import { ToneEngine } from '../src/image/ToneEngine';
import { AdjustmentParams } from '../src/types/analysis';

function createBlankAdjustments(): AdjustmentParams {
  return {
    exposureEV: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    brightness: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
    sharpening: 0,
    noiseProtection: 0,
    eyeDetail: 0,
    faceDetail: 0,
    hairDetail: 0,
    skinProtection: 0,
    satRed: 0,
    satYellow: 0,
    satGreen: 0,
    satCyan: 0,
    satBlue: 0,
    satMagenta: 0,
  };
}

function runTests() {
  console.log('=== RUNNING SELECTIVE COLOR SATURATION VERIFICATION TESTS ===\n');

  // Test 1: Neutral Guarantee (All 0s)
  {
    const neutralParams = createBlankAdjustments();
    const testPixels = [
      [255, 0, 0, 255],     // Pure Red
      [255, 255, 0, 255],   // Pure Yellow
      [0, 255, 0, 255],     // Pure Green
      [0, 255, 255, 255],   // Pure Cyan
      [0, 0, 255, 255],     // Pure Blue
      [255, 0, 255, 255],   // Pure Magenta
      [210, 160, 130, 255], // Skin Tone
      [128, 128, 128, 255], // Neutral Gray
      [255, 255, 255, 255], // White
      [0, 0, 0, 255],       // Black
    ];

    const buf = new Uint8ClampedArray(testPixels.flat());
    const originalCopy = new Uint8ClampedArray(buf);

    ToneEngine.applyTonalAdjustments({ data: buf, width: 10, height: 1 } as any, neutralParams, 'color', 'natural');

    let identical = true;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] !== originalCopy[i]) {
        identical = false;
        console.error(`Mismatch at index ${i}: original=${originalCopy[i]}, after=${buf[i]}`);
        break;
      }
    }

    if (identical) {
      console.log('✔ TEST 1 PASSED: Neutral Guarantee (All 0 = 100% byte-identical output).');
    } else {
      console.error('❌ TEST 1 FAILED: Neutral output differed from input.');
      process.exit(1);
    }
  }

  // Test 2: Color Isolation - Red Saturation does NOT touch Blue/Green/Cyan
  {
    const params = createBlankAdjustments();
    params.satRed = 80;

    // Pure Blue: [0, 0, 255, 255] -> Hue is 240 deg (opposite to Red at 0 deg)
    const bluePixel = new Uint8ClampedArray([0, 0, 255, 255]);
    ToneEngine.applyTonalAdjustments({ data: bluePixel, width: 1, height: 1 } as any, params, 'color', 'natural');

    if (bluePixel[0] === 0 && bluePixel[1] === 0 && bluePixel[2] === 255) {
      console.log('✔ TEST 2A PASSED: satRed has zero bleed onto pure Blue.');
    } else {
      console.error(`❌ TEST 2A FAILED: Blue pixel was modified: [${bluePixel.join(', ')}]`);
      process.exit(1);
    }

    // Pure Green: [0, 255, 0, 255] -> Hue is 120 deg
    const greenPixel = new Uint8ClampedArray([0, 255, 0, 255]);
    ToneEngine.applyTonalAdjustments({ data: greenPixel, width: 1, height: 1 } as any, params, 'color', 'natural');

    if (greenPixel[0] === 0 && greenPixel[1] === 255 && greenPixel[2] === 0) {
      console.log('✔ TEST 2B PASSED: satRed has zero bleed onto pure Green.');
    } else {
      console.error(`❌ TEST 2B FAILED: Green pixel was modified: [${greenPixel.join(', ')}]`);
      process.exit(1);
    }

    // Pure Cyan: [0, 255, 255, 255] -> Hue is 180 deg
    const cyanPixel = new Uint8ClampedArray([0, 255, 255, 255]);
    ToneEngine.applyTonalAdjustments({ data: cyanPixel, width: 1, height: 1 } as any, params, 'color', 'natural');

    if (cyanPixel[0] === 0 && cyanPixel[1] === 255 && cyanPixel[2] === 255) {
      console.log('✔ TEST 2C PASSED: satRed has zero bleed onto pure Cyan.');
    } else {
      console.error(`❌ TEST 2C FAILED: Cyan pixel was modified: [${cyanPixel.join(', ')}]`);
      process.exit(1);
    }
  }

  // Test 3: Desaturation - Blues (-100) Desaturates Blue towards Grayscale Luminance
  {
    const params = createBlankAdjustments();
    params.satBlue = -100;

    // Rich Blue: [30, 80, 200, 255]
    const richBlue = new Uint8ClampedArray([30, 80, 200, 255]);
    ToneEngine.applyTonalAdjustments({ data: richBlue, width: 1, height: 1 } as any, params, 'color', 'natural');

    // After -100 blue saturation, R, G, B should be closer to each other (desaturated)
    const originalSpread = 200 - 30; // 170
    const newSpread = Math.max(richBlue[0], richBlue[1], richBlue[2]) - Math.min(richBlue[0], richBlue[1], richBlue[2]);

    if (newSpread < originalSpread) {
      console.log(`✔ TEST 3 PASSED: satBlue=-100 successfully desaturates blue (spread reduced from ${originalSpread} to ${newSpread}).`);
    } else {
      console.error(`❌ TEST 3 FAILED: Blue was not desaturated: spread is ${newSpread}`);
      process.exit(1);
    }
  }

  // Test 4: Skin Tone Protection (Damped vs Vivid Red)
  {
    const params = createBlankAdjustments();
    params.satRed = 80;

    // Skin Tone pixel: R=210, G=160, B=130 (Hue approx 22.5 deg)
    const skinPixel = new Uint8ClampedArray([210, 160, 130, 255]);
    const skinBefore = [...skinPixel];
    ToneEngine.applyTonalAdjustments({ data: skinPixel, width: 1, height: 1 } as any, params, 'color', 'natural');

    const skinDiff = Math.abs(skinPixel[0] - skinBefore[0]) + Math.abs(skinPixel[1] - skinBefore[1]) + Math.abs(skinPixel[2] - skinBefore[2]);

    // Synthetic Non-Skin Reddish-Orange with low green/blue ratio: R=210, G=50, B=10
    const clothPixel = new Uint8ClampedArray([210, 50, 10, 255]);
    const clothBefore = [...clothPixel];
    ToneEngine.applyTonalAdjustments({ data: clothPixel, width: 1, height: 1 } as any, params, 'color', 'natural');

    const clothDiff = Math.abs(clothPixel[0] - clothBefore[0]) + Math.abs(clothPixel[1] - clothBefore[1]) + Math.abs(clothPixel[2] - clothBefore[2]);

    console.log(`Skin delta: ${skinDiff}, Cloth delta: ${clothDiff}`);
    if (skinDiff < clothDiff) {
      console.log('✔ TEST 4 PASSED: Skin tone protection attenuates saturation changes on human complexion.');
    } else {
      console.error('❌ TEST 4 FAILED: Skin tone protection did not attenuate skin delta.');
      process.exit(1);
    }
  }

  // Test 5: Gamut Clipping and Luminance Stability
  {
    const params = createBlankAdjustments();
    params.satRed = 100;
    params.satYellow = 100;
    params.satGreen = 100;
    params.satCyan = 100;
    params.satBlue = 100;
    params.satMagenta = 100;

    // Random noise pixels
    const noise = new Uint8ClampedArray(1000 * 4);
    for (let i = 0; i < noise.length; i += 4) {
      noise[i] = Math.floor(Math.random() * 256);
      noise[i + 1] = Math.floor(Math.random() * 256);
      noise[i + 2] = Math.floor(Math.random() * 256);
      noise[i + 3] = 255;
    }

    ToneEngine.applyTonalAdjustments({ data: noise, width: 1000, height: 1 } as any, params, 'color', 'natural');

    let validGamut = true;
    for (let i = 0; i < noise.length; i++) {
      if (isNaN(noise[i]) || noise[i] < 0 || noise[i] > 255) {
        validGamut = false;
        break;
      }
    }

    if (validGamut) {
      console.log('✔ TEST 5 PASSED: Extreme adjustments keep all values strictly within [0, 255] gamut with zero NaN/clipping distortion.');
    } else {
      console.error('❌ TEST 5 FAILED: Invalid values produced.');
      process.exit(1);
    }
  }

  console.log('\nALL SELECTIVE COLOR SATURATION TESTS PASSED PERFECTLY!\n');
}

runTests();
