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

// Simulated BG detection
const bgR = 30, bgG = 95, bgB = 195;
const tolerance = 30;

// Test the projection math for boundary pixel at x=20, y=40:
const pIdx = 40 * width + 20;
const i = pIdx * 4;
const r = data[i], g = data[i+1], b = data[i+2];

// Find local foreground in 5x5 window
let maxD = 0;
let Fr = r, Fg = g, Fb = b;
for (let dy = -2; dy <= 2; dy++) {
  for (let dx = -2; dx <= 2; dx++) {
    const nx = 20 + dx;
    const ny = 40 + dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const nIdx = (ny * width + nx) * 4;
      const nr = data[nIdx], ng = data[nIdx+1], nb = data[nIdx+2];
      const dist = Math.sqrt((nr - bgR)**2 + (ng - bgG)**2 + (nb - bgB)**2);
      if (dist > maxD) {
        maxD = dist;
        Fr = nr;
        Fg = ng;
        Fb = nb;
      }
    }
  }
}

console.log(`Local foreground sampled: Fr=${Fr}, Fg=${Fg}, Fb=${Fb}, maxD=${maxD.toFixed(1)}`);

const fdr = Fr - bgR, fdg = Fg - bgG, fdb = Fb - bgB;
const normSq = 2 * fdr * fdr + 4 * fdg * fdg + 3 * fdb * fdb;

const cdr = r - bgR, cdg = g - bgG, cdb = b - bgB;
const dot = 2 * cdr * fdr + 4 * cdg * fdg + 3 * cdb * fdb;

let rawAlpha = Math.max(0, Math.min(1, dot / normSq));
console.log(`Boundary pixel: RGB=[${r}, ${g}, ${b}] => rawAlpha=${rawAlpha.toFixed(3)}`);

const choke = 0.18;
let alpha = 0;
if (rawAlpha > choke) {
  const t = (rawAlpha - choke) / (1 - choke);
  alpha = t * t * (3 - 2 * t);
}
console.log(`After choke & smoothstep: alpha=${alpha.toFixed(3)}`);

// Now unmix and defringe
const bgWeight = 1 - alpha;
const effAlpha = Math.max(0.20, alpha);
let unmixR = Math.max(0, Math.min(255, (r - bgWeight * bgR) / effAlpha));
let unmixG = Math.max(0, Math.min(255, (g - bgWeight * bgG) / effAlpha));
let unmixB = Math.max(0, Math.min(255, (b - bgWeight * bgB) / effAlpha));

// Defringe blue: b should not exceed max(r, g)
if (unmixB > Math.max(unmixR, unmixG)) {
  unmixB = Math.round((unmixR + unmixG) * 0.5);
}

console.log(`Unmixed cutout RGB: [${Math.round(unmixR)}, ${Math.round(unmixG)}, ${Math.round(unmixB)}]`);

// Composite onto new White background [255, 255, 255]
const finalR = Math.round(unmixR * alpha + 255 * (1 - alpha));
const finalG = Math.round(unmixG * alpha + 255 * (1 - alpha));
const finalB = Math.round(unmixB * alpha + 255 * (1 - alpha));

console.log(`Final pixel on white background: [${finalR}, ${finalG}, ${finalB}]`);
