import { BackgroundEngine } from '../src/image/BackgroundEngine';
import { BackgroundSettings, DEFAULT_BG_SETTINGS } from '../src/types/analysis';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
  console.log(`✓ PASS: ${msg}`);
}

console.log('--- TEST SUITE: PREVENT SUBJECT PIXEL LOSS DURING BACKGROUND REMOVAL ---');

// Helper to create synthetic test image data
function createTestImage(
  width: number,
  height: number,
  bgR: number,
  bgG: number,
  bgB: number,
  options: {
    hijabColor?: [number, number, number];
    shirtColor?: [number, number, number];
    skinColor?: [number, number, number];
    sleevesTouchBorders?: boolean;
  } = {}
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  const hijab = options.hijabColor || [30, 30, 30]; // default dark/black hijab
  const shirt = options.shirtColor || [235, 235, 240]; // default white shirt
  const skin = options.skinColor || [210, 160, 130]; // default skin tone

  for (let y = 0; y < height; y++) {
    const yRel = y / height;
    for (let x = 0; x < width; x++) {
      const xRel = x / width;
      const pIdx = (y * width + x) * 4;

      // 1. Torso / Shirt (y > 0.50)
      if (yRel >= 0.50) {
        // Body spans across center, widening to edges
        const depth = (yRel - 0.50) / 0.50;
        const halfSpan = 0.25 + depth * (options.sleevesTouchBorders !== false ? 0.30 : 0.15);
        if (Math.abs(xRel - 0.50) <= halfSpan) {
          data[pIdx] = shirt[0];
          data[pIdx + 1] = shirt[1];
          data[pIdx + 2] = shirt[2];
          data[pIdx + 3] = 255;
          continue;
        }
      }

      // 2. Head / Hijab (y between 0.15 and 0.55, centered)
      const headDist = Math.sqrt(((xRel - 0.50) / 0.22) ** 2 + ((yRel - 0.35) / 0.20) ** 2);
      if (headDist <= 1.0) {
        // Face inside head
        const faceDist = Math.sqrt(((xRel - 0.50) / 0.12) ** 2 + ((yRel - 0.35) / 0.12) ** 2);
        if (faceDist <= 0.8) {
          data[pIdx] = skin[0];
          data[pIdx + 1] = skin[1];
          data[pIdx + 2] = skin[2];
          data[pIdx + 3] = 255;
        } else {
          // Hijab / Hair
          data[pIdx] = hijab[0];
          data[pIdx + 1] = hijab[1];
          data[pIdx + 2] = hijab[2];
          data[pIdx + 3] = 255;
        }
        continue;
      }

      // Background
      data[pIdx] = bgR;
      data[pIdx + 1] = bgG;
      data[pIdx + 2] = bgB;
      data[pIdx + 3] = 255;
    }
  }

  return {
    width,
    height,
    data,
    colorSpace: 'srgb',
  } as ImageData;
}

// TEST 1: WHITE SHIRT ON WHITE BACKGROUND WITH SLEEVES TOUCHING EDGES
console.log('\n[1] White Shirt on White Background (Sleeves touching left & right edges):');
const imgWhiteOnWhite = createTestImage(400, 600, 245, 245, 248, {
  shirtColor: [230, 230, 235],
  sleevesTouchBorders: true,
});

const resWhite = BackgroundEngine.computeSubjectMask(imgWhiteOnWhite, DEFAULT_BG_SETTINGS);
const maskWhite = resWhite.mask;

// Check chest/torso center (x=200, y=450)
const chestIdx = 450 * 400 + 200;
assert(maskWhite[chestIdx] === 1.0, 'Chest / Torso core has solid mask = 1.0');

// Check right sleeve touching right border (x=390, y=550)
const rightSleeveIdx = 550 * 400 + 390;
assert(maskWhite[rightSleeveIdx] === 1.0, 'Right sleeve near edge has solid mask = 1.0 (no leak from right border!)');

// Check left sleeve touching left border (x=10, y=550)
const leftSleeveIdx = 550 * 400 + 10;
assert(maskWhite[leftSleeveIdx] === 1.0, 'Left sleeve near edge has solid mask = 1.0 (no leak from left border!)');

// Check true background at top corner (x=20, y=20)
const topBgIdx = 20 * 400 + 20;
assert(maskWhite[topBgIdx] === 0.0, 'Top background has mask = 0.0');

// TEST 2: BLACK HIJAB ON LIGHT / NEUTRAL BACKGROUND
console.log('\n[2] Black Kerudung / Hijab on Light Background:');
const imgBlackHijab = createTestImage(400, 600, 235, 235, 240, {
  hijabColor: [35, 35, 38], // Dark black hijab
  shirtColor: [235, 235, 240],
});

const resHijab = BackgroundEngine.computeSubjectMask(imgBlackHijab, DEFAULT_BG_SETTINGS);
const maskHijab = resHijab.mask;

// Check hijab area near head crown / temples (x=160, y=200)
const hijabIdx = 200 * 400 + 160;
assert(maskHijab[hijabIdx] === 1.0, 'Dark hijab is not treated as background shadow (mask = 1.0)');

// Check face center (x=200, y=210)
const faceIdx = 210 * 400 + 200;
assert(maskHijab[faceIdx] === 1.0, 'Face center has solid mask = 1.0');

// TEST 3: BLUE STUDIO BACKDROP & RED STUDIO BACKDROP
console.log('\n[3] Standard Official Red & Blue Studio Backdrops:');
// Blue backdrop (e.g. Pas Foto Resmi Biru)
const imgBlueBg = createTestImage(400, 600, 15, 60, 190, {
  shirtColor: [240, 240, 245],
  hijabColor: [30, 30, 30],
  sleevesTouchBorders: false, // Normal pas foto framing where background flanks shoulders
});
const resBlue = BackgroundEngine.computeSubjectMask(imgBlueBg, DEFAULT_BG_SETTINGS);
assert(resBlue.safety.isSafe, 'Blue backdrop segmentation is safe');
assert(resBlue.mask[chestIdx] === 1.0, 'White shirt on blue backdrop is 100% solid');
assert(resBlue.mask[topBgIdx] === 0.0, 'Blue background at top-left is cleanly 0.0');
assert(resBlue.mask[350 * 400 + 20] === 0.0, 'Blue background at mid-left is cleanly 0.0 (removed)');
assert(resBlue.mask[350 * 400 + 380] === 0.0, 'Blue background at mid-right is cleanly 0.0 (removed)');
assert(resBlue.mask[450 * 400 + 20] === 0.0, 'Blue background at lower-left is cleanly 0.0 (removed)');

// Red backdrop (e.g. Pas Foto Resmi Merah)
const imgRedBg = createTestImage(400, 600, 200, 25, 25, {
  shirtColor: [240, 240, 245],
  hijabColor: [30, 30, 30],
  sleevesTouchBorders: false,
});
const resRed = BackgroundEngine.computeSubjectMask(imgRedBg, DEFAULT_BG_SETTINGS);
assert(resRed.safety.isSafe, 'Red backdrop segmentation is safe');
assert(resRed.mask[chestIdx] === 1.0, 'White shirt on red backdrop is 100% solid');
assert(resRed.mask[topBgIdx] === 0.0, 'Red background at top-left is cleanly 0.0');
assert(resRed.mask[350 * 400 + 20] === 0.0, 'Red background at mid-left is cleanly 0.0 (removed)');
assert(resRed.mask[350 * 400 + 380] === 0.0, 'Red background at mid-right is cleanly 0.0 (removed)');
assert(resRed.mask[450 * 400 + 20] === 0.0, 'Red background at lower-left is cleanly 0.0 (removed)');

// TEST 4: NO UNINTENDED HOLES INSIDE SUBJECT CORE (TOPOLOGICAL INTEGRITY)
console.log('\n[4] Zero Transparency Holes across Torso & Head Columns:');
let internalHolesFound = 0;
// Sample grid across torso (y: 350 to 580, x: 150 to 250)
for (let y = 350; y < 580; y += 10) {
  for (let x = 150; x < 250; x += 10) {
    if (maskWhite[y * 400 + x] < 0.99) {
      internalHolesFound++;
    }
  }
}
assert(internalHolesFound === 0, 'Zero transparent holes found in subject torso area');

console.log('\n======================================================');
console.log('ALL SUBJECT LOSS PREVENTION TESTS PASSED 100%!');
console.log('======================================================');
