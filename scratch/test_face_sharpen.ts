/**
 * Automated Verification Script for Penajaman Wajah (AI)
 * (Face Sharpening Filter, Non-Generative, Anti-Halo, Single & Batch, Preview & Export)
 */

import { SharpenEngine } from '../src/image/SharpenEngine';
import {
  FaceSharpenSettings,
  DEFAULT_FACE_SHARPEN_SETTINGS,
  AdjustmentParams,
} from '../src/types/analysis';

// Node polyfill for ImageData
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(width: number, height: number, data?: Uint8ClampedArray) {
    this.width = width;
    this.height = height;
    this.data = data || new Uint8ClampedArray(width * height * 4);
  }
}

if (typeof (global as any).ImageData === 'undefined') {
  (global as any).ImageData = MockImageData;
}

// Generate a synthetic test passport portrait
function createSyntheticPassportImage(width = 200, height = 260): ImageData {
  const imgData = new MockImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    const yRel = y / height;
    for (let x = 0; x < width; x++) {
      const xRel = x / width;
      const idx = (y * width + x) * 4;

      // Background (blue backdrop)
      let r = 35;
      let g = 80;
      let b = 180;

      // Subject oval (head & shoulders)
      const isHead =
        Math.pow((xRel - 0.5) / 0.28, 2) + Math.pow((yRel - 0.45) / 0.35, 2) < 1.0;
      const isShoulders = yRel >= 0.70 && Math.abs(xRel - 0.5) < 0.45;

      if (isHead) {
        // Face skin color (Asian/Indonesian standard skin tone: R ~ 215, G ~ 170, B ~ 135)
        r = 215;
        g = 170;
        b = 135;

        // Eyes (Left eye ~ (0.38, 0.36), Right eye ~ (0.62, 0.36))
        const isLeftEye =
          Math.pow((xRel - 0.385) / 0.04, 2) + Math.pow((yRel - 0.365) / 0.025, 2) < 1.0;
        const isRightEye =
          Math.pow((xRel - 0.615) / 0.04, 2) + Math.pow((yRel - 0.365) / 0.025, 2) < 1.0;

        if (isLeftEye || isRightEye) {
          // Dark iris / pupil
          r = 45;
          g = 35;
          b = 30;
        }

        // Eyebrows
        const isEyebrow =
          yRel >= 0.29 && yRel <= 0.32 && ((xRel >= 0.32 && xRel <= 0.45) || (xRel >= 0.55 && xRel <= 0.68));
        if (isEyebrow) {
          r = 55;
          g = 45;
          b = 40;
        }

        // Lips
        const isLip =
          Math.pow((xRel - 0.50) / 0.08, 2) + Math.pow((yRel - 0.58) / 0.03, 2) < 1.0;
        if (isLip) {
          r = 190;
          g = 95;
          b = 95;
        }
      } else if (isShoulders) {
        // Dark suit
        r = 30;
        g = 32;
        b = 38;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  return imgData as any as ImageData;
}

function cloneImageData(src: ImageData): ImageData {
  const copy = new MockImageData(src.width, src.height);
  copy.data.set(src.data);
  return copy as any as ImageData;
}

function toTrueGrayscale(imgData: ImageData): void {
  for (let i = 0; i < imgData.data.length; i += 4) {
    const y = Math.round(0.299 * imgData.data[i] + 0.587 * imgData.data[i + 1] + 0.114 * imgData.data[i + 2]);
    imgData.data[i] = y;
    imgData.data[i + 1] = y;
    imgData.data[i + 2] = y;
  }
}

async function runFaceSharpenTests() {
  console.log('--- STARTING PENAJAMAN WAJAH (AI) AUTOMATED VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`\x1b[32m✔ [PASS]\x1b[0m ${testName}`);
      passed++;
    } else {
      console.error(`\x1b[31m✖ [FAIL]\x1b[0m ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Default ON and Toggle Behavior
  console.log('\n[TEST GROUP 1] Default ON and Toggle Behavior');
  assert(DEFAULT_FACE_SHARPEN_SETTINGS.enabled === true, 'Default toggle state is ON (enabled: true)');
  assert(DEFAULT_FACE_SHARPEN_SETTINGS.intensity === 40, 'Default intensity is conservative (40%)');
  assert(DEFAULT_FACE_SHARPEN_SETTINGS.radius === 1.2, 'Default radius is conservative (1.2 px)');
  assert(DEFAULT_FACE_SHARPEN_SETTINGS.threshold === 4, 'Default threshold is 4');

  const testImg = createSyntheticPassportImage(120, 150);
  toTrueGrayscale(testImg);
  const beforeImg = cloneImageData(testImg);

  // Applying with enabled: false should strictly make 0 pixel modifications
  SharpenEngine.applyFaceSharpenFilter(testImg, { ...DEFAULT_FACE_SHARPEN_SETTINGS, enabled: false }, 'bw', null);
  let diffCountOff = 0;
  for (let i = 0; i < testImg.data.length; i++) {
    if (testImg.data[i] !== beforeImg.data[i]) diffCountOff++;
  }
  assert(diffCountOff === 0, 'When toggle is OFF, zero pixels are modified (0 diff)');

  // 2. Toggle ON behavior
  console.log('\n[TEST GROUP 2] Toggle ON & Feature Sharpening Verification');
  const sharpenSettingsON: FaceSharpenSettings = {
    enabled: true,
    intensity: 50,
    radius: 1.2,
    threshold: 4,
  };

  const testImgON = cloneImageData(beforeImg);
  SharpenEngine.applyFaceSharpenFilter(testImgON, sharpenSettingsON, 'bw', null);

  let totalDiff = 0;
  let eyeDiffCount = 0;
  let smoothSkinDiffCount = 0;

  const w = testImgON.width;
  const h = testImgON.height;

  for (let y = 0; y < h; y++) {
    const yRel = y / h;
    for (let x = 0; x < w; x++) {
      const xRel = x / w;
      const idx = (y * w + x) * 4;
      const diff = Math.abs(testImgON.data[idx] - beforeImg.data[idx]);
      totalDiff += diff;

      // Eye contour region
      if (Math.abs(xRel - 0.385) < 0.05 && Math.abs(yRel - 0.365) < 0.04) {
        if (diff > 0) eyeDiffCount++;
      }

      // Smooth cheek region (should be protected from sharpening noise)
      if (Math.abs(xRel - 0.50) < 0.04 && Math.abs(yRel - 0.46) < 0.04) {
        if (diff > 0) smoothSkinDiffCount++;
      }
    }
  }

  assert(totalDiff > 0, 'When toggle is ON, sharpening is actively applied');
  assert(eyeDiffCount > 0, 'Eye/iris/eyelid features are successfully sharpened');
  assert(smoothSkinDiffCount === 0 || smoothSkinDiffCount < eyeDiffCount * 0.1, 'Smooth cheek skin is shielded by skin protection & threshold');

  // 3. Geometry & Identity Lock Verification
  console.log('\n[TEST GROUP 3] Geometry & True Identity Lock');
  // Dimensions must remain exact
  assert(testImgON.width === beforeImg.width && testImgON.height === beforeImg.height, 'Image dimensions are strictly preserved');
  // Alpha channel must remain 255
  let alphaIntact = true;
  for (let i = 3; i < testImgON.data.length; i += 4) {
    if (testImgON.data[i] !== 255) {
      alphaIntact = false;
      break;
    }
  }
  assert(alphaIntact, 'Alpha channel is 100% intact');

  // In B&W mode, True Grayscale Rec. 709 (R = G = B) must be strictly maintained
  let isTrueGrayscale = true;
  for (let i = 0; i < testImgON.data.length; i += 4) {
    if (testImgON.data[i] !== testImgON.data[i + 1] || testImgON.data[i] !== testImgON.data[i + 2]) {
      isTrueGrayscale = false;
      break;
    }
  }
  assert(isTrueGrayscale, 'True Grayscale (R=G=B) is strictly maintained with zero color drift');

  // 4. Anti-Halo and Extrema Clamping Verification
  console.log('\n[TEST GROUP 4] Anti-Halo Suppression & Extrema Clamping');
  // Maximum delta across any pixel must be bounded (no ringing overshoot spikes)
  let maxDelta = 0;
  for (let i = 0; i < testImgON.data.length; i += 4) {
    const delta = Math.abs(testImgON.data[i] - beforeImg.data[i]);
    if (delta > maxDelta) maxDelta = delta;
  }
  assert(maxDelta <= 45, `Anti-halo dampening verified: max delta is ${maxDelta} (<= 45 levels)`);

  // 5. Idempotency (Render updates must not cumulatively re-sharpen)
  console.log('\n[TEST GROUP 5] Idempotency & Repeat Render Safety');
  const run1 = cloneImageData(beforeImg);
  SharpenEngine.applyFaceSharpenFilter(run1, sharpenSettingsON, 'bw', null);

  const run2 = cloneImageData(beforeImg);
  SharpenEngine.applyFaceSharpenFilter(run2, sharpenSettingsON, 'bw', null);

  let matchBetweenRuns = true;
  for (let i = 0; i < run1.data.length; i++) {
    if (run1.data[i] !== run2.data[i]) {
      matchBetweenRuns = false;
      break;
    }
  }
  assert(matchBetweenRuns, 'Independent renders produce bit-identical output (deterministic)');

  // 6. Parameter Responsiveness (Intensity & Radius)
  console.log('\n[TEST GROUP 6] Parameter Responsiveness (Intensity & Radius)');
  const gentleSettings: FaceSharpenSettings = {
    enabled: true,
    intensity: 20,
    radius: 0.8,
    threshold: 6,
  };
  const strongSettings: FaceSharpenSettings = {
    enabled: true,
    intensity: 80,
    radius: 1.8,
    threshold: 2,
  };

  const gentleImg = cloneImageData(beforeImg);
  SharpenEngine.applyFaceSharpenFilter(gentleImg, gentleSettings, 'bw', null);

  const strongImg = cloneImageData(beforeImg);
  SharpenEngine.applyFaceSharpenFilter(strongImg, strongSettings, 'bw', null);

  let gentleDiff = 0;
  let strongDiff = 0;
  for (let i = 0; i < beforeImg.data.length; i += 4) {
    gentleDiff += Math.abs(gentleImg.data[i] - beforeImg.data[i]);
    strongDiff += Math.abs(strongImg.data[i] - beforeImg.data[i]);
  }

  assert(strongDiff > gentleDiff, `Higher intensity & wider radius produces greater edge contrast (${strongDiff} > ${gentleDiff})`);

  console.log('\n======================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL PENAJAMAN WAJAH (AI) TESTS PASSED SUCCESSFULLY!');
  }
}

runFaceSharpenTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
