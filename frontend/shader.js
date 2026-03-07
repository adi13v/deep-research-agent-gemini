/**
 * Ordered 4x4 Bayer dithering sphere — rendered directly on canvas.
 *
 * Technique: per-pixel ray-sphere intersection, lambertian shading,
 * threshold against the Bayer 4x4 matrix → 1-bit acid green / black.
 * Runs at half CSS resolution, upscaled with image-rendering: pixelated.
 */
(function () {
    const canvas = document.getElementById('dither-canvas');
    const ctx = canvas.getContext('2d');

    // Bayer 4×4 ordered dither matrix (normalised to [0, 1))
    const BAYER = [
        0, 8, 2, 10,
        12, 4, 14, 6,
        3, 11, 1, 9,
        15, 7, 13, 5,
    ].map(v => v / 16);

    const FG = [232, 255, 58]; // --accent #e8ff3a
    const BG = [0, 0, 0];

    // Light direction (normalised)
    const _ll = Math.sqrt(0.5 * 0.5 + 0.5 * 0.5 + 0.7 * 0.7);
    const LX = 0.5 / _ll, LY = -0.5 / _ll, LZ = 0.7 / _ll;

    // State that depends on canvas physical size
    let IW, IH, img, data, cx, cy, R;

    function initSize() {
        IW = Math.max(1, Math.floor(window.innerWidth / 2));
        IH = Math.max(1, Math.floor(window.innerHeight / 2));
        canvas.width = IW;
        canvas.height = IH;
        img = ctx.createImageData(IW, IH);
        data = img.data;
        cx = IW / 2;
        cy = IH / 2;
        R = Math.min(IW, IH) * 0.42;
    }

    // Defer until layout is complete so getBoundingClientRect is valid
    window.addEventListener('load', initSize);
    window.addEventListener('resize', initSize);
    // Also try immediately (works if script runs after layout)
    initSize();

    function render(ts) {
        if (!img) { requestAnimationFrame(render); return; }

        const t = ts * 0.001;
        const cosT = Math.cos(t * 0.4);
        const sinT = Math.sin(t * 0.4);

        for (let y = 0; y < IH; y++) {
            for (let x = 0; x < IW; x++) {
                const dx = (x - cx) / R;
                const dy = (y - cy) / R;
                const d2 = dx * dx + dy * dy;

                let bright = 0;

                if (d2 <= 1.0) {
                    const nz0 = Math.sqrt(1 - d2);
                    // Y-axis rotation
                    const nx = cosT * dx + sinT * nz0;
                    const ny = dy;
                    const nz = -sinT * dx + cosT * nz0;
                    // Lambertian + ambient
                    const dot = nx * LX + ny * LY + nz * LZ;
                    bright = 0.12 + Math.max(0, dot) * 0.88;
                }

                const threshold = BAYER[(y % 4) * 4 + (x % 4)];
                const color = bright > threshold ? FG : BG;

                const i = (y * IW + x) * 4;
                data[i] = color[0];
                data[i + 1] = color[1];
                data[i + 2] = color[2];
                data[i + 3] = 255;
            }
        }

        ctx.putImageData(img, 0, 0);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
})();
