/* =========================================================================
   GAME: case flow, Bayesian engine, evidence interaction, AI
   reconstruction, scoring and UI.
   ========================================================================= */
const Game = (() => {
    const T = THREE, $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
    const AMBER = new T.Color(0xf2b42a), BLUE = new T.Color(0x4b8dff), GREEN = new T.Color(0x3fcf8e), tmpC = new T.Color();
    const EXAMINE_RANGE = 4.5;
    const S = { c: null, world: null, root: null, ev: {}, examined: new Set(), deltas: {}, revealed: false, prev: null, elapsed: 0, running: false, scans: 0, wrong: [], solved: false, focus: null, hover: null, scanUntil: 0, locate: null, locateUntil: 0, tweens: [], recon: null, pending: null, vrUntil: 0 };
    let sceneEl, camera, renderer, ray = new T.Raycaster(), hitList = [], occluders = [], lastPick = 0;
    const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

    // ---------------------------------------------------------------- audio
    const Sfx = {
        ctx: null,
        tone(type, f0, f1, dur, vol, delay = 0) {
            if (!this.on) return;
            try {
                this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
                if (this.ctx.state === 'suspended') this.ctx.resume();
                const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
                o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
                g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
                o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur);
            } catch (e) { }
        },
        shutter() { this.tone('square', 2400, 600, 0.05, 0.03); this.tone('triangle', 900, 300, 0.09, 0.05, 0.04); },
        sweep() { this.tone('sine', 220, 880, 0.8, 0.05); },
        ai() { [392, 523, 659, 784].forEach((f, i) => this.tone('sine', f, 0, 0.5, 0.04, i * 0.12)); },
        ok() { [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, 0, 0.45, 0.06, i * 0.1)); },
        bad() { [311, 233].forEach((f, i) => this.tone('sawtooth', f, 0, 0.35, 0.04, i * 0.18)); },
        tick() { this.tone('sine', 1200, 0, 0.03, 0.02); },
        on: true,
        noise(dur) {
            const c = this.ctx, b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0);
            let last = 0; for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
            const src = c.createBufferSource(); src.buffer = b; return src;
        },
        step(scene) {
            if (!this.on || !this.ctx) return;
            const c = this.ctx, src = this.noise(0.12), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
            f.type = 'lowpass'; f.frequency.value = scene === 'lake' ? 900 : scene === 'museum' ? 2200 : 1400;
            g.gain.setValueAtTime(scene === 'museum' ? 0.25 : 0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
            src.connect(f); f.connect(g); g.connect(c.destination); src.start(t);
        },
        ambient(scene) {
            this.stopAmbient();
            if (!this.on) return;
            try {
                this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
                const c = this.ctx, src = this.noise(4), f = c.createBiquadFilter(), g = c.createGain();
                src.loop = true; f.type = 'lowpass'; f.frequency.value = scene === 'lake' ? 500 : scene === 'museum' ? 220 : 320;
                g.gain.value = scene === 'lake' ? 0.05 : 0.035;
                src.connect(f); f.connect(g); g.connect(c.destination); src.start();
                this.amb = { src, g };
                if (scene === 'lake') this.birds = setInterval(() => { if (Math.random() < 0.5) [0, 0.12, 0.22].forEach(d => this.tone('sine', 2600 + Math.random() * 900, 1800 + Math.random() * 600, 0.09, 0.012, d)); }, 2600);
            } catch (e) { }
        },
        stopAmbient() { if (this.amb) { try { this.amb.src.stop(); } catch (e) { } this.amb = null; } clearInterval(this.birds); }
    };

    // ---------------------------------------------------------------- Bayes
    const allEv = () => S.c.evidence.concat(S.c.recon.reveals);
    const findEv = id => allEv().find(e => e.id === id);
    const sname = id => S.c.suspects.find(s => s.id === id).name;
    const pct = x => Math.round(x * 100);
    function posterior(set = S.examined) {
        const p = {}; S.c.suspects.forEach(s => p[s.id] = 1);
        set.forEach(id => { const lr = findEv(id).lr; for (const k in lr) p[k] *= lr[k]; });
        const tot = Object.values(p).reduce((a, b) => a + b, 0);
        for (const k in p) p[k] /= tot;
        return p;
    }
    const leader = p => Object.keys(p).reduce((a, b) => (p[a] >= p[b] ? a : b));
    const confidence = x => (x >= 0.75 ? 'High' : x >= 0.5 ? 'Moderate' : 'Low');
    function drivers(sid) {
        const list = [...S.examined].map(id => ({ e: findEv(id), r: findEv(id).lr[sid] ?? 1 })).filter(d => d.r !== 1);
        return { up: list.filter(d => d.r > 1).sort((a, b) => b.r - a.r), down: list.filter(d => d.r < 1).sort((a, b) => a.r - b.r) };
    }
    const tagOf = e => e.tag;
    const initials = n => n.split(/\s+/).filter(w => /^[A-Z]/.test(w)).map(w => w[0]).slice(-2).join('');

    // ---------------------------------------------------------------- UI helpers
    function screen(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
    function openModal(id) { $('#' + id).classList.add('open'); syncInput(); }
    function closeModal(id) { const m = $('#' + id); m.classList.remove('open'); syncInput(); }
    const anyModal = () => [...$$('.modal.open')].length > 0;
    function syncInput() {
        const blocking = anyModal() || $('.screen.active');
        Controls.state.enabled = !!S.c && !blocking && !S.solved;
        S.running = !!S.c && !S.solved && !$('#menu.open, #help.open, #about.open, #result.open') && !$('.screen.active');
    }
    let toastTimer;
    function toast(msg, ai = false, ms = 3800) { const t = $('#toast'); t.textContent = msg; t.className = ai ? 'ai' : ''; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), ms); }
    function flash() { const f = $('#flash'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 90); }
    const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // ---------------------------------------------------------------- title & briefing
    function rankFor(score) { return score >= 1150 ? 'Chief Inspector' : score >= 900 ? 'Inspector' : score >= 650 ? 'Detective' : 'Constable'; }
    function renderTitle() {
        $('#case-grid').innerHTML = CASES.map(c => {
            const best = store.get('ss-best-' + c.id);
            return `<button class="case-card" data-case="${c.id}">
                <div class="case-art ${c.scene}"><span class="stamp ${best ? 'solved' : 'open'}">${best ? 'SOLVED' : 'OPEN'}</span></div>
                <div class="case-body">
                    <div class="case-meta mono"><span>${c.code}</span><span>${esc(c.type)}</span></div>
                    <h3>${esc(c.title)}</h3>
                    <p class="muted small">${esc(c.location)}</p>
                    <p>${esc(c.summary.split('. ')[0])}.</p>
                    <div class="case-foot"><span class="dots">Difficulty ${[1, 2, 3].map(i => `<i class="${i <= c.difficulty ? 'on' : ''}"></i>`).join('')}</span><span>${best ? `${esc(best.rank)} · ${best.score}` : `${c.evidence.length} evidence items`}</span></div>
                </div></button>`;
        }).join('');
    }
    function brief(id) {
        const c = CASES.find(x => x.id === id);
        S.pending = c;
        $('#brief-code').textContent = `${c.code} · ${c.type.toUpperCase()}`;
        $('#brief-title').textContent = c.title;
        $('#brief-type').textContent = c.type; $('#brief-loc').textContent = c.location; $('#brief-date').textContent = c.datetime; $('#brief-victim').textContent = c.victim;
        $('#brief-summary').textContent = c.summary;
        $('#brief-suspects').innerHTML = c.suspects.map(s => `<div class="person"><div class="avatar ${s.age ? '' : 'alt'}">${s.age ? initials(s.name) : '?'}</div><div><b>${esc(s.name)}</b><span class="role">${esc(s.role)}${s.age ? ` · ${s.age} · ${esc(s.height)}` : ''}</span><p>${esc(s.motive)}</p>${s.alibi ? `<p class="muted">Alibi: ${esc(s.alibi)}</p>` : ''}</div></div>`).join('');
        $('#brief-controls').textContent = Controls.isTouch ? 'Phone: move your phone to look, joystick to walk, tap Examine on highlighted evidence.' : 'Desktop: WASD to walk, drag to look, click evidence to examine.';
        screen('screen-brief');
    }

    // ---------------------------------------------------------------- loading a case
    function clearWorld() {
        if (S.root) {
            sceneEl.object3D.remove(S.root);
            S.root.traverse(o => { if (o.geometry && !o.isInstancedMesh) o.geometry.dispose(); });
        }
        if (sceneEl.object3D.environment) { sceneEl.object3D.environment.dispose(); sceneEl.object3D.environment = null; }
        S.root = null; S.world = null; S.ev = {}; hitList = []; occluders = []; S.tweens = []; S.recon = null;
    }
    async function enter(c) {
        const motionReq = Controls.isTouch ? Controls.requestMotion() : Promise.resolve(false);
        clearWorld();
        Object.assign(S, { c, examined: new Set(), deltas: {}, revealed: false, prev: null, elapsed: 0, scans: 0, wrong: [], solved: false, focus: null, hover: null, scanUntil: 0, locate: null });
        $('#load-code').textContent = c.code; $('#load-title').textContent = c.title;
        const step = (txt, p) => { $('#load-step').textContent = txt; $('#load-bar').style.width = Math.round(p * 100) + '%'; };
        screen('screen-load'); $('#hud').classList.add('hidden'); closeSheet();
        step('Securing the scene', 0.05); await nextFrame();
        const base = { t: P.stats.total, d: P.stats.done };
        const poll = setInterval(() => { const t = P.stats.total - base.t, d = P.stats.done - base.d; if (t > 0) step(`Loading 3D assets ${d}/${t}`, 0.35 + 0.5 * d / t); }, 150);
        S.root = new T.Group(); sceneEl.object3D.add(S.root);
        step('Generating surfaces and lighting', 0.2); await nextFrame();
        const clear = allEv().map(e => [e.pos[0], e.pos[2]]).concat([c.spawn.pos], (c.recon.ghosts || []).map(g => [g.pos[0], g.pos[2]]));
        S.world = await SCENES[c.scene]({ root: S.root, scene: sceneEl.object3D, renderer, mobile: Controls.isTouch, clear });
        Controls.state.world = S.world;
        step('Tagging evidence', 0.88); await nextFrame();
        await Promise.all(c.evidence.map((e, i) => buildEvidence(e, i, false)));
        clearInterval(poll);
        collectOccluders();
        step('Compiling shaders', 0.96); await nextFrame();
        try { renderer.compile(sceneEl.object3D, camera); } catch (e) { }
        Sfx.ambient(c.scene);
        Controls.teleport(c.spawn.pos[0], c.spawn.pos[1], c.spawn.yaw);
        step('Ready', 1); await nextFrame();
        screen(null); $('#hud').classList.remove('hidden');
        $('#hud-code').textContent = c.code; $('#hud-title').textContent = c.title;
        updateHUD(); syncInput();
        const ok = await motionReq;
        if (Controls.isTouch) setMotionUI(ok && Controls.setMotion(true) !== false);
        toast(`Scene secured. ${c.evidence.length} evidence markers to examine. Use Sweep if you get stuck.`);
    }
    function collectOccluders() {
        const box = new T.Box3(), size = new T.Vector3();
        S.root.updateMatrixWorld(true);
        S.root.traverse(o => {
            if (!o.isMesh || o.isInstancedMesh || o.userData.eid || o.userData.evidence) return;
            const m = Array.isArray(o.material) ? o.material[0] : o.material;
            if (!m || m.transparent || m.isMeshBasicMaterial) return;
            box.setFromObject(o).getSize(size);
            if (size.y > 1.0 && Math.max(size.x, size.z) > 0.3 && Math.max(size.x, size.z) < 60) occluders.push(o);
        });
    }

    // ---------------------------------------------------------------- evidence objects
    function buildEvidence(e, i, ai) {
        const w = S.world, g = new T.Group();
        e.tag = ai ? e.id : String(i + 1).padStart(2, '0');
        const ground = w.groundAt(e.pos[0], e.pos[2]);
        const y = (e.obj.type === 'rowboat' && w.water !== undefined ? Math.max(ground, w.water) : ground) + e.pos[1];
        g.position.set(e.pos[0], y, e.pos[2]); g.rotation.y = (e.rot || 0) * Math.PI / 180;
        g.userData.evidence = true;
        S.root.add(g);
        const rec = { e, g, obj: null, glow: [], level: 0, ai };
        S.ev[e.id] = rec;
        const done = obj => {
            rec.obj = obj; g.add(obj);
            g.updateMatrixWorld(true);
            g.traverse(o => { if (o.isMesh) o.userData.evidence = true; });
            // highlight materials
            obj.traverse(o => {
                if (!o.isMesh || !o.material || !o.material.emissive) return;
                o.material = o.material.clone();
                rec.glow.push({ m: o.material, e0: o.material.emissive.clone() });
            });
            // hitbox
            let hit;
            const hs = obj.userData.hitSize;
            if (hs) { hit = new T.Mesh(new T.BoxGeometry(hs[0], hs[1], hs[2]), new T.MeshBasicMaterial({ visible: false })); hit.position.set(hs[3] || 0, hs[1] / 2, hs[4] || 0); g.add(hit); }
            else {
                const b = new T.Box3().setFromObject(obj), size = b.getSize(new T.Vector3()), ctr = b.getCenter(new T.Vector3());
                size.set(Math.max(size.x + 0.12, 0.35), Math.max(size.y + 0.12, 0.3), Math.max(size.z + 0.12, 0.35));
                hit = new T.Mesh(new T.BoxGeometry(size.x, size.y, size.z), new T.MeshBasicMaterial({ visible: false }));
                hit.position.copy(ctr); S.root.add(hit);
            }
            hit.userData.eid = e.id; hitList.push(hit); rec.hit = hit;
            const hp = hit.geometry.parameters; rec.vol = hp.width * hp.height * hp.depth;
            hit.updateMatrixWorld(true);
            const hb = new T.Box3().setFromObject(hit), hsz = hb.getSize(new T.Vector3());
            rec.anchor = hb.getCenter(new T.Vector3());
            // floor ring
            const ring = new T.Mesh(new T.RingGeometry(0.92, 1, 56), new T.MeshBasicMaterial({ color: ai ? BLUE : AMBER, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide }));
            ring.rotation.x = -Math.PI / 2; const rr = Math.min(1.6, Math.max(0.3, Math.max(hsz.x, hsz.z) * 0.62));
            ring.scale.setScalar(rr); ring.position.set(rec.anchor.x, w.groundAt(rec.anchor.x, rec.anchor.z) + 0.012, rec.anchor.z);
            S.root.add(ring); rec.ring = ring;
            // label
            rec.label = new T.Sprite(new T.SpriteMaterial({ map: TX.pic('label', e.tag, e.title, ai), depthTest: false, transparent: true, sizeAttenuation: false }));
            rec.label.scale.set(0.2, 0.0375, 1); rec.label.renderOrder = 999; rec.label.visible = false;
            rec.label.position.set(rec.anchor.x, hb.max.y + 0.22, rec.anchor.z); S.root.add(rec.label);
            // tent marker
            const tx = e.tent ? e.tent[0] : e.pos[0] + 0.32, tz = e.tent ? e.tent[1] : e.pos[2] + 0.32;
            const tent = P.tent(e.tag, ai), sp = S.c.spawn.pos;
            tent.position.set(tx, w.groundAt(tx, tz), tz); tent.rotation.y = Math.atan2(sp[0] - tx, sp[1] - tz);
            tent.traverse(o => { o.userData.evidence = true; });
            S.root.add(tent); rec.tent = tent;
            if (ai) { g.scale.setScalar(0.01); tween(0.8, p => g.scale.setScalar(Math.max(0.01, ease(p)))); }
        };
        if (e.obj.model) return P.model(e.obj.model).then(m => { const o = new T.Group(); if (m) { m.scale.setScalar(e.obj.scale || 1); o.add(m); } else P.box(o, 1.8, 1.2, 4, 'steel', 0, 0.6, 0); done(o); });
        done(P.EV[e.obj.type](e.obj, e));
        return Promise.resolve();
    }

    // ---------------------------------------------------------------- picking
    function pick(ndc, origin, dir) {
        if (origin) ray.set(origin, dir); else ray.setFromCamera(ndc, camera);
        ray.far = 30;
        const hits = ray.intersectObjects(hitList, false);
        if (!hits.length) return null;
        // Overlapping boxes: prefer the most specific (smallest) item near the first hit
        const h = hits.filter(x => x.distance < hits[0].distance + 0.9).sort((a, b) => S.ev[a.object.userData.eid].vol - S.ev[b.object.userData.eid].vol)[0];
        const block = ray.intersectObjects(occluders, false);
        if (block.length && block[0].distance < h.distance - 0.05) return null;
        return h.object.userData.eid;
    }
    function camPos() { return camera.getWorldPosition(new T.Vector3()); }
    const distTo = id => camPos().distanceTo(S.ev[id].anchor);
    function onTap(x, y) {
        if (!Controls.state.enabled) return;
        const id = pick(new T.Vector2(x / innerWidth * 2 - 1, -y / innerHeight * 2 + 1));
        if (id) tryExamine(id);
    }
    function onHover(x, y) {
        if (x === null || !Controls.state.enabled) { S.hover = null; return; }
        S.hover = pick(new T.Vector2(x / innerWidth * 2 - 1, -y / innerHeight * 2 + 1));
        sceneEl.canvas.style.cursor = S.hover ? 'pointer' : 'grab';
    }
    function tryExamine(id) {
        const d = distTo(id);
        if (d > EXAMINE_RANGE) { toast(`Too far to examine (${d.toFixed(1)} m). Move closer.`); Sfx.tick(); return; }
        if (id === S.c.recon.frag && S.examined.has(id) && !S.revealed && sceneEl.is('vr-mode')) return reconstruct();
        examine(id);
    }

    // ---------------------------------------------------------------- examine
    function examine(id) {
        const e = findEv(id), first = !S.examined.has(id);
        if (first) {
            const before = posterior();
            S.examined.add(id);
            const after = posterior();
            S.deltas[id] = Object.fromEntries(S.c.suspects.map(s => [s.id, pct(after[s.id]) - pct(before[s.id])]));
            S.prev = before;
            S.ev[id].label.material.map = TX.pic('label', e.tag, '✓ ' + e.title, S.ev[id].ai);
            flash(); Sfx.shutter();
        } else Sfx.tick();
        openSheet(id);
        updateHUD();
        if (sceneEl.is('vr-mode')) showVRPanel(id);
        if (first && id === S.c.recon.frag && !S.revealed) setTimeout(() => toast('Damaged evidence logged. AI reconstruction is now available (R).', true), 600);
        if (first && allEv().every(x => S.examined.has(x.id))) setTimeout(() => toast('All evidence examined. Open the case board (B) to file a charge.'), 1200);
    }
    function openSheet(id) {
        const e = findEv(id), ai = !!S.ev[id].ai;
        $('#ev-num').textContent = ai ? `AI ${e.id}` : `EVIDENCE ${e.tag}`;
        $('#ev-kind').textContent = e.kind;
        $('.ev-tag').classList.toggle('ai', ai);
        $('#ev-title').textContent = e.title;
        $('#ev-found').textContent = 'Found: ' + e.found;
        $('#ev-data').innerHTML = e.data.map(([k, v, h]) => `<tr class="${h ? 'hl' : ''}"><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
        $('#ev-insight').textContent = e.insight;
        const d = S.deltas[id] || {}, lrs = Object.entries(e.lr).filter(([, r]) => r !== 1);
        $('#ev-impact').innerHTML = lrs.length ? S.c.suspects.filter(s => e.lr[s.id] !== undefined && e.lr[s.id] !== 1).sort((a, b) => e.lr[b.id] - e.lr[a.id])
            .map(s => { const r = e.lr[s.id], dd = d[s.id] || 0; return `<span class="chip ${r > 1 ? 'up' : 'down'}">${esc(s.name)} <b>×${r}</b> <span class="${dd >= 0 ? 'up' : 'down'}">${dd > 0 ? '▲' : dd < 0 ? '▼' : '·'}${Math.abs(dd)}%</span></span>`; }).join('')
            : '<span class="muted small">No direct effect yet. This item needs AI reconstruction.</span>';
        $('#ev-ai').classList.toggle('hidden', !(id === S.c.recon.frag && !S.revealed));
        $('#ev-panel').classList.add('open');
    }
    function closeSheet() { $('#ev-panel').classList.remove('open'); }

    // ---------------------------------------------------------------- sweep & locate
    function sweep() {
        if (!Controls.state.enabled) return;
        S.scans++; S.scanUntil = performance.now() + 6000; Sfx.sweep();
        const p = camPos(), g = S.world.groundAt(p.x, p.z);
        const wave = new T.Mesh(new T.RingGeometry(0.96, 1, 96), new T.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
        wave.rotation.x = -Math.PI / 2; wave.position.set(p.x, g + 0.05, p.z); S.root.add(wave);
        tween(1.8, t => { wave.scale.setScalar(0.2 + t * 18); wave.material.opacity = 0.8 * (1 - t); }, () => S.root && S.root.remove(wave));
        const near = Object.values(S.ev).filter(r => r.anchor && r.anchor.distanceTo(p) < 18).length;
        const left = Object.values(S.ev).filter(r => !S.examined.has(r.e.id)).length;
        toast(`Forensic sweep: ${near} markers within 18 m · ${left} still unexamined (−15 pts)`);
    }
    function locate(id) { S.locate = id; S.locateUntil = performance.now() + 7000; closeModal('log'); toast(`Locating ${S.ev[id].e.title}. Follow the highlighted label.`); }

    // ---------------------------------------------------------------- AI reconstruction
    const ease = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
    const clamp01 = v => Math.max(0, Math.min(1, v));
    function tween(dur, fn, done) { S.tweens.push({ t: 0, dur, fn, done }); }
    function reconstruct() {
        const r = S.c.recon;
        if (S.revealed) return;
        if (!S.examined.has(r.frag)) { toast('Find and examine the damaged evidence first.'); return; }
        S.revealed = true; closeSheet(); Sfx.ai(); updateHUD();
        toast(`AI reconstruction running · ${r.label}`, true, 3000);
        const grp = new T.Group(); S.root.add(grp);
        const w = S.world, gy = (x, z) => Math.max(w.groundAt(x, z), w.water ?? -Infinity);
        // 1. Fragments reassemble into a hologram
        const fr = S.ev[r.frag], shards = (fr.obj && fr.obj.userData.shards) || [];
        const holo = new T.MeshStandardMaterial({ color: 0x9cc4ff, emissive: 0x2a6bff, emissiveIntensity: 0.9, transparent: true, opacity: 0.85, side: T.DoubleSide });
        shards.forEach((s, i) => {
            const from = s.position.clone(), q0 = s.quaternion.clone(), q1 = new T.Quaternion().setFromEuler(s.userData.assembled.rot), to = s.userData.assembled.pos;
            s.material = holo;
            tween(2.0, p => { const k = ease(clamp01(p * 1.4 - i * 0.012)); s.position.lerpVectors(from, to, k); s.quaternion.slerpQuaternions(q0, q1, k); });
        });
        // 2. Projected path
        const pts = r.path.map(p => new T.Vector3(...p));
        const curve = pts.length === 2 ? new T.LineCurve3(pts[0], pts[1]) : new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
        const col = r.kind === 'drift' ? 0x5ad1ff : 0xff4d4d;
        const tube = new T.Mesh(new T.TubeGeometry(curve, 200, r.kind === 'trajectory' ? 0.02 : 0.04, 10), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, depthWrite: false }));
        const total = tube.geometry.index.count; tube.geometry.setDrawRange(0, 0); grp.add(tube);
        tween(2.4, p => tube.geometry.setDrawRange(0, Math.floor(total * ease(p) / 3) * 3));
        const dot = new T.Mesh(new T.SphereGeometry(r.kind === 'trajectory' ? 0.022 : 0.07, 16, 12), new T.MeshBasicMaterial({ color: 0xffffff }));
        grp.add(dot); S.recon = { dot, curve, u: 0, speed: r.kind === 'trajectory' ? 0.9 : 0.12 };
        if (r.kind === 'drift') for (let i = 1; i < 7; i++) { const u = i / 7, c = new T.Mesh(new T.ConeGeometry(0.12, 0.35, 12), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8 })); c.position.copy(curve.getPointAt(u)); c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), curve.getTangentAt(u)); grp.add(c); }
        // 3. Event projection: ghost figures
        setTimeout(() => (r.ghosts || []).forEach(gd => {
            const f = P.figure(gd.pose, null, gd.color); f.position.set(gd.pos[0], gy(gd.pos[0], gd.pos[2]), gd.pos[2]);
            f.rotation.y = Math.atan2(gd.face[0] - gd.pos[0], gd.face[1] - gd.pos[2]); grp.add(f);
            const mats = new Set(); f.traverse(o => o.material && mats.add(o.material));
            tween(1.2, p => mats.forEach(m => m.opacity = 0.45 * p));
        }), 900);
        // 4. Camera coverage cone
        if (r.cone) {
            const a = new T.Vector3(...r.cone.from), b = new T.Vector3(...r.cone.to), len = a.distanceTo(b) * 1.1;
            const geo = new T.ConeGeometry(len * Math.tan(r.cone.angle * Math.PI / 180), len, 40, 1, true); geo.translate(0, -len / 2, 0);
            const cone = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x4b8dff, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
            cone.position.copy(a); cone.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), b.clone().sub(a).normalize()); grp.add(cone);
            tween(1.5, p => cone.material.opacity = 0.09 * p);
        }
        // 5. New findings
        setTimeout(() => {
            r.reveals.forEach((e, i) => buildEvidence(e, i, true));
            toast(`${r.reveals.length} new AI findings are marked in blue. Examine them.`, true, 4500);
            updateHUD();
        }, 2400);
    }

    // ---------------------------------------------------------------- charging & scoring
    function askCharge(sid) {
        if (S.examined.size < 3) { toast('The prosecutor needs at least three examined items before a charge.'); return; }
        const s = S.c.suspects.find(x => x.id === sid), p = posterior();
        const person = !!s.age;
        $('#confirm-title').textContent = person ? `Charge ${s.name}?` : `Conclude: ${s.name}?`;
        $('#confirm-body').textContent = `Current probability ${pct(p[sid])}% (${confidence(p[sid]).toLowerCase()} confidence). A wrong conclusion costs 250 points.`;
        $('#confirm-yes').textContent = person ? 'File charge' : 'Conclude';
        $('#confirm-yes').onclick = () => charge(sid);
        openModal('confirm');
    }
    function charge(sid) {
        closeModal('confirm');
        if (sid === S.c.solution) { S.solved = true; closeModal('board'); closeSheet(); Sfx.ok(); finish(); return; }
        S.wrong.push(sid); Sfx.bad(); closeModal('board');
        toast(`Rejected: the evidence does not support ${sname(sid)}. −250 points. Keep investigating.`, false, 5000);
        updateHUD();
    }
    function score() {
        const p = posterior(), n = S.examined.size, t = Math.floor(S.elapsed);
        const rows = [['Case opened', 400], [`Evidence examined × ${n}`, n * 60], ['AI reconstruction', S.revealed ? 150 : 0], [`Time bonus (${fmt(t)})`, Math.max(0, 300 - Math.floor(t / 2))]];
        if (S.scans) rows.push([`Forensic sweeps × ${S.scans}`, -15 * S.scans]);
        if (S.wrong.length) rows.push([`Wrong conclusions × ${S.wrong.length}`, -250 * S.wrong.length]);
        if (p[S.c.solution] < 0.6) rows.push(['Charged on weak evidence', -100]);
        const total = Math.max(0, rows.reduce((a, [, v]) => a + v, 0));
        return { rows, total, rank: rankFor(total) };
    }
    function finish() {
        const c = S.c, sc = score(), best = store.get('ss-best-' + c.id);
        if (!best || sc.total > best.score) store.set('ss-best-' + c.id, { score: sc.total, rank: sc.rank });
        const key = drivers(c.solution).up.slice(0, 3);
        const next = CASES[(CASES.indexOf(c) + 1) % CASES.length];
        $('#result-box').innerHTML = `
            <div class="result-head"><span class="verdict-stamp ok">CASE CLOSED</span><div><div class="mono muted small">${c.code}</div><h2 style="margin:0">${esc(c.title)}</h2></div></div>
            <div class="result-grid">
                <div>
                    <h4>Finding</h4><p><b>${esc(sname(c.solution))}</b>: ${esc(c.explain)}</p>
                    <h4>Key evidence</h4><ul class="small">${key.map(k => `<li>${esc(k.e.title)} <span class="up mono">×${k.r}</span></li>`).join('')}</ul>
                    <h4>Reconstructed timeline</h4><ol class="timeline">${c.timeline.map(([t, x]) => `<li><span class="mono">${t}</span>${esc(x)}</li>`).join('')}</ol>
                </div>
                <div>
                    <h4>Score</h4>
                    <table class="score-table">${sc.rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="${v < 0 ? 'down' : ''}">${v > 0 ? '+' : ''}${v}</td></tr>`).join('')}<tr class="total"><td>Total</td><td>${sc.total}</td></tr></table>
                    <div class="rank"><span class="muted small">Rank</span><b>${sc.rank}</b>${best && best.score >= sc.total ? `<span class="muted small">Best: ${best.score}</span>` : '<span class="muted small">New best</span>'}</div>
                </div>
            </div>
            <div class="result-actions"><button class="btn" id="res-files">Case files</button><button class="btn primary" id="res-next">Next case: ${esc(next.title)}</button></div>`;
        $('#res-files').onclick = quit; $('#res-next').onclick = () => { closeModal('result'); brief(next.id); hideHUD(); };
        openModal('result'); syncInput();
    }
    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // ---------------------------------------------------------------- HUD rendering
    function updateHUD() {
        const c = S.c; if (!c) return;
        const p = posterior(), lead = leader(p), any = S.examined.size > 0;
        const baseDone = c.evidence.filter(e => S.examined.has(e.id)).length, aiDone = c.recon.reveals.filter(e => S.examined.has(e.id)).length;
        const obj = [[`Examine evidence (${baseDone}/${c.evidence.length})`, baseDone === c.evidence.length], ['Run AI reconstruction', S.revealed]];
        if (S.revealed) obj.push([`Review AI findings (${aiDone}/${c.recon.reveals.length})`, aiDone === c.recon.reveals.length]);
        obj.push(['File a charge from the case board', S.solved]);
        $('#hud-obj').innerHTML = obj.map(([t, d]) => `<li class="${d ? 'done' : ''}">${esc(t)}</li>`).join('');
        $('#probs-lead').textContent = any ? confidence(p[lead]) : '—';
        $('#probs-list').innerHTML = c.suspects.map(s => {
            const d = S.prev && any ? pct(p[s.id]) - pct(S.prev[s.id]) : 0, wrong = S.wrong.includes(s.id);
            return `<div class="prob ${any && s.id === lead ? 'lead' : ''}"><div class="prob-top"><span>${esc(s.name)}${wrong ? ' <span class="down small">✕</span>' : ''}</span><span><span class="pct">${pct(p[s.id])}%</span><span class="d ${d > 0 ? 'up' : 'down'}">${d ? (d > 0 ? '▲' : '▼') + Math.abs(d) : ''}</span></span></div><div class="pbar"><i style="width:${p[s.id] * 100}%"></i></div></div>`;
        }).join('');
        $('#b-ai').classList.toggle('hidden', !(S.examined.has(c.recon.frag) && !S.revealed));
        if ($('#board').classList.contains('open')) renderBoard();
        if ($('#log').classList.contains('open')) renderLog();
    }
    function renderBoard() {
        const c = S.c, p = posterior(), lead = leader(p), n = S.examined.size, total = c.evidence.length + (S.revealed ? c.recon.reveals.length : 0);
        $('#board-assess').innerHTML = n ? `<span>Leading hypothesis: <b>${esc(sname(lead))}</b> · ${pct(p[lead])}%</span><span>Confidence: <b>${confidence(p[lead])}</b></span><span class="muted">Evidence examined ${n}/${total}${S.revealed ? '' : ' · AI reconstruction pending'}</span>`
            : '<span class="muted">All hypotheses are equally likely. Examine evidence to update them.</span>';
        $('#board-suspects').innerHTML = c.suspects.map(s => {
            const dv = drivers(s.id), wrong = S.wrong.includes(s.id), person = !!s.age;
            return `<div class="scard ${n && s.id === lead ? 'lead' : ''} ${wrong ? 'wrong' : ''}">
                <div class="scard-top"><div class="avatar ${person ? '' : 'alt'}">${person ? initials(s.name) : '?'}</div><div><b>${esc(s.name)}</b><span class="role">${esc(s.role)}${person ? ` · ${s.age} · ${esc(s.height)}` : ''}</span></div></div>
                <div class="big-pct">${pct(p[s.id])}%</div>
                <div class="pbar"><i style="width:${p[s.id] * 100}%"></i></div>
                <p><span class="muted">Motive:</span> ${esc(s.motive)}</p>
                ${s.alibi ? `<p><span class="muted">Alibi:</span> ${esc(s.alibi)}</p>` : ''}
                <div class="drivers">${dv.up.slice(0, 2).map(d => `<span class="up">▲ ${esc(d.e.title)} ×${d.r}</span>`).join('')}${dv.down.slice(0, 2).map(d => `<span class="down">▼ ${esc(d.e.title)} ×${d.r}</span>`).join('')}</div>
                <button class="btn ${wrong ? '' : 'danger'}" data-charge="${s.id}" ${wrong ? 'disabled' : ''}>${wrong ? 'Rejected' : person ? 'Charge' : 'Conclude'}</button>
            </div>`;
        }).join('');
    }
    function renderLog() {
        const p = camPos();
        $('#log-list').innerHTML = Object.values(S.ev).map(r => {
            const ex = S.examined.has(r.e.id), d = r.anchor ? r.anchor.distanceTo(p).toFixed(1) : '?';
            return `<li><span class="num ${r.ai ? 'ai' : ''}">${r.e.tag}</span><span class="t">${esc(r.e.title)}<small>${esc(r.e.kind)} · ${ex ? '<span class="up">✓ examined</span>' : `${d} m away`}</small></span>${ex ? `<button class="btn" data-view="${r.e.id}">View</button>` : `<button class="btn" data-locate="${r.e.id}">Locate</button>`}</li>`;
        }).join('');
    }
    function hideHUD() { $('#hud').classList.add('hidden'); closeSheet(); }
    function setMotionUI(on) { const b = $('#t-motion'); b.setAttribute('aria-pressed', on); b.querySelector('b').textContent = on ? 'ON' : 'OFF'; }
    function quit() { $$('.modal.open').forEach(m => m.classList.remove('open')); hideHUD(); clearWorld(); Sfx.stopAmbient(); S.c = null; renderTitle(); screen('screen-title'); syncInput(); }

    // ---------------------------------------------------------------- VR panel
    function showVRPanel(id) {
        const e = findEv(id), p = posterior(), panel = $('#vr-panel');
        const top = Object.keys(p).sort((a, b) => p[b] - p[a]).slice(0, 3).map(k => `${sname(k)} ${pct(p[k])}%`).join('   ');
        const key = e.data.find(d => d[2]) || e.data[0];
        panel.querySelector('#vr-title').setAttribute('value', `${e.tag}  ${e.title.toUpperCase()}`);
        panel.querySelector('#vr-body').setAttribute('value', `${key[0]}: ${key[1]}\n\n${e.insight}`);
        panel.querySelector('#vr-probs').setAttribute('value', top);
        const cp = camPos(), dir = new T.Vector3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new T.Quaternion())); dir.y = 0; dir.normalize();
        panel.object3D.position.copy(cp).addScaledVector(dir, 0.9); panel.object3D.position.y = cp.y - 0.1;
        panel.object3D.lookAt(cp.x, panel.object3D.position.y, cp.z);
        panel.setAttribute('visible', true); S.vrUntil = performance.now() + 14000;
    }

    // ---------------------------------------------------------------- frame loop
    const tmpV = new T.Vector3();
    function tick(t, dtMs) {
        const dt = Math.min(dtMs || 16, 60) / 1000;
        for (let i = S.tweens.length - 1; i >= 0; i--) { const tw = S.tweens[i]; tw.t += dt; const p = Math.min(1, tw.t / tw.dur); tw.fn(p); if (p >= 1) { S.tweens.splice(i, 1); tw.done && tw.done(); } }
        if (!S.c || !S.world || !S.root) return;
        if (S.running) { const prev = Math.floor(S.elapsed); S.elapsed += dt; if (Math.floor(S.elapsed) !== prev) $('#hud-timer').textContent = fmt(Math.floor(S.elapsed)); }
        const now = performance.now(), cp = camPos();
        if (now - lastPick > 110 && Controls.state.enabled) {
            lastPick = now;
            S.focus = S.hover || pick(new T.Vector2(0, 0));
            renderPrompt(cp);
        }
        if (S.recon) { S.recon.u = (S.recon.u + dt * S.recon.speed) % 1; S.recon.dot.position.copy(S.recon.curve.getPointAt(S.recon.u)); }
        if (S.vrUntil && now > S.vrUntil) { $('#vr-panel').setAttribute('visible', false); S.vrUntil = 0; }
        const scanning = now < S.scanUntil, pulse = 0.65 + 0.35 * Math.sin(t / 180);
        for (const id in S.ev) {
            const r = S.ev[id]; if (!r.anchor) continue;
            const d = cp.distanceTo(r.anchor), ex = S.examined.has(id);
            let target = id === S.focus ? 1 : scanning || (S.locate === id && now < S.locateUntil) ? 0.85 : d < 2.6 && !ex ? 0.35 : 0;
            r.level += (target - r.level) * Math.min(1, dt * 8);
            const k = r.level * pulse, col = r.ai ? BLUE : ex ? GREEN : AMBER;
            if (Math.abs(r.lastK - k) > 0.01 || r.lastK === undefined) {
                r.lastK = k;
                r.glow.forEach(gm => gm.m.emissive.copy(gm.e0).add(tmpC.copy(col).multiplyScalar(k * 0.4)));
                r.ring.material.color.copy(col); r.ring.material.opacity = k * 0.75;
            }
            r.label.visible = r.level > 0.5 || (d < 2.2 && !ex);
            if (r.obj && r.obj.userData.spin) r.obj.userData.spin.rotation.y += dt * 1.2;
        }
    }
    function renderPrompt(cp) {
        const pr = $('#prompt'), id = S.focus, ex = $('#t-examine');
        $('#crosshair').classList.toggle('on', !!id);
        if (!id || $('#ev-panel').classList.contains('open') && Controls.isTouch) { pr.classList.add('hidden'); ex.disabled = true; return; }
        const r = S.ev[id], d = cp.distanceTo(r.anchor), far = d > EXAMINE_RANGE, done = S.examined.has(id);
        pr.innerHTML = `<span class="tag ${r.ai ? 'ai' : ''}">${r.e.tag}</span><span>${esc(r.e.title)}</span><span class="dist">${d.toFixed(1)} m</span>${done ? '<span class="done">✓</span>' : ''}<span class="muted small">${far ? 'Move closer' : Controls.isTouch ? '' : 'Click / E'}</span>`;
        pr.classList.remove('hidden');
        ex.disabled = far;
    }

    // ---------------------------------------------------------------- boot
    function bindUI() {
        document.body.classList.toggle('touch', Controls.isTouch);
        document.addEventListener('click', e => {
            const t = e.target.closest('[data-open],[data-close],[data-case],[data-charge],[data-locate],[data-view]');
            if (!t) return;
            if (t.dataset.open) openModal(t.dataset.open);
            if (t.dataset.close) { if (t.dataset.close === 'ev-panel') closeSheet(); else closeModal(t.dataset.close); }
            if (t.dataset.case) brief(t.dataset.case);
            if (t.dataset.charge) askCharge(t.dataset.charge);
            if (t.dataset.locate) locate(t.dataset.locate);
            if (t.dataset.view) { closeModal('log'); openSheet(t.dataset.view); }
        });
        $('#brief-back').onclick = () => screen('screen-title');
        $('#btn-enter').onclick = () => S.pending && enter(S.pending);
        $('#b-board').onclick = () => { renderBoard(); openModal('board'); };
        $('#b-log').onclick = () => { renderLog(); openModal('log'); };
        $('#b-sweep').onclick = sweep; $('#t-sweep').onclick = sweep;
        $('#b-ai').onclick = reconstruct; $('#ev-ai').onclick = reconstruct;
        $('#b-menu').onclick = () => openModal('menu');
        $('#btn-restart').onclick = () => { closeModal('menu'); enter(S.c); };
        $('#btn-quit').onclick = quit;
        $('#t-examine').onclick = () => S.focus && tryExamine(S.focus);
        $('#t-motion').onclick = () => {
            if (Controls.state.motion) { Controls.setMotion(false); setMotionUI(false); return; }
            Controls.requestMotion().then(ok => { if (ok) { Controls.setMotion(true); setMotionUI(true); } else toast('Motion sensors are unavailable on this device. Drag to look around.'); });
        };
        Sfx.on = store.get('ss-sound') !== false;
        $('#btn-sound').textContent = `Sound: ${Sfx.on ? 'on' : 'off'}`;
        $('#btn-sound').onclick = () => { Sfx.on = !Sfx.on; store.set('ss-sound', Sfx.on); $('#btn-sound').textContent = `Sound: ${Sfx.on ? 'on' : 'off'}`; if (Sfx.on && S.c) Sfx.ambient(S.c.scene); else Sfx.stopAmbient(); };
        $('#probs-toggle').onclick = () => $('#hud-probs').classList.toggle('collapsed');
        if (Controls.isTouch && innerWidth < 720) $('#hud-probs').classList.add('collapsed');
        window.addEventListener('keydown', e => {
            if (e.code === 'Escape') {
                const open = [...$$('.modal.open')].pop();
                if (open && open.id !== 'result') closeModal(open.id); else if ($('#ev-panel').classList.contains('open')) closeSheet(); else if (S.c && !S.solved) openModal('menu');
                return;
            }
            if (!S.c || anyModal() || $('.screen.active')) return;
            if (e.code === 'KeyE' && S.focus) tryExamine(S.focus);
            if (e.code === 'KeyQ') sweep();
            if (e.code === 'KeyR') reconstruct();
            if (e.code === 'KeyB') { renderBoard(); openModal('board'); }
            if (e.code === 'KeyL' || e.code === 'Tab') { e.preventDefault(); renderLog(); openModal('log'); }
        });
        const vrBtns = [$('#btn-vr-title'), $('#btn-vr-menu')];
        if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-vr').then(ok => ok && vrBtns.forEach(b => b.classList.remove('hidden'))).catch(() => { });
        vrBtns.forEach(b => b.onclick = () => { if (!S.c) toast('Open a case first, then enter VR from the menu.'); else { closeModal('menu'); sceneEl.enterVR(); } });
        // VR laser triggers
        sceneEl.querySelectorAll('[laser-controls]').forEach(h => h.addEventListener('triggerdown', () => {
            if (!S.c) return;
            const o = h.object3D.getWorldPosition(new T.Vector3()), d = new T.Vector3(0, 0, -1).applyQuaternion(h.object3D.getWorldQuaternion(new T.Quaternion()));
            const id = pick(null, o, d); if (id) tryExamine(id);
        }));
        const dpr = () => renderer.setPixelRatio(Math.min(devicePixelRatio, Controls.isTouch ? 1.5 : 2));
        window.addEventListener('resize', () => setTimeout(dpr, 50)); dpr();
    }

    AFRAME.registerSystem('ss-game', { tick(t, dt) { tick(t, dt); } });

    function boot() {
        sceneEl = document.querySelector('a-scene');
        const start = () => {
            renderer = sceneEl.renderer; camera = sceneEl.camera;
            renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
            sceneEl.addEventListener('camera-set-active', e => { camera = e.detail.cameraEl.getObject3D('camera'); });
            Controls.init(sceneEl);
            Controls.state.onTap = onTap; Controls.state.onHover = onHover; Controls.state.onStep = () => S.c && Sfx.step(S.c.scene);
            bindUI(); renderTitle();
        };
        sceneEl.hasLoaded ? start() : sceneEl.addEventListener('loaded', start);
    }
    document.addEventListener('DOMContentLoaded', boot);

    return { S, posterior, enter: id => enter(CASES.find(c => c.id === id)), examine, reconstruct, sweep, pickNdc: (x, y) => pick(new T.Vector2(x, y)), debugHits: (x, y) => { ray.setFromCamera(new T.Vector2(x, y), camera); return ray.intersectObjects(hitList, false).map(h => h.object.userData.eid + '@' + h.distance.toFixed(2)); } };
})();
