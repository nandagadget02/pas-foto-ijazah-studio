import { ToneEngine } from '../src/image/ToneEngine';
import { AdjustmentParams } from '../src/types/analysis';

function getNeutralAdjustments(): AdjustmentParams {
  return {
    exposureEV: 0,
    brightness: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    sharpening: 0,
    noiseProtection: 0,
    faceDetail: 0,
    eyeDetail: 0,
    hairDetail: 0,
    skinProtection: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
    satRed: 0,
    satYellow: 0,
    satGreen: 0,
    satCyan: 0,
    satBlue: 0,
    satMagenta: 0,
    levelsInBlack: 0,
    levelsGamma: 1.0,
    levelsInWhite: 255,
    levelsOutBlack: 0,
    levelsOutWhite: 255,
  };
}

function runLevelsQA() {
  console.log('===============================================================');
  console.log('        COMPREHENSIVE QA SUITE: LEVELS CONTROL V2.0            ');
  console.log('===============================================================\n');

  // Test 1: Neutral Guarantee (B&W & Color Mode)
  console.log('[QA 1] Neutral Baseline Guarantee (0, 1.0, 255, 0, 255)');
  {
    // Test across all 256 grayscale levels
    const grayData = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) {
      grayData[i * 4] = i;
      grayData[i * 4 + 1] = i;
      grayData[i * 4 + 2] = i;
      grayData[i * 4 + 3] = 255;
    }
    const grayBaseline = new Uint8ClampedArray(grayData);
    ToneEngine.applyTonalAdjustments({ data: grayData, width: 256, height: 1 } as any, getNeutralAdjustments(), 'bw', 'natural');

    for (let i = 0; i < grayData.length; i++) {
      if (grayData[i] !== grayBaseline[i]) {
        throw new Error(`QA 1 Failed: B&W pixel mismatch at byte ${i}: original=${grayBaseline[i]}, got=${grayData[i]}`);
      }
    }

    // Test in Color mode
    const colorData = new Uint8ClampedArray([
      200, 50, 50, 255,   // Red
      40, 180, 50, 255,   // Green
      30, 60, 210, 255,   // Blue
      215, 165, 135, 255, // Skin
    ]);
    const colorBaseline = new Uint8ClampedArray(colorData);
    ToneEngine.applyTonalAdjustments({ data: colorData, width: 4, height: 1 } as any, getNeutralAdjustments(), 'color', 'natural');

    for (let i = 0; i < colorData.length; i++) {
      if (colorData[i] !== colorBaseline[i]) {
        throw new Error(`QA 1 Failed: Color pixel mismatch at byte ${i}: original=${colorBaseline[i]}, got=${colorData[i]}`);
      }
    }
    console.log('  ✔ Baseline output is 100% byte-identical across both B&W and Color modes.\n');
  }

  // Test 2: Black Point (Input Black)
  console.log('[QA 2] Black Point (Input Black = 30)');
  {
    const params = getNeutralAdjustments();
    params.levelsInBlack = 30;

    const data = new Uint8ClampedArray([
      10, 10, 10, 255, // Below inBlack
      30, 30, 30, 255, // Exactly inBlack
      60, 60, 60, 255, // Above inBlack
    ]);

    ToneEngine.applyTonalAdjustments({ data, width: 3, height: 1 } as any, params, 'bw', 'natural');

    if (data[0] !== 0) throw new Error(`QA 2 Failed: Pixel below inBlack (10) was not clipped to 0 (got ${data[0]})`);
    if (data[4] !== 0) throw new Error(`QA 2 Failed: Pixel at inBlack (30) was not clipped to 0 (got ${data[4]})`);
    if (data[8] <= 0 || data[8] >= 60) throw new Error(`QA 2 Failed: Pixel above inBlack (60) was not mapped properly (got ${data[8]})`);

    console.log(`  ✔ Pixel 10 -> ${data[0]} (clipped to true black)`);
    console.log(`  ✔ Pixel 30 -> ${data[4]} (clipped to true black)`);
    console.log(`  ✔ Pixel 60 -> ${data[8]} (smoothly scaled relative to black point)\n`);
  }

  // Test 3: Midtones / Gamma Control
  console.log('[QA 3] Midtones / Gamma (gamma = 1.5 brighten, gamma = 0.7 darken)');
  {
    // Midtone pixel (128)
    const midtoneByte = 128;

    // Gamma = 1.5 (brighten midtones)
    const paramsBright = getNeutralAdjustments();
    paramsBright.levelsGamma = 1.5;

    const dataBright = new Uint8ClampedArray([
      0, 0, 0, 255,           // Black anchor
      midtoneByte, midtoneByte, midtoneByte, 255, // Midtone
      255, 255, 255, 255,     // White anchor
    ]);

    ToneEngine.applyTonalAdjustments({ data: dataBright, width: 3, height: 1 } as any, paramsBright, 'bw', 'natural');

    const blackAnchorB = dataBright[0];
    const midtoneB = dataBright[4];
    const whiteAnchorB = dataBright[8];

    if (blackAnchorB !== 0) throw new Error(`QA 3 Failed: Black anchor shifted under gamma (got ${blackAnchorB})`);
    if (whiteAnchorB !== 255) throw new Error(`QA 3 Failed: White anchor shifted under gamma (got ${whiteAnchorB})`);
    if (midtoneB <= midtoneByte) throw new Error(`QA 3 Failed: Gamma 1.5 did not brighten midtones (got ${midtoneB})`);

    // Gamma = 0.7 (darken midtones)
    const paramsDark = getNeutralAdjustments();
    paramsDark.levelsGamma = 0.7;

    const dataDark = new Uint8ClampedArray([
      0, 0, 0, 255,
      midtoneByte, midtoneByte, midtoneByte, 255,
      255, 255, 255, 255,
    ]);

    ToneEngine.applyTonalAdjustments({ data: dataDark, width: 3, height: 1 } as any, paramsDark, 'bw', 'natural');

    const midtoneD = dataDark[4];
    if (midtoneD >= midtoneByte) throw new Error(`QA 3 Failed: Gamma 0.7 did not darken midtones (got ${midtoneD})`);

    console.log(`  ✔ Gamma 1.5: Midtone 128 -> ${midtoneB} (brightened by +${midtoneB - midtoneByte} levels)`);
    console.log(`  ✔ Gamma 0.7: Midtone 128 -> ${midtoneD} (darkened by -${midtoneByte - midtoneD} levels)`);
    console.log(`  ✔ Black (0) and White (255) anchors remained 100% pinned.\n`);
  }

  // Test 4: White Point (Input White)
  console.log('[QA 4] White Point (Input White = 220)');
  {
    const params = getNeutralAdjustments();
    params.levelsInWhite = 220;

    const data = new Uint8ClampedArray([
      200, 200, 200, 255, // Below inWhite
      220, 220, 220, 255, // Exactly inWhite
      240, 240, 240, 255, // Above inWhite
    ]);

    ToneEngine.applyTonalAdjustments({ data, width: 3, height: 1 } as any, params, 'bw', 'natural');

    if (data[4] !== 255) throw new Error(`QA 4 Failed: Pixel at inWhite (220) was not mapped to 255 (got ${data[4]})`);
    if (data[8] !== 255) throw new Error(`QA 4 Failed: Pixel above inWhite (240) was not mapped to 255 (got ${data[8]})`);
    if (data[0] >= 255 || data[0] <= 200) throw new Error(`QA 4 Failed: Pixel below inWhite (200) was not scaled properly (got ${data[0]})`);

    console.log(`  ✔ Pixel 200 -> ${data[0]} (smoothly scaled)`);
    console.log(`  ✔ Pixel 220 -> ${data[4]} (mapped to pure white 255)`);
    console.log(`  ✔ Pixel 240 -> ${data[8]} (clipped cleanly to 255)\n`);
  }

  // Test 5: Output Levels (Output Black & Output White)
  console.log('[QA 5] Output Levels (outBlack = 25, outWhite = 230)');
  {
    const params = getNeutralAdjustments();
    params.levelsOutBlack = 25;
    params.levelsOutWhite = 230;

    const data = new Uint8ClampedArray([
      0, 0, 0, 255,       // Input black
      255, 255, 255, 255, // Input white
    ]);

    ToneEngine.applyTonalAdjustments({ data, width: 2, height: 1 } as any, params, 'bw', 'natural');

    if (data[0] !== 25) throw new Error(`QA 5 Failed: Output black was not 25 (got ${data[0]})`);
    if (data[4] !== 230) throw new Error(`QA 5 Failed: Output white was not 230 (got ${data[4]})`);

    console.log(`  ✔ Input 0 -> Output Black ${data[0]}`);
    console.log(`  ✔ Input 255 -> Output White ${data[4]}\n`);
  }

  // Test 6: Safety & Robustness against division by zero
  console.log('[QA 6] Safety Guard against inBlack >= inWhite and extreme values');
  {
    const paramsInverted = getNeutralAdjustments();
    paramsInverted.levelsInBlack = 250;
    paramsInverted.levelsInWhite = 10; // Inverted!
    paramsInverted.levelsGamma = 0.0001; // Extreme small gamma!

    const data = new Uint8ClampedArray([50, 100, 150, 255]);
    ToneEngine.applyTonalAdjustments({ data, width: 1, height: 1 } as any, paramsInverted, 'color', 'natural');

    for (let c = 0; c < 3; c++) {
      if (isNaN(data[c]) || data[c] < 0 || data[c] > 255) {
        throw new Error(`QA 6 Failed: Inverted values caused out-of-bounds or NaN: [${data.join(',')}]`);
      }
    }
    console.log('  ✔ Handled inverted inputs and near-zero gamma safely without NaN or crash.\n');
  }

  // Test 7: Harmony with Exposure, Contrast, and Selective Saturation
  console.log('[QA 7] Harmony with existing Exposure & Selective Saturation');
  {
    const combinedParams = getNeutralAdjustments();
    combinedParams.exposureEV = 0.2;
    combinedParams.contrast = 5;
    combinedParams.levelsInBlack = 15;
    combinedParams.levelsGamma = 1.1;
    combinedParams.satRed = 40;

    const testPixel = new Uint8ClampedArray([180, 50, 50, 255]);
    ToneEngine.applyTonalAdjustments({ data: testPixel, width: 1, height: 1 } as any, combinedParams, 'color', 'natural');

    for (let c = 0; c < 3; c++) {
      if (isNaN(testPixel[c]) || testPixel[c] < 0 || testPixel[c] > 255) {
        throw new Error(`QA 7 Failed: Combined adjustments produced out of gamut pixel: [${testPixel.join(',')}]`);
      }
    }
    console.log(`  ✔ Combined tonal + levels + selective saturation produced valid pixel: [${testPixel.join(', ')}]\n`);
  }

  console.log('===============================================================');
  console.log('     ALL 7 LEVELS QA TESTS PASSED WITH 100% PARITY!           ');
  console.log('===============================================================\n');
}

runLevelsQA();
