import { BackgroundEngine } from '../src/image/BackgroundEngine';
import { DEFAULT_BG_SETTINGS, BackgroundType } from '../src/types/analysis';

console.log('===============================================================');
console.log('   QA TEST SUITE: EDGE DECONTAMINATION & COLOR FRINGE REMOVAL   ');
console.log('===============================================================');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✔ ${msg}`);
}

function createBlueStudioPhoto(): ImageData {
  const width = 200;
  const height = 300;
  const data = new Uint8ClampedArray(width * height * 4);

  // Background: Studio Blue [35, 75, 175] with subtle lighting gradient
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 35;
      data[idx + 1] = 75;
      data[idx + 2] = 175;
      data[idx + 3] = 255;
    }
  }

  // Head: Black hair (y: 25..85, x: 70..130)
  for (let y = 25; y <= 85; y++) {
    for (let x = 70; x <= 130; x++) {
      const dx = x - 100;
      const dy = y - 60;
      if (dx * dx + dy * dy < 32 * 32) {
        const idx = (y * width + x) * 4;
        const distFromEdge = 32 - Math.sqrt(dx * dx + dy * dy);
        if (distFromEdge <= 4) {
          // Blue optical spill on outer hair strands
          data[idx] = 16;
          data[idx + 1] = 32;
          data[idx + 2] = 115; // strong blue spill
        } else {
          // Interior hair
          data[idx] = 18;
          data[idx + 1] = 20;
          data[idx + 2] = 22;
        }
      }
    }
  }

  // Face & Ears (y: 65..125, x: 70..130)
  for (let y = 65; y <= 125; y++) {
    for (let x = 70; x <= 130; x++) {
      const dx = x - 100;
      const dy = y - 95;
      if (dx * dx + dy * dy < 28 * 28) {
        const idx = (y * width + x) * 4;
        if (x <= 75 || x >= 125) {
          data[idx] = 85;
          data[idx + 1] = 80;
          data[idx + 2] = 95;
        } else {
          data[idx] = 210;
          data[idx + 1] = 160;
          data[idx + 2] = 130;
        }
      }
    }
  }

  // White Shirt Collar (y: 125..155, x: 80..120)
  for (let y = 125; y <= 155; y++) {
    for (let x = 80; x <= 120; x++) {
      const idx = (y * width + x) * 4;
      if (x <= 83 || x >= 117) {
        data[idx] = 180;
        data[idx + 1] = 200;
        data[idx + 2] = 240;
      } else {
        data[idx] = 245;
        data[idx + 1] = 245;
        data[idx + 2] = 245;
      }
    }
  }

  // Black Suit & Shoulders (y: 140..300, x: 40..160)
  for (let y = 140; y < height; y++) {
    const halfW = 45 + (y - 140) * 0.40;
    const startX = Math.max(0, Math.floor(100 - halfW));
    const endX = Math.min(width - 1, Math.floor(100 + halfW));
    for (let x = startX; x <= endX; x++) {
      const idx = (y * width + x) * 4;
      const distFromShoulderEdge = Math.min(x - startX, endX - x);
      if (distFromShoulderEdge <= 4) {
        data[idx] = 38;
        data[idx + 1] = 68;
        data[idx + 2] = 78;
      } else {
        data[idx] = 30;
        data[idx + 1] = 32;
        data[idx + 2] = 33;
      }
    }
  }

  return { width, height, data } as any;
}

function createFreshMockCanvas(width: number, height: number) {
  const pixelBuffer = new Uint8ClampedArray(width * height * 4);
  const ctx = {
    getImageData: () => ({ width, height, data: new Uint8ClampedArray(pixelBuffer) }),
    putImageData: (img: any) => {
      pixelBuffer.set(img.data);
    },
    createImageData: (w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4)
    }),
    clearRect: () => {
      pixelBuffer.fill(0);
    },
    fillRect: () => {
      let r = 255, g = 255, b = 255;
      if (ctx.fillStyle === '#ffffff') { r = 255; g = 255; b = 255; }
      else if (ctx.fillStyle === '#c0181e') { r = 192; g = 24; b = 30; }
      for (let i = 0; i < pixelBuffer.length; i += 4) {
        pixelBuffer[i] = r;
        pixelBuffer[i + 1] = g;
        pixelBuffer[i + 2] = b;
        pixelBuffer[i + 3] = 255;
      }
    },
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    drawImage: (img: any) => {
      if (img && img.getContext) {
        const subData = img.getContext('2d').getImageData().data;
        for (let i = 0; i < pixelBuffer.length; i += 4) {
          const a = subData[i + 3] / 255;
          pixelBuffer[i] = Math.round(subData[i] * a + pixelBuffer[i] * (1 - a));
          pixelBuffer[i + 1] = Math.round(subData[i + 1] * a + pixelBuffer[i + 1] * (1 - a));
          pixelBuffer[i + 2] = Math.round(subData[i + 2] * a + pixelBuffer[i + 2] * (1 - a));
          pixelBuffer[i + 3] = 255;
        }
      }
    },
    filter: '',
    fillStyle: '#ffffff',
  };

  const canvas = {
    width,
    height,
    getContext: () => ctx,
    _buffer: pixelBuffer,
  };
  return canvas as any;
}

(global as any).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      return createFreshMockCanvas(200, 300);
    }
    return {};
  }
};

const srcImgData = createBlueStudioPhoto();

// --------------------------------------------------------------------------
// TEST 1: Background Segmentation & Safety Confidence
// --------------------------------------------------------------------------
console.log('\n[TEST 1] Segmentation & Confidence Analysis on Blue Studio Photo');
const maskInfo = BackgroundEngine.computeSubjectMask(srcImgData, DEFAULT_BG_SETTINGS);
assert(maskInfo.safety.isSafe === true, 'Segmentation marked safe');
assert(maskInfo.safety.detectedBgColor === 'Biru', `Detected background color is 'Biru' (got ${maskInfo.safety.detectedBgColor})`);
assert(maskInfo.bgB > maskInfo.bgR + 50, 'Background blue channel sampled cleanly');

// --------------------------------------------------------------------------
// TEST 2: Mask Boundary Precision (Strict 0.0 outside, 1.0 inside)
// --------------------------------------------------------------------------
console.log('\n[TEST 2] Mask Boundary Precision on Hair & Shoulders');
const { mask } = maskInfo;
assert(mask[0] === 0.0, 'Top-left background mask is strictly 0.0');
assert(mask[199] === 0.0, 'Top-right background mask is strictly 0.0');
assert(mask[50 * 200 + 60] === 0.0, 'Left of hair is strictly 0.0');
assert(mask[50 * 200 + 140] === 0.0, 'Right of hair is strictly 0.0');
assert(mask[50 * 200 + 100] === 1.0, 'Interior hair core is 100% solid (mask = 1.0)');
assert(mask[90 * 200 + 100] === 1.0, 'Interior face skin is 100% solid (mask = 1.0)');
assert(mask[200 * 200 + 100] === 1.0, 'Interior suit chest is 100% solid (mask = 1.0)');

// --------------------------------------------------------------------------
// TEST 3: Edge Decontamination on Hair (Removing Blue Fringe)
// --------------------------------------------------------------------------
console.log('\n[TEST 3] Decontamination on Hair Strands (Zero Blue Fringe)');
const targetCanvas = createFreshMockCanvas(200, 300);
targetCanvas.getContext('2d').putImageData(srcImgData);

BackgroundEngine.applyBackgroundReplacement(
  targetCanvas,
  'white',
  null,
  DEFAULT_BG_SETTINGS,
  maskInfo
);

const finalResult = targetCanvas._buffer;

// Examine hair border pixels (around x = 70..75, y = 60)
let maxBlueExcessInHair = -999;
for (let x = 70; x <= 76; x++) {
  const pIdx = 60 * 200 + x;
  if (mask[pIdx] > 0.3) {
    const r = finalResult[pIdx * 4];
    const g = finalResult[pIdx * 4 + 1];
    const b = finalResult[pIdx * 4 + 2];
    const excessB = b - Math.max(r, g);
    if (excessB > maxBlueExcessInHair) maxBlueExcessInHair = excessB;
    console.log(`  Hair border x=${x} [final: ${r}, ${g}, ${b}] excessB=${excessB}`);
  }
}
console.log(`  Max blue excess in hair boundary: ${maxBlueExcessInHair}`);
assert(maxBlueExcessInHair <= 5, 'Hair border blue excess is completely eliminated (<= 5)');

// --------------------------------------------------------------------------
// TEST 4: Edge Decontamination on Suit & Shoulders (Removing Cyan/Blue Rim)
// --------------------------------------------------------------------------
console.log('\n[TEST 4] Decontamination on Black Suit & Shoulder Contour');
let maxCyanExcessInSuit = -999;
for (let x = 31; x <= 38; x++) {
  const pIdx = 200 * 200 + x;
  if (mask[pIdx] > 0.3) {
    const r = finalResult[pIdx * 4];
    const g = finalResult[pIdx * 4 + 1];
    const b = finalResult[pIdx * 4 + 2];
    const excessB = b - r;
    const excessG = g - r;
    const excess = Math.max(excessB, excessG);
    if (excess > maxCyanExcessInSuit) maxCyanExcessInSuit = excess;
    console.log(`  Suit border x=${x} [final: ${r}, ${g}, ${b}] excessCyan=${excess}`);
  }
}
console.log(`  Max cyan excess in suit boundary: ${maxCyanExcessInSuit}`);
assert(maxCyanExcessInSuit <= 8, 'Suit border cyan/blue rim is neutralized to dark neutral cloth (<= 8)');

// --------------------------------------------------------------------------
// TEST 5: Edge Decontamination on Ear Rim (Warm Skin Tone Preserved)
// --------------------------------------------------------------------------
console.log('\n[TEST 5] Decontamination on Ear & Cheek Rim');
const earRimIdx = 95 * 200 + 73;
const earR = finalResult[earRimIdx * 4];
const earG = finalResult[earRimIdx * 4 + 1];
const earB = finalResult[earRimIdx * 4 + 2];
console.log(`  Ear rim composite color: [${earR}, ${earG}, ${earB}]`);
assert(earR >= earG - 5, 'Ear rim retains natural warmth (R >= G - 5, no grayish-cyan tint)');

// --------------------------------------------------------------------------
// TEST 6: White Shirt Collar Integrity (Clean Crisp White, No Halo)
// --------------------------------------------------------------------------
console.log('\n[TEST 6] White Shirt Collar Integrity');
const collarIdx = 135 * 200 + 82;
const colR = finalResult[collarIdx * 4];
const colG = finalResult[collarIdx * 4 + 1];
const colB = finalResult[collarIdx * 4 + 2];
console.log(`  Collar composite color: [${colR}, ${colG}, ${colB}]`);
assert(colR >= 170 && colG >= 170 && colB >= 170, 'Collar is bright clean white');
assert(Math.abs(colB - colR) <= 15, 'Collar has zero blue halo (|B - R| <= 15)');

// --------------------------------------------------------------------------
// TEST 7: Cross-Color Compatibility (White, Gray, Red, Blue Backdrops)
// --------------------------------------------------------------------------
console.log('\n[TEST 7] Cross-Color Background Compatibility');
const backdrops: BackgroundType[] = ['white', 'gray', 'red', 'blue'];
for (const bg of backdrops) {
  const bgCanvas = createFreshMockCanvas(200, 300);
  bgCanvas.getContext('2d').putImageData(srcImgData);
  const result = BackgroundEngine.applyBackgroundReplacement(
    bgCanvas,
    bg,
    null,
    DEFAULT_BG_SETTINGS,
    maskInfo
  );
  assert(result.isSafe === true, `Applied '${bg}' background cleanly and safely`);
}

console.log('\n===============================================================');
console.log('   ALL 7 DECONTAMINATION QA SCENARIOS PASSED WITH 100%!        ');
console.log('===============================================================');
