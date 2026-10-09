/* =========================================================================
   PERFORMANCE: quality presets, settings, static mesh merging, cheap
   materials for models, dynamic resolution and an FPS meter.
   ========================================================================= */
const Perf = (() => {
    const T = THREE;
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const PRESETS = {
        high: { dprCap: 1.75, dprMin: 0.85, shadows: true, shadowSize: 2048, physical: true, detail: 'high' },
        medium: { dprCap: 1.35, dprMin: 0.7, shadows: true, shadowSize: 1024, physical: false, detail: 'medium' },
        low: { dprCap: 1.0, dprMin: 0.55, shadows: false, shadowSize: 512, physical: false, detail: 'low' }
    };
    const DEFAULTS = { quality: 'auto', showFps: false, music: 0.55, sfx: 0.8, sens: 1, invertY: false, mouseLock: false, motion: true, snapTurn: 30 };
    let settings = { ...DEFAULTS };
    try { Object.assign(settings, JSON.parse(localStorage.getItem('ss-settings') || '{}')); } catch (e) { }
    const save = () => { try { localStorage.setItem('ss-settings', JSON.stringify(settings)); } catch (e) { } };
    const listeners = [];
    function set(k, v) { settings[k] = v; save(); listeners.forEach(fn => fn(k, v)); }
    function onChange(fn) { listeners.push(fn); }
    function preset() {
        const q = settings.quality === 'auto' ? (isTouch ? 'medium' : 'high') : settings.quality;
        return { name: q, ...PRESETS[q] };
    }

    // ---------- model preparation: strip lights, remove transmission, simplify materials ----------
    const converted = new WeakMap();
    function cheapMaterial(m) {
        if (converted.has(m)) return converted.get(m);
        let out = m;
        if (m.isMeshPhysicalMaterial) {
            const glassy = m.transmission > 0;
            if (!preset().physical || glassy) {
                out = new T.MeshStandardMaterial();
                ['name', 'color', 'map', 'normalMap', 'normalScale', 'roughness', 'roughnessMap', 'metalness', 'metalnessMap', 'emissive', 'emissiveMap', 'emissiveIntensity',
                    'aoMap', 'aoMapIntensity', 'alphaMap', 'alphaTest', 'transparent', 'opacity', 'side', 'vertexColors', 'envMapIntensity', 'depthWrite', 'flatShading'].forEach(k => {
                        if (m[k] === undefined) return;
                        if (m[k] && m[k].isColor || m[k] && m[k].isVector2) out[k].copy(m[k]); else out[k] = m[k];
                    });
                if (glassy) { out.transparent = true; out.opacity = Math.min(out.opacity, 0.3); out.depthWrite = false; out.roughness = Math.min(out.roughness, 0.08); out.metalness = 0.1; out.envMapIntensity = 1.6; }
            }
        }
        converted.set(m, out);
        return out;
    }
    function prepareModel(root) {
        const lights = [];
        root.traverse(o => {
            if (o.isLight) lights.push(o);
            if (o.isMesh) {
                o.material = Array.isArray(o.material) ? o.material.map(cheapMaterial) : cheapMaterial(o.material);
                o.userData.model = true;
            }
        });
        lights.forEach(l => l.parent && l.parent.remove(l));
        return root;
    }

    // ---------- merge static meshes sharing a material into one draw call ----------
    function mergeStatic(root) {
        root.updateMatrixWorld(true);
        const groups = new Map(), inv = new T.Matrix4().copy(root.matrixWorld).invert(), m4 = new T.Matrix4();
        root.traverse(o => {
            if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.noMerge || o.userData.model || Array.isArray(o.material) || o.material.transparent || o.morphTargetInfluences) return;
            if (o.matrixWorld.determinant() < 0) return;
            const g = o.geometry, attrs = Object.keys(g.attributes).sort().join(',');
            const key = `${o.material.uuid}|${attrs}|${g.index ? 'i' : 'n'}|${o.castShadow}|${o.receiveShadow}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(o);
        });
        let before = 0, after = 0;
        groups.forEach(list => {
            before += list.length;
            if (list.length < 2) { after += list.length; return; }
            const geos = list.map(o => { const g = o.geometry.clone(); g.applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld)); g.morphAttributes = {}; return g; });
            const merged = T.BufferGeometryUtils.mergeGeometries(geos, false);
            geos.forEach(g => g.dispose());
            if (!merged) { after += list.length; return; }
            const mesh = new T.Mesh(merged, list[0].material);
            mesh.castShadow = list[0].castShadow; mesh.receiveShadow = list[0].receiveShadow;
            list.forEach(o => o.parent && o.parent.remove(o));
            root.add(mesh); after++;
        });
        return { before, after };
    }

    // ---------- dynamic resolution + FPS meter ----------
    let renderer, dpr = 1, ema = 16.7, acc = 0, frames = 0, fpsEl, fpsShown = 0, locked = false;
    function attach(r) { renderer = r; dpr = Math.min(devicePixelRatio, preset().dprCap); renderer.setPixelRatio(dpr); fpsEl = document.getElementById('fps'); applyFps(); }
    function applyFps() { if (fpsEl) fpsEl.classList.toggle('hidden', !settings.showFps); }
    function resetDpr() { if (!renderer) return; dpr = Math.min(devicePixelRatio, preset().dprCap); renderer.setPixelRatio(dpr); }
    function lock(v) { locked = v; }
    function tick(dtMs) {
        if (!renderer || !dtMs) return;
        ema += (Math.min(dtMs, 250) - ema) * 0.08;
        acc += dtMs; frames++;
        if (acc < 1000) return;
        const fps = frames * 1000 / acc; acc = 0; frames = 0;
        if (settings.showFps && fpsEl) fpsEl.textContent = `${Math.round(fps)} fps · ${dpr.toFixed(2)}x · ${renderer.info.render.calls} calls`;
        if (locked || renderer.xr.isPresenting) return;
        const p = preset(), cap = Math.min(devicePixelRatio, p.dprCap);
        let next = dpr;
        if (ema > 24) next = Math.max(p.dprMin, dpr - (ema > 40 ? 0.2 : 0.1));
        else if (ema < 17.5 && dpr < cap) next = Math.min(cap, dpr + 0.1);
        if (Math.abs(next - dpr) > 0.01) { dpr = next; renderer.setPixelRatio(dpr); }
    }
    onChange(k => { if (k === 'showFps') applyFps(); if (k === 'quality') resetDpr(); });

    return { settings, set, onChange, preset, prepareModel, mergeStatic, attach, tick, resetDpr, lock, isTouch };
})();
