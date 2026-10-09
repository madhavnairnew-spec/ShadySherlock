/* =========================================================================
   SCENES: each builder fills ctx.root and returns
   { walk(x, z), groundAt(x, z), tick(dt, t) }
   ========================================================================= */
const SCENES = (() => {
    const T = THREE, { box, cyl, plane, group, F, mat, decal } = P;

    function planeGeo(w, h, density) {
        const g = new T.PlaneGeometry(w, h), uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * density, uv.getY(i) * h * density);
        return g;
    }
    function floorMesh(root, w, d, m, x = 0, z = 0, density = 0.5) {
        const f = new T.Mesh(planeGeo(w, d, density), m); f.rotation.x = -Math.PI / 2; f.position.set(x, 0, z); f.receiveShadow = true; root.add(f); return f;
    }
    function envFrom(renderer, build) {
        const s = new T.Scene(); build(s);
        const pm = new T.PMREMGenerator(renderer), rt = pm.fromScene(s, 0.04); pm.dispose();
        return rt.texture;
    }
    const basic = (color, opts = {}) => new T.MeshBasicMaterial({ color, ...opts });
    function spot(root, color, intensity, pos, target, angle, penumbra, shadow, mobile) {
        const l = new T.SpotLight(color, intensity, 0, angle, penumbra, 2);
        l.position.set(...pos); l.target.position.set(...target);
        if (shadow) { l.castShadow = true; l.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); l.shadow.bias = -0.0004; l.shadow.normalBias = 0.02; }
        root.add(l, l.target); return l;
    }
    function point(root, color, intensity, pos) { const l = new T.PointLight(color, intensity, 0, 2); l.position.set(...pos); root.add(l); return l; }
    function placeModel(root, name, { pos, rot = 0, scale = 1, fallback }) {
        return P.model(name).then(m => {
            const o = m || (fallback ? fallback() : null);
            if (!o) return null;
            if (m) o.scale.setScalar(scale);
            o.position.set(...pos); o.rotation.y = rot; root.add(o); return o;
        });
    }
    // Collision helper: rect list [x0, z0, x1, z1], expanded by player radius
    function walker(bounds, rects, r = 0.22) {
        return (x, z) => x > bounds[0] && x < bounds[2] && z > bounds[1] && z < bounds[3] && !rects.some(([a, b, c, d]) => x > a - r && x < c + r && z > b - r && z < d + r);
    }

    // =====================================================================
    // PENTHOUSE — night, city skyline
    // =====================================================================
    async function penthouse(ctx) {
        const { root, scene, renderer, mobile } = ctx, H = 3.2;
        scene.background = new T.Color(0x03050b);
        scene.fog = null;
        const wall = TX.mat('plaster', { base: '#e9e5dd' }, { rough: 0.92, normal: 0.4 });
        const floor = TX.mat('wood', { base: '#a87b4f', dark: '#5a3a20', planks: 7, sd: 3 }, { rough: 0.38 });
        floorMesh(root, 12, 10, floor, 0, 0, 0.4);
        const ceil = new T.Mesh(new T.PlaneGeometry(12, 10), TX.mat('plaster', { base: '#f2f0ec', sd: 9 }, { rough: 0.95 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; root.add(ceil);
        for (let x = -4.5; x <= 4.5; x += 1.8) for (let z = -3.5; z <= 3.5; z += 2.3) { const d = new T.Mesh(new T.CircleGeometry(0.07, 20), mat('bulb')); d.rotation.x = Math.PI / 2; d.position.set(x, H - 0.005, z); root.add(d); }

        // Walls
        box(root, 12.4, H, 0.2, wall, 0, H / 2, 5.1, 0, 0.5);
        box(root, 0.2, H, 10.2, wall, -6.1, H / 2, 0, 0, 0.5);
        box(root, 0.2, H, 10.2, wall, 6.1, H / 2, 0, 0, 0.5);
        box(root, 0.15, H, 5, wall, 1.5, H / 2, -2.5, 0, 0.5);
        box(root, 0.15, H, 0.2, wall, 1.5, H / 2, 1.1, 0, 0.5);
        box(root, 0.15, 1.0, 1.0, wall, 1.5, 2.7, 0.5, 0, 0.5);
        box(root, 4.5, H, 0.15, wall, 3.75, H / 2, 1.2, 0, 0.5);
        [[0.08, 2.2, 0.08, 1.5, 1.1, 0.0], [0.08, 2.2, 0.08, 1.5, 1.1, 1.0], [0.08, 0.08, 1.08, 1.5, 2.2, 0.5]].forEach(([w, h, d, x, y, z]) => box(root, w + 0.12, h, d, 'whitePaint', x, y, z));
        box(root, 0.9, 2.15, 0.04, 'walnut', 1.98, 1.075, 0.96);
        [[12, 0.1, 0.03, 0, 0.05, 4.99], [0.03, 0.1, 10, -5.99, 0.05, 0], [0.03, 0.1, 10, 5.99, 0.05, 0]].forEach(([w, h, d, x, y, z]) => box(root, w, h, d, 'whitePaint', x, y, z));

        // Window wall + balcony + city
        box(root, 12.2, 0.12, 0.3, 'blackMetal', 0, 0.06, -5.05); box(root, 12.2, 0.25, 0.3, 'blackMetal', 0, H - 0.12, -5.05);
        for (let x = -6; x <= 6.01; x += 1.5) box(root, 0.07, H, 0.12, 'blackMetal', x, H / 2, -5.05);
        const glass = new T.Mesh(new T.PlaneGeometry(12, H), new T.MeshStandardMaterial({ color: 0x9fb4c8, roughness: 0.02, metalness: 0.9, transparent: true, opacity: 0.12, depthWrite: false })); glass.position.set(0, H / 2, -5.0); root.add(glass);
        box(root, 12.4, 0.2, 2.2, TX.mat('concrete', { base: '#5d5e60' }, { rough: 0.8 }), 0, -0.1, -6.2, 0, 0.5);
        const rail = new T.Mesh(new T.PlaneGeometry(12.2, 1.05), mat('glass')); rail.position.set(0, 0.52, -7.25); root.add(rail);
        box(root, 12.2, 0.05, 0.06, 'steel', 0, 1.06, -7.25);
        const city = new T.Mesh(new T.PlaneGeometry(320, 100), basic(0xffffff, { map: TX.pic('skyline'), fog: false })); city.position.set(0, -3, -110); root.add(city);
        [-1, 1].forEach(s => { const side = city.clone(); side.position.set(s * 160, -3, 30); side.rotation.y = -s * Math.PI / 2; root.add(side); });
        // Sheer curtains
        const curtain = new T.PlaneGeometry(1.4, H - 0.2, 28, 1), cp = curtain.attributes.position;
        for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 22) * 0.04);
        curtain.computeVertexNormals();
        const cm = new T.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 1, transparent: true, opacity: 0.55, side: T.DoubleSide });
        [-5.2, 0.6, 2.2, 5.3].forEach(x => { const c = new T.Mesh(curtain, cm); c.position.set(x, H / 2, -4.85); root.add(c); });

        // Living room
        const rug = new T.Mesh(new T.PlaneGeometry(3.6, 2.6), new T.MeshStandardMaterial({ map: TX.surface('rug', { field: '#b9b2a3', border: '#3b3f46', accent: '#7c6a4f', sd: 13 }).map, roughness: 1 }));
        rug.rotation.x = -Math.PI / 2; rug.position.set(-2.4, 0.004, -1.7); rug.receiveShadow = true; root.add(rug);
        const coffee = F.coffeeTable(); coffee.position.set(-2.4, 0, -1.7); root.add(coffee);
        const loads = [
            placeModel(root, 'GlamVelvetSofa', { pos: [-2.4, 0, -3.15], fallback: F.sofa }),
            placeModel(root, 'SheenChair', { pos: [-4.4, 0, -1.6], rot: Math.PI / 2, scale: 1.05, fallback: F.armchair }),
            placeModel(root, 'SheenChair', { pos: [-0.5, 0, -1.6], rot: -Math.PI / 2, scale: 1.05, fallback: F.armchair }),
            placeModel(root, 'LightsPunctualLamp', { pos: [-4.7, 0, -3.7], rot: Math.PI / 4 }),
            placeModel(root, 'DiffuseTransmissionPlant', { pos: [-5.4, 0, -4.35], scale: 1.4 }),
            placeModel(root, 'DiffuseTransmissionPlant', { pos: [0.9, 0, -4.4], rot: 2, scale: 1.2 }),
            placeModel(root, 'SheenChair', { pos: [2.45, 0, -4.15], rot: 0.5, scale: 1.05, fallback: F.armchair }),
            placeModel(root, 'IridescenceLamp', { pos: [4.65, 0.76, -3.45], scale: 1.0 }),
            placeModel(root, 'GlassVaseFlowers', { pos: [5.75, 0.85, 3.0], rot: 1, scale: 1.6 })
        ];
        const art1 = F.painting('abstract', 7, 1.6, 1.1, 'blackMetal'); art1.position.set(-5.98, 1.65, -1.8); art1.rotation.y = Math.PI / 2; root.add(art1);
        const art2 = F.painting('landscape', 11, 1.5, 1.0); art2.position.set(1.42, 1.65, -2.6); art2.rotation.y = -Math.PI / 2; root.add(art2);
        const bar = F.barCart(); bar.position.set(0.55, 0, -3.5); root.add(bar);
        const dining = F.diningSet(); dining.position.set(-1.2, 0, 2.4); root.add(dining);
        const pend = F.pendant(); pend.position.set(-1.2, 2.35, 2.4); root.add(pend);
        root.add(F.kitchen());
        // Foyer
        box(root, 0.4, 0.85, 1.5, 'walnut', 5.78, 0.425, 3.0);
        const mirror = new T.Mesh(new T.PlaneGeometry(1.2, 0.9), new T.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.04 })); mirror.position.set(5.99, 1.75, 3.0); mirror.rotation.y = -Math.PI / 2; root.add(mirror);
        const door = F.door(1.0, 2.25, 'walnut'); door.position.set(4.0, 0, 4.98); door.rotation.y = Math.PI; root.add(door);
        // Study
        const desk = F.desk(); desk.position.set(3.9, 0, -3.2); root.add(desk);
        const chair = F.officeChair(); chair.position.set(3.9, 0, -4.05); root.add(chair);
        const shelf = F.bookshelf(3.0, 2.6); shelf.position.set(5.76, 0, -3.0); shelf.rotation.y = -Math.PI / 2; root.add(shelf);
        const side = F.sideTable(); side.position.set(2.3, 0, -3.2); root.add(side);
        const lap = P.group(4.25, 0.76, -3.15, -0.15); root.add(lap);
        box(lap, 0.33, 0.015, 0.23, 'steel', 0, 0.008, 0);
        const scr = TX.pic('screen', ['KESSLER PROVENANCE', 'Lot 114  $2.1M  ??', 'Lot 117  $860K  ??', 'Lot 121  $3.4M  FORGED?'], { bg: '#f4f5f7', fg: '#24292f' });
        const lid = P.group(0, 0.01, -0.115); lap.add(lid); lid.rotation.x = -0.25;
        box(lid, 0.33, 0.22, 0.01, 'steel', 0, 0.11, 0);
        plane(lid, 0.3, 0.19, new T.MeshStandardMaterial({ map: scr, emissive: 0xffffff, emissiveMap: scr, emissiveIntensity: 0.5 }), 0, 0.11, 0.006);
        const srug = new T.Mesh(new T.PlaneGeometry(2.6, 1.9), new T.MeshStandardMaterial({ map: TX.surface('rug', { field: '#1d2a44', border: '#5a1a1d', accent: '#b8955a', sd: 21 }).map, roughness: 1 }));
        srug.rotation.x = -Math.PI / 2; srug.position.set(4.0, 0.004, -1.25); srug.receiveShadow = true; root.add(srug);
        const art3 = F.painting('portrait', 5, 0.9, 1.15); art3.position.set(3.8, 1.65, 1.12); art3.rotation.y = Math.PI; root.add(art3);

        // Lighting
        root.add(new T.HemisphereLight(0x9fb3d1, 0x3a2a1e, 0.35));
        const moon = new T.DirectionalLight(0x8fa8d8, 0.5); moon.position.set(0, 8, -20); root.add(moon);
        spot(root, 0xffd9b0, 70, [3.4, 3.15, -1.4], [3.5, 0, -1.2], 0.9, 0.7, true, mobile);
        spot(root, 0xffd9b0, 45, [-2.4, 3.15, -1.8], [-2.4, 0, -1.9], 0.95, 0.75, !mobile, mobile);
        point(root, 0xffcf9a, 6, [-1.2, 2.0, 2.4]);
        point(root, 0xfff0dd, 8, [-4.2, 2.9, 3.2]);
        if (!mobile) { point(root, 0xffe0c0, 6, [4.0, 2.9, 3.0]); point(root, 0xffd2a0, 3, [-4.4, 1.7, -3.4]); }
        point(root, 0xffd2a0, 1.5, [4.65, 1.15, -3.45]);
        scene.environment = envFrom(renderer, s => {
            const room = new T.Mesh(new T.BoxGeometry(12, 3.2, 10), basic(0x3a342e, { side: T.BackSide })); room.position.y = 1.6; s.add(room);
            const win = new T.Mesh(new T.PlaneGeometry(12, 3), basic(0xffffff, { map: TX.pic('skyline') })); win.position.set(0, 1.6, -4.9); s.add(win);
            for (let x = -4; x <= 4; x += 2) { const l = new T.Mesh(new T.PlaneGeometry(0.6, 0.6), basic(0xfff1dc)); l.rotation.x = Math.PI / 2; l.position.set(x, 3.15, 0); s.add(l); }
        });
        scene.environmentIntensity = 0.55;
        await Promise.all(loads);

        const rects = [
            [1.35, -5, 1.65, 0.0], [1.35, 0.9, 6, 1.35],
            [-3.6, -3.8, -1.2, -2.55], [-3.05, -2.05, -1.75, -1.35], [-4.85, -2.05, -3.95, -1.15], [-0.95, -2.05, -0.05, -1.15],
            [-5.0, -4.0, -4.3, -3.3], [-5.8, -4.8, -5.0, -3.9], [0.45, -4.85, 1.35, -3.95], [0.1, -3.8, 1.0, -3.2],
            [-2.25, 1.55, -0.15, 3.25], [-5.8, 4.35, -2.4, 5], [-6, 1.5, -5.35, 4.35], [-5.2, 1.85, -3.2, 3.2],
            [5.55, 2.2, 6, 3.8], [2.9, -3.65, 4.9, -2.75], [3.55, -4.45, 4.25, -3.7], [5.55, -4.5, 6, -1.5],
            [2.0, -4.6, 2.9, -3.65], [2.05, -3.45, 2.55, -2.95],
            [2.95, -0.85, 3.45, -0.35], [3.4, -1.3, 3.9, -0.8], [3.85, -1.75, 4.3, -1.25]
        ];
        return { walk: walker([-5.8, -4.75, 5.8, 4.8], rects), groundAt: () => 0, tick() { } };
    }

    // =====================================================================
    // LAKE — misty dawn
    // =====================================================================
    async function lake(ctx) {
        const { root, scene, renderer, mobile } = ctx, WATER = -0.06, clear = ctx.clear || [];
        const isClear = (x, z, r) => clear.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < r);
        const shoreZ = x => -1.2 + 0.9 * Math.sin(x * 0.09) + 0.4 * Math.sin(x * 0.23 + 1);
        const smooth = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
        const land = (x, z) => 0.12 + 0.1 * Math.sin(x * 0.31) * Math.cos(z * 0.27) + 0.08 * Math.sin(x * 0.07 + z * 0.05) + Math.max(0, z - 6) * 0.05;
        const h = (x, z) => { const d = z - shoreZ(x); return d < 0 ? Math.max(-1.6, d * 0.32) + 0.02 : 0.02 + (land(x, z) - 0.02) * smooth(0, 3, d); };
        const onDock = (x, z) => Math.abs(x) < 0.85 && z < -0.3 && z > -13.3;
        const groundAt = (x, z) => onDock(x, z) ? (z > -1.1 ? h(x, z) + (0.42 - h(x, z)) * smooth(-0.3, -1.1, z) : 0.42) : h(x, z);
        const paths = [[[-10, 3.0], [-6, 1.2], [-2, 0.2], [0, -0.3]], [[1, 0], [6, 1.6], [11, 2.4], [16, 3.6], [22, 5]], [[-3.5, 9.5], [-9, 11], [-20, 12]]];
        const segDist = (px, pz, [ax, az], [bx, bz]) => { const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz))); return Math.hypot(px - ax - vx * t, pz - az - vz * t); };
        const pathD = (x, z) => Math.min(...paths.map(p => Math.min(...p.slice(1).map((b, i) => segDist(x, z, p[i], b)))));

        // Sky, fog, distant hills
        const skyTex = TX.pic('sky', { sun: [0.45, 0.42] });
        const sky = new T.Mesh(new T.SphereGeometry(450, 48, 24), basic(0xffffff, { map: skyTex, side: T.BackSide, fog: false, depthWrite: false })); root.add(sky);
        scene.background = new T.Color(0xc9cfcf);
        scene.fog = new T.FogExp2(0xc4cbcc, mobile ? 0.02 : 0.016);
        const hills = new T.Mesh(new T.CylinderGeometry(190, 190, 60, 64, 1, true), basic(0xb8c2c4, { map: TX.pic('hills'), transparent: true, side: T.BackSide, fog: false, depthWrite: false }));
        hills.material.map.wrapS = T.RepeatWrapping; hills.material.map.repeat.x = 3; hills.position.y = 14; root.add(hills);

        // Terrain with vertex-colour zones
        const N = mobile ? 110 : 160, tg = new T.PlaneGeometry(140, 140, N, N); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, 20);
        const tp = tg.attributes.position, cols = new Float32Array(tp.count * 3), c = new T.Color();
        const GRASS = new T.Color(0x56683a), GRASS2 = new T.Color(0x6b7444), MUD = new T.Color(0x4a3a2a), WET = new T.Color(0x2e261d), PATH = new T.Color(0x7d6a52), GRAVEL = new T.Color(0x77736b);
        for (let i = 0; i < tp.count; i++) {
            const x = tp.getX(i), z = tp.getZ(i), y = h(x, z); tp.setY(i, y);
            const d = z - shoreZ(x), n = Math.sin(x * 0.7) * Math.cos(z * 0.5) * 0.5 + 0.5;
            c.copy(GRASS).lerp(GRASS2, n);
            if (d < 2.6) c.lerp(MUD, smooth(2.6, 0.8, d));
            if (d < 0.3) c.lerp(WET, smooth(0.3, -0.5, d));
            const pd = pathD(x, z); if (pd < 1.1) c.lerp(z > 8.5 && x < -2 ? GRAVEL : PATH, smooth(1.1, 0.5, pd) * 0.85);
            cols.set([c.r, c.g, c.b], i * 3);
        }
        tg.setAttribute('color', new T.BufferAttribute(cols, 3)); tg.computeVertexNormals();
        const gm = TX.mat('ground', {}, { repeat: [70, 70], rough: 0.95, normal: 1.2, vertexColors: true });
        const terrain = new T.Mesh(tg, gm); terrain.receiveShadow = true; root.add(terrain);

        // Water
        const wnorm = TX.canvasTex(TX.normalFrom(TX.noise(256, 8, 4, 77), 4), 60, 60, false);
        const water = new T.Mesh(new T.PlaneGeometry(500, 500), new T.MeshStandardMaterial({ color: 0x2a4148, roughness: 0.05, metalness: 0.25, normalMap: wnorm, transparent: true, opacity: 0.93 }));
        water.material.normalScale.set(0.35, 0.35); water.rotation.x = -Math.PI / 2; water.position.set(0, WATER, -200); water.receiveShadow = true; root.add(water);
        // Mist
        const mistTex = TX.canvasTex(TX.noise(256, 4, 4, 81), 4, 4, false);
        const mists = [0.35, 1.1].map((y, i) => { const m = new T.Mesh(new T.PlaneGeometry(260, 160), new T.MeshBasicMaterial({ color: 0xe8eceb, alphaMap: mistTex, transparent: true, opacity: 0.22 - i * 0.07, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(0, y, -70); root.add(m); return m; });

        // Dock
        const dockMat = TX.mat('dock', {}, { rough: 0.85, normal: 1.2 });
        box(root, 1.8, 0.1, 12.8, dockMat, 0, 0.37, -6.9, 0, 0.6);
        for (let z = -0.8; z > -13.4; z -= 2.1) [-0.85, 0.85].forEach(x => cyl(root, 0.09, 0.1, 2.2, 'oak', x, -0.6, z, 10));
        const bench = P.group(0.5, 0.42, -11.6); root.add(bench);
        box(bench, 0.42, 0.05, 1.6, dockMat, 0, 0.47, 0, 0, 1.2);
        [[-0.15, -0.7], [0.15, -0.7], [-0.15, 0.7], [0.15, 0.7]].forEach(([x, z]) => box(bench, 0.07, 0.45, 0.07, 'oak', x, 0.225, z));
        [-4, -9].forEach(z => box(root, 0.18, 0.06, 0.08, 'blackMetal', 0.78, 0.45, z));

        // Cabin, campfire, sign, launch ramp
        const cabin = F.cabin(); cabin.position.set(-10, h(-10, 7) - 0.05, 7); root.add(cabin);
        const fire = P.group(-4, h(-4, 2.5), 2.5); root.add(fire);
        for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, r = P.add(fire, new T.DodecahedronGeometry(0.13, 0), 'rock', Math.cos(a) * 0.55, 0.06, Math.sin(a) * 0.55); r.scale.set(1, 0.7, 1.2); r.rotation.y = a; }
        [0, 1.2, 2.3].forEach(a => { const l = cyl(fire, 0.05, 0.06, 0.6, 'charcoal', 0, 0.06, 0, 8); l.rotation.set(Math.PI / 2, 0, a); });
        decal(fire, 1.0, 1.0, TX.pic('blood'), 0, 0, { color: 0x6a6a6a, rough: 1, opacity: 0.8 });
        [[-4.9, 1.8, 0.9], [-3.0, 1.7, -0.8]].forEach(([x, z, r]) => { const ch = F.campChair(); ch.position.set(x, h(x, z), z); ch.rotation.y = r; root.add(ch); });
        const sign = P.group(15.8, h(15.8, 3.4), 3.4, -0.4); root.add(sign);
        cyl(sign, 0.05, 0.05, 1.6, 'oak', 0, 0.8, 0, 8);
        P.plane(sign, 0.9, 0.3, new T.MeshStandardMaterial({ map: TX.pic('sign', 'PRIVATE · VARGA') }), 0, 1.35, 0.06);
        const ramp = box(root, 3, 0.25, 6.5, TX.mat('concrete', { base: '#8c8a84', sd: 83 }, { rough: 0.9 }), 17.6, -0.2, -1.6, 0, 0.5); ramp.rotation.x = -0.13;

        // Vegetation (instanced)
        const pineGeo = F.pine(), pineMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
        const treeObs = [];
        const forest = (count, fn) => { const im = new T.InstancedMesh(pineGeo, pineMat, count), m4 = new T.Matrix4(), q = new T.Quaternion(); for (let i = 0; i < count; i++) { const [x, z, s] = fn(i); q.setFromAxisAngle(new T.Vector3(0, 1, 0), TX.rand() * 6.28); m4.compose(new T.Vector3(x, h(x, z) - 0.1, z), q, new T.Vector3(s, s * TX.R(0.9, 1.25), s)); im.setMatrixAt(i, m4); } im.castShadow = !mobile; im.receiveShadow = true; root.add(im); };
        TX.seed(101);
        const near = [];
        while (near.length < (mobile ? 70 : 110)) {
            const x = TX.R(-45, 45), z = TX.R(-1, 45);
            if (z - shoreZ(x) < 3 || pathD(x, z) < 2.5 || isClear(x, z, 4)) continue;
            if (x > -15 && x < 18.5 && z < 14) { if (TX.rand() > 0.12) continue; }
            if (x > -14.5 && x < -5.5 && z > 2.5 && z < 11.5) continue;
            if (x > -7 && x < 0 && z > 6 && z < 12.5) continue;
            near.push([x, z, TX.R(0.8, 1.4)]);
            if (x > -17 && x < 19 && z < 15) treeObs.push([x - 0.25, z - 0.25, x + 0.25, z + 0.25]);
        }
        forest(near.length, i => near[i]);
        forest(mobile ? 160 : 260, () => [TX.R(-110, 110), TX.R(-78, -58), TX.R(0.9, 1.6)]);
        const rocks = new T.InstancedMesh(new T.DodecahedronGeometry(0.4, 1), mat('rock'), 40), m4 = new T.Matrix4(), q = new T.Quaternion();
        for (let i = 0; i < 40; i++) { const x = TX.R(-30, 30), z = shoreZ(x) + TX.R(-0.6, 1.5); q.setFromEuler(new T.Euler(TX.rand(), TX.rand() * 6, 0)); const s = TX.R(0.3, 1.1); m4.compose(new T.Vector3(x, h(x, z), z), q, new T.Vector3(s, s * 0.6, s)); rocks.setMatrixAt(i, m4); }
        rocks.castShadow = rocks.receiveShadow = true; root.add(rocks);
        const bladeTex = TX.pic('grassBlade');
        const tuft = new T.PlaneGeometry(0.6, 0.6); tuft.translate(0, 0.3, 0); const tuft2 = tuft.clone().rotateY(Math.PI / 2);
        const tuftGeo = T.BufferGeometryUtils.mergeGeometries([tuft, tuft2]);
        const grassField = (count, fn, scale) => { const im = new T.InstancedMesh(tuftGeo, new T.MeshStandardMaterial({ map: bladeTex, alphaTest: 0.4, side: T.DoubleSide, roughness: 0.9 }), count); for (let i = 0; i < count; i++) { const [x, z] = fn(); q.setFromAxisAngle(new T.Vector3(0, 1, 0), TX.rand() * 6.28); const s = scale * TX.R(0.6, 1.4); m4.compose(new T.Vector3(x, h(x, z) - 0.02, z), q, new T.Vector3(s, s, s)); im.setMatrixAt(i, m4); } root.add(im); };
        grassField(mobile ? 220 : 420, () => { let x, z; do { x = TX.R(-24, 24); z = shoreZ(x) + TX.R(-0.5, 0.4); } while (isClear(x, z, 1.8) || Math.abs(x) < 1.2); return [x, z]; }, 1.25);
        grassField(mobile ? 400 : 900, () => { let x, z; do { x = TX.R(-25, 25); z = TX.R(-1, 20); } while (z - shoreZ(x) < 1.5 || pathD(x, z) < 1.2 || isClear(x, z, 1.4)); return [x, z]; }, 0.6);

        // Props from models
        const loads = [P.model('Lantern').then(m => { if (!m) return; m.scale.setScalar(0.065); m.position.set(-0.7, 0.42, -12.9); m.rotation.y = Math.PI / 2; root.add(m); })];

        // Lighting
        root.add(new T.HemisphereLight(0xcfe0ee, 0x45553a, 1.0));
        const sun = new T.DirectionalLight(0xffe2b8, 2.6); sun.position.set(30, 8, 12); sun.target.position.set(2, 0, 0);
        sun.castShadow = true; Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 });
        sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
        root.add(sun, sun.target);
        point(root, 0xffb36b, 3, [-8.55, 2.4, 4.0]);
        point(root, 0xffc27a, 1.2, [-0.7, 1.6, -12.9]);
        scene.environment = envFrom(renderer, s => {
            s.add(new T.Mesh(new T.SphereGeometry(100, 32, 16), basic(0xffffff, { map: skyTex, side: T.BackSide })));
            const g = new T.Mesh(new T.CircleGeometry(100, 32), basic(0x3a4a3a)); g.rotation.x = -Math.PI / 2; g.position.y = -1; s.add(g);
        });
        scene.environmentIntensity = 0.9;
        await Promise.all(loads);

        const rects = [[-13.3, 4.2, -6.7, 9.8], [-12.2, 2.9, -7.8, 4.3], [-4.7, 1.9, -3.3, 3.1], [-5.3, 1.4, -4.5, 2.2], [-3.4, 1.3, -2.6, 2.1], [15.6, 3.2, 16.0, 3.6], [-5.6, 7.6, -1.4, 10.8], [1.9, -0.7, 3.6, 0.05], [-0.8, -13.0, -0.6, -12.7], ...treeObs];
        const inBounds = walker([-17, -14, 19, 15], rects);
        return {
            groundAt, water: WATER,
            walk: (x, z) => inBounds(x, z) && (onDock(x, z) || h(x, z) > WATER + 0.04),
            tick(dt) { wnorm.offset.x += dt * 0.004; wnorm.offset.y += dt * 0.006; mists[0].position.x = Math.sin(performance.now() * 0.00003) * 8; mistTex.offset.x += dt * 0.002; }
        };
    }

    // =====================================================================
    // MUSEUM — hall at night
    // =====================================================================
    async function museum(ctx) {
        const { root, scene, renderer, mobile } = ctx, H = 5.5, W = 16, D = 14;
        scene.background = new T.Color(0x05070a);
        scene.fog = null;
        floorMesh(root, W, D, TX.mat('marble', { tiles: 2, base: '#e2ded6', vein: '#8a8d94', sd: 7 }, { rough: 0.15 }), 0, 0, 0.5);
        const green = TX.mat('plaster', { base: '#2c463e', sd: 11 }, { rough: 0.9, normal: 0.5 });
        [[W + 0.4, 0, -D / 2 - 0.1, 0], [W + 0.4, 0, D / 2 + 0.1, 0], [D + 0.4, -W / 2 - 0.1, 0, Math.PI / 2], [D + 0.4, W / 2 + 0.1, 0, Math.PI / 2]].forEach(([len, x, z, r]) => {
            box(root, len, H, 0.2, green, x, H / 2, z, r, 0.4);
            const wain = box(root, len - 0.4, 1.15, 0.06, 'walnut', x - Math.sign(x) * 0.12, 0.575, z - Math.sign(z) * 0.12, r, 1.2);
            box(root, len - 0.4, 0.06, 0.1, 'walnut', x - Math.sign(x) * 0.14, 1.18, z - Math.sign(z) * 0.14, r);
            box(root, len - 0.4, 0.18, 0.14, 'whitePaint', x - Math.sign(x) * 0.13, H - 0.09, z - Math.sign(z) * 0.13, r);
        });
        const ceil = new T.Mesh(new T.PlaneGeometry(W, D), TX.mat('plaster', { base: '#22272b', sd: 13 }, { rough: 0.95 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; root.add(ceil);
        const sky = new T.Mesh(new T.PlaneGeometry(6, 4), new T.MeshStandardMaterial({ color: 0x0c1220, emissive: 0x4a6590, emissiveIntensity: 0.55 })); sky.rotation.x = Math.PI / 2; sky.position.set(0, H - 0.02, -0.5); root.add(sky);
        [[6.2, 0.15, 0, -2.5], [6.2, 0.15, 0, 1.5], [0.15, 4.2, -3.05, -0.5], [0.15, 4.2, 3.05, -0.5], [0.08, 4, 0, -0.5], [6, 0.08, 0, -0.5]].forEach(([w, d, x, z]) => box(root, w, 0.25, d, 'blackMetal', x, H - 0.12, z));
        // Vent opening
        const vent = new T.Mesh(new T.PlaneGeometry(0.62, 0.62), basic(0x050505)); vent.rotation.x = Math.PI / 2; vent.position.set(-5.0, H - 0.01, -5.4); root.add(vent);
        [[0.7, 0.05, 0, 0.33], [0.7, 0.05, 0, -0.33], [0.05, 0.7, 0.33, 0], [0.05, 0.7, -0.33, 0]].forEach(([w, d, x, z]) => box(root, w, 0.04, d, 'whitePaint', -5.0 + x, H - 0.02, -5.4 + z));

        // Columns
        [[-2.8, -4.4], [2.8, -4.4], [-2.8, 4.4], [2.8, 4.4]].forEach(([x, z]) => { cyl(root, 0.32, 0.34, H, mat('bustMarble'), x, H / 2, z, 32); box(root, 0.9, 0.25, 0.9, 'bustMarble', x, 0.125, z); box(root, 0.85, 0.3, 0.85, 'bustMarble', x, H - 0.35, z); });

        // Paintings with picture lights and plaques
        const art = (kind, sd, w, h, x, y, z, r, title) => {
            const p = F.painting(kind, sd, w, h); p.position.set(x, y, z); p.rotation.y = r; root.add(p);
            const lightBar = P.group(0, h / 2 + 0.16, 0.12); p.add(lightBar); box(lightBar, w * 0.5, 0.04, 0.08, 'brass2', 0, 0, 0);
            const glow = new T.Mesh(new T.PlaneGeometry(w * 0.48, 0.03), mat('bulb')); glow.rotation.x = Math.PI / 2; glow.position.y = -0.021; lightBar.add(glow);
            const canvasMesh = p.children[0]; canvasMesh.material.emissive.set(0xffe2c0); canvasMesh.material.emissiveMap = canvasMesh.material.map; canvasMesh.material.emissiveIntensity = 0.22;
            P.plane(p, 0.36, 0.12, new T.MeshStandardMaterial({ map: TX.pic('sign', title, { bg: '#e9e3d6', fg: '#2a2620', w: 384, h: 128 }) }), w / 2 + 0.35, -h / 2 + 0.1, 0.01);
        };
        art('landscape', 23, 1.7, 1.15, -7.88, 2.3, -2.2, Math.PI / 2, 'Valley at Dusk, 1874');
        art('portrait', 29, 1.0, 1.3, -7.88, 2.3, 2.4, Math.PI / 2, 'Lady Ashford, 1791');
        art('sea', 31, 1.7, 1.15, 7.88, 2.3, -2.2, -Math.PI / 2, 'Squall off Dover, 1866');
        art('abstract', 37, 1.2, 1.5, 7.88, 2.3, 2.4, -Math.PI / 2, 'Composition No. 7');
        art('landscape', 41, 2.6, 1.6, 0, 2.6, -6.88, 0, 'The Meridian Coast, 1902');
        art('portrait', 43, 0.9, 1.2, -4.6, 2.3, 6.88, Math.PI, 'Sir T. Ashford, 1820');
        art('abstract', 47, 1.0, 1.0, 4.6, 2.3, 6.88, Math.PI, 'Untitled (Blue), 1961');

        // Display cases with exhibits
        const loads = [];
        const exhibit = (x, z, r, inner, label) => {
            const c = F.displayCase(inner); c.position.set(x, 0, z); c.rotation.y = r; root.add(c);
            P.plane(c, 0.3, 0.1, new T.MeshStandardMaterial({ map: TX.pic('sign', label, { bg: '#1b1b1b', fg: '#d9c9a0', w: 384, h: 128 }) }), 0, 0.85, 0.352);
            return c;
        };
        const corsetStand = new T.Group(); cyl(corsetStand, 0.015, 0.015, 0.25, 'blackMetal', 0, 0.12, 0, 8);
        exhibit(-6.3, -5.6, Math.PI / 4, corsetStand, 'Corset, c. 1890');
        loads.push(P.model('Corset').then(m => { if (!m) return; m.scale.setScalar(9); m.position.set(-6.3, 1.18, -5.6); m.rotation.y = Math.PI / 4; root.add(m); }));
        exhibit(6.3, -5.6, -Math.PI / 4, null, 'Amber, 40 Myr');
        loads.push(P.model('MosquitoInAmber').then(m => { if (!m) return; m.scale.setScalar(3); m.position.set(6.3, 1.25, -5.6); root.add(m); }));
        const amph = new T.Group(); P.lathe(amph, [[0, 0], [0.05, 0], [0.06, 0.03], [0.12, 0.14], [0.14, 0.24], [0.11, 0.36], [0.05, 0.42], [0.045, 0.5], [0.06, 0.52], [0, 0.52]], 'terracotta');
        exhibit(-6.3, 1.4, Math.PI / 2, amph, 'Amphora, 500 BC');
        const bust = new T.Group(); box(bust, 0.24, 0.08, 0.24, 'bustMarble', 0, 0.04, 0); const b1 = P.add(bust, new T.SphereGeometry(0.15, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), 'bustMarble', 0, 0.08, 0); b1.scale.set(1.3, 0.8, 0.8); cyl(bust, 0.05, 0.06, 0.1, 'bustMarble', 0, 0.22, 0); const hd = P.add(bust, new T.SphereGeometry(0.1, 24, 18), 'bustMarble', 0, 0.36, 0); hd.scale.set(0.85, 1.1, 1);
        exhibit(6.3, 1.4, -Math.PI / 2, bust, 'Bust of Ashford');

        // Central pedestal with broken case
        box(root, 0.8, 1.05, 0.8, 'bustMarble', 0, 0.525, -0.3);
        box(root, 0.5, 0.06, 0.5, 'velvetBlue', 0, 1.08, -0.3);
        P.decal(root, 0.12, 0.12, TX.canvasTex((() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.strokeStyle = 'rgba(200,200,190,0.7)'; g.lineWidth = 6; g.strokeRect(8, 8, 48, 48); return c; })()), 0, -0.3, { y: 1.112 });
        const e = 0.42, frameY = 1.05;
        [[-e, -e], [e, -e], [-e, e], [e, e]].forEach(([x, z]) => box(root, 0.025, 0.75, 0.025, 'brass3', x, frameY + 0.375, -0.3 + z));
        [[0.86, 0.025, 0, -e], [0.86, 0.025, 0, e], [0.025, 0.86, -e, 0], [0.025, 0.86, e, 0]].forEach(([w, d, x, z]) => box(root, w, 0.025, d, 'brass3', x, frameY + 0.75, -0.3 + z));
        const pane = box(root, 0.82, 0.72, 0.01, 'glass', 0, frameY + 0.37, -0.3 - e); pane.castShadow = false;
        // Stanchions
        const posts = [[-1.5, -1.8], [1.5, -1.8], [1.5, 1.2], [-1.5, 1.2]];
        posts.forEach(([x, z]) => { const s = F.stanchion(); s.position.set(x, 0, z); root.add(s); });
        posts.forEach((p, i) => { const n = posts[(i + 1) % 4]; root.add(F.rope(new T.Vector3(p[0], 0.92, p[1]), new T.Vector3(n[0], 0.92, n[1]))); });
        const bench = F.bench(); bench.position.set(0, 0, 3.4); root.add(bench);
        // Guard desk
        box(root, 0.7, 0.76, 1.6, 'walnut', 5.6, 0.38, 5.4, 0, 1.2);
        const mon = P.group(5.85, 0.76, 5.0, -Math.PI / 2); root.add(mon);
        box(mon, 0.5, 0.32, 0.03, 'plastic', 0, 0.3, 0); cyl(mon, 0.02, 0.02, 0.14, 'plastic', 0, 0.07, -0.03, 8);
        const cctv = TX.pic('screen', [], { grid: true, w: 512, h: 320 });
        P.plane(mon, 0.46, 0.28, new T.MeshStandardMaterial({ map: cctv, emissive: 0xffffff, emissiveMap: cctv, emissiveIntensity: 0.8 }), 0, 0.3, 0.017);
        const gchair = F.officeChair(); gchair.position.set(6.45, 0, 5.4); gchair.rotation.y = -Math.PI / 2; root.add(gchair);
        loads.push(P.model('IridescenceLamp').then(m => { if (!m) return; m.position.set(5.75, 0.76, 6.0); root.add(m); }));
        const cam = F.securityCam(); cam.position.set(7.4, 4.6, 6.4); cam.lookAt(0.5, 0, -0.5); root.add(cam);
        const exit = P.plane(root, 0.6, 0.2, new T.MeshStandardMaterial({ map: TX.pic('sign', 'EXIT', { bg: '#0f7a3b', fg: '#ffffff', w: 384, h: 128 }), emissive: 0xffffff, emissiveIntensity: 0.6, emissiveMap: TX.pic('sign', 'EXIT', { bg: '#0f7a3b', fg: '#ffffff', w: 384, h: 128 }) }), 0, 3.1, 6.88, 0, Math.PI);
        [-0.56, 0.56].forEach(x => { const d = F.door(1.1, 2.6, 'walnut'); d.position.set(x, 0, 6.97); d.rotation.y = Math.PI; root.add(d); });

        // Lighting
        root.add(new T.HemisphereLight(0x8fa3c8, 0x2a2420, 0.3));
        const moon = new T.DirectionalLight(0xa9bcff, 1.1); moon.position.set(1.5, 14, 1); moon.target.position.set(0, 0, -0.5);
        moon.castShadow = true; Object.assign(moon.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 }); moon.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); moon.shadow.bias = -0.0005;
        root.add(moon, moon.target);
        spot(root, 0xffe2b8, 55, [0, 5.3, 1.6], [0, 1.0, -0.3], 0.36, 0.5, !mobile, mobile);
        point(root, 0xffd9a0, 4, [-6.0, 2.6, -5.2]); point(root, 0xffd9a0, 4, [6.0, 2.6, -5.2]);
        if (!mobile) { point(root, 0xffd9a0, 3, [-6.0, 2.6, 1.4]); point(root, 0xffd9a0, 3, [6.0, 2.6, 1.4]); point(root, 0x40ff90, 0.6, [0, 3, 6.5]); }
        point(root, 0xffd0a0, 1.5, [5.75, 1.3, 6.0]);
        scene.environment = envFrom(renderer, s => {
            const room = new T.Mesh(new T.BoxGeometry(16, 5.5, 14), basic(0x1d2a27, { side: T.BackSide })); room.position.y = 2.75; s.add(room);
            const sl = new T.Mesh(new T.PlaneGeometry(6, 4), basic(0x6a86b8)); sl.rotation.x = Math.PI / 2; sl.position.y = 5.4; s.add(sl);
            [[-7.9, 1], [7.9, -1]].forEach(([x, r]) => { const w = new T.Mesh(new T.PlaneGeometry(6, 1.2), basic(0x8a6a3a)); w.position.set(x, 2.3, 0); w.rotation.y = r * Math.PI / 2; s.add(w); });
        });
        scene.environmentIntensity = 0.6;
        await Promise.all(loads);

        const rects = [
            ...[[-2.8, -4.4], [2.8, -4.4], [-2.8, 4.4], [2.8, 4.4]].map(([x, z]) => [x - 0.45, z - 0.45, x + 0.45, z + 0.45]),
            ...[[-6.3, -5.6], [6.3, -5.6], [-6.3, 1.4], [6.3, 1.4]].map(([x, z]) => [x - 0.5, z - 0.5, x + 0.5, z + 0.5]),
            [-1.55, -1.85, 1.55, -1.75], [-1.55, 1.15, 1.55, 1.25], [-1.55, -1.85, -1.45, 1.25], [1.45, -1.85, 1.55, 1.25],
            [-0.9, 3.15, 0.9, 3.65], [5.25, 4.6, 6.85, 6.2], [4.1, -3.7, 4.7, -3.1]
        ];
        return { walk: walker([-7.7, -6.7, 7.7, 6.7], rects), groundAt: () => 0, tick() { } };
    }

    return { penthouse, lake, museum };
})();
