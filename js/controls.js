/* =========================================================================
   CONTROLS: keyboard + mouse (desktop), joystick + touch-look + device
   motion (phones), thumbsticks (VR). Collision via world.walk().
   ========================================================================= */
const Controls = (() => {
    const T = THREE;
    const keys = {}, joy = { x: 0, y: 0 }, stick = { x: 0, y: 0 };
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const state = { enabled: false, world: null, motion: false, onTap: null, onHover: null, onStep: null };
    let sceneEl, camEl, rigEl;

    window.addEventListener('keydown', e => { if (!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) keys[e.code] = true; });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('blur', () => Object.keys(keys).forEach(k => keys[k] = false));

    function lc() { return camEl && camEl.components['look-controls']; }

    function init(scene) {
        sceneEl = scene; camEl = scene.querySelector('#camera'); rigEl = scene.querySelector('#rig');
        const canvas = scene.canvas;
        // Touch-look (one finger anywhere on the canvas) and tap detection for all pointers
        let look = null;
        canvas.addEventListener('pointerdown', e => {
            if (look) return;
            look = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, touch: e.pointerType === 'touch', t: performance.now() };
        });
        window.addEventListener('pointermove', e => {
            if (!look || e.pointerId !== look.id) { if (e.pointerType === 'mouse' && e.target === canvas && state.onHover) state.onHover(e.clientX, e.clientY); return; }
            const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY;
            if (look.touch && state.enabled && lc()) {
                const k = 0.0042;
                lc().yawObject.rotation.y += dx * k;
                lc().pitchObject.rotation.x = Math.max(-1.35, Math.min(1.35, lc().pitchObject.rotation.x + dy * k));
            }
        });
        const end = e => {
            if (!look || e.pointerId !== look.id) return;
            const moved = Math.hypot(e.clientX - look.sx, e.clientY - look.sy);
            if (moved < 9 && performance.now() - look.t < 600 && state.onTap) state.onTap(e.clientX, e.clientY);
            look = null;
        };
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', e => { if (look && e.pointerId === look.id) look = null; });
        canvas.addEventListener('mouseleave', () => state.onHover && state.onHover(null));

        // VR thumbsticks
        scene.querySelectorAll('[laser-controls]').forEach(h => h.addEventListener('thumbstickmoved', e => { stick.x = e.detail.x; stick.y = e.detail.y; }));

        // Virtual joystick
        const base = document.getElementById('joystick'), knob = base.querySelector('.knob');
        let jid = null;
        const setJoy = e => {
            const r = base.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width * 0.36;
            let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy);
            if (d > max) { dx *= max / d; dy *= max / d; }
            joy.x = dx / max; joy.y = dy / max;
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
        };
        base.addEventListener('pointerdown', e => { jid = e.pointerId; base.setPointerCapture(jid); base.classList.add('active'); setJoy(e); e.preventDefault(); });
        base.addEventListener('pointermove', e => { if (e.pointerId === jid) setJoy(e); });
        const release = e => { if (e.pointerId !== jid) return; jid = null; joy.x = joy.y = 0; knob.style.transform = ''; base.classList.remove('active'); };
        base.addEventListener('pointerup', release); base.addEventListener('pointercancel', release);
    }

    // iOS needs an explicit permission request from a user gesture
    function requestMotion() {
        const DOE = window.DeviceOrientationEvent;
        if (DOE && typeof DOE.requestPermission === 'function') {
            return DOE.requestPermission().then(r => {
                if (r !== 'granted') return false;
                const ui = sceneEl.components['device-orientation-permission-ui'];
                if (ui) ui.permissionGranted = true;
                sceneEl.emit('deviceorientationpermissiongranted');
                return true;
            }).catch(() => false);
        }
        return Promise.resolve(!!DOE && isTouch);
    }
    function setMotion(on) {
        state.motion = on;
        if (camEl) camEl.setAttribute('look-controls', 'magicWindowTrackingEnabled', on);
    }
    function teleport(x, z, yawDeg) {
        rigEl.object3D.position.set(x, state.world ? state.world.groundAt(x, z) : 0, z);
        const l = lc();
        if (l) { l.yawObject.rotation.y = yawDeg * Math.PI / 180; l.pitchObject.rotation.x = -0.12; }
    }

    AFRAME.registerComponent('player', {
        init() { this.f = new T.Vector3(); this.q = new T.Quaternion(); },
        tick(t, dtMs) {
            const w = state.world;
            if (!state.enabled || !w || !camEl) return;
            const dt = Math.min(dtMs, 60) / 1000;
            let f = 0, s = 0;
            if (keys.KeyW || keys.ArrowUp) f += 1;
            if (keys.KeyS || keys.ArrowDown) f -= 1;
            if (keys.KeyA || keys.ArrowLeft) s -= 1;
            if (keys.KeyD || keys.ArrowRight) s += 1;
            f -= joy.y + stick.y; s += joy.x + stick.x;
            const len = Math.hypot(f, s);
            const pos = this.el.object3D.position;
            if (len > 0.05) {
                if (len > 1) { f /= len; s /= len; }
                const speed = keys.ShiftLeft || keys.ShiftRight ? 2.8 : 1.6;
                camEl.object3D.getWorldQuaternion(this.q);
                this.f.set(0, 0, -1).applyQuaternion(this.q); this.f.y = 0; this.f.normalize();
                const mx = (this.f.x * f - this.f.z * s) * speed * dt, mz = (this.f.z * f + this.f.x * s) * speed * dt;
                if (w.walk(pos.x + mx, pos.z)) pos.x += mx;
                if (w.walk(pos.x, pos.z + mz)) pos.z += mz;
                this.stride = (this.stride || 0) + Math.hypot(mx, mz);
                if (this.stride > (speed > 2 ? 0.85 : 0.7)) { this.stride = 0; state.onStep && state.onStep(); }
            }
            const gy = w.groundAt(pos.x, pos.z);
            pos.y += (gy - pos.y) * Math.min(1, dt * 10);
            if (w.tick) w.tick(dt, t);
        }
    });

    return { init, requestMotion, setMotion, teleport, isTouch, state, keys };
})();
