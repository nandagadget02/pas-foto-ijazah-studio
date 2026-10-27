import { BackgroundEngine } from '../src/image/BackgroundEngine';
import { DEFAULT_BG_SETTINGS } from '../src/types/analysis';

const width = 60;
const height = 60;
const data = new Uint8ClampedArray(width * height * 4);

const bg = [30, 95, 195];
const shirt = [240, 240, 240];
const skin = [215, 165, 135];

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;
    const isSubjectCore = x >= 22 && x <= 38 && y >= 18 && y <= 55;
    const isSubjectEdge = (x >= 20 && x <= 40 && y >= 16 && y <= 55) && !isSubjectCore;

    if (isSubjectCore) {
      const color = y < 30 ? skin : shirt;
      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
      data[idx + 3] = 255;
    } else if (isSubjectEdge) {
      const color = y < 30 ? skin : shirt;
      data[idx] = Math.round(0.5 * bg[0] + 0.5 * color[0]);
      data[idx + 1] = Math.round(0.5 * bg[1] + 0.5 * color[1]);
      data[idx + 2] = Math.round(0.5 * bg[2] + 0.5 * color[2]);
      data[idx + 3] = 255;
    } else {
      data[idx] = bg[0];
      data[idx + 1] = bg[1];
      data[idx + 2] = bg[2];
      data[idx + 3] = 255;
    }
  }
}

// Prototype test with radius 2
const bgR = 30, bgG = 95, bgB = 195;
const tolerance = 30;
const classification = new Uint8Array(width * height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (x < 20 || x > 40 || y < 16) {
      classification[y * width + x] = 1;
    }
  }
}

const mask = new Float32Array(width * height);
const featherSpread = Math.max(0.6, Math.min(1.4, DEFAULT_BG_SETTINGS.edgeFeather * 0.35));

for (let y = 0; y < height; y++) {
  const rowOffset = y * width;
  for (let x = 0; x < width; x++) {
    const pIdx = rowOffset + x;
    if (classification[pIdx] === 1) {
      mask[pIdx] = 0.0;
      continue;
    }

    let hasBgNearby = false;
    for (let dy = -2; dy <= 2 && !hasBgNearby; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      const nRow = ny * width;
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (classification[nRow + nx] === 1) {
          hasBgNearby = true;
          break;
        }
      }
    }

    if (hasBgNearby) {
      const i = pIdx * 4;
      const r = data[i], g = data[i+1], b = data[i+2];

      let maxD = 0;
      let Fr = r, Fg = g, Fb = b;
      for (let dy = -3; dy <= 3; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        const nRow = ny * width;
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const nIdx = nRow + nx;
          if (classification[nIdx] === 0) {
            const ni = nIdx * 4;
            const nr = data[ni], ng = data[ni+1], nb = data[ni+2];
            const dist = Math.sqrt((nr - bgR)**2 + (ng - bgG)**2 + (nb - bgB)**2);
            if (dist > maxD) {
              maxD = dist;
              Fr = nr; Fg = ng; Fb = nb;
            }
          }
        }
      }

      const fdr = Fr - bgR, fdg = Fg - bgG, fdb = Fb - bgB;
      const normSq = 2 * fdr * fdr + 4 * fdg * fdg + 3 * fdb * fdb;
      const cdr = r - bgR, cdg = g - bgG, cdb = b - bgB;
      const dot = 2 * cdr * fdr + 4 * cdg * fdg + 3 * cdb * fdb;

      let rawAlpha: number;
      if (normSq > 400) {
        rawAlpha = Math.max(0, Math.min(1, dot / normSq));
      } else {
        const cDist = Math.sqrt(2 * cdr * cdr + 4 * cdg * cdg + 3 * cdb * cdb) / 1.732;
        const low = tolerance * 0.75;
        const high = tolerance * 1.4;
        rawAlpha = Math.max(0, Math.min(1, (cDist - low) / Math.max(1, high - low)));
      }

      const choke = Math.max(0.10, Math.min(0.24, 0.18 - (featherSpread - 1.0) * 0.05));
      if (rawAlpha <= choke) {
        mask[pIdx] = 0.0;
      } else {
        const t = (rawAlpha - choke) / (1.0 - choke);
        mask[pIdx] = t * t * (3 - 2 * t);
      }
    } else {
      mask[pIdx] = 1.0;
    }
  }
}

// Now test defringing and composite
const cutout = new Uint8ClampedArray(data);
const spillFactor = Math.min(1.0, (DEFAULT_BG_SETTINGS.spillRemoval / 100) * 1.15);
const isBlueBg = true;

for (let y = 0; y < height; y++) {
  const rowOffset = y * width;
  for (let x = 0; x < width; x++) {
    const pIdx = rowOffset + x;
    const alpha = mask[pIdx];
    if (alpha <= 0.001) continue;

    const isNearEdge = alpha < 0.98 || (
      (x > 0 && mask[pIdx - 1] < 0.95) ||
      (x < width - 1 && mask[pIdx + 1] < 0.95) ||
      (y > 0 && mask[pIdx - width] < 0.95) ||
      (y < height - 1 && mask[pIdx + width] < 0.95)
    );

    if (isNearEdge) {
      const i = pIdx * 4;
      let r = cutout[i], g = cutout[i+1], b = cutout[i+2];

      if (alpha < 0.96 && alpha > 0.04) {
        const bgWeight = 1.0 - alpha;
        const effAlpha = Math.max(0.18, alpha);
        const unmixR = Math.max(0, Math.min(255, (r - bgWeight * bgR) / effAlpha));
        const unmixG = Math.max(0, Math.min(255, (g - bgWeight * bgG) / effAlpha));
        const unmixB = Math.max(0, Math.min(255, (b - bgWeight * bgB) / effAlpha));

        r = Math.round(r * (1 - spillFactor) + unmixR * spillFactor);
        g = Math.round(g * (1 - spillFactor) + unmixG * spillFactor);
        b = Math.round(b * (1 - spillFactor) + unmixB * spillFactor);
      }

      if (isBlueBg) {
        const maxRG = Math.max(r, g);
        if (b > maxRG) {
          const targetB = Math.round((r + g) * 0.5);
          b = Math.round(b * (1 - spillFactor) + targetB * spillFactor);
        }
        if (r >= 120 && g >= 120) {
          const maxChan = Math.max(r, g, b);
          r = Math.max(r, Math.round(maxChan * 0.96));
          g = Math.max(g, Math.round(maxChan * 0.96));
          b = Math.min(b, Math.max(r, g));
        }
      }

      cutout[i] = r;
      cutout[i+1] = g;
      cutout[i+2] = b;
    }
  }
}

console.log('--- COMPOSITING ON WHITE BACKGROUND [255, 255, 255] ---');
for (let x = 18; x <= 23; x++) {
  const pIdx = 40 * width + x;
  const i = pIdx * 4;
  const alpha = mask[pIdx];
  const r = cutout[i], g = cutout[i+1], b = cutout[i+2];
  const finalR = Math.round(r * alpha + 255 * (1 - alpha));
  const finalG = Math.round(g * alpha + 255 * (1 - alpha));
  const finalB = Math.round(b * alpha + 255 * (1 - alpha));
  console.log(`x=${x}: alpha=${alpha.toFixed(2)} | Cutout RGB=[${r}, ${g}, ${b}] => Output on White=[${finalR}, ${finalG}, ${finalB}]`);
}
