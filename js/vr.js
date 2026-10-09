/* =========================================================================
   VR: everything a headset player needs without the 2D page.
   - Lobby with case selection
   - Case tablet (A/X): Evidence · Suspects (charge) · Case, plus results
   - Laser pointers for panels and evidence, floating notifications
   Panels are canvas textures, so they need no external fonts or assets.
   ========================================================================= */
const VR = (() => {
    const T = THREE;
    let sceneEl, camEl, G, supported = false;
    const state = { active: false, tab: 'evidence', confirm: null, loading: null, result: null };
    const panels = [];
    const ray = new T.Raycaster(), tmpV = new T.Vector3(), tmpQ = new T.Quaternion(), headPos = new T.Vector3(), fwd = new T.Vector3();
    const FONT = 'Inter, "Segoe UI", Arial, sans-serif', MONO = '"IBM Plex Mono", Consolas, monospace';
    const C = { bg: 'rgba(13,17,23,0.95)', line: 'rgba(255,255,255,0.12)', text: '#e6e9ee', muted: '#8b95a3', amber: '#f2b42a', blue: '#4b8dff', red: '#ef5350', green: '#3fcf8e', btn: '#1d2530' };

    // ------------------------------------------------------------- panels
    class Panel {
        constructor(wM, hM, pxW, render) {
            this.W = pxW; this.H = Math.round(pxW * hM / wM);
            this.canvas = document.createElement('canvas'); this.canvas.width = this.W; this.canvas.height = this.H;
            this.g = this.canvas.getContext('2d');
            this.tex = new T.CanvasTexture(this.canvas); this.tex.colorSpace = T.SRGBColorSpace; this.tex.anisotropy = 4; this.tex.generateMipmaps = false; this.tex.minFilter = T.LinearFilter;
            this.mesh = new T.Mesh(new T.PlaneGeometry(wM, hM), new T.MeshBasicMaterial({ map: this.tex, transparent: true, toneMapped: false, fog: false, depthTest: false, depthWrite: false }));
            this.mesh.renderOrder = 30; this.mesh.visible = false; this.mesh.userData.panel = this;
            this.render = render; this.buttons = []; this.hover = null;
            panels.push(this);
        }
        show(v = true) { this.mesh.visible = v; if (v) this.redraw(); }
        redraw() {
            const g = this.g; g.clearRect(0, 0, this.W, this.H); this.buttons = [];
            g.textBaseline = 'alphabetic';
            this.render(ui(this));
            this.tex.needsUpdate = true;
        }
        hit(uv) { const x = uv.x * this.W, y = (1 - uv.y) * this.H; return this.buttons.find(b => !b.disabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) || null; }
        setHover(id) { if (this.hover !== id) { this.hover = id; this.redraw(); } }
    }
    function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function ui(p) {
        const g = p.g;
        const api = {
            W: p.W, H: p.H, g,
            bg() { rr(g, 2, 2, p.W - 4, p.H - 4, 28); g.fillStyle = C.bg; g.fill(); g.strokeStyle = C.line; g.lineWidth = 3; g.stroke(); },
            text(s, x, y, o = {}) {
                const size = o.size || 26, lh = o.lh || Math.round(size * 1.35);
                g.font = `${o.weight || 400} ${size}px ${o.mono ? MONO : FONT}`; g.fillStyle = o.color || C.text; g.textAlign = o.align || 'left';
                if (!o.maxW) { g.fillText(String(s), x, y); return y + lh; }
                const words = String(s).split(' '); let line = '', yy = y, n = 0;
                for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > o.maxW && line) { g.fillText(line, x, yy); yy += lh; line = w; if (o.maxLines && ++n >= o.maxLines) { line = '…'; break; } } else line = t; }
                if (line) { g.fillText(line, x, yy); yy += lh; }
                return yy;
            },
            rect(x, y, w, h, fill, r = 10) { rr(g, x, y, w, h, r); g.fillStyle = fill; g.fill(); },
            bar(x, y, w, h, pct, color) { api.rect(x, y, w, h, 'rgba(255,255,255,0.1)', h / 2); if (pct > 0.005) api.rect(x, y, Math.max(h, w * pct), h, color, h / 2); },
            button(id, label, x, y, w, h, o = {}) {
                const hov = p.hover === id && !o.disabled;
                const fill = o.disabled ? 'rgba(255,255,255,0.05)' : o.kind === 'primary' ? C.amber : o.kind === 'danger' ? C.red : o.kind === 'ai' ? 'rgba(75,141,255,0.25)' : C.btn;
                api.rect(x, y, w, h, fill, 12);
                if (hov) { rr(g, x, y, w, h, 12); g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke(); }
                else if (o.kind === 'ai') { rr(g, x, y, w, h, 12); g.strokeStyle = C.blue; g.lineWidth = 3; g.stroke(); }
                api.text(label, x + w / 2, y + h / 2 + (o.size || 26) * 0.36, { size: o.size || 26, weight: 600, align: 'center', color: o.disabled ? C.muted : o.kind === 'primary' ? '#15120a' : '#fff' });
                p.buttons.push({ id, x, y, w, h, disabled: !!o.disabled, onClick: o.onClick });
            },
            tag(s, x, y, color, ink = '#15120a') { g.font = `600 22px ${MONO}`; const w = g.measureText(s).width + 24; api.rect(x, y, w, 36, color, 6); api.text(s, x + 12, y + 26, { size: 22, mono: true, weight: 600, color: ink }); return x + w; }
        };
        return api;
    }

    // ------------------------------------------------------------- tablet
    const tablet = () => panels.tablet;
    function renderTablet(u) {
        const S = G.S, c = S.c; u.bg();
        if (!c) { u.text('No case open', 40, 80, { size: 34, weight: 700 }); return; }
        if (state.result) return renderResult(u);
        u.text(c.code, 40, 58, { size: 22, mono: true, color: C.amber });
        u.text(c.title, 40, 100, { size: 36, weight: 700 });
        u.text(G.fmt(Math.floor(S.elapsed)), u.W - 130, 58, { size: 24, mono: true, color: C.muted, align: 'right' });
        u.button('close', '✕', u.W - 100, 24, 70, 56, { onClick: () => tablet().show(false) });
        [['evidence', 'Evidence'], ['suspects', 'Suspects'], ['case', 'Case']].forEach(([id, label], i) => {
            u.button('tab-' + id, label, 40 + i * 230, 128, 210, 58, { kind: state.tab === id ? 'primary' : '', onClick: () => { state.tab = id; state.confirm = null; tablet().redraw(); } });
        });
        u.rect(40, 200, u.W - 80, 2, C.line, 0);
        ({ evidence: tabEvidence, suspects: tabSuspects, case: tabCase })[state.tab](u, S, c);
    }
    function tabEvidence(u, S, c) {
        const e = S.sel && G.findEv(S.sel);
        if (!e) {
            let y = u.text('Point a laser at an evidence marker and pull the trigger to examine it.', 40, 260, { size: 28, maxW: u.W - 80 });
            const left = Object.values(S.ev).filter(r => !S.examined.has(r.e.id)).length;
            u.text(`${left} item${left === 1 ? '' : 's'} still unexamined.`, 40, y + 10, { size: 26, color: C.muted });
            u.button('lead', 'Show nearest lead', 40, y + 50, 330, 64, { onClick: () => G.hint() });
            return;
        }
        const ai = !!(S.ev[e.id] && S.ev[e.id].ai);
        const x2 = u.tag(ai ? `AI ${e.id}` : `EVIDENCE ${e.tag}`, 40, 222, ai ? C.blue : C.amber, ai ? '#fff' : '#15120a');
        u.tag(e.kind.toUpperCase(), x2 + 8, 222, '#2a323e', '#c8cfd9');
        u.text(e.title, 40, 300, { size: 38, weight: 700 });
        let y = u.text('Found: ' + e.found, 40, 338, { size: 22, color: C.muted, maxW: u.W - 80, maxLines: 1 });
        y += 4;
        e.data.forEach(([k, v, h]) => {
            u.g.font = `22px ${MONO}`;
            const lines = Math.max(1, Math.ceil(u.g.measureText(v).width / 760));
            const rh = 18 + lines * 30;
            if (h) u.rect(40, y - 4, u.W - 80, rh, 'rgba(242,180,42,0.12)', 6);
            u.text(k, 56, y + 26, { size: 22, color: C.muted, maxW: 300, maxLines: 1 });
            u.text(v, 380, y + 26, { size: 22, mono: true, color: h ? '#ffd77a' : C.text, maxW: 840, lh: 30, maxLines: 3 });
            y += rh + 6;
        });
        y += 10;
        u.rect(40, y, 6, 96, C.blue, 2);
        y = u.text(e.insight, 64, y + 30, { size: 23, color: '#d6e2f5', maxW: u.W - 120, lh: 31, maxLines: 3 }) + 6;
        const d = S.deltas[e.id] || {};
        let cx = 40;
        c.suspects.filter(s => e.lr[s.id] !== undefined && e.lr[s.id] !== 1).forEach(s => {
            const r = e.lr[s.id], dd = d[s.id] || 0, label = `${s.name} ×${r} ${dd > 0 ? '▲' : dd < 0 ? '▼' : ''}${Math.abs(dd)}%`;
            u.g.font = `22px ${FONT}`; const w = u.g.measureText(label).width + 28;
            if (cx + w > u.W - 40) { cx = 40; y += 46; }
            u.rect(cx, y, w, 38, r > 1 ? 'rgba(63,207,142,0.18)' : 'rgba(239,83,80,0.18)', 19);
            u.text(label, cx + 14, y + 27, { size: 22, color: r > 1 ? C.green : '#ff9b98' });
            cx += w + 8;
        });
        if (e.id === c.recon.frag && !S.revealed) u.button('recon', '◈ Run AI reconstruction', u.W - 420, u.H - 96, 380, 66, { kind: 'ai', onClick: () => G.reconstruct() });
    }
    function tabSuspects(u, S, c) {
        const p = G.posterior(), lead = G.leader(p), n = S.examined.size;
        u.text(n ? `Leading: ${G.sname(lead)} · ${Math.round(p[lead] * 100)}% · ${G.confidence(p[lead])} confidence` : 'All hypotheses equal. Examine evidence to update them.', 40, 250, { size: 26, color: n ? C.amber : C.muted });
        c.suspects.forEach((s, i) => {
            const y = 290 + i * 148, wrong = S.wrong.includes(s.id), person = !!s.age, pct = p[s.id];
            const dv = G.drivers(s.id);
            u.rect(40, y, u.W - 80, 134, n && s.id === lead ? 'rgba(242,180,42,0.08)' : 'rgba(255,255,255,0.03)', 14);
            u.text(s.name, 64, y + 44, { size: 30, weight: 700, color: wrong ? C.muted : C.text });
            u.text(`${s.role}${person ? ` · ${s.age} · ${s.height}` : ''}`, 64, y + 76, { size: 21, color: C.muted, maxW: 620, maxLines: 1 });
            u.bar(64, y + 92, 620, 10, pct, n && s.id === lead ? C.amber : '#9aa7b8');
            const drv = [dv.up[0] && `▲ ${dv.up[0].e.title}`, dv.down[0] && `▼ ${dv.down[0].e.title}`].filter(Boolean).join('   ');
            if (drv) u.text(drv, 64, y + 126, { size: 19, color: C.muted, maxW: 640, maxLines: 1 });
            u.text(`${Math.round(pct * 100)}%`, 860, y + 82, { size: 46, mono: true, weight: 600, align: 'right' });
            u.button('charge-' + s.id, wrong ? 'Rejected' : person ? 'Charge' : 'Conclude', u.W - 300, y + 34, 240, 66, { kind: wrong ? '' : 'danger', disabled: wrong || n < 3, onClick: () => { state.confirm = s.id; tablet().redraw(); } });
        });
        if (n < 3) u.text('Examine at least three items before filing a charge.', 40, u.H - 30, { size: 22, color: C.muted });
        if (state.confirm) {
            tablet().buttons = []; // only the dialog's own buttons are clickable
            const s = c.suspects.find(x => x.id === state.confirm), pr = p[s.id];
            u.rect(0, 0, u.W, u.H, 'rgba(5,7,10,0.82)', 28);
            u.rect(200, 250, u.W - 400, 380, '#151b23', 20);
            u.text(s.age ? `Charge ${s.name}?` : `Conclude: ${s.name}?`, 240, 330, { size: 36, weight: 700 });
            u.text(`Current probability ${Math.round(pr * 100)}% (${G.confidence(pr).toLowerCase()} confidence). A wrong conclusion costs 250 points.`, 240, 390, { size: 26, color: C.muted, maxW: u.W - 480 });
            u.button('cancel', 'Cancel', 240, 530, 300, 70, { onClick: () => { state.confirm = null; tablet().redraw(); } });
            u.button('confirm', s.age ? 'File charge' : 'Conclude', u.W - 540, 530, 300, 70, { kind: 'danger', onClick: () => { const id = state.confirm; state.confirm = null; G.charge(id); } });
        }
    }
    function tabCase(u, S, c) {
        let y = u.text(`${c.type} · ${c.location}`, 40, 250, { size: 24, color: C.muted, maxW: u.W - 80, maxLines: 1 });
        y = u.text(c.summary, 40, y + 4, { size: 24, maxW: u.W - 80, maxLines: 3, lh: 32 });
        const obj = G.objectives();
        y += 10;
        obj.forEach(([t, d]) => { u.rect(44, y + 2, 26, 26, d ? C.green : 'rgba(255,255,255,0.08)', 5); u.text(t, 86, y + 24, { size: 25, color: d ? C.muted : C.text }); y += 44; });
        const canAI = S.examined.has(c.recon.frag) && !S.revealed;
        y = Math.max(y + 16, u.H - 230);
        u.button('sweep', 'Forensic sweep', 40, y, 380, 68, { onClick: () => G.sweep() });
        u.button('recon', '◈ AI reconstruction', 450, y, 380, 68, { kind: canAI ? 'ai' : '', disabled: !canAI, onClick: () => G.reconstruct() });
        u.button('lead', 'Nearest lead', 860, y, 380, 68, { onClick: () => G.hint() });
        u.button('restart', 'Restart case', 40, y + 90, 380, 68, { onClick: () => G.restart() });
        u.button('lobby', 'Exit to lobby', 450, y + 90, 380, 68, { onClick: () => G.quit() });
        u.button('exitvr', 'Exit VR', 860, y + 90, 380, 68, { onClick: () => sceneEl.exitVR() });
    }
    function renderResult(u) {
        const r = state.result;
        u.rect(40, 40, 330, 60, 'rgba(63,207,142,0.18)', 10);
        u.text('CASE CLOSED', 205, 82, { size: 30, mono: true, weight: 600, color: C.green, align: 'center' });
        u.text(r.title, 400, 84, { size: 34, weight: 700 });
        u.text(`Finding: ${r.culprit}`, 40, 160, { size: 30, weight: 700, color: C.amber });
        u.text(r.explain, 40, 210, { size: 24, maxW: 760, lh: 32, maxLines: 9 });
        u.rect(840, 130, u.W - 880, 470, 'rgba(255,255,255,0.04)', 16);
        let sy = 175;
        r.rows.forEach(([k, v]) => { u.text(k, 870, sy, { size: 21, color: C.muted, maxW: 260, maxLines: 1 }); u.text((v > 0 ? '+' : '') + v, u.W - 70, sy, { size: 22, mono: true, align: 'right', color: v < 0 ? C.red : C.text }); sy += 38; });
        u.text('Total', 870, sy + 20, { size: 26, weight: 700 }); u.text(String(r.total), u.W - 70, sy + 20, { size: 30, mono: true, weight: 700, align: 'right' });
        u.text(r.rank, 1040, sy + 90, { size: 34, weight: 700, color: C.amber, align: 'center' });
        u.button('next', `Next: ${r.next}`, 40, u.H - 110, 460, 72, { kind: 'primary', onClick: () => { state.result = null; G.startCase(r.nextId); } });
        u.button('lobby', 'Lobby', 530, u.H - 110, 260, 72, { onClick: () => { state.result = null; G.quit(); } });
        u.button('exitvr', 'Exit VR', 820, u.H - 110, 260, 72, { onClick: () => sceneEl.exitVR() });
    }

    // ------------------------------------------------------------- lobby
    let lobbyGroup = null;
    function renderTitle(u) {
        u.bg();
        u.rect(60, 70, 34, 34, C.amber, 6);
        u.text('SHADY SHERLOCK', 120, 102, { size: 54, weight: 800 });
        u.text('Forensic investigation simulator. Choose a case file with your laser.', 60, 170, { size: 28, color: C.muted, maxW: u.W - 120 });
        u.text('Left stick: walk · Right stick: turn · Trigger: select · A/X: case tablet · B/Y: sweep', 60, 230, { size: 22, color: C.muted, maxW: u.W - 120 });
    }
    function renderCases(u) {
        u.bg();
        if (state.loading) {
            u.text('Loading', u.W / 2, u.H / 2 - 30, { size: 30, color: C.muted, align: 'center' });
            u.text(state.loading, u.W / 2, u.H / 2 + 30, { size: 44, weight: 700, align: 'center' });
            u.text('Securing the scene…', u.W / 2, u.H / 2 + 90, { size: 26, color: C.amber, align: 'center' });
            return;
        }
        const w = (u.W - 120) / 3;
        CASES.forEach((c, i) => {
            const x = 40 + i * (w + 20), best = G.best(c.id);
            u.button('case-' + c.id, '', x, 40, w, u.H - 170, { onClick: () => G.startCase(c.id) });
            u.text(c.code, x + 24, 90, { size: 22, mono: true, color: C.amber });
            u.text(c.type.toUpperCase(), x + w - 24, 90, { size: 20, mono: true, color: C.muted, align: 'right' });
            let y = u.text(c.title, x + 24, 150, { size: 34, weight: 700, maxW: w - 48, lh: 42 });
            y = u.text(c.location, x + 24, y + 6, { size: 22, color: C.muted, maxW: w - 48, maxLines: 2 });
            u.text(c.summary, x + 24, y + 14, { size: 22, maxW: w - 48, maxLines: 6, lh: 30 });
            u.text(best ? `Solved · ${best.rank} · ${best.score}` : `${c.evidence.length} evidence items`, x + 24, u.H - 170, { size: 22, color: best ? C.green : C.muted });
        });
        u.button('exitvr', 'Exit VR', u.W - 300, u.H - 100, 260, 66, { onClick: () => sceneEl.exitVR() });
    }
    function showLobby(on) {
        const scene = sceneEl.object3D;
        if (on && !lobbyGroup) {
            lobbyGroup = new T.Group();
            const floor = new T.Mesh(new T.CircleGeometry(7, 64), new T.MeshStandardMaterial({ color: 0x151a21, roughness: 0.85 })); floor.rotation.x = -Math.PI / 2; lobbyGroup.add(floor);
            for (let r = 1; r < 7; r += 1.5) { const ring = new T.Mesh(new T.RingGeometry(r, r + 0.01, 96), new T.MeshBasicMaterial({ color: 0x2a3340 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; lobbyGroup.add(ring); }
            lobbyGroup.add(new T.HemisphereLight(0x9fb3d1, 0x202020, 1.2));
            scene.add(lobbyGroup);
        }
        if (lobbyGroup) lobbyGroup.visible = on;
        if (on) {
            scene.background = new T.Color(0x0b0e13); scene.fog = null;
            G.teleportHome();
            place(panels.title.mesh, 0, 2.05, -2.2); place(panels.cases.mesh, 0, 1.25, -2.0);
            panels.title.show(); panels.cases.show();
        } else { panels.title.show(false); panels.cases.show(false); }
    }
    function place(mesh, x, y, z) {
        const rig = sceneEl.querySelector('#rig').object3D;
        rig.updateMatrixWorld(true);
        mesh.position.set(x, y, z); rig.localToWorld(mesh.position);
        sceneEl.camera.getWorldPosition(headPos); mesh.lookAt(headPos.x, mesh.position.y, headPos.z);
        if (!mesh.parent) sceneEl.object3D.add(mesh);
    }

    // ------------------------------------------------------------- toast
    let toastUntil = 0, toastText = '';
    function renderToast(u) { u.bg(); u.rect(14, 14, 10, u.H - 28, toastAI ? C.blue : C.amber, 4); u.text(toastText, 48, u.H / 2 + 10, { size: 28, maxW: u.W - 80, maxLines: 2, lh: 34 }); }
    let toastAI = false;
    function toast(msg, ai) { if (!state.active) return; toastText = msg; toastAI = ai; toastUntil = performance.now() + 4500; panels.toast.show(); snapToast = true; }
    let snapToast = false;

    // ------------------------------------------------------------- lasers
    const hands = [];
    function setupHands() {
        sceneEl.querySelectorAll('[laser-controls]').forEach(el => {
            const geo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(0, 0, -1)]);
            const line = new T.Line(geo, new T.LineBasicMaterial({ color: 0xf2b42a, transparent: true, opacity: 0.8 }));
            const dot = new T.Mesh(new T.SphereGeometry(0.012, 12, 8), new T.MeshBasicMaterial({ color: 0xffffff }));
            line.visible = dot.visible = false; line.frustumCulled = false; line.renderOrder = dot.renderOrder = 60;
            sceneEl.object3D.add(line, dot);
            const h = { el, line, dot, hit: null, origin: new T.Vector3(), dir: new T.Vector3() };
            hands.push(h);
            const hideLaser = () => setTimeout(() => el.setAttribute('raycaster', 'showLine', false), 0);
            ['controllerconnected', 'controllermodelready'].forEach(ev => el.addEventListener(ev, hideLaser)); hideLaser();
            el.addEventListener('triggerdown', () => { if (state.active) { primary = h; select(h); } });
            // grip / trackpad click too, for controllers without A/X buttons
            ['abuttondown', 'xbuttondown', 'menudown', 'gripdown', 'trackpaddown'].forEach(ev => el.addEventListener(ev, () => state.active && G.S.c && !G.S.loading && !state.result && toggleTablet()));
            ['bbuttondown', 'ybuttondown'].forEach(ev => el.addEventListener(ev, () => state.active && G.S.c && G.sweep()));
        });
        primary = hands[1] || hands[0];
    }
    let primary = null;
    function updateHand(h) {
        const el = h.el, rc = el.components.raycaster, tracked = el.components['tracked-controls'];
        const ok = state.active && rc && tracked && el.object3D.visible !== false;
        h.line.visible = h.dot.visible = !!ok; h.hit = null;
        if (!ok) return;
        el.object3D.updateMatrixWorld(true);
        h.origin.copy(rc.data.origin); el.object3D.localToWorld(h.origin);
        h.dir.copy(rc.data.direction).transformDirection(el.object3D.matrixWorld).normalize();
        ray.set(h.origin, h.dir); ray.far = 20;
        let best = null;
        const vis = panels.filter(p => p.mesh.visible && p !== panels.toast).map(p => p.mesh);
        const ph = ray.intersectObjects(vis, false)[0];
        if (ph) { const p = ph.object.userData.panel, b = p.hit(ph.uv); best = { d: ph.distance, panel: p, button: b }; }
        if (G.S.c && !state.result) {
            const ev = G.pickRay(h.origin, h.dir);
            if (ev && (!best || ev.dist < best.d)) best = { d: ev.dist, ev: ev.id };
        }
        h.hit = best;
        const len = best ? best.d : 4;
        const pos = h.line.geometry.attributes.position;
        pos.setXYZ(0, h.origin.x, h.origin.y, h.origin.z);
        pos.setXYZ(1, h.origin.x + h.dir.x * len, h.origin.y + h.dir.y * len, h.origin.z + h.dir.z * len); pos.needsUpdate = true;
        h.line.geometry.computeBoundingSphere();
        h.dot.visible = !!best; if (best) h.dot.position.set(h.origin.x + h.dir.x * len, h.origin.y + h.dir.y * len, h.origin.z + h.dir.z * len);
        h.line.material.color.set(best && (best.button || best.ev) ? 0xffffff : 0xf2b42a);
    }
    function select(h) {
        const hit = h.hit; if (!hit) return;
        if (hit.button) { Sound.sfx.click(); hit.button.onClick && hit.button.onClick(); return; }
        if (hit.ev) G.tryExamine(hit.ev);
    }

    // ------------------------------------------------------------- tablet control
    function summonTablet(force) {
        const t = tablet(); if (!t) return;
        sceneEl.camera.getWorldPosition(headPos);
        if (!force && t.mesh.visible && t.mesh.position.distanceTo(headPos) < 1.8) { t.redraw(); return; }
        sceneEl.camera.getWorldQuaternion(tmpQ); fwd.set(0, 0, -1).applyQuaternion(tmpQ); fwd.y = 0; fwd.normalize();
        t.mesh.position.copy(headPos).addScaledVector(fwd, 0.72); t.mesh.position.y = headPos.y - 0.22;
        t.mesh.lookAt(headPos);
        if (!t.mesh.parent) sceneEl.object3D.add(t.mesh);
        t.show();
    }
    function toggleTablet() { const t = tablet(); sceneEl.camera.getWorldPosition(headPos); if (t.mesh.visible && t.mesh.position.distanceTo(headPos) < 1.8) t.show(false); else { state.confirm = null; summonTablet(true); } }

    // ------------------------------------------------------------- frame
    let lastSec = -1;
    function tick() {
        if (!state.active) return;
        hands.forEach(updateHand);
        // hover feedback for the primary hand
        panels.forEach(p => { const hov = hands.map(h => h.hit && h.hit.panel === p && h.hit.button ? h.hit.button.id : null).find(Boolean) || null; if (p.mesh.visible) p.setHover(hov); });
        const ph = primary && primary.hit;
        G.setVRFocus(ph && ph.ev ? ph.ev : null);
        // toast follows the head lazily
        const tp = panels.toast;
        if (tp.mesh.visible) {
            if (performance.now() > toastUntil) tp.show(false);
            else {
                sceneEl.camera.getWorldPosition(headPos); sceneEl.camera.getWorldQuaternion(tmpQ);
                tmpV.set(0, -0.32, -1.25).applyQuaternion(tmpQ).add(headPos);
                if (snapToast) { tp.mesh.position.copy(tmpV); snapToast = false; } else tp.mesh.position.lerp(tmpV, 0.06);
                tp.mesh.lookAt(headPos);
            }
        }
        // timer on the tablet once per second
        const sec = G.S.c ? Math.floor(G.S.elapsed) : -1;
        if (sec !== lastSec && tablet().mesh.visible && !state.confirm) { lastSec = sec; tablet().redraw(); }
    }

    // ------------------------------------------------------------- hooks from the game
    const hooks = {
        examined() { if (!state.active) return; state.tab = 'evidence'; state.confirm = null; summonTablet(false); },
        update() { if (state.active && tablet().mesh.visible) tablet().redraw(); },
        loading(title) {
            state.loading = title;
            if (!state.active) return;
            tablet().show(false); state.confirm = null;
            if (!panels.cases.mesh.visible) { place(panels.cases.mesh, 0, 1.45, -1.9); panels.cases.show(); } else panels.cases.redraw();
        },
        caseLoaded() {
            state.loading = null; state.result = null; state.tab = 'case';
            if (!state.active) return;
            showLobby(false); summonTablet(true);
            toast('Scene secured. Walk with the left stick, point and pull the trigger to examine.');
        },
        solved(result) { state.result = result; if (state.active) summonTablet(true); },
        quit() { state.result = null; tablet() && tablet().show(false); if (state.active) showLobby(true); }
    };

    function enter() { if (!supported) return; sceneEl.enterVR(); }

    function init(scene, game) {
        sceneEl = scene; camEl = scene.querySelector('#camera'); G = game;
        panels.tablet = new Panel(1.0, 0.72, 1280, renderTablet);
        panels.title = new Panel(1.5, 0.3, 1400, renderTitle);
        panels.cases = new Panel(1.8, 0.82, 1600, renderCases);
        panels.toast = new Panel(0.7, 0.12, 900, renderToast);
        panels.toast.mesh.renderOrder = 50;
        [panels.tablet, panels.title, panels.cases, panels.toast].forEach(p => scene.object3D.add(p.mesh));
        setupHands();
        scene.addEventListener('enter-vr', () => {
            if (!scene.is('vr-mode')) return;
            state.active = true; Perf.lock(true);
            if (G.S.c && state.result) summonTablet(true);
            else if (G.S.c) { G.syncInput(); toast('Press A or X for the case tablet. B or Y runs a forensic sweep.'); }
            else showLobby(true);
            G.onVR(true);
        });
        scene.addEventListener('exit-vr', () => {
            state.active = false; Perf.lock(false); requestAnimationFrame(() => Perf.resetDpr());
            panels.forEach(p => p.show(false)); hands.forEach(h => { h.line.visible = h.dot.visible = false; });
            if (lobbyGroup) lobbyGroup.visible = false;
            G.setVRFocus(null); G.onVR(false);
        });
        if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-vr').then(ok => { supported = ok; document.body.classList.toggle('xr', ok); }).catch(() => { });
    }

    // Test helper: world position of a panel button's centre
    function buttonWorld(name, id) {
        const p = panels[name], b = p && p.buttons.find(x => x.id === id); if (!b) return null;
        const g = p.mesh.geometry.parameters, v = new T.Vector3(((b.x + b.w / 2) / p.W - 0.5) * g.width, (0.5 - (b.y + b.h / 2) / p.H) * g.height, 0);
        p.mesh.updateMatrixWorld(true); return p.mesh.localToWorld(v);
    }
    return { init, tick, enter, toast, hooks, state, get supported() { return supported; }, panels, debug: { hands, buttonWorld } };
})();
