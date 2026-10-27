import { AdjustmentParams, PhotoMode, TargetTone } from '../types/analysis';

export class ToneEngine {
  /**
   * Applies tonal adjustments to image data in-place.
   * If isBW is true, forces exact mathematical true grayscale (R = G = B).
   */
  public static applyTonalAdjustments(
    imageData: ImageData,
    params: AdjustmentParams,
    mode: PhotoMode,
    targetTone: TargetTone = 'natural'
  ): void {
    const data = imageData.data;
    const isBW = mode === 'bw';

    // Tone target biases
    let targetBrightnessBias = 0;
    let targetContrastBias = 0;
    let targetShadowsBias = 0;
    let targetHighlightsBias = 0;

    if (targetTone === 'brighter') {
      targetBrightnessBias = 5;
      targetShadowsBias = 4;
    } else if (targetTone === 'softer') {
      targetContrastBias = -6;
      targetHighlightsBias = -4;
    }

    // Effective parameters
    const exposureMul = Math.pow(2, params.exposureEV);
    const brightness = (params.brightness + targetBrightnessBias) * 2.55;
    const contrast = params.contrast + targetContrastBias;
    // Contrast factor formula
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const highlights = (params.highlights + targetHighlightsBias) / 100;
    const shadows = (params.shadows + targetShadowsBias) / 100;
    const whites = params.whites * 1.5;
    const blacks = params.blacks * 1.5;

    // Color mode temperature and tint
    const temp = params.temperature;
    const tint = params.tint;
    const satFactor = 1 + params.saturation / 50;

    // Precalculate tone lookup table (LUT) for basic 0..255 if applicable,
    // but highlights/shadows depend on local pixel luminance.
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (isBW) {
        // Step 1: True ITU-R BT.709 Luminance Conversion
        let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // Step 2: Exposure EV
        lum = lum * exposureMul;

        // Step 3: Brightness
        lum = lum + brightness;

        // Step 4: Contrast centered at 128
        lum = contrastFactor * (lum - 128) + 128;

        // Step 5: Highlight recovery & Shadow lift
        if (lum > 128) {
          // Highlight curve
          const normH = (lum - 128) / 127;
          lum = lum + highlights * 40 * Math.pow(normH, 1.5);
          // Whites
          lum = lum + whites * normH;
        } else {
          // Shadow curve
          const normS = (128 - lum) / 128;
          lum = lum + shadows * 45 * Math.pow(normS, 1.4);
          // Blacks
          lum = lum + blacks * normS;
        }

        // Clamp to 0..255
        const finalVal = Math.round(Math.max(0, Math.min(255, lum)));

        // TRUE GRAYSCALE: R === G === B. Absolute zero color cast!
        data[i] = finalVal;
        data[i + 1] = finalVal;
        data[i + 2] = finalVal;
      } else {
        // COLOR MODE
        // 1. Color balance (Temperature & Tint)
        if (temp !== 0) {
          r += temp * 1.2;
          b -= temp * 1.2;
        }
        if (tint !== 0) {
          g -= tint * 1.2;
          r += tint * 0.6;
          b += tint * 0.6;
        }

        // 2. Exposure EV
        r *= exposureMul;
        g *= exposureMul;
        b *= exposureMul;

        // 3. Brightness
        r += brightness;
        g += brightness;
        b += brightness;

        // 4. Contrast
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        // 5. Highlights and Shadows based on pixel luminance
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum > 128) {
          const normH = Math.min(1, Math.max(0, (lum - 128) / 127));
          const hShift = highlights * 35 * Math.pow(normH, 1.5) + whites * normH;
          r += hShift;
          g += hShift;
          b += hShift;
        } else {
          const normS = Math.min(1, Math.max(0, (128 - lum) / 128));
          const sShift = shadows * 40 * Math.pow(normS, 1.4) + blacks * normS;
          r += sShift;
          g += sShift;
          b += sShift;
        }

        // 6. Saturation
        if (params.saturation !== 0) {
          const curLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = curLum + satFactor * (r - curLum);
          g = curLum + satFactor * (g - curLum);
          b = curLum + satFactor * (b - curLum);
        }

        data[i] = Math.round(Math.max(0, Math.min(255, r)));
        data[i + 1] = Math.round(Math.max(0, Math.min(255, g)));
        data[i + 2] = Math.round(Math.max(0, Math.min(255, b)));
      }
    }
  }
}
