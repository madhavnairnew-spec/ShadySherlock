/* =========================================================================
   CONTROLS: keyboard + mouse (drag or captured), joystick + touch-look +
   device motion (phones), thumbstick move + snap turn (VR).
   Movement is smoothed, frame-rate independent and collision-checked at
   the head position so room-scale VR cannot walk through walls.
   ========================================================================= */
const Controls = (() => {
    const T = THREE;
    const keys = {}, joy = { x: 0, y: 0 }, stick = { x: 0, y: 0 };
    const isTouch = Perf.isTouch;
    const state = { enabled: false, world: null, motion: false, cursor: null, onTap: null, onHover: null, onStep: null };
    let sceneEl, camEl, rigEl, canvas, snapArmed = true, lockRequested = 0, ptr = null, resetJoy = () => { };
    const good = { x: 0, z: 0, ok: false }, vrHead = { x: 0, z: 0, yaw: 0, ok: false };
    const vel = new T.Vector2(), q = new T.Quaternion(), eul = new T.Euler(0, 0, 0, 'YXZ'), head = new T.Vector3(), head2 = new T.Vector3();
    const clearKeys = () => { Object.keys(keys).forEach(k => keys[k] = false); ptr = null; resetJoy(); };

    window.addEventListener('keydown', e => { if (!e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) keys[e.code] = true; });
    window.addEventListener('keyup', e => { if (e.key === 'Meta') clearKeys(); else keys[e.code] = false; });
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', clearKeys);

    const lc = () => camEl && camEl.components['look-controls'];
    const cam = () => (sceneEl && sceneEl.camera) || camEl.object3D;
    const inVR = () => sceneEl && sceneEl.is('vr-mode') && sceneEl.renderer.xr.isPresenting;
    function look(dyaw, dpitch) {
        const l = lc(); if (!l) return;
        l.yawObject.rotation.y += dyaw;
        // Clamp the total pitch (device tilt + drag) so the view never flips past vertical
        const dev = state.motion && l.magicWindowDeltaEuler ? l.magicWindowDeltaEuler.x : 0;
        l.pitchObject.rotation.x = Math.max(-1.45 - dev, Math.min(1.45 - dev, l.pitchObject.rotation.x + dpitch));
    }
    const sens = () => Perf.settings.sens, inv = () => (Perf.settings.invertY ? -1 : 1);
    const locked = () => document.pointerLockElement === canvas;
    function releasePointer() { if (locked()) document.exitPointerLock(); }

    function init(scene) {
        sceneEl = scene; camEl = scene.querySelector('#camera'); rigEl = scene.querySelector('#rig'); canvas = scene.canvas;
        // One active look pointer (mouse drag or a finger); taps are short, still presses
        canvas.addEventListener('pointerdown', e => {
            if (ptr || (e.pointerType === 'mouse' && e.button !== 0)) return;
            if (e.pointerType === 'mouse' && Perf.settings.mouseLock && state.enabled && !locked() && canvas.requestPointerLock) {
                lockRequested = performance.now();
                try { const pr = canvas.requestPointerLock(); if (pr && pr.catch) pr.catch(() => { lockRequested = 0; }); } catch (err) { lockRequested = 0; }
            }
            ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), mouse: e.pointerType === 'mouse' };
        });
        window.addEventListener('pointermove', e => {
            if (locked()) return;
            if (ptr && ptr.mouse && e.pointerType === 'mouse' && e.buttons === 0) ptr = null;
            if (!ptr || e.pointerId !== ptr.id) {
                if (e.pointerType === 'mouse') state.cursor = e.target === canvas ? { x: e.clientX, y: e.clientY } : null;
                if (e.pointerType === 'mouse' && e.target === canvas && state.onHover) state.onHover(e.clientX, e.clientY);
                return;
            }
            if (ptr.mouse) state.cursor = null;
            const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY;
            if (!state.enabled) return;
            const k = (ptr.mouse ? 0.0026 : 0.0045) * sens();
            look(-dx * k, -dy * k * inv());
        });
        document.addEventListener('mousemove', e => { if (locked() && state.enabled) { const k = 0.0022 * sens(); look(-e.movementX * k, -e.movementY * k * inv()); } });
        const end = e => {
            if (!ptr || e.pointerId !== ptr.id) return;
            const still = Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) < 9 && performance.now() - ptr.t < 600;
            const justLocked = performance.now() - lockRequested < 400;
            if (still && !justLocked && state.onTap) locked() ? state.onTap(null, null) : state.onTap(e.clientX, e.clientY);
            ptr = null;
        };
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', e => { if (ptr && e.pointerId === ptr.id) ptr = null; });
        canvas.addEventListener('mouseleave', () => { state.cursor = null; state.onHover && state.onHover(null); });
        document.addEventListener('pointerlockchange', () => { state.cursor = null; state.onHover && state.onHover(null); });
        document.addEventListener('pointerlockerror', () => { lockRequested = 0; });

        // VR: left stick moves, right stick snap-turns
        const hl = scene.querySelector('#hand-l'), hr = scene.querySelector('#hand-r');
        hl.addEventListener('thumbstickmoved', e => { stick.x = e.detail.x; stick.y = e.detail.y; });
        hr.addEventListener('thumbstickmoved', e => {
            const x = e.detail.x;
            if (Math.abs(x) < 0.3) snapArmed = true;
            else if (snapArmed && Math.abs(x) > 0.7) { snapArmed = false; snapTurn(-Math.sign(x) * Perf.settings.snapTurn); }
        });
        scene.addEventListener('exit-vr', () => {
            stick.x = stick.y = 0;
            // Put the flat-screen camera where the headset was, facing the same way
            if (vrHead.ok && state.world) setTimeout(() => {
                const w = state.world, bad = !w.walk(vrHead.x, vrHead.z) && good.ok;
                teleport(bad ? good.x : vrHead.x, bad ? good.z : vrHead.z, vrHead.yaw * 180 / Math.PI); vrHead.ok = false;
            }, 0);
        });

        // Virtual joystick
        const base = document.getElementById('joystick'), knob = base.querySelector('.knob');
        let jid = null;
        const setJoy = e => {
            const r = base.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width * 0.36;
            let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy);
            if (d > max) { dx *= max / d; dy *= max / d; }
            joy.x = dx / max; joy.y = dy / max;
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
            base.classList.toggle('run', Math.hypot(joy.x, joy.y) > 0.92);
        };
        base.addEventListener('pointerdown', e => { jid = e.pointerId; base.setPointerCapture(jid); base.classList.add('active'); setJoy(e); e.preventDefault(); });
        base.addEventListener('pointermove', e => { if (e.pointerId === jid) setJoy(e); });
        resetJoy = () => { jid = null; joy.x = joy.y = 0; knob.style.transform = ''; base.classList.remove('active', 'run'); };
        const release = e => { if (e.pointerId === jid) resetJoy(); };
        base.addEventListener('pointerup', release); base.addEventListener('pointercancel', release);
    }

    function snapTurn(deg) {
        const o = rigEl.object3D;
        cam().getWorldPosition(head);
        o.rotation.y += deg * Math.PI / 180; o.updateMatrixWorld(true);
        cam().getWorldPosition(head2);
        o.position.x += head.x - head2.x; o.position.z += head.z - head2.z;
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
    function setMotion(on) { state.motion = on; if (camEl) camEl.setAttribute('look-controls', 'magicWindowTrackingEnabled', on); }

    function teleport(x, z, yawDeg) {
        const o = rigEl.object3D, w = state.world;
        vel.set(0, 0); good.ok = false;
        if (inVR()) {
            cam().getWorldQuaternion(q); eul.setFromQuaternion(q, 'YXZ');
            o.rotation.y += yawDeg * Math.PI / 180 - eul.y; o.updateMatrixWorld(true);
            cam().getWorldPosition(head);
            o.position.x += x - head.x; o.position.z += z - head.z;
        } else {
            o.rotation.set(0, 0, 0); o.position.x = x; o.position.z = z;
            const l = lc(); if (l) { l.yawObject.rotation.y = yawDeg * Math.PI / 180; l.pitchObject.rotation.x = -0.12; if (l.magicWindowDeltaEuler) l.magicWindowDeltaEuler.y = 0; }
        }
        o.position.y = w ? w.groundAt(x, z) : 0;
    }

    AFRAME.registerComponent('player', {
        tick(t, dtMs) {
            const w = state.world;
            if (!w || !camEl) return;
            const dt = Math.min(dtMs || 16, 100) / 1000;
            let f = 0, s = 0, run = false;
            if (state.enabled) {
                if (keys.KeyW || keys.ArrowUp) f += 1;
                if (keys.KeyS || keys.ArrowDown) f -= 1;
                if (keys.KeyA || keys.ArrowLeft) s -= 1;
                if (keys.KeyD || keys.ArrowRight) s += 1;
                run = keys.ShiftLeft || keys.ShiftRight;
                const jm = Math.hypot(joy.x, joy.y), sm = Math.hypot(stick.x, stick.y);
                if (jm > 0.12) { f -= joy.y; s += joy.x; run = run || jm > 0.92; }
                if (sm > 0.15) { f -= stick.y; s += stick.x; run = run || sm > 0.95; }
            }
            const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
            cam().getWorldQuaternion(q); eul.setFromQuaternion(q, 'YXZ');
            const sin = Math.sin(eul.y), cos = Math.cos(eul.y), speed = run ? 3.0 : 1.7;
            const tx = (-sin * f + cos * s) * speed, tz = (-cos * f - sin * s) * speed;
            const k = 1 - Math.exp(-dt * (len > 0.05 ? 10 : 14));
            vel.x += (tx - vel.x) * k; vel.y += (tz - vel.y) * k;
            if (len < 0.05 && vel.lengthSq() < 0.0004) vel.set(0, 0);
            const pos = this.el.object3D.position;
            cam().getWorldPosition(head);
            if (inVR()) { vrHead.x = head.x; vrHead.z = head.z; vrHead.yaw = eul.y; vrHead.ok = true; }
            if (w.walk(head.x, head.z)) { good.x = head.x; good.z = head.z; good.ok = true; }
            if (vel.x || vel.y) {
                let mx = vel.x * dt, mz = vel.y * dt, moved = 0;
                const n = Math.max(1, Math.ceil(Math.hypot(mx, mz) / 0.08)); mx /= n; mz /= n;
                const ox = head.x - pos.x, oz = head.z - pos.z;
                // When the head is somewhere blocked (leaned through a wall), only allow moves back toward the last good spot
                const ok = (x, z, px, pz) => w.walk(x, z) || (good.ok && Math.hypot(x - good.x, z - good.z) < Math.hypot(px - good.x, pz - good.z) - 1e-4) || (!good.ok && !w.walk(px, pz));
                for (let i = 0; i < n; i++) {
                    const hx = pos.x + ox, hz = pos.z + oz;
                    if (ok(hx + mx, hz, hx, hz)) { pos.x += mx; moved += Math.abs(mx); } else vel.x *= 0.5;
                    const hx2 = pos.x + ox;
                    if (ok(hx2, hz + mz, hx2, hz)) { pos.z += mz; moved += Math.abs(mz); } else vel.y *= 0.5;
                }
                this.stride = (this.stride || 0) + moved;
                if (this.stride > (run ? 0.9 : 0.72)) { this.stride = 0; state.onStep && state.onStep(); }
            }
            const gy = w.groundAt(head.x, head.z);
            pos.y += (gy - pos.y) * Math.min(1, dt * 10);
            if (w.tick) w.tick(dt, t);
        }
    });

    return { init, requestMotion, setMotion, teleport, releasePointer, snapTurn, isTouch, state, keys };
})();
