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
    // Selective Color Saturation parameters
    const satReds = params.satRed || 0;
    const satYellows = params.satYellow || 0;
    const satGreens = params.satGreen || 0;
    const satCyans = params.satCyan || 0;
    const satBlues = params.satBlue || 0;
    const satMagentas = params.satMagenta || 0;
    const hasSelectiveSat = !isBW && (
      satReds !== 0 ||
      satYellows !== 0 ||
      satGreens !== 0 ||
      satCyans !== 0 ||
      satBlues !== 0 ||
      satMagentas !== 0
    );

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
        // 7. Selective Color Saturation (Reds, Yellows, Greens, Cyans, Blues, Magentas)
        if (hasSelectiveSat) {
          const maxVal = Math.max(r, g, b);
          const minVal = Math.min(r, g, b);
          const chroma = maxVal - minVal;

          if (chroma >= 1.0) {
            let hue = 0;
            if (maxVal === r) {
              hue = ((g - b) / chroma) % 6;
            } else if (maxVal === g) {
              hue = (b - r) / chroma + 2;
            } else {
              hue = (r - g) / chroma + 4;
            }
            hue = hue * 60;
            if (hue < 0) hue += 360;

            // Interpolate saturation adjustment based on hue
            // 0: Reds, 60: Yellows, 120: Greens, 180: Cyans, 240: Blues, 300: Magentas
            let deltaSat = 0;
            const sector = Math.floor(hue / 60); // 0 to 5
            const t = (hue % 60) / 60; // 0.0 to 1.0
            // Cosine blend for silky smooth transitions without color banding
            const w = (1 - Math.cos(t * Math.PI)) * 0.5;

            if (sector === 0) {
              // Reds (0) to Yellows (60)
              deltaSat = satReds * (1 - w) + satYellows * w;
            } else if (sector === 1) {
              // Yellows (60) to Greens (120)
              deltaSat = satYellows * (1 - w) + satGreens * w;
            } else if (sector === 2) {
              // Greens (120) to Cyans (180)
              deltaSat = satGreens * (1 - w) + satCyans * w;
            } else if (sector === 3) {
              // Cyans (180) to Blues (240)
              deltaSat = satCyans * (1 - w) + satBlues * w;
            } else if (sector === 4) {
              // Blues (240) to Magentas (300)
              deltaSat = satBlues * (1 - w) + satMagentas * w;
            } else {
              // Magentas (300) to Reds (360)
              deltaSat = satMagentas * (1 - w) + satReds * w;
            }

            if (deltaSat !== 0) {
              // Proportional skin tone protection (hue 5 to 50 with characteristic melanin/hemoglobin ratios)
              if (r > g && g > b && (r - b) > 15 && r > 60 && hue >= 5 && hue <= 50) {
                const hueCenterDist = Math.abs(hue - 25);
                const skinProximity = Math.max(0, 1 - hueCenterDist / 25);
                const satRatio = chroma / maxVal;
                if (satRatio >= 0.12 && satRatio <= 0.68) {
                  // Dampen selective shift by 65% on authentic skin tones to prevent unnatural discolouration
                  deltaSat *= (1.0 - skinProximity * 0.65);
                }
              }

              const curLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
              const selectiveFactor = 1 + deltaSat / 100;
              r = curLum + selectiveFactor * (r - curLum);
              g = curLum + selectiveFactor * (g - curLum);
              b = curLum + selectiveFactor * (b - curLum);

              // Gamut clipping protection (scale towards luminance to preserve hue integrity)
              const newMax = Math.max(r, g, b);
              if (newMax > 255) {
                const damp = 255 / newMax;
                r = curLum + (r - curLum) * damp;
                g = curLum + (g - curLum) * damp;
                b = curLum + (b - curLum) * damp;
              }
            }
          }
        }


        data[i] = Math.round(Math.max(0, Math.min(255, r)));
        data[i + 1] = Math.round(Math.max(0, Math.min(255, g)));
        data[i + 2] = Math.round(Math.max(0, Math.min(255, b)));
      }
    }
  }
}
