/* =========================================================================
   PROPS: procedural furniture, figures and evidence objects (three.js)
   Every builder returns a THREE.Group whose origin sits on the floor.
   ========================================================================= */
const P = (() => {
    const T = THREE, V = (x, y, z) => new T.Vector3(x, y, z);
    const M = {};
    const std = o => new T.MeshStandardMaterial(o);
    const DEF = {
        skin: () => std({ color: 0xb98b6e, roughness: 0.55 }),
        skinPale: () => std({ color: 0xa8968c, roughness: 0.6 }),
        shirt: () => TX.mat('fabric', { base: '#e6e6e2', sd: 1 }, { repeat: [1, 1], rough: 0.85, normal: 0.15 }),
        trousers: () => TX.mat('fabric', { base: '#2a2e35', sd: 2 }, { repeat: [1, 1], rough: 0.8, normal: 0.15 }),
        jacket: () => TX.mat('fabric', { base: '#2c3d57', sd: 3 }, { repeat: [1, 1], rough: 0.75, normal: 0.2 }),
        jeans: () => TX.mat('fabric', { base: '#3a4a64', sd: 4 }, { repeat: [1, 1], rough: 0.85, normal: 0.2 }),
        tie: () => std({ color: 0x5a1520, roughness: 0.5 }),
        leatherBlack: () => std({ color: 0x121212, roughness: 0.35 }),
        sneaker: () => std({ color: 0xd8d8d2, roughness: 0.7 }),
        hairGrey: () => std({ color: 0x77736e, roughness: 0.8 }),
        hairDark: () => std({ color: 0x2a1a12, roughness: 0.7 }),
        walnut: () => TX.mat('wood', { base: '#6a4328', dark: '#2a170a', planks: 3, joints: false, sd: 31 }, { rough: 0.45 }),
        oak: () => TX.mat('wood', { base: '#b08355', dark: '#6a4628', planks: 4, joints: false, sd: 33 }, { rough: 0.5 }),
        whiteLacquer: () => std({ color: 0xeeece8, roughness: 0.35 }),
        marbleWhite: () => TX.mat('marble', { sd: 35 }, { rough: 0.18 }),
        marbleDark: () => TX.mat('marble', { base: '#2a2a2c', vein: '#c9c4ba', sd: 37 }, { rough: 0.2 }),
        brass: () => std({ color: 0xb8923e, metalness: 1, roughness: 0.3 }),
        chrome: () => std({ color: 0xd6d8dc, metalness: 1, roughness: 0.12 }),
        steel: () => std({ color: 0x8a8f96, metalness: 0.9, roughness: 0.35 }),
        blackMetal: () => std({ color: 0x18191b, metalness: 0.6, roughness: 0.45 }),
        plastic: () => std({ color: 0x1b1c1f, roughness: 0.5 }),
        glass: () => std({ color: 0xdfe8ee, roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide, envMapIntensity: 2 }),
        wine: () => std({ color: 0x3d0610, roughness: 0.08, transparent: true, opacity: 0.88 }),
        bourbon: () => std({ color: 0x7a3d0c, roughness: 0.1, transparent: true, opacity: 0.75 }),
        bottleGreen: () => std({ color: 0x0e2a18, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.9 }),
        paper: () => std({ color: 0xf2efe7, roughness: 0.9 }),
        velvetBlue: () => TX.mat('fabric', { base: '#1c2a52', sd: 5 }, { repeat: [2, 2], rough: 0.95, normal: 0.3 }),
        velvetRed: () => std({ color: 0x6b0f17, roughness: 0.9 }),
        leatherBrown: () => TX.mat('fabric', { base: '#4a2a18', sd: 6 }, { repeat: [3, 3], rough: 0.45, normal: 0.2 }),
        sofaFabric: () => TX.mat('fabric', { base: '#5b6470', sd: 7 }, { repeat: [4, 4], rough: 0.9, normal: 0.5 }),
        brass2: () => std({ color: 0xc8a050, metalness: 1, roughness: 0.22 }),
        bulb: () => new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd7a0, emissiveIntensity: 3 }),
        coolLight: () => new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfe9ff, emissiveIntensity: 2 }),
        greenPaint: () => TX.mat('wood', { base: '#2f6b45', dark: '#1d4a2d', planks: 2, joints: false, sd: 39 }, { rough: 0.6 }),
        whitePaint: () => std({ color: 0xe8e6df, roughness: 0.7 }),
        brass3: () => std({ color: 0xa88a3c, metalness: 1, roughness: 0.4 }),
        rubber: () => std({ color: 0x101010, roughness: 0.9 }),
        rock: () => TX.mat('concrete', { base: '#7b7a74', sd: 41 }, { rough: 0.9, flatShading: true }),
        charcoal: () => std({ color: 0x0d0c0b, roughness: 1 }),
        terracotta: () => TX.mat('concrete', { base: '#a4532f', sd: 43 }, { rough: 0.85, normal: 0.4 }),
        bustMarble: () => TX.mat('marble', { base: '#efede8', vein: '#b8b4ac', sd: 45 }, { rough: 0.3 })
    };
    const mat = k => (typeof k === 'string' ? (M[k] || (M[k] = DEF[k]())) : k);

    // ---------- primitives ----------
    function add(parent, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
        const mesh = new T.Mesh(geo, mat(m));
        mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    // Box with UVs scaled to world size (density = texture repeats per metre)
    function boxGeo(w, h, d, density = 1) {
        const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
        for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] * density, uv.getY(k) * dims[f][1] * density); }
        return g;
    }
    const box = (p, w, h, d, m, x, y, z, ry = 0, density = 1) => add(p, boxGeo(w, h, d, density), m, x, y, z, 0, ry, 0);
    const cyl = (p, rt, rb, h, m, x, y, z, seg = 24) => add(p, new T.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
    const lathe = (p, pts, m, x = 0, y = 0, z = 0, seg = 28) => add(p, new T.LatheGeometry(pts.map(([r, h]) => new T.Vector2(r, h)), seg), m, x, y, z);
    function plane(p, w, h, m, x, y, z, rx = 0, ry = 0) { const mesh = add(p, new T.PlaneGeometry(w, h), m, x, y, z, rx, ry, 0); mesh.castShadow = false; return mesh; }
    function decal(p, w, h, texture, x, z, { y = 0.004, ry = 0, rough = 0.9, color = 0xffffff, opacity = 1 } = {}) {
        const m = new T.MeshStandardMaterial({ map: texture, transparent: true, opacity, roughness: rough, color, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
        const mesh = add(p, new T.PlaneGeometry(w, h), m, x, y, z, -Math.PI / 2, 0, 0);
        mesh.rotation.z = ry; mesh.castShadow = false;
        return mesh;
    }
    function limb(p, a, b, r, m) {
        const dir = new T.Vector3().subVectors(b, a), len = dir.length();
        const mesh = add(p, new T.CapsuleGeometry(r, Math.max(0.001, len), 6, 14), m);
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
        return mesh;
    }
    const group = (x = 0, y = 0, z = 0, ry = 0) => { const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; return g; };

    // ---------- human figure ----------
    const OUTFIT = {
        suit: { top: 'shirt', bottom: 'trousers', shoes: 'leatherBlack', hair: 'hairGrey', skin: 'skinPale', tie: true },
        outdoor: { top: 'jacket', bottom: 'jeans', shoes: 'sneaker', hair: 'hairDark', skin: 'skinPale', long: true }
    };
    function joints(pose) {
        const j = {
            pelvis: V(0, 0.98, 0), chest: V(0, 1.36, 0), neck: V(0, 1.52, 0), head: V(0, 1.65, 0.01),
            lHip: V(0.1, 0.95, 0), rHip: V(-0.1, 0.95, 0), lKnee: V(0.11, 0.52, 0.02), rKnee: V(-0.11, 0.52, 0.02),
            lAnkle: V(0.11, 0.09, 0), rAnkle: V(-0.11, 0.09, 0), lToe: V(0.12, 0.04, 0.16), rToe: V(-0.12, 0.04, 0.16),
            lSh: V(0.2, 1.44, 0), rSh: V(-0.2, 1.44, 0), lEl: V(0.25, 1.15, -0.02), rEl: V(-0.25, 1.15, -0.02), lWr: V(0.27, 0.9, 0.04), rWr: V(-0.27, 0.9, 0.04)
        };
        if (pose === 'aim') { j.rEl.set(-0.13, 1.4, 0.3); j.rWr.set(-0.04, 1.43, 0.58); j.lEl.set(0.08, 1.28, 0.26); j.lWr.set(-0.02, 1.4, 0.54); j.lAnkle.x = 0.16; j.lToe.x = 0.18; j.lKnee.x = 0.14; }
        if (pose === 'swing') { j.rEl.set(-0.3, 1.62, -0.05); j.rWr.set(-0.18, 1.86, 0.05); j.lEl.set(0.0, 1.58, 0.1); j.lWr.set(-0.12, 1.8, 0.12); }
        if (pose === 'reach') { j.chest.set(0, 1.3, 0.12); j.neck.set(0, 1.44, 0.2); j.head.set(0, 1.55, 0.26); j.lSh.set(0.2, 1.37, 0.12); j.rSh.set(-0.2, 1.37, 0.12); j.lEl.set(0.2, 1.2, 0.38); j.rEl.set(-0.2, 1.2, 0.38); j.lWr.set(0.1, 1.14, 0.62); j.rWr.set(-0.1, 1.14, 0.62); j.lKnee.z = 0.12; j.rKnee.z = 0.12; }
        if (pose === 'supine') { j.lEl.set(0.45, 1.3, 0); j.lWr.set(0.66, 1.14, 0.03); j.rEl.set(-0.42, 1.24, 0); j.rWr.set(-0.6, 1.02, 0.03); j.lKnee.set(0.16, 0.52, 0.12); j.lAnkle.set(0.2, 0.1, 0.04); j.lToe.set(0.28, 0.06, 0.18); j.rToe.set(-0.2, 0.06, 0.16); }
        return j;
    }
    function figure(pose = 'stand', outfit = 'suit', ghostColor) {
        const g = new T.Group(), j = joints(pose);
        let o = OUTFIT[outfit] || OUTFIT.suit;
        if (ghostColor !== undefined) {
            const gm = new T.MeshBasicMaterial({ color: ghostColor, transparent: true, opacity: 0.45, depthWrite: false });
            o = { top: gm, bottom: gm, shoes: gm, hair: gm, skin: gm };
        }
        const torso = limb(g, j.pelvis.clone().add(V(0, 0.05, 0)), j.chest, 0.15, o.top); torso.scale.set(1.2, 1, 0.72);
        if (pose === 'reach') torso.scale.set(1.2, 1, 0.8);
        const hips = limb(g, j.lHip, j.rHip, 0.125, o.bottom); hips.scale.set(1, 1, 0.75);
        limb(g, j.chest.clone().add(V(0, 0.08, 0)), j.neck, 0.05, o.skin);
        const head = add(g, new T.SphereGeometry(0.105, 24, 18), o.skin); head.position.copy(j.head); head.scale.set(0.9, 1.1, 1);
        const hair = add(g, new T.SphereGeometry(0.112, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), o.hair); hair.position.copy(j.head).add(V(0, 0.01, -0.012)); hair.scale.set(0.92, 1.1, 1.02); hair.rotation.x = -0.35;
        if (o.long) limb(g, j.head.clone().add(V(0, 0.0, -0.1)), j.head.clone().add(V(0, -0.22, -0.13)), 0.05, o.hair);
        if (o.tie) { const t = box(g, 0.05, 0.3, 0.01, o.tie === true ? 'tie' : o.tie, 0, 1.3, 0.1); t.castShadow = false; }
        [['l', 1], ['r', -1]].forEach(([s]) => {
            limb(g, j[s + 'Sh'], j[s + 'El'], 0.048, o.top);
            limb(g, j[s + 'El'], j[s + 'Wr'], 0.04, o.top);
            const d = new T.Vector3().subVectors(j[s + 'Wr'], j[s + 'El']).normalize().multiplyScalar(0.08);
            limb(g, j[s + 'Wr'], j[s + 'Wr'].clone().add(d), 0.034, o.skin);
            limb(g, j[s + 'Sh'].clone().lerp(j.chest, 0.4), j[s + 'Sh'], 0.06, o.top);
            limb(g, j[s + 'Hip'], j[s + 'Knee'], 0.075, o.bottom);
            limb(g, j[s + 'Knee'], j[s + 'Ankle'], 0.056, o.bottom);
            limb(g, j[s + 'Ankle'].clone().add(V(0, -0.03, -0.03)), j[s + 'Toe'], 0.045, o.shoes);
        });
        if (ghostColor !== undefined) g.traverse(m => { m.castShadow = false; });
        if (pose === 'supine') { const w = new T.Group(); g.rotation.x = -Math.PI / 2; g.position.y = 0.105; w.add(g); return w; }
        return g;
    }

    // ---------- forensic accessories ----------
    let scaleTex;
    function abfo(p, x, z, ry = 0) {
        scaleTex = scaleTex || (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 256, 32); g.fillStyle = '#111'; for (let i = 0; i <= 25; i++) g.fillRect(i * 10, 0, 1.5, i % 5 ? 10 : 18); g.font = '10px Arial'; g.fillText('cm', 228, 28); return TX.canvasTex(c); })();
        const g = group(x, 0, z, ry);
        decal(g, 0.15, 0.02, scaleTex, 0, 0, { y: 0.006, rough: 0.6 });
        decal(g, 0.15, 0.02, scaleTex, -0.065, 0.065, { y: 0.006, ry: Math.PI / 2, rough: 0.6 });
        p.add(g);
    }
    function tent(label, ai) {
        const g = new T.Group(), m = new T.MeshStandardMaterial({ map: TX.pic('tent', label, ai), roughness: 0.6 });
        const side = new T.MeshStandardMaterial({ color: ai ? 0x3d7eff : 0xf2c218, roughness: 0.6, side: T.DoubleSide });
        [-1, 1].forEach(s => { const face = add(g, new T.PlaneGeometry(0.11, 0.13), m, 0, 0.06, s * 0.03, -s * 0.45, s < 0 ? Math.PI : 0, 0); face.material.side = T.DoubleSide; });
        const shape = new T.Shape([new T.Vector2(-0.06, 0), new T.Vector2(0.06, 0), new T.Vector2(0, 0.12)]);
        [-0.055, 0.055].forEach(x => add(g, new T.ShapeGeometry(shape), side, x, 0, 0, 0, Math.PI / 2, 0).rotation.set(0, Math.PI / 2, 0));
        return g;
    }

    // ---------- evidence objects ----------
    const EV = {
        body: o => { const g = new T.Group(); g.add(figure(o.pose, o.outfit)); if (o.outfit === 'suit') decal(g, 0.9, 0.75, TX.pic('blood'), 0.05, -1.3, { y: 0.003, rough: 0.12, ry: 0.4 }); g.userData.hitSize = [1.0, 0.36, 1.95, 0, -0.9]; return g; },
        pistol: () => {
            const g = new T.Group(), p = group(0, 0.016, 0); p.rotation.x = Math.PI / 2; g.add(p);
            box(p, 0.18, 0.032, 0.028, 'blackMetal', 0.02, 0.06, 0);
            box(p, 0.15, 0.022, 0.026, 'plastic', 0.0, 0.034, 0);
            const grip = box(p, 0.032, 0.105, 0.029, 'plastic', -0.055, -0.01, 0); grip.rotation.z = 0.28;
            add(p, new T.TorusGeometry(0.018, 0.004, 6, 16, Math.PI), 'plastic', 0.0, 0.02, 0, 0, 0, Math.PI);
            add(p, new T.CylinderGeometry(0.007, 0.007, 0.01, 12), 'chrome', 0.112, 0.062, 0, 0, 0, Math.PI / 2);
            abfo(g, 0.12, 0.1);
            return g;
        },
        casing: () => { const g = new T.Group(); add(g, new T.CylinderGeometry(0.0048, 0.0048, 0.019, 12), 'brass2', 0, 0.005, 0, 0, 0.5, Math.PI / 2); abfo(g, 0.08, 0.06); const sw = box(g, 0.02, 0.02, 0.005, new T.MeshStandardMaterial({ color: 0x2a6bff, emissive: 0x1144aa, emissiveIntensity: 0.5 }), -0.27, 1.45, 0.02); sw.castShadow = false; return g; },
        wineGlasses: () => {
            const g = new T.Group(), glassPts = [[0, 0], [0.036, 0], [0.037, 0.004], [0.006, 0.01], [0.004, 0.09], [0.012, 0.098], [0.032, 0.112], [0.043, 0.14], [0.045, 0.172], [0.041, 0.205]];
            [[-0.07, 0.02], [0.08, -0.03]].forEach(([x, z], i) => {
                const gl = lathe(g, glassPts, 'glass', x, 0, z); gl.castShadow = false;
                lathe(g, [[0, 0.1], [0.014, 0.101], [0.031, 0.113], [0.038, 0.13 - i * 0.006], [0, 0.13 - i * 0.006]], 'wine', x, 0, z);
            });
            lathe(g, [[0, 0], [0.037, 0], [0.038, 0.2], [0.03, 0.235], [0.014, 0.26], [0.013, 0.31], [0.016, 0.32], [0, 0.32]], 'bottleGreen', 0.0, 0, -0.14);
            return g;
        },
        print: o => { const g = new T.Group(); decal(g, 0.11, 0.3, TX.pic('print', o.shoe, 'rgba(78,52,30,0.9)'), 0, 0, { ry: Math.PI / 2 }); abfo(g, 0.1, 0.12); return g; },
        printTrail: (o, ev) => {
            const g = new T.Group(), dx = o.to[0] - ev.pos[0], dz = o.to[1] - ev.pos[2], len = Math.hypot(dx, dz), n = Math.floor(len / 0.75), ang = Math.atan2(dx, dz);
            const tx = TX.pic('print', o.shoe, o.shoe === 'work' ? 'rgba(200,196,186,0.55)' : 'rgba(58,40,24,0.85)');
            for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n), side = i % 2 ? 0.1 : -0.1; decal(g, 0.11, 0.3, tx, dx * t + Math.cos(ang) * side, dz * t - Math.sin(ang) * side, { ry: ang + Math.PI, y: 0.004 + i * 0.0002 }); }
            abfo(g, 0.12, 0.15);
            g.userData.hitSize = [0.8, 0.3, 0.8];
            return g;
        },
        shards: o => {
            const g = new T.Group(), list = [];
            const isGlass = o.what === 'glass', cols = isGlass ? 5 : 3, rows = isGlass ? 5 : 5;
            const W = isGlass ? 0.8 : 0.075, H = isGlass ? 0.8 : 0.155;
            const m = isGlass ? new T.MeshStandardMaterial({ color: 0xcfe3ea, roughness: 0.05, transparent: true, opacity: 0.45, side: T.DoubleSide, envMapIntensity: 2 }) : std({ color: 0x0b0c0e, roughness: 0.15, metalness: 0.4 });
            TX.seed(isGlass ? 5 : 9);
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                const w = W / cols, h = H / rows;
                const shape = new T.Shape([new T.Vector2(TX.R(-0.1, 0.1) * w, TX.R(-0.1, 0.1) * h), new T.Vector2(w * TX.R(0.9, 1.1), 0), new T.Vector2(w, h * TX.R(0.9, 1.1)), new T.Vector2(TX.R(-0.05, 0.1) * w, h)]);
                const geo = new T.ExtrudeGeometry(shape, { depth: isGlass ? 0.01 : 0.004, bevelEnabled: false });
                geo.translate(-w / 2, -h / 2, 0);
                const s = add(g, geo, m);
                const a = TX.R(0, 6.28), d = TX.R(0.05, isGlass ? 0.7 : 0.22);
                s.position.set(Math.cos(a) * d, 0.006, Math.sin(a) * d);
                s.rotation.set(-Math.PI / 2, 0, TX.R(0, 6.28));
                s.userData.assembled = { pos: V(-W / 2 + (c + 0.5) * w, (isGlass ? 1.25 : 0.45) + (r + 0.5) * h - H / 2, isGlass ? -0.3 : 0), rot: new T.Euler(0, 0, 0) };
                list.push(s);
            }
            if (!isGlass) abfo(g, 0.18, 0.18);
            g.userData.shards = list;
            g.userData.hitSize = isGlass ? [1.6, 0.3, 1.6] : [0.6, 0.25, 0.6];
            return g;
        },
        panel: o => {
            const g = new T.Group(), alarm = o.variant === 'alarm';
            box(g, alarm ? 0.26 : 0.3, alarm ? 0.34 : 0.48, 0.03, alarm ? 'whiteLacquer' : 'steel', 0, 0, 0);
            const scr = alarm ? TX.pic('screen', ['ZONE 3  MAINT', '01:12:07 CODE #7', '01:31:40 ARMED'], { w: 256, h: 128, bg: '#0d1a10', fg: '#9cff9c' })
                : TX.pic('screen', ['PH 41  ACCESS LOG', '22:38 UP  GUEST', '23:04 DN  GUEST', '23:38 UP  SECURITY'], { w: 256, h: 160, bg: '#050a12', fg: '#8fd0ff' });
            plane(g, alarm ? 0.2 : 0.24, alarm ? 0.1 : 0.15, new T.MeshStandardMaterial({ map: scr, emissive: 0xffffff, emissiveMap: scr, emissiveIntensity: 0.7 }), 0, alarm ? 0.08 : 0.12, 0.017);
            for (let i = 0; i < (alarm ? 12 : 4); i++) { const b = cyl(g, 0.012, 0.012, 0.01, alarm ? 'plastic' : 'chrome', (i % 3 - 1) * 0.05, -0.04 - Math.floor(i / 3) * 0.04, 0.018, 16); b.rotation.x = Math.PI / 2; }
            g.userData.hitSize = [0.5, 0.6, 0.3];
            return g;
        },
        papers: () => { const g = new T.Group(); box(g, 0.21, 0.012, 0.297, 'paper', 0.02, 0.006, 0.01, 0.1); plane(g, 0.21, 0.297, new T.MeshStandardMaterial({ map: TX.pic('lines', 'PETITION FOR DISSOLUTION', ['OF MARRIAGE', 'Petitioner: Victor Hale', 'Respondent: Mara Hale', 'Date: 10 Sep 2026'], {}), roughness: 0.9 }), 0, 0.013, 0, -Math.PI / 2, 0); cyl(g, 0.004, 0.004, 0.14, 'blackMetal', 0.14, 0.006, 0.05).rotation.set(Math.PI / 2, 0, 0.4); return g; },
        oar: () => { const g = new T.Group(); const s = cyl(g, 0.018, 0.018, 1.7, 'greenPaint', 0, 0.02, 0); s.rotation.x = Math.PI / 2; const b = box(g, 0.16, 0.012, 0.5, 'greenPaint', 0, 0.02, 1.05); b.rotation.z = 0.15; decal(g, 0.1, 0.18, TX.pic('blood'), 0.0, 1.0, { y: 0.03, rough: 0.3, opacity: 0.8 }); g.userData.hitSize = [0.6, 0.3, 2.4]; return g; },
        rowboat: () => {
            const g = new T.Group(), L = 3.4, Wd = 1.25, D = 0.42, nu = 24, nv = 12, pos = [], idx = [];
            for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) {
                const u = i / nu, v = k / nv, z = (u - 0.5) * L, w = Wd / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.08 + 0.02)), 0.6) * (u < 0.1 ? u / 0.1 * 0.6 + 0.4 : 1), ang = Math.PI * v;
                pos.push(Math.cos(ang) * w, D - Math.sin(ang) * D * (0.55 + 0.45 * Math.sin(Math.PI * u)), z);
            }
            for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) { const a = i * (nv + 1) + k, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
            const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
            const hull = add(g, geo, std({ color: 0x2f5d43, roughness: 0.6, side: T.DoubleSide }));
            const inner = hull.clone(); inner.material = std({ color: 0xd9d4c4, roughness: 0.8, side: T.BackSide }); inner.scale.set(0.96, 0.98, 0.98); inner.position.y = 0.02; g.add(inner);
            [-0.6, 0.3].forEach(z => box(g, Wd * 0.85, 0.04, 0.22, 'oak', 0, D * 0.75, z));
            const oar = cyl(g, 0.016, 0.016, 2.0, 'greenPaint', 0.2, D * 0.85, 0); oar.rotation.x = Math.PI / 2; oar.rotation.z = 0.1;
            const t = new T.Mesh(new T.PlaneGeometry(0.6, 0.12), new T.MeshStandardMaterial({ map: TX.pic('sign', 'SL-2231', { bg: '#2f5d43', fg: '#f2f2f2', w: 256, h: 64 }) })); t.position.set(Wd / 2 + 0.002, D * 0.65, 0.9); t.rotation.y = Math.PI / 2; g.add(t);
            g.rotation.z = 0.08; g.position.y = 0.04;
            const w = new T.Group(); w.add(g); w.userData.hitSize = [1.6, 0.8, 3.6]; return w;
        },
        whiskey: () => { const g = new T.Group(); lathe(g, [[0, 0], [0.045, 0], [0.046, 0.18], [0.02, 0.22], [0.016, 0.27], [0, 0.27]], 'bourbon', 0, 0, 0); cyl(g, 0.018, 0.018, 0.03, 'blackMetal', 0, 0.285, 0);[[0.12, 0.05], [0.18, -0.06]].forEach(([x, z]) => { const t = lathe(g, [[0, 0], [0.036, 0], [0.04, 0.09], [0.038, 0.09]], 'glass', x, 0, z); t.castShadow = false; cyl(g, 0.033, 0.034, 0.025, 'bourbon', x, 0.015, z); }); g.userData.hitSize = [0.5, 0.4, 0.4]; return g; },
        doorcam: () => { const g = new T.Group(); box(g, 0.06, 0.13, 0.03, 'plastic', 0, 0, 0); const l = cyl(g, 0.016, 0.016, 0.012, 'chrome', 0, 0.03, 0.016); l.rotation.x = Math.PI / 2; const led = cyl(g, 0.004, 0.004, 0.004, new T.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 3 }), 0.018, -0.04, 0.016); led.rotation.x = Math.PI / 2; g.userData.hitSize = [0.4, 0.5, 0.3]; return g; },
        grille: () => { const g = new T.Group(), f = group(0, 0.03, 0); f.rotation.set(-Math.PI / 2 + 0.06, 0, 0.1); g.add(f); [[0.6, 0.04, 0, 0.28], [0.6, 0.04, 0, -0.28], [0.04, 0.6, 0.28, 0], [0.04, 0.6, -0.28, 0]].forEach(([w, h, x, y]) => box(f, w, h, 0.03, 'whitePaint', x, y, 0)); for (let i = -5; i <= 5; i++) { const s = box(f, 0.54, 0.012, 0.03, 'whitePaint', 0, i * 0.045, 0); s.rotation.x = 0.6; } for (let i = 0; i < 4; i++) cyl(g, 0.004, 0.004, 0.012, 'steel', 0.4 + i * 0.05, 0.003, 0.2 - i * 0.03, 8).rotation.z = Math.PI / 2; return g; },
        logbook: () => { const g = new T.Group(); const tx = TX.pic('lines', 'NIGHT ROUNDS LOG', ['00:00 Hall of Gems - OK  S.O.', '01:00 Hall of Gems - OK  S.O.', '01:10 East wing fault - check', '01:25 False alarm. Reset.', '02:00 Hall of Gems - CASE!!'], { w: 512, h: 360 }); [-1, 1].forEach(s => { const pg = plane(g, 0.21, 0.29, new T.MeshStandardMaterial({ map: tx, roughness: 0.9 }), s * 0.106, 0.014, 0, -Math.PI / 2, 0); pg.rotation.z = s * 0.03; }); box(g, 0.44, 0.012, 0.3, 'leatherBrown', 0, 0.006, 0); return g; },
        lectern: () => { const g = new T.Group(); cyl(g, 0.03, 0.03, 1.0, 'blackMetal', 0, 0.5, 0); cyl(g, 0.18, 0.2, 0.02, 'blackMetal', 0, 0.01, 0); const top = group(0, 1.03, 0); top.rotation.x = -0.45; g.add(top); box(top, 0.42, 0.02, 0.32, 'walnut', 0, 0, 0); plane(top, 0.21, 0.28, new T.MeshStandardMaterial({ map: TX.pic('lines', 'STAFF BADGE LOG', ['00:47 IN   RUIZ, E.', '01:58 OUT  RUIZ, E.', 'OFFICE CAM 01:05-01:20', '  ** FOOTAGE CORRUPT **'], {}), roughness: 0.9 }), 0, 0.012, 0, -Math.PI / 2, 0); g.userData.hitSize = [0.6, 1.3, 0.6]; return g; },
        holo: () => {
            const g = new T.Group(), c = 0x5aa9ff;
            const beam = add(g, new T.CylinderGeometry(0.22, 0.22, 1.6, 32, 1, true), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.12, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }), 0, 0.8, 0); beam.castShadow = false;
            const ring = add(g, new T.TorusGeometry(0.24, 0.008, 8, 48), new T.MeshBasicMaterial({ color: c }), 0, 0.02, 0, Math.PI / 2, 0, 0); ring.castShadow = false;
            const gem = add(g, new T.OctahedronGeometry(0.09), new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5, wireframe: true }), 0, 1.0, 0); gem.castShadow = false;
            g.userData.spin = gem;
            g.userData.hitSize = [0.6, 1.6, 0.6];
            return g;
        }
    };

    // ---------- furniture & decor ----------
    const F = {
        sofa: () => { const g = new T.Group(); box(g, 2.1, 0.42, 0.9, 'sofaFabric', 0, 0.21, 0); box(g, 2.1, 0.45, 0.2, 'sofaFabric', 0, 0.62, -0.35); [-1, 1].forEach(s => box(g, 0.18, 0.6, 0.9, 'sofaFabric', s * 0.96, 0.3, 0)); [-0.45, 0.45].forEach(x => box(g, 0.86, 0.14, 0.68, 'sofaFabric', x, 0.49, 0.06)); return g; },
        armchair: () => { const g = new T.Group(); box(g, 0.8, 0.4, 0.8, 'sofaFabric', 0, 0.2, 0); box(g, 0.8, 0.5, 0.15, 'sofaFabric', 0, 0.62, -0.33);[-1, 1].forEach(s => box(g, 0.12, 0.55, 0.8, 'sofaFabric', s * 0.34, 0.28, 0)); return g; },
        coffeeTable: () => { const g = new T.Group(); box(g, 1.2, 0.04, 0.6, 'marbleWhite', 0, 0.4, 0); [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]].forEach(([x, z]) => cyl(g, 0.015, 0.015, 0.38, 'brass', x, 0.19, z, 12)); box(g, 0.22, 0.05, 0.16, 'leatherBrown', 0.3, 0.445, 0.05, 0.3); box(g, 0.2, 0.03, 0.15, new T.MeshStandardMaterial({ color: 0x1c3c5a, roughness: 0.7 }), 0.3, 0.485, 0.05, 0.1); return g; },
        sideTable: () => { const g = new T.Group(); cyl(g, 0.25, 0.25, 0.03, 'marbleDark', 0, 0.55, 0, 32); cyl(g, 0.02, 0.02, 0.53, 'brass', 0, 0.27, 0); cyl(g, 0.18, 0.2, 0.02, 'brass', 0, 0.01, 0); return g; },
        desk: () => { const g = new T.Group(); box(g, 1.9, 0.05, 0.85, 'walnut', 0, 0.735, 0, 0, 1.5); [-1, 1].forEach(s => box(g, 0.45, 0.71, 0.8, 'walnut', s * 0.7, 0.355, 0)); box(g, 0.95, 0.4, 0.03, 'walnut', 0, 0.5, -0.38); const dr = box(g, 0.4, 0.14, 0.4, 'walnut', 0.62, 0.62, 0.32); dr.position.z = 0.55; box(g, 0.08, 0.015, 0.015, 'brass', 0.62, 0.64, 0.76); return g; },
        officeChair: () => { const g = new T.Group(); box(g, 0.52, 0.08, 0.5, 'leatherBlack', 0, 0.48, 0); box(g, 0.5, 0.62, 0.07, 'leatherBlack', 0, 0.86, -0.24); cyl(g, 0.025, 0.025, 0.36, 'chrome', 0, 0.28, 0); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, leg = box(g, 0.32, 0.03, 0.04, 'chrome', Math.cos(a) * 0.16, 0.08, Math.sin(a) * 0.16); leg.rotation.y = -a; add(g, new T.SphereGeometry(0.03, 10, 8), 'rubber', Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3); }[-1, 1].forEach(s => box(g, 0.05, 0.03, 0.3, 'leatherBlack', s * 0.28, 0.68, 0)); return g; },
        bookshelf: (w = 3, h = 2.6) => {
            const g = new T.Group(), d = 0.38;
            box(g, w, h, 0.03, 'walnut', 0, h / 2, -d / 2 + 0.015);
            [-1, 1].forEach(s => box(g, 0.04, h, d, 'walnut', s * (w / 2 - 0.02), h / 2, 0));
            const shelves = 6, gap = h / shelves, books = [];
            for (let i = 0; i <= shelves; i++) box(g, w, 0.035, d, 'walnut', 0, i * gap + 0.02, 0);
            TX.seed(17);
            const pal = [0x5a1a1a, 0x1b2a49, 0x23402c, 0x6b5a2a, 0xd8d0bf, 0x1a1a1a, 0x7a3b1d, 0x3d2d4a];
            for (let i = 0; i < shelves; i++) { let x = -w / 2 + 0.06; while (x < w / 2 - 0.1) { if (TX.rand() < 0.12) { x += TX.R(0.15, 0.35); continue; } const bw = TX.R(0.025, 0.06), bh = gap * TX.R(0.6, 0.85); books.push([x + bw / 2, i * gap + 0.04 + bh / 2, bw, bh, pal[Math.floor(TX.rand() * pal.length)], TX.rand() < 0.08 ? 0.15 : 0]); x += bw + 0.002; } }
            const inst = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ map: TX.pic('books'), roughness: 0.7 }), books.length);
            const m4 = new T.Matrix4(), q = new T.Quaternion(), col = new T.Color();
            books.forEach(([x, y, bw, bh, c, tilt], i) => { q.setFromEuler(new T.Euler(0, Math.PI / 2, tilt)); m4.compose(V(x, y, 0.02), q, V(d * 0.75, bh, bw)); inst.setMatrixAt(i, m4); inst.setColorAt(i, col.set(c)); });
            inst.castShadow = inst.receiveShadow = true; g.add(inst);
            return g;
        },
        barCart: () => { const g = new T.Group();[0.15, 0.7].forEach(y => box(g, 0.8, 0.02, 0.45, 'glass', 0, y, 0)); [[-0.38, -0.2], [0.38, -0.2], [-0.38, 0.2], [0.38, 0.2]].forEach(([x, z]) => cyl(g, 0.01, 0.01, 0.85, 'brass', x, 0.42, z, 8)); lathe(g, [[0, 0], [0.04, 0], [0.04, 0.2], [0.015, 0.26], [0.015, 0.3], [0, 0.3]], 'bottleGreen', -0.2, 0.71, 0); lathe(g, [[0, 0], [0.045, 0], [0.046, 0.18], [0.02, 0.22], [0.016, 0.27], [0, 0.27]], 'bourbon', 0, 0.71, 0.05); lathe(g, [[0, 0], [0.035, 0], [0.04, 0.24], [0.012, 0.28], [0.012, 0.32], [0, 0.32]], 'glass', 0.2, 0.71, -0.05); return g; },
        diningSet: () => { const g = new T.Group(); box(g, 1.9, 0.05, 0.95, 'walnut', 0, 0.75, 0, 0, 1.2); [-1, 1].forEach(s => box(g, 0.06, 0.72, 0.8, 'walnut', s * 0.75, 0.36, 0)); [[-0.45, -0.75, 0], [0.45, -0.75, 0], [-0.45, 0.75, Math.PI], [0.45, 0.75, Math.PI]].forEach(([x, z, r]) => { const c = group(x, 0, z, r); g.add(c); box(c, 0.46, 0.05, 0.46, 'oak', 0, 0.46, 0); box(c, 0.46, 0.5, 0.04, 'oak', 0, 0.72, -0.21); [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([lx, lz]) => box(c, 0.035, 0.45, 0.035, 'oak', lx, 0.22, lz)); }); return g; },
        kitchen: () => {
            const g = new T.Group();
            box(g, 3.4, 0.88, 0.62, 'whiteLacquer', -4.1, 0.44, 4.69); box(g, 3.44, 0.04, 0.66, 'marbleWhite', -4.1, 0.9, 4.67);
            box(g, 0.62, 0.88, 2.8, 'whiteLacquer', -5.69, 0.44, 2.9); box(g, 0.66, 0.04, 2.84, 'marbleWhite', -5.67, 0.9, 2.9);
            box(g, 3.4, 0.75, 0.38, 'whiteLacquer', -4.1, 2.1, 4.8); box(g, 0.38, 0.75, 2.8, 'whiteLacquer', -5.8, 2.1, 2.9);
            box(g, 0.5, 0.03, 0.35, 'steel', -4.4, 0.915, 4.67); const f = cyl(g, 0.012, 0.012, 0.3, 'chrome', -4.4, 1.07, 4.88); f.rotation.x = 0;
            box(g, 1.9, 0.9, 0.9, 'walnut', -4.2, 0.45, 2.7); box(g, 1.96, 0.05, 0.96, 'marbleWhite', -4.2, 0.925, 2.7);
            [-0.6, 0, 0.6].forEach(x => { cyl(g, 0.17, 0.17, 0.05, 'leatherBlack', -4.2 + x, 0.66, 2.05); cyl(g, 0.015, 0.015, 0.64, 'chrome', -4.2 + x, 0.32, 2.05, 8); cyl(g, 0.15, 0.15, 0.015, 'chrome', -4.2 + x, 0.008, 2.05); });
            return g;
        },
        painting: (kind, sd, w = 1.2, h = 0.9, frame = 'brass') => { const g = new T.Group(); plane(g, w, h, new T.MeshStandardMaterial({ map: TX.pic('painting', kind, sd), roughness: 0.75 }), 0, 0, 0.02); const t = 0.07;[[w + t * 2, t, 0, h / 2 + t / 2], [w + t * 2, t, 0, -h / 2 - t / 2], [t, h, w / 2 + t / 2, 0], [t, h, -w / 2 - t / 2, 0]].forEach(([fw, fh, x, y]) => box(g, fw, fh, 0.05, frame, x, y, 0.015)); return g; },
        door: (w = 1.0, h = 2.2, m = 'walnut') => { const g = new T.Group(); box(g, w, h, 0.05, m, 0, h / 2, 0); [[w + 0.16, 0.08, 0, h + 0.04], [0.08, h, -w / 2 - 0.04, h / 2], [0.08, h, w / 2 + 0.04, h / 2]].forEach(([fw, fh, x, y]) => box(g, fw, fh, 0.08, 'whitePaint', x, y, 0)); const hd = box(g, 0.14, 0.02, 0.02, 'chrome', w / 2 - 0.15, 1.0, 0.05); hd.castShadow = false; return g; },
        pendant: () => { const g = new T.Group(); cyl(g, 0.004, 0.004, 1.0, 'blackMetal', 0, 0.5, 0, 6); const sh = add(g, new T.CylinderGeometry(0.12, 0.25, 0.22, 32, 1, true), std({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4, side: T.DoubleSide }), 0, -0.1, 0); sh.castShadow = false; add(g, new T.SphereGeometry(0.06, 16, 12), 'bulb', 0, -0.16, 0).castShadow = false; return g; },
        displayCase: (inner) => { const g = new T.Group(); box(g, 0.7, 1.0, 0.7, 'whiteLacquer', 0, 0.5, 0); const gl = box(g, 0.66, 0.7, 0.66, 'glass', 0, 1.35, 0); gl.castShadow = false; box(g, 0.7, 0.02, 0.7, 'brass3', 0, 1.71, 0); if (inner) { inner.position.y += 1.0; g.add(inner); } return g; },
        stanchion: () => { const g = new T.Group(); cyl(g, 0.025, 0.025, 0.95, 'brass2', 0, 0.48, 0, 12); cyl(g, 0.15, 0.17, 0.03, 'brass2', 0, 0.015, 0); add(g, new T.SphereGeometry(0.04, 12, 10), 'brass2', 0, 0.97, 0); return g; },
        rope: (a, b) => { const mid = a.clone().lerp(b, 0.5); mid.y -= 0.22; const curve = new T.QuadraticBezierCurve3(a, mid, b); return new T.Mesh(new T.TubeGeometry(curve, 20, 0.018, 8), mat('velvetRed')); },
        bench: () => { const g = new T.Group(); box(g, 1.8, 0.1, 0.5, 'leatherBrown', 0, 0.45, 0);[-0.75, 0.75].forEach(x => box(g, 0.06, 0.42, 0.44, 'steel', x, 0.2, 0)); return g; },
        pine: () => {
            const parts = [], trunk = new T.CylinderGeometry(0.1, 0.16, 2.2, 7); trunk.translate(0, 1.1, 0); parts.push([trunk, 0x3b2a1e]);
            for (let i = 0; i < 5; i++) { const r = 1.5 - i * 0.26, c = new T.ConeGeometry(r, 1.6, 9, 2); c.translate(0, 1.6 + i * 0.95, 0); const p = c.attributes.position; for (let k = 0; k < p.count; k++) p.setX(k, p.getX(k) * (0.9 + Math.sin(k * 7.1) * 0.12)); parts.push([c, i % 2 ? 0x1f3a2b : 0x24432f]); }
            const geos = parts.map(([geo, col]) => { const g2 = geo.toNonIndexed(), n = g2.attributes.position.count, cs = new Float32Array(n * 3), cc = new T.Color(col); for (let k = 0; k < n; k++) cs.set([cc.r, cc.g, cc.b], k * 3); g2.setAttribute('color', new T.BufferAttribute(cs, 3)); g2.deleteAttribute('uv'); return g2; });
            const merged = T.BufferGeometryUtils.mergeGeometries(geos); merged.computeVertexNormals();
            return merged;
        },
        cabin: () => {
            const g = new T.Group(), W = 6, D = 5, H = 2.7, logs = TX.mat('logs', {}, { repeat: [1, 1], rough: 0.85, normal: 1.5 });
            box(g, W, H, 0.3, logs, 0, H / 2, -D / 2, 0, 0.5); box(g, W, H, 0.3, logs, 0, H / 2, D / 2, 0, 0.5);
            box(g, 0.3, H, D, logs, -W / 2, H / 2, 0, 0, 0.5); box(g, 0.3, H, D, logs, W / 2, H / 2, 0, 0, 0.5);
            const shingles = TX.mat('wood', { base: '#3d3a36', dark: '#151413', planks: 16, sd: 51 }, { rough: 0.9 });
            const rl = Math.hypot(D / 2 + 0.5, 1.7);
            [-1, 1].forEach(s => { const r = box(g, W + 0.8, 0.12, rl, shingles, 0, H + 0.85, s * (D / 4 + 0.12), 0, 0.6); r.rotation.x = s * Math.atan2(1.7, D / 2 + 0.5); });
            const tri = new T.Shape([new T.Vector2(-D / 2, 0), new T.Vector2(D / 2, 0), new T.Vector2(0, 1.7)]);
            [-1, 1].forEach(s => { const m = add(g, new T.ShapeGeometry(tri), logs, s * W / 2, H, 0, 0, Math.PI / 2, 0); m.material.side = T.DoubleSide; });
            const door = F.door(0.95, 2.05, 'walnut'); door.position.set(0.75, 0, -D / 2 - 0.16); door.rotation.y = Math.PI; g.add(door);
            const glow = new T.MeshStandardMaterial({ color: 0x2a2015, emissive: 0xffb15e, emissiveIntensity: 1.2 });
            [[-1.6, -D / 2 - 0.16, Math.PI], [1.9, D / 2 + 0.16, 0], [-W / 2 - 0.16, 0, -Math.PI / 2]].forEach(([x, z, r]) => { const w = group(x, 1.45, z, r); g.add(w); plane(w, 1.0, 0.8, glow, 0, 0, 0.01); [[1.1, 0.06, 0, 0.43], [1.1, 0.06, 0, -0.43], [0.06, 0.9, 0.53, 0], [0.06, 0.9, -0.53, 0], [0.04, 0.8, 0, 0]].forEach(([fw, fh, fx, fy]) => box(w, fw, fh, 0.06, 'whitePaint', fx, fy, 0.02)); });
            const deck = TX.mat('dock', {}, { rough: 0.85 });
            box(g, 4.2, 0.2, 1.4, deck, 0, 0.1, -D / 2 - 0.85, 0, 0.6);
            [[-2, -D / 2 - 1.5], [2, -D / 2 - 1.5]].forEach(([x, z]) => box(g, 0.14, 2.6, 0.14, 'oak', x, 1.3, z));
            box(g, 4.4, 0.1, 1.6, shingles, 0, 2.62, -D / 2 - 0.8, 0, 0.6).rotation.x = -0.15;
            box(g, 1.2, 0.1, 0.4, deck, 0.75, 0.05, -D / 2 - 1.75, 0, 0.6);
            box(g, 0.7, 1.6, 0.7, TX.mat('concrete', { base: '#77736c', sd: 53 }, { rough: 0.95 }), W / 2 - 0.9, H + 1.5, 0.8);
            const lamp = add(g, new T.SphereGeometry(0.06, 12, 10), 'bulb', 1.45, 2.2, -D / 2 - 0.2); lamp.castShadow = false;
            return g;
        },
        campChair: () => { const g = new T.Group(), fab = std({ color: 0x2c4a6e, roughness: 0.85, side: T.DoubleSide }); [[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.22], [0.25, 0.22]].forEach(([x, z]) => { const l = cyl(g, 0.012, 0.012, 0.6, 'steel', x, 0.28, z, 8); l.rotation.x = z > 0 ? -0.25 : 0.25; }); plane(g, 0.5, 0.45, fab, 0, 0.42, 0, -Math.PI / 2 + 0.1, 0); plane(g, 0.5, 0.5, fab, 0, 0.7, -0.25, -0.15, 0); return g; },
        securityCam: () => { const g = new T.Group(); box(g, 0.05, 0.05, 0.25, 'whiteLacquer', 0, 0, -0.1); box(g, 0.14, 0.12, 0.3, 'whiteLacquer', 0, -0.06, 0.1); const l = cyl(g, 0.04, 0.04, 0.03, 'plastic', 0, -0.06, 0.26); l.rotation.x = Math.PI / 2; add(g, new T.SphereGeometry(0.008, 8, 6), new T.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3 }), 0.05, -0.01, 0.25); return g; }
    };

    // ---------- glTF models (CC0 / CC-BY, see CREDITS.md) ----------
    const loader = new T.GLTFLoader(), modelCache = {};
    const stats = { total: 0, done: 0 };
    function model(name) {
        if (!modelCache[name]) {
            stats.total++;
            modelCache[name] = new Promise(res => loader.load(`assets/models/${name}.glb`, gl => { stats.done++; res(gl.scene); }, undefined, () => { stats.done++; res(null); }));
        }
        return modelCache[name].then(sc => {
            if (!sc) return null;
            const c = sc.clone(true);
            c.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
            return c;
        });
    }

    return { add, box, boxGeo, cyl, lathe, plane, decal, limb, group, mat, figure, tent, EV, F, model, stats, abfo };
})();
