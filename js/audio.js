/* =========================================================================
   SOUND: procedural adaptive music, ambience and effects (Web Audio).
   Nothing is downloaded: every note is synthesised.
   ========================================================================= */
const Sound = (() => {
    let ctx, master, musicBus, sfxBus, revSend, ambBus;
    let theme = null, pending = null, token = 0, tbus = null, nextT = 0, step = 0, timer = null, level = 0, amb = null, ambTimers = [];
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const MINOR = [0, 2, 3, 5, 7, 8, 10], PHRYG = [0, 1, 3, 5, 7, 8, 10];
    const THEMES = {
        title: { root: 50, scale: MINOR, prog: [0, 5, 2, 6], bpm: 60, plink: 0.16, cutoff: 900 },
        penthouse: { root: 48, scale: MINOR, prog: [0, 3, 5, 4], bpm: 66, plink: 0.24, cutoff: 1100, keys: true },
        lake: { root: 45, scale: MINOR, prog: [0, 6, 5, 6], bpm: 56, plink: 0.3, cutoff: 1500, high: true },
        museum: { root: 52, scale: PHRYG, prog: [0, 1, 0, 6], bpm: 64, plink: 0.14, cutoff: 750, pulse: true }
    };

    function ensure() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            try { ctx = new AC(); } catch (e) { return null; }
            const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
            master = ctx.createGain(); master.connect(comp); comp.connect(ctx.destination);
            musicBus = ctx.createGain(); sfxBus = ctx.createGain(); ambBus = ctx.createGain();
            musicBus.connect(master); sfxBus.connect(master); ambBus.connect(sfxBus);
            // Generated stereo reverb impulse
            const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
            for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
            const conv = ctx.createConvolver(); conv.buffer = ir;
            revSend = ctx.createGain(); revSend.gain.value = 0.9; revSend.connect(conv);
            const wet = ctx.createGain(); wet.gain.value = 0.32; conv.connect(wet); wet.connect(master);
            applyVolumes();
            document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : ctx.resume(); });
        }
        if (ctx.state !== 'running' && !document.hidden) ctx.resume().catch(() => { });
        return ctx;
    }
    function applyVolumes() {
        if (!ctx) return;
        const s = Perf.settings, t = ctx.currentTime;
        musicBus.gain.setTargetAtTime(s.music * 0.9, t, 0.2);
        sfxBus.gain.setTargetAtTime(s.sfx, t, 0.1);
    }
    Perf.onChange(k => { if (k === 'music' || k === 'sfx') applyVolumes(); });

    // ---------- voices ----------
    function env(g, t, a, peak, hold, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); }
    function osc(type, f, t, end, dest, detune = 0) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.connect(dest); o.start(t); o.stop(end); return o; }
    function pad(notes, t, dur, cutoff, vol = 0.045) {
        const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.6;
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.08; lg.gain.value = cutoff * 0.35; lfo.connect(lg); lg.connect(f.frequency); lfo.start(t); lfo.stop(t + dur + 4);
        f.connect(g); g.connect(tbus || musicBus); g.connect(revSend);
        env(g, t, 2.2, vol, Math.max(0.1, dur - 2.2), 3.2);
        notes.forEach(n => { osc('sawtooth', mtof(n), t, t + dur + 3.5, f, -7); osc('sawtooth', mtof(n), t, t + dur + 3.5, f, 7); });
    }
    function bass(n, t, dur) {
        const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
        f.connect(g); g.connect(tbus || musicBus); env(g, t, 0.08, 0.11, dur * 0.4, dur * 0.7);
        osc('sine', mtof(n), t, t + dur * 1.2, g); osc('triangle', mtof(n), t, t + dur * 1.2, f);
    }
    function plink(n, t, vol = 0.045, keys = false) {
        const g = ctx.createGain(); g.connect(tbus || musicBus); g.connect(revSend);
        env(g, t, 0.006, vol, 0.02, keys ? 1.4 : 2.2);
        osc('sine', mtof(n), t, t + 2.6, g); osc(keys ? 'triangle' : 'sine', mtof(n + 12), t, t + 1.2, g, 3);
    }
    function pulse(n, t, vol) {
        const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
        f.connect(g); g.connect(tbus || musicBus); env(g, t, 0.01, vol, 0.03, 0.18);
        osc('triangle', mtof(n), t, t + 0.3, f);
    }
    function strings(notes, t, dur) {
        const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600;
        f.connect(g); g.connect(tbus || musicBus); g.connect(revSend); env(g, t, 3, 0.022, Math.max(0.1, dur - 3), 3);
        const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5; vg.gain.value = 5; vib.connect(vg); vib.start(t); vib.stop(t + dur + 3.2);
        notes.forEach(n => { const o = osc('sawtooth', mtof(n), t, t + dur + 3.2, f); vg.connect(o.detune); });
    }

    // ---------- scheduler ----------
    function chord(th, deg) { const sc = th.scale, at = i => th.root + sc[i % 7] + 12 * Math.floor(i / 7); return [at(deg), at(deg + 2), at(deg + 4)]; }
    function schedule(i, t) {
        const th = theme, e8 = 60 / th.bpm / 2, bar = Math.floor(i / 8), within = i % 8;
        const deg = th.prog[Math.floor(bar / 2) % th.prog.length], c = chord(th, deg);
        if (i % 16 === 0) { pad(c.map(n => n + 12), t, e8 * 16, th.cutoff); if (level >= 2) strings(c.map(n => n + 24), t, e8 * 16); }
        if (within === 0) bass(c[0] - 12, t, e8 * 8);
        if (th.pulse || level >= 1) { if (within % 2 === 0 || level >= 1) pulse(c[0] - (th.pulse ? 0 : 12), t, (level >= 1 ? 0.05 : 0.03) * (within === 0 ? 1.4 : 1)); }
        if (Math.random() < th.plink + level * 0.06) {
            const pool = c.concat(th.scale.slice(0, 5).map(s => th.root + s)).map(n => n + (th.high ? 36 : 24));
            plink(pool[Math.floor(Math.random() * pool.length)], t + (within % 2 ? e8 * 0.08 : 0), 0.04, th.keys);
        }
    }
    function run() {
        if (!theme || !ctx) return;
        if (Perf.settings.music <= 0.001) { nextT = ctx.currentTime + 0.1; return; }
        const e8 = 60 / theme.bpm / 2;
        // After a stall, skip the missed steps instead of firing them all at once
        if (nextT < ctx.currentTime) { const miss = Math.ceil((ctx.currentTime - nextT) / e8); step += miss; nextT += miss * e8; }
        for (let n = 0; n < 8 && nextT < ctx.currentTime + 0.7; n++) { schedule(step, nextT); nextT += e8; step++; }
    }
    function music(name) {
        if (!ensure()) return;
        const th = THEMES[name] || THEMES.title;
        if ((pending || theme) === th) return;
        pending = th; const my = ++token;
        const t = ctx.currentTime;
        musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(0.0001, t, 0.4);
        clearInterval(timer);
        setTimeout(() => {
            if (my !== token) return;
            pending = null; theme = th; step = 0; level = 0; nextT = ctx.currentTime + 0.1;
            // Fresh bus per theme so notes still ringing from the old theme are cut off
            const old = tbus; tbus = ctx.createGain(); tbus.connect(musicBus);
            if (old) { old.gain.setTargetAtTime(0, ctx.currentTime, 0.05); setTimeout(() => old.disconnect(), 1000); }
            applyVolumes(); clearInterval(timer); timer = setInterval(run, 120); run();
        }, 1300);
    }
    function stopMusic() { clearInterval(timer); theme = null; pending = null; ++token; if (ctx) musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.5); }
    function intensity(n) { level = n; }

    // ---------- effects ----------
    function tone(type, f0, f1, dur, vol, delay = 0, bus) {
        if (!ensure()) return;
        const t = ctx.currentTime + delay, g = ctx.createGain(), o = ctx.createOscillator();
        o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(dur, brown = true) {
        const b = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate), d = b.getChannelData(0);
        let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = brown ? (last + 0.02 * w) / 1.02 : w; d[i] = brown ? last * 3.5 : w; }
        const s = ctx.createBufferSource(); s.buffer = b; return s;
    }
    const sfx = {
        shutter() { if (!ensure()) return; const s = noise(0.06, false), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime; f.type = 'highpass'; f.frequency.value = 2500; g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); tone('triangle', 900, 300, 0.09, 0.05, 0.04); },
        tick() { tone('sine', 1200, 0, 0.03, 0.02); },
        click() { tone('sine', 1600, 900, 0.04, 0.025); },
        sweep() { tone('sine', 220, 880, 0.8, 0.05); tone('sine', 330, 1320, 0.8, 0.025, 0.1); },
        ping() { tone('sine', 1320, 0, 0.25, 0.04); tone('sine', 1760, 0, 0.3, 0.03, 0.12); },
        ai() { [392, 523, 659, 784, 1047].forEach((f, i) => { tone('sine', f, 0, 0.6, 0.035, i * 0.1); }); },
        discover() { [659, 880].forEach((f, i) => tone('triangle', f, 0, 0.35, 0.04, i * 0.09)); },
        ok() { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, 0, 0.6, 0.06, i * 0.12)); },
        bad() { [311, 233].forEach((f, i) => tone('sawtooth', f, 0, 0.4, 0.035, i * 0.18)); },
        step(scene) {
            if (!ctx) return;
            const s = noise(0.12), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
            f.type = 'lowpass'; f.frequency.value = scene === 'lake' ? 900 : scene === 'museum' ? 2400 : 1400;
            g.gain.setValueAtTime((scene === 'museum' ? 0.22 : 0.16) * (0.8 + Math.random() * 0.4), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
            s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t);
        }
    };

    // ---------- ambience ----------
    function ambience(scene) {
        stopAmbience();
        if (!ensure() || !scene) return;
        const src = noise(5), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.loop = true; f.type = 'lowpass'; f.frequency.value = scene === 'lake' ? 520 : scene === 'museum' ? 200 : 300;
        g.gain.value = scene === 'lake' ? 0.06 : 0.04;
        src.connect(f); f.connect(g); g.connect(ambBus); src.start();
        amb = src;
        const every = (ms, fn) => ambTimers.push(setInterval(() => !document.hidden && fn(), ms));
        if (scene === 'lake') every(2800, () => Math.random() < 0.5 && [0, 0.12, 0.22].forEach(d => tone('sine', 2600 + Math.random() * 900, 1800 + Math.random() * 600, 0.09, 0.01, d, ambBus)));
        if (scene === 'penthouse') every(17000, () => Math.random() < 0.4 && tone('sine', 620, 880, 3.5, 0.006, 0, ambBus));
        if (scene === 'museum') { const hum = ctx.createOscillator(), hg = ctx.createGain(); hum.frequency.value = 58; hg.gain.value = 0.012; hum.connect(hg); hg.connect(ambBus); hum.start(); amb.hum = hum; }
    }
    function stopAmbience() { if (amb) { try { amb.stop(); amb.hum && amb.hum.stop(); } catch (e) { } amb = null; } ambTimers.forEach(clearInterval); ambTimers = []; }

    return { unlock: ensure, music, stopMusic, intensity, ambience, stopAmbience, sfx };
})();
