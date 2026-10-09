/* =========================================================================
   PROCEDURAL TEXTURES & MATERIALS
   Everything is drawn on canvases at load time: no texture downloads.
   ========================================================================= */
const TX = (() => {
    const T = THREE;
    const cache = {};
    let s = 1;
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const seed = v => { s = Math.abs(Math.floor(v)) % 2147483646 + 1; };
    const R = (a, b) => a + (b - a) * rand();
    const pick = a => a[Math.floor(rand() * a.length)];
    const canvas = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
    const once = (key, fn) => cache[key] || (cache[key] = fn());

    // ---------- tileable fractal value noise (grayscale canvas) ----------
    function noise(size, cells, oct, sd) {
        return once(`n${size}-${cells}-${oct}-${sd}`, () => {
            seed(sd);
            const [c, g] = canvas(size), img = g.createImageData(size, size), acc = new Float32Array(size * size);
            let amp = 1, total = 0;
            for (let o = 0; o < oct; o++, amp *= 0.5) {
                const n = cells << o, grid = Float32Array.from({ length: n * n }, rand), k = n / size;
                for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                    const fx = x * k, fy = y * k, ix = Math.floor(fx), iy = Math.floor(fy);
                    const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
                    const a = grid[(iy % n) * n + ix % n], b = grid[(iy % n) * n + (ix + 1) % n];
                    const c2 = grid[((iy + 1) % n) * n + ix % n], d = grid[((iy + 1) % n) * n + (ix + 1) % n];
                    acc[y * size + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c2 + (d - c2) * sx) * sy);
                }
                total += amp;
            }
            for (let i = 0; i < acc.length; i++) { const v = acc[i] / total * 255; img.data.set([v, v, v, 255], i * 4); }
            g.putImageData(img, 0, 0);
            return c;
        });
    }
    function overlay(g, w, h, n, alpha, mode = 'multiply') {
        g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = mode;
        for (let y = 0; y < h; y += n.height) for (let x = 0; x < w; x += n.width) g.drawImage(n, x, y);
        g.restore();
    }

    // Normal map from canvas luminance (Sobel)
    function normalFrom(src, strength = 2) {
        const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
        const [c, g] = canvas(w, h), out = g.createImageData(w, h), L = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) L[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
        const at = (x, y) => L[((y + h) % h) * w + (x + w) % w];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
            const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
            out.data[i] = (-dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
        }
        g.putImageData(out, 0, 0);
        return c;
    }

    function tex(c, rx = 1, ry = rx, color = true) {
        const t = new T.CanvasTexture(c);
        t.wrapS = t.wrapT = T.RepeatWrapping;
        t.repeat.set(rx, ry);
        t.anisotropy = 8;
        if (color) t.colorSpace = T.SRGBColorSpace;
        return t;
    }

    // ---------- surface generators ----------
    const GEN = {
        wood({ base = '#9a6a3f', dark = '#5d3a1e', planks = 6, joints = true, sd = 3 } = {}) {
            seed(sd);
            const S = 512, [c, g] = canvas(S), ph = S / planks;
            for (let p = 0; p < planks; p++) {
                const y0 = p * ph;
                g.fillStyle = base; g.fillRect(0, y0, S, ph);
                g.fillStyle = `rgba(0,0,0,${R(0, 0.18)})`; g.fillRect(0, y0, S, ph);
                g.fillStyle = `rgba(255,230,190,${R(0, 0.12)})`; g.fillRect(0, y0, S, ph);
                for (let l = 0; l < 26; l++) {
                    const yy = y0 + R(2, ph - 2), amp = R(1, 5), fr = R(0.005, 0.02), ph0 = R(0, 6);
                    g.strokeStyle = dark; g.globalAlpha = R(0.05, 0.22); g.lineWidth = R(0.6, 2.2);
                    g.beginPath();
                    for (let x = 0; x <= S; x += 8) g.lineTo(x, yy + Math.sin(x * fr + ph0) * amp);
                    g.stroke();
                }
                if (rand() < 0.35) { g.globalAlpha = 0.35; g.strokeStyle = dark; const kx = R(40, S - 40), ky = y0 + ph / 2; for (let r = 2; r < 12; r += 2.5) { g.beginPath(); g.ellipse(kx, ky, r * 2.2, r * 0.7, 0, 0, 7); g.stroke(); } }
                g.globalAlpha = 1;
                g.fillStyle = 'rgba(20,10,4,0.75)'; g.fillRect(0, y0, S, 1.5);
                if (joints) { const jx = R(0, S); g.fillRect(jx, y0, 1.5, ph); }
            }
            overlay(g, S, S, noise(256, 8, 4, sd + 1), 0.25);
            return c;
        },
        marble({ base = '#e9e6e1', vein = '#6b6f78', tiles = 0, sd = 5 } = {}) {
            seed(sd);
            const S = 512, [c, g] = canvas(S);
            g.fillStyle = base; g.fillRect(0, 0, S, S);
            overlay(g, S, S, noise(256, 4, 5, sd), 0.18);
            for (let v = 0; v < 9; v++) {
                let x = R(0, S), y = R(0, S), a = R(0, 6.28);
                const pts = [];
                for (let i = 0; i < 140; i++) { a += R(-0.35, 0.35); x += Math.cos(a) * 5; y += Math.sin(a) * 5; pts.push([x, y]); }
                [[6, 0.04], [2.5, 0.1], [0.9, 0.35]].forEach(([w, al]) => {
                    g.strokeStyle = vein; g.globalAlpha = al * R(0.4, 1); g.lineWidth = w * R(0.5, 1.4);
                    g.beginPath(); pts.forEach(([px, py]) => g.lineTo(px, py)); g.stroke();
                });
            }
            g.globalAlpha = 1;
            if (tiles) {
                const t = S / tiles;
                for (let i = 0; i < tiles; i++) for (let j = 0; j < tiles; j++) { g.fillStyle = `rgba(${(i + j) % 2 ? '0,0,0' : '255,255,255'},${R(0.02, 0.08)})`; g.fillRect(i * t, j * t, t, t); }
                g.fillStyle = 'rgba(60,60,60,0.55)';
                for (let i = 0; i <= tiles; i++) { g.fillRect(i * t - 1, 0, 2, S); g.fillRect(0, i * t - 1, S, 2); }
            }
            return c;
        },
        plaster({ base = '#ebe7df', sd = 7 } = {}) {
            const S = 256, [c, g] = canvas(S);
            g.fillStyle = base; g.fillRect(0, 0, S, S);
            overlay(g, S, S, noise(256, 16, 4, sd), 0.08);
            overlay(g, S, S, noise(256, 64, 2, sd + 1), 0.05);
            return c;
        },
        fabric({ base = '#55606e', sd = 9 } = {}) {
            const S = 256, [c, g] = canvas(S);
            g.fillStyle = base; g.fillRect(0, 0, S, S);
            g.globalAlpha = 0.12;
            for (let i = 0; i < S; i += 2) { g.fillStyle = i % 4 ? '#000' : '#fff'; g.fillRect(i, 0, 1, S); g.fillRect(0, i + 1, S, 1); }
            g.globalAlpha = 1;
            overlay(g, S, S, noise(256, 16, 3, sd), 0.15);
            return c;
        },
        rug({ field = '#6e1f22', border = '#1d2a44', accent = '#c9a45a', sd = 11 } = {}) {
            seed(sd);
            const W = 512, H = 368, [c, g] = canvas(W, H);
            g.fillStyle = border; g.fillRect(0, 0, W, H);
            g.fillStyle = field; g.fillRect(34, 34, W - 68, H - 68);
            g.strokeStyle = accent; g.lineWidth = 3; g.strokeRect(22, 22, W - 44, H - 44); g.strokeRect(40, 40, W - 80, H - 80);
            for (let x = 30; x < W - 20; x += 16) { g.fillStyle = accent; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(x, 9); g.lineTo(x + 6, 16); g.lineTo(x, 23); g.lineTo(x - 6, 16); g.fill(); g.beginPath(); g.moveTo(x, H - 23); g.lineTo(x + 6, H - 16); g.lineTo(x, H - 9); g.lineTo(x - 6, H - 16); g.fill(); }
            g.globalAlpha = 1;
            const cx = W / 2, cy = H / 2;
            [[120, border], [100, accent], [84, field], [60, accent], [44, border]].forEach(([r, col]) => { g.fillStyle = col; g.beginPath(); g.moveTo(cx - r * 1.4, cy); g.lineTo(cx, cy - r * 0.9); g.lineTo(cx + r * 1.4, cy); g.lineTo(cx, cy + r * 0.9); g.fill(); });
            g.fillStyle = accent; g.globalAlpha = 0.5;
            for (let i = 0; i < 60; i++) { const x = R(50, W - 50), y = R(50, H - 50); if (Math.abs(x - cx) / 170 + Math.abs(y - cy) / 110 > 1) g.fillRect(x, y, 4, 4); }
            g.globalAlpha = 1;
            overlay(g, W, H, noise(256, 32, 3, sd), 0.3);
            return c;
        },
        concrete({ base = '#8d8d88', sd = 13 } = {}) {
            seed(sd);
            const S = 512, [c, g] = canvas(S);
            g.fillStyle = base; g.fillRect(0, 0, S, S);
            overlay(g, S, S, noise(256, 4, 5, sd), 0.35);
            overlay(g, S, S, noise(256, 32, 3, sd + 2), 0.2);
            for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${R(0.1, 0.4)})`; g.beginPath(); g.arc(R(0, S), R(0, S), R(0.5, 1.8), 0, 7); g.fill(); }
            return c;
        },
        ground({ sd = 15 } = {}) {
            seed(sd);
            const S = 512, [c, g] = canvas(S);
            g.fillStyle = '#d8d8d0'; g.fillRect(0, 0, S, S);
            overlay(g, S, S, noise(256, 8, 5, sd), 0.45);
            for (let i = 0; i < 2600; i++) { const x = R(0, S), y = R(0, S), l = R(3, 10), a = R(-0.6, 0.6) - Math.PI / 2; g.strokeStyle = `rgba(${rand() < 0.5 ? '255,255,240' : '40,40,30'},${R(0.15, 0.4)})`; g.lineWidth = R(0.6, 1.4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
            return c;
        },
        logs({ sd = 17 } = {}) {
            seed(sd);
            const S = 512, [c, g] = canvas(S), n = 8, h = S / n;
            for (let i = 0; i < n; i++) {
                const y = i * h, gr = g.createLinearGradient(0, y, 0, y + h);
                gr.addColorStop(0, '#3a2414'); gr.addColorStop(0.15, '#7a5634'); gr.addColorStop(0.5, '#9a6f45'); gr.addColorStop(0.85, '#6b4829'); gr.addColorStop(1, '#2c1a0e');
                g.fillStyle = gr; g.fillRect(0, y, S, h);
                for (let l = 0; l < 14; l++) { const yy = y + R(6, h - 6); g.strokeStyle = 'rgba(40,24,12,0.25)'; g.lineWidth = R(0.6, 1.6); g.beginPath(); for (let x = 0; x <= S; x += 16) g.lineTo(x, yy + Math.sin(x * 0.01 + l) * 2); g.stroke(); }
                g.fillStyle = 'rgba(205,195,175,0.85)'; g.fillRect(0, y + h - 3, S, 3);
            }
            overlay(g, S, S, noise(256, 16, 4, sd), 0.3);
            return c;
        },
        dock({ sd = 19 } = {}) {
            seed(sd);
            const S = 512, [c, g] = canvas(S), n = 6, w = S / n;
            for (let i = 0; i < n; i++) {
                g.fillStyle = `hsl(${R(25, 35)},${R(8, 18)}%,${R(36, 46)}%)`; g.fillRect(i * w, 0, w, S);
                for (let l = 0; l < 20; l++) { const xx = i * w + R(3, w - 3); g.strokeStyle = 'rgba(30,25,20,0.25)'; g.lineWidth = R(0.5, 1.5); g.beginPath(); for (let y = 0; y <= S; y += 16) g.lineTo(xx + Math.sin(y * 0.01 + l) * 2, y); g.stroke(); }
                g.fillStyle = '#15110d'; g.fillRect(i * w, 0, 4, S);
                g.fillStyle = '#2a2a2a'; [S * 0.25, S * 0.75].forEach(y => { g.beginPath(); g.arc(i * w + 14, y, 2.5, 0, 7); g.arc(i * w + w - 10, y, 2.5, 0, 7); g.fill(); });
            }
            overlay(g, S, S, noise(256, 8, 4, sd), 0.35);
            return c;
        },
        bark({ sd = 21 } = {}) {
            seed(sd);
            const S = 256, [c, g] = canvas(S);
            g.fillStyle = '#3b2c22'; g.fillRect(0, 0, S, S);
            for (let i = 0; i < 70; i++) { const x = R(0, S); g.strokeStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '120,100,85'},${R(0.2, 0.5)})`; g.lineWidth = R(1, 4); g.beginPath(); for (let y = 0; y <= S; y += 16) g.lineTo(x + R(-3, 3), y); g.stroke(); }
            overlay(g, S, S, noise(256, 16, 3, sd), 0.3);
            return c;
        },
        books() {
            const S = 128, [c, g] = canvas(S);
            g.fillStyle = '#ddd'; g.fillRect(0, 0, S, S);
            g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 6, S); g.fillRect(S - 6, 0, 6, S);
            g.fillStyle = 'rgba(255,215,120,0.9)'; [12, 18, S - 22, S - 16].forEach(y => g.fillRect(14, y, S - 28, 3));
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(30, S * 0.35, S - 60, S * 0.25);
            return c;
        }
    };

    // ---------- pictorial textures ----------
    const PIC = {
        skyline() {
            seed(41);
            const W = 2048, H = 640, [c, g] = canvas(W, H);
            const sky = g.createLinearGradient(0, 0, 0, H);
            sky.addColorStop(0, '#03050b'); sky.addColorStop(0.55, '#0c1424'); sky.addColorStop(0.8, '#2a2a3a'); sky.addColorStop(1, '#4a3a33');
            g.fillStyle = sky; g.fillRect(0, 0, W, H);
            for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${R(0.1, 0.6)})`; g.fillRect(R(0, W), R(0, H * 0.45), 1.2, 1.2); }
            const layer = (count, hMin, hMax, shade, winA, base) => {
                let x = -20;
                while (x < W) {
                    const bw = R(30, 110) * (count / 3), bh = R(hMin, hMax), top = base - bh;
                    g.fillStyle = shade; g.fillRect(x, top, bw, H - top);
                    if (rand() < 0.25) { g.fillRect(x + bw * 0.4, top - R(10, 40), bw * 0.2, R(10, 40)); }
                    const cols = Math.floor(bw / 7), rows = Math.floor(bh / 9);
                    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) if (rand() < winA) {
                        g.fillStyle = pick(['rgba(255,214,150,', 'rgba(255,236,200,', 'rgba(170,200,255,']) + R(0.35, 0.95) + ')';
                        g.fillRect(x + 3 + k * 7, top + 4 + r * 9, 3.2, 4.5);
                    }
                    if (bh > hMax * 0.85) { g.fillStyle = '#ff2b2b'; g.fillRect(x + bw / 2, top - 3, 3, 3); }
                    x += bw + R(2, 14);
                }
            };
            layer(2, 60, 200, '#0b0f18', 0.18, H * 0.86);
            layer(3, 80, 330, '#07090f', 0.3, H * 0.95);
            const glow = g.createLinearGradient(0, H * 0.85, 0, H);
            glow.addColorStop(0, 'rgba(255,150,70,0)'); glow.addColorStop(1, 'rgba(255,150,70,0.35)');
            g.fillStyle = glow; g.fillRect(0, H * 0.85, W, H * 0.15);
            return c;
        },
        sky({ top = '#7b9bc4', mid = '#d8cdbd', horizon = '#f1d6ad', sun = [0.18, 0.47] } = {}) {
            const W = 1024, H = 512, [c, g] = canvas(W, H);
            const gr = g.createLinearGradient(0, 0, 0, H);
            gr.addColorStop(0, top); gr.addColorStop(0.38, mid); gr.addColorStop(0.5, horizon); gr.addColorStop(1, '#8c968f');
            g.fillStyle = gr; g.fillRect(0, 0, W, H);
            const rg = g.createRadialGradient(sun[0] * W, sun[1] * H, 2, sun[0] * W, sun[1] * H, 160);
            rg.addColorStop(0, 'rgba(255,248,225,1)'); rg.addColorStop(0.08, 'rgba(255,235,195,0.9)'); rg.addColorStop(1, 'rgba(255,220,170,0)');
            g.fillStyle = rg; g.fillRect(0, 0, W, H);
            seed(43);
            for (let i = 0; i < 26; i++) { const x = R(0, W), y = R(H * 0.15, H * 0.42); g.fillStyle = `rgba(255,240,225,${R(0.06, 0.18)})`; g.beginPath(); g.ellipse(x, y, R(60, 180), R(6, 16), 0, 0, 7); g.fill(); }
            return c;
        },
        hills() {
            seed(47);
            const W = 2048, H = 256, [c, g] = canvas(W, H);
            const ridge = (yBase, amp, col, jag) => {
                g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
                for (let x = 0; x <= W; x += 8) {
                    let y = yBase - amp * (0.5 + 0.3 * Math.sin(x * 0.0061 + yBase) + 0.2 * Math.sin(x * 0.019));
                    if (jag) y -= (x % 16 < 8 ? R(4, 14) : 0);
                    g.lineTo(x, y);
                }
                g.lineTo(W, H); g.fill();
            };
            ridge(150, 110, 'rgba(120,140,155,0.9)', false);
            ridge(200, 60, 'rgba(70,90,92,1)', true);
            ridge(232, 24, 'rgba(38,52,46,1)', true);
            return c;
        },
        painting(kind, sd) {
            seed(sd);
            const W = 384, H = 288, [c, g] = canvas(W, H);
            if (kind === 'landscape' || kind === 'sea') {
                const sky = g.createLinearGradient(0, 0, 0, H * 0.6);
                sky.addColorStop(0, pick(['#4b6a8a', '#6d7f99', '#3f5873'])); sky.addColorStop(1, pick(['#e3c89a', '#d9b98c', '#f0dcc0']));
                g.fillStyle = sky; g.fillRect(0, 0, W, H);
                for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(255,250,240,${R(0.08, 0.25)})`; g.beginPath(); g.ellipse(R(0, W), R(20, H * 0.4), R(30, 90), R(8, 22), 0, 0, 7); g.fill(); }
                if (kind === 'sea') {
                    g.fillStyle = '#2e4a5c'; g.fillRect(0, H * 0.6, W, H * 0.4);
                    for (let i = 0; i < 80; i++) { g.strokeStyle = `rgba(230,240,245,${R(0.1, 0.4)})`; g.beginPath(); const y = R(H * 0.62, H); g.moveTo(R(0, W), y); g.lineTo(R(0, W), y + R(-2, 2)); g.stroke(); }
                    g.fillStyle = '#1a1612'; const sx = R(80, 280); g.fillRect(sx, H * 0.55, 70, 10); g.fillRect(sx + 30, H * 0.3, 3, H * 0.25);
                    g.fillStyle = 'rgba(240,230,210,0.9)'; g.beginPath(); g.moveTo(sx + 33, H * 0.31); g.lineTo(sx + 62, H * 0.52); g.lineTo(sx + 33, H * 0.52); g.fill();
                } else {
                    [[0.62, '#7a8a6a'], [0.7, '#556b45'], [0.8, '#3e5232']].forEach(([y, col]) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 12) g.lineTo(x, H * y - Math.sin(x * 0.02 + y * 9) * 18 - R(0, 6)); g.lineTo(W, H); g.fill(); });
                    for (let i = 0; i < 9; i++) { const x = R(0, W), y = H * R(0.68, 0.85); g.fillStyle = '#26361f'; g.beginPath(); g.ellipse(x, y, R(10, 22), R(18, 36), 0, 0, 7); g.fill(); }
                }
            } else if (kind === 'portrait') {
                const bg = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 260); bg.addColorStop(0, '#5a4630'); bg.addColorStop(1, '#16110b');
                g.fillStyle = bg; g.fillRect(0, 0, W, H);
                g.fillStyle = '#1a1512'; g.beginPath(); g.ellipse(W / 2, H * 1.02, 120, 110, 0, 0, 7); g.fill();
                g.fillStyle = '#d7b494'; g.beginPath(); g.ellipse(W / 2, H * 0.42, 46, 60, 0, 0, 7); g.fill();
                g.fillStyle = '#2a1d14'; g.beginPath(); g.ellipse(W / 2, H * 0.3, 52, 36, 0, Math.PI, 0); g.fill();
                g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(W / 2 + 18, H * 0.44, 26, 52, 0, 0, 7); g.fill();
                g.fillStyle = '#efe6d8'; g.beginPath(); g.moveTo(W / 2 - 30, H * 0.72); g.lineTo(W / 2, H * 0.84); g.lineTo(W / 2 + 30, H * 0.72); g.fill();
            } else {
                g.fillStyle = pick(['#8c2f22', '#24344d', '#2d3b2a', '#5b3a5e']); g.fillRect(0, 0, W, H);
                for (let i = 0; i < 3; i++) { g.fillStyle = pick(['#e0a03a', '#c94a2c', '#e7dccb', '#1d1d24', '#3f6a8a']); g.globalAlpha = R(0.55, 0.9); const y = R(10, H * 0.6); g.fillRect(R(14, 30), y, W - R(28, 60), R(50, 110)); }
                g.globalAlpha = 1;
            }
            overlay(g, W, H, noise(256, 32, 3, sd), 0.18);
            for (let i = 0; i < 300; i++) { g.strokeStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`; g.lineWidth = R(1, 4); g.beginPath(); const x = R(0, W), y = R(0, H); g.moveTo(x, y); g.lineTo(x + R(-14, 14), y + R(-5, 5)); g.stroke(); }
            return c;
        },
        print(shoe, color) {
            seed(shoe.length * 7);
            const W = 96, H = 256, [c, g] = canvas(W, H);
            g.fillStyle = color;
            g.beginPath(); g.ellipse(W / 2, H * 0.3, W * 0.42, H * 0.27, 0, 0, 7); g.fill();
            g.beginPath(); g.ellipse(W / 2 + 2, H * 0.8, W * 0.32, H * 0.15, 0, 0, 7); g.fill();
            if (shoe !== 'dress') g.fillRect(W * 0.25, H * 0.5, W * 0.5, H * 0.18);
            g.globalCompositeOperation = 'destination-out';
            if (shoe === 'boot' || shoe === 'work') {
                for (let y = 18; y < H - 10; y += 16) for (let x = 12; x < W - 8; x += 18) { g.beginPath(); if (shoe === 'boot') { g.moveTo(x, y); g.lineTo(x + 8, y + 6); g.lineTo(x + 16, y); g.lineWidth = 4; g.stroke(); } else g.fillRect(x, y, 10, 7); }
            } else {
                g.lineWidth = 2; for (let y = 30; y < H * 0.5; y += 12) { g.beginPath(); g.moveTo(14, y); g.lineTo(W - 14, y); g.stroke(); }
            }
            for (let i = 0; i < 70; i++) { g.beginPath(); g.arc(R(0, W), R(0, H), R(2, 9), 0, 7); g.fill(); }
            g.globalCompositeOperation = 'source-over';
            return c;
        },
        blood() {
            seed(71);
            const S = 256, [c, g] = canvas(S);
            for (let i = 0; i < 26; i++) { const a = R(0, 6.28), d = R(0, 60); const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d * 0.7; g.fillStyle = `rgba(${R(55, 85)},4,6,${R(0.7, 1)})`; g.beginPath(); g.arc(x, y, R(18, 46), 0, 7); g.fill(); }
            for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(70,5,6,0.9)'; g.beginPath(); g.arc(R(20, S - 20), R(20, S - 20), R(2, 6), 0, 7); g.fill(); }
            return c;
        },
        tent(text, ai) {
            const S = 128, [c, g] = canvas(S);
            g.fillStyle = ai ? '#3d7eff' : '#f2c218'; g.fillRect(0, 0, S, S);
            g.fillStyle = ai ? '#fff' : '#111'; g.font = 'bold 64px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(text, S / 2, S / 2 + 10);
            g.fillRect(0, S - 10, S, 10);
            return c;
        },
        lines(title, rows, { bg = '#f4f1ea', ink = '#222', w = 512, h = 640, head = '#111' } = {}) {
            const [c, g] = canvas(w, h);
            g.fillStyle = bg; g.fillRect(0, 0, w, h);
            g.fillStyle = head; g.font = `bold ${Math.round(w / 22)}px Arial`; g.fillText(title, w * 0.08, h * 0.1);
            g.fillStyle = ink; g.font = `${Math.round(w / 30)}px Arial`;
            rows.forEach((r, i) => g.fillText(r, w * 0.08, h * 0.18 + i * (w / 18)));
            seed(title.length);
            for (let y = h * 0.18 + rows.length * (w / 18); y < h * 0.92; y += w / 26) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(w * 0.08, y, w * R(0.5, 0.84), 2); }
            return c;
        },
        screen(lines, { bg = '#061018', fg = '#7cf0a8', w = 512, h = 320, grid = false } = {}) {
            const [c, g] = canvas(w, h);
            g.fillStyle = bg; g.fillRect(0, 0, w, h);
            if (grid) {
                seed(83);
                for (let i = 0; i < 4; i++) { const x = (i % 2) * w / 2, y = Math.floor(i / 2) * h / 2; const gr = g.createLinearGradient(x, y, x, y + h / 2); gr.addColorStop(0, '#2b3238'); gr.addColorStop(1, '#14181b'); g.fillStyle = gr; g.fillRect(x + 3, y + 3, w / 2 - 6, h / 2 - 6); g.fillStyle = 'rgba(255,255,255,0.08)'; for (let k = 0; k < 6; k++) g.fillRect(x + R(10, w / 2 - 60), y + R(20, h / 2 - 40), R(20, 50), R(20, 60)); g.fillStyle = '#ddd'; g.font = '14px monospace'; g.fillText(`CAM-${i + 1}  01:2${i}:0${i}`, x + 10, y + 20); }
            }
            g.fillStyle = fg; g.font = `${Math.round(h / 12)}px monospace`;
            lines.forEach((l, i) => g.fillText(l, 16, (grid ? h * 0.55 : 30) + i * h / 9));
            return c;
        },
        label(id, title, ai) {
            const [c, g] = canvas(512, 96);
            g.fillStyle = 'rgba(12,15,20,0.88)'; g.beginPath(); g.roundRect(0, 0, 512, 96, 14); g.fill();
            g.fillStyle = ai ? '#3d7eff' : '#f2c218'; g.fillRect(0, 0, 12, 96);
            g.font = 'bold 38px Arial'; g.fillText(id, 32, 62);
            g.fillStyle = '#f2f4f7'; g.font = '34px Arial'; g.fillText(title.length > 20 ? title.slice(0, 19) + '…' : title, 112, 62);
            return c;
        },
        sign(text, { bg = '#3a2a1c', fg = '#f1e6d0', w = 512, h = 160 } = {}) {
            const [c, g] = canvas(w, h);
            g.fillStyle = bg; g.fillRect(0, 0, w, h);
            overlay(g, w, h, noise(256, 16, 3, 91), 0.25);
            g.fillStyle = fg; g.font = `bold ${Math.round(h * 0.38)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(text, w / 2, h / 2 + 4);
            return c;
        },
        grassBlade() {
            seed(97);
            const W = 128, H = 128, [c, g] = canvas(W, H);
            for (let i = 0; i < 22; i++) { const x = R(10, W - 10), h = R(50, 125), lean = R(-18, 18); g.strokeStyle = `hsl(${R(70, 95)},${R(25, 45)}%,${R(22, 40)}%)`; g.lineWidth = R(2, 4); g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + lean * 0.3, H - h * 0.6, x + lean, H - h); g.stroke(); }
            return c;
        }
    };

    // ---------- public API ----------
    function surface(name, opts, rx, ry) {
        const key = name + JSON.stringify(opts || {});
        const c = once('c' + key, () => GEN[name](opts));
        const n = once('nm' + key, () => normalFrom(c, name === 'marble' || name === 'plaster' ? 0.6 : 2.5));
        return { map: tex(c, rx, ry), normalMap: tex(n, rx, ry, false) };
    }
    function pic(name, ...args) {
        const c = once('p' + name + JSON.stringify(args), () => (PIC[name] || GEN[name])(...args));
        const t = tex(c); t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
        return t;
    }
    // Standard PBR material from a generator
    function mat(name, opts, { repeat = [1, 1], rough = 0.7, metal = 0, normal = 1, color, ...extra } = {}) {
        const s2 = surface(name, opts, repeat[0], repeat[1]);
        const m = new T.MeshStandardMaterial({ map: s2.map, normalMap: s2.normalMap, roughness: rough, metalness: metal, ...extra });
        m.normalScale.set(normal, normal);
        if (color) m.color.set(color);
        return m;
    }
    return { mat, pic, surface, noise, normalFrom, canvasTex: tex, seed, rand, R };
})();
