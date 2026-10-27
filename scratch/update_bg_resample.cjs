const fs = require('fs');
let code = fs.readFileSync('src/image/BackgroundEngine.ts', 'utf8');
const search = 'if (customMask && customMask.length === width * height) {';
const idx = code.indexOf(search);
if (idx !== -1) {
  const endIdx = code.indexOf('return { mask, safety', idx);
  const before = code.substring(0, idx);
  const after = code.substring(endIdx);
  const rep = `if (customMask) {
      if (customMask.length === width * height) {
        for (let i = 0; i < mask.length; i++) {
          mask[i] = customMask[i];
        }
      } else {
        const srcW = Math.round(Math.sqrt((customMask.length * width) / height));
        const srcH = Math.round(customMask.length / srcW);
        if (srcW > 0 && srcH > 0 && srcW * srcH === customMask.length) {
          for (let y = 0; y < height; y++) {
            const srcY = Math.min(srcH - 1, Math.max(0, (y / (height - 1)) * (srcH - 1)));
            const y0 = Math.floor(srcY);
            const y1 = Math.min(srcH - 1, y0 + 1);
            const fy = srcY - y0;

            for (let x = 0; x < width; x++) {
              const srcX = Math.min(srcW - 1, Math.max(0, (x / (width - 1)) * (srcW - 1)));
              const x0 = Math.floor(srcX);
              const x1 = Math.min(srcW - 1, x0 + 1);
              const fx = srcX - x0;

              const v00 = customMask[y0 * srcW + x0];
              const v10 = customMask[y0 * srcW + x1];
              const v01 = customMask[y1 * srcW + x0];
              const v11 = customMask[y1 * srcW + x1];

              const top = v00 * (1 - fx) + v10 * fx;
              const btm = v01 * (1 - fx) + v11 * fx;
              mask[y * width + x] = top * (1 - fy) + btm * fy;
            }
          }
        }
      }
    }

    `;
  fs.writeFileSync('src/image/BackgroundEngine.ts', before + rep + after, 'utf8');
  console.log('Successfully updated BackgroundEngine.ts!');
} else {
  console.log('Search pattern not found');
}
