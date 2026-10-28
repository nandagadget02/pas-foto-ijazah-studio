import { BackgroundType, BackgroundSettings, DEFAULT_BG_SETTINGS, PhotoMode, MaskBrushSettings, DiagnosticPreviewMode } from '../types/analysis';

export interface SegmentationResult {
  isSafe: boolean;
  confidence: number;
  message?: string;
  detectedBgColor?: string;
}

export class BackgroundEngine {
  /**
   * Generates preset backdrops on a canvas if a preset type is chosen
   */
  public static drawPresetBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bgType: BackgroundType
  ) {
    if (bgType === 'red') {
      // Standar Merah Pas Foto Resmi Ijazah/SKCK/KTP (#c81e1e to #a51d24)
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        width * 0.1,
        width * 0.5,
        height * 0.5,
        width * 0.8
      );
      grad.addColorStop(0, '#d9272e');
      grad.addColorStop(0.65, '#c0181e');
      grad.addColorStop(1, '#9e1217');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'blue') {
      // Standar Biru Pas Foto Resmi Ijazah/Kedinasan/KTP (#1d4ed8 to #1e3a8a)
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        width * 0.1,
        width * 0.5,
        height * 0.5,
        width * 0.8
      );
      grad.addColorStop(0, '#2563eb');
      grad.addColorStop(0.65, '#1d4ed8');
      grad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'gray') {
      // Abu-abu Studio Netral dengan vignetting studio halus
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        width * 0.15,
        width * 0.5,
        height * 0.5,
        width * 0.85
      );
      grad.addColorStop(0, '#dedede');
      grad.addColorStop(0.7, '#c2c2c2');
      grad.addColorStop(1, '#9e9e9e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'black') {
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        width * 0.1,
        width * 0.5,
        height * 0.5,
        width * 0.8
      );
      grad.addColorStop(0, '#28282d');
      grad.addColorStop(0.7, '#18181b');
      grad.addColorStop(1, '#0c0c0e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'gradient_blue') {
      // Gradasi Mewah Studio Portrait
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.4, '#1e40af');
      grad.addColorStop(0.8, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'academic_blur') {
      // Latar Nuansa Akademik / Kantor Studio Bokeh Hangat
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#3e2d22');
      grad.addColorStop(0.5, '#4a3728');
      grad.addColorStop(1, '#2b1e15');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Bokeh spots
      const bokehPoints = [
        { x: width * 0.18, y: height * 0.25, r: width * 0.16, alpha: 0.18, color: '#fef08a' },
        { x: width * 0.82, y: height * 0.3, r: width * 0.22, alpha: 0.15, color: '#fed7aa' },
        { x: width * 0.25, y: height * 0.65, r: width * 0.18, alpha: 0.12, color: '#e2e8f0' },
        { x: width * 0.78, y: height * 0.7, r: width * 0.2, alpha: 0.14, color: '#fbcfe8' },
        { x: width * 0.5, y: height * 0.15, r: width * 0.25, alpha: 0.2, color: '#fed7aa' },
      ];
      for (const p of bokehPoints) {
        const bGrad = ctx.createRadialGradient(p.x, p.y, p.r * 0.1, p.x, p.y, p.r);
        bGrad.addColorStop(0, p.color);
        bGrad.addColorStop(1, 'transparent');
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /**
   * Evaluates background color and variance across corners and top border
   */
  public static evaluateBackgroundConfidence(
    imageData: ImageData
  ): SegmentationResult {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    const sampleBox = Math.max(2, Math.floor(Math.min(width, height) * 0.05));
    let rSum = 0, gSum = 0, bSum = 0, count = 0;

    // Sample top edge and top corners
    for (let y = 0; y < sampleBox; y++) {
      for (let x = 0; x < width; x += 2) {
        // Skip central 20% to avoid touching hair crown
        if (y > sampleBox * 0.6 && x > width * 0.38 && x < width * 0.62) continue;
        const idx = (y * width + x) * 4;
        rSum += data[idx];
        gSum += data[idx + 1];
        bSum += data[idx + 2];
        count++;
      }
    }

    if (count === 0) {
      return { isSafe: false, confidence: 50, message: 'Sampel background tidak mencukupi.' };
    }

    const meanR = rSum / count;
    const meanG = gSum / count;
    const meanB = bSum / count;

    let varianceSum = 0;
    for (let y = 0; y < sampleBox; y++) {
      for (let x = 0; x < width; x += 2) {
        if (y > sampleBox * 0.6 && x > width * 0.38 && x < width * 0.62) continue;
        const idx = (y * width + x) * 4;
        const dr = data[idx] - meanR;
        const dg = data[idx + 1] - meanG;
        const db = data[idx + 2] - meanB;
        varianceSum += Math.sqrt(dr * dr + dg * dg + db * db);
      }
    }
    const avgColorDeviation = varianceSum / count;
    const confidence = Math.min(99, Math.max(50, Math.round(100 - avgColorDeviation * 0.7)));

    let colorName = 'Netral';
    if (meanR > meanG + 30 && meanR > meanB + 30) colorName = 'Merah';
    else if (meanB > meanR + 25 && meanB > meanG + 15) colorName = 'Biru';
    else if (meanR > 210 && meanG > 210 && meanB > 210) colorName = 'Putih Terang';
    else if (meanR < 60 && meanG < 60 && meanB < 60) colorName = 'Gelap/Hitam';
    else if (Math.abs(meanR - meanG) < 15 && Math.abs(meanG - meanB) < 15) colorName = 'Abu-abu';

    return {
      isSafe: true,
      confidence,
      detectedBgColor: colorName,
    };
  }

  /**
   * Helper to check if a pixel is likely skin tone (YCbCr & face sample comparison)
   */
  private static isSkinTone(
    r: number,
    g: number,
    b: number,
    skinRef?: { r: number; g: number; b: number } | null
  ): boolean {
    // Basic human skin chromaticity: R > G, G >= B, R - B > 10
    if (!(r > g && g >= b && r - b > 10)) {
      return false;
    }
    // YCbCr conversion
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    const inSkinYcbcr = cb >= 75 && cb <= 135 && cr >= 130 && cr <= 178;

    if (skinRef) {
      const dr = Math.abs(r - skinRef.r);
      const dg = Math.abs(g - skinRef.g);
      const db = Math.abs(b - skinRef.b);
      if (dr < 50 && dg < 42 && db < 42) {
        return true;
      }
    }
    return inSkinYcbcr;
  }

  /**
   * Computes 3x3 Sobel gradient magnitude map for anatomical edge preservation
   */
  private static computeGradientMap(
    srcData: Uint8ClampedArray,
    width: number,
    height: number
  ): Float32Array {
    const grad = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width;
      const prevRow = (y - 1) * width;
      const nextRow = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const i11 = (prevRow + x - 1) * 4;
        const i12 = (prevRow + x) * 4;
        const i13 = (prevRow + x + 1) * 4;
        const p11 = 0.299 * srcData[i11] + 0.587 * srcData[i11 + 1] + 0.114 * srcData[i11 + 2];
        const p12 = 0.299 * srcData[i12] + 0.587 * srcData[i12 + 1] + 0.114 * srcData[i12 + 2];
        const p13 = 0.299 * srcData[i13] + 0.587 * srcData[i13 + 1] + 0.114 * srcData[i13 + 2];

        const i21 = (rowOffset + x - 1) * 4;
        const i23 = (rowOffset + x + 1) * 4;
        const p21 = 0.299 * srcData[i21] + 0.587 * srcData[i21 + 1] + 0.114 * srcData[i21 + 2];
        const p23 = 0.299 * srcData[i23] + 0.587 * srcData[i23 + 1] + 0.114 * srcData[i23 + 2];

        const i31 = (nextRow + x - 1) * 4;
        const i32 = (nextRow + x) * 4;
        const i33 = (nextRow + x + 1) * 4;
        const p31 = 0.299 * srcData[i31] + 0.587 * srcData[i31 + 1] + 0.114 * srcData[i31 + 2];
        const p32 = 0.299 * srcData[i32] + 0.587 * srcData[i32 + 1] + 0.114 * srcData[i32 + 2];
        const p33 = 0.299 * srcData[i33] + 0.587 * srcData[i33 + 1] + 0.114 * srcData[i33 + 2];

        const gx = (-p11 - 2 * p21 - p31 + p13 + 2 * p23 + p33) * 0.25;
        const gy = (-p11 - 2 * p12 - p13 + p31 + 2 * p32 + p33) * 0.25;
        const lumGrad = Math.sqrt(gx * gx + gy * gy);

        // Detect color gradient (detects boundaries even when luminance is similar, e.g. blue on gray)
        const drX = Math.abs(srcData[i23] - srcData[i21]);
        const dgX = Math.abs(srcData[i23 + 1] - srcData[i21 + 1]);
        const dbX = Math.abs(srcData[i23 + 2] - srcData[i21 + 2]);
        const drY = Math.abs(srcData[i32] - srcData[i12]);
        const dgY = Math.abs(srcData[i32 + 1] - srcData[i12 + 1]);
        const dbY = Math.abs(srcData[i32 + 2] - srcData[i12 + 2]);
        const colorGrad = (Math.max(drX, dgX, dbX) + Math.max(drY, dgY, dbY)) * 0.5;

        grad[rowOffset + x] = Math.max(lumGrad, colorGrad);
      }
    }
    return grad;
  }

  /**
   * Computes the refined subject alpha mask using Edge-Aware Segmentation,
   * dark background shadow handling, negative space inspection, and ultra-thin feathering.
   */
  public static computeSubjectMask(
    imageData: ImageData,
    settings: BackgroundSettings = DEFAULT_BG_SETTINGS,
    customMask?: Float32Array | null
  ): {
    mask: Float32Array;
    safety: SegmentationResult;
    bgR: number;
    bgG: number;
    bgB: number;
    skinRef?: { r: number; g: number; b: number } | null;
  } {
    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;

    // 1. Evaluate original background confidence & color profile
    const safety = this.evaluateBackgroundConfidence(imageData);

    // 2. Safe outer multi-zone background sampling
    // Strictly sampling from the outermost borders to avoid touching hair or shoulders
    const bgSamples: [number, number, number][] = [];
    const cornerSize = Math.max(3, Math.floor(width * 0.09));
    const topStripH = Math.max(2, Math.floor(height * 0.05));

    // Top-left corner
    for (let y = 0; y < cornerSize; y++) {
      for (let x = 0; x < cornerSize; x++) {
        const i = (y * width + x) * 4;
        bgSamples.push([srcData[i], srcData[i + 1], srcData[i + 2]]);
      }
    }
    // Top-right corner
    for (let y = 0; y < cornerSize; y++) {
      for (let x = width - cornerSize; x < width; x++) {
        const i = (y * width + x) * 4;
        bgSamples.push([srcData[i], srcData[i + 1], srcData[i + 2]]);
      }
    }
    // Top perimeter band (excluding center 36% hair crown)
    for (let y = 0; y < topStripH; y++) {
      for (let x = 0; x < width; x += 2) {
        if (x > width * 0.32 && x < width * 0.68) continue;
        const i = (y * width + x) * 4;
        bgSamples.push([srcData[i], srcData[i + 1], srcData[i + 2]]);
      }
    }
    // Upper-left & Upper-right side margins strictly above shoulder line (y < 26% height)
    const midUpperY = Math.floor(height * 0.26);
    const edgeMargin = Math.max(2, Math.floor(width * 0.035));
    for (let y = cornerSize; y < midUpperY; y += 2) {
      for (let x = 0; x < edgeMargin; x++) {
        const i = (y * width + x) * 4;
        bgSamples.push([srcData[i], srcData[i + 1], srcData[i + 2]]);
      }
      for (let x = width - edgeMargin; x < width; x++) {
        const i = (y * width + x) * 4;
        bgSamples.push([srcData[i], srcData[i + 1], srcData[i + 2]]);
      }
    }

    let bgR = 0, bgG = 0, bgB = 0;
    if (bgSamples.length > 0) {
      for (const [r, g, b] of bgSamples) {
        bgR += r;
        bgG += g;
        bgB += b;
      }
      bgR = Math.round(bgR / bgSamples.length);
      bgG = Math.round(bgG / bgSamples.length);
      bgB = Math.round(bgB / bgSamples.length);
    }
    const bgSum = Math.max(1, bgR + bgG + bgB);
    const bgCr = bgR / bgSum;
    const bgCg = bgG / bgSum;
    const bgCb = bgB / bgSum;
    const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
    const isLightBg = bgLum > 165;
    const isDarkBg = bgLum < 75;
    const isSaturatedBg = (Math.max(bgR, bgG, bgB) - Math.min(bgR, bgG, bgB)) > 26;
    const isBlueBg = (bgB > bgR + 15 && bgB > bgG + 10) || (bgCb > 0.40 && bgCr < 0.32);
    const isRedBg = (bgR > bgG + 22 && bgR > bgB + 22) || (bgCr > 0.46 && bgCb < 0.30);
    const isGreenBg = (bgG > bgR + 18 && bgG > bgB + 18) || (bgCg > 0.44);

    // 3. Sample Facial Skin Tone Reference (tight safe box in inner face)
    let skinSampleCount = 0, skinRSum = 0, skinGSum = 0, skinBSum = 0;
    const faceStartX = Math.floor(width * 0.46);
    const faceEndX = Math.floor(width * 0.54);
    const faceStartY = Math.floor(height * 0.28);
    const faceEndY = Math.floor(height * 0.38);

    for (let y = faceStartY; y < faceEndY; y += 2) {
      for (let x = faceStartX; x < faceEndX; x += 2) {
        const i = (y * width + x) * 4;
        const r = srcData[i];
        const g = srcData[i + 1];
        const b = srcData[i + 2];
        if (r > g && g > b) {
          skinRSum += r;
          skinGSum += g;
          skinBSum += b;
          skinSampleCount++;
        }
      }
    }
    const skinRef = skinSampleCount > 0 ? {
      r: Math.round(skinRSum / skinSampleCount),
      g: Math.round(skinGSum / skinSampleCount),
      b: Math.round(skinBSum / skinSampleCount),
    } : null;

    // 4. Compute Anatomical Gradient Map (Sobel edges + Color gradients)
    const grad = this.computeGradientMap(srcData, width, height);

    // 5. Subject Anatomical Core & Landmark Protection:
    // 0 = unvisited/candidate, 1 = verified background, 2 = protected subject core (MUTLAK FOREGROUND)
    const classification = new Uint8Array(width * height);

    // 6. Background Evaluation Function (Defined early for landmark and seed evaluations)
    const tolerance = Math.max(14, Math.min(42, settings.edgeTolerance));

    const isPixelBackground = (x: number, y: number, pIdx: number): boolean => {
      // Protected subject core CAN NEVER be classified as background!
      if (classification[pIdx] === 2) return false;

      const i = pIdx * 4;
      const r = srcData[i];
      const g = srcData[i + 1];
      const b = srcData[i + 2];
      const pLum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Human skin tone is 100% FOREGROUND (subject)
      if (skinRef && this.isSkinTone(r, g, b, skinRef)) {
        return false;
      }

      // 0. Dark Pixel Foreground Shield:
      // In light or colored backdrops, dark pixels (hair, black hijab, dark tie, dark suit) are 100% subject!
      if (!isDarkBg) {
        const maxRGB = Math.max(r, g, b);
        const hasChromaBgDominance = (isBlueBg && (b - Math.max(r, g) >= 15)) ||
                                     (isRedBg && (r - Math.max(g, b) >= 20)) ||
                                     (isGreenBg && (g - Math.max(r, b) >= 15));
        if (!hasChromaBgDominance) {
          if (maxRGB < 65 || (pLum < 70 && Math.abs(r - b) < 25 && Math.abs(r - g) < 25)) {
            return false;
          }
        }
      }

      // In dark backgrounds, bright pixels (white shirt, bright clothing) are 100% FOREGROUND.
      if (isDarkBg && pLum > 110) {
        return false;
      }

      // 1. Studio Blue Backdrop (Pas Foto Biru Resmi)
      if (isBlueBg) {
        const blueDominance = b - Math.max(r, g);
        // True blue studio background has sharp blue dominance
        if (blueDominance >= 18 && b >= 65 && pLum >= 35) {
          return true;
        }
        if (b > r + 15 && b > g + 12 && b >= 60 && pLum >= 35) {
          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          if (cb > 142) {
            return true;
          }
        }
        // Neutral or non-blue pixels in blue backdrop cannot be background
        return false;
      }

      // 2. Studio Red Backdrop (Pas Foto Merah Resmi)
      if (isRedBg) {
        const redDominance = r - Math.max(g, b);
        if (redDominance >= 28 && r >= 88 && pLum >= 45) {
          if (!this.isSkinTone(r, g, b, skinRef)) {
            return true;
          }
        }
        // Neutral or non-red pixels in red backdrop cannot be background
        return false;
      }

      // 3. Studio Green Backdrop
      if (isGreenBg) {
        const greenDominance = g - Math.max(r, b);
        if (greenDominance >= 20 && g >= 55) {
          return true;
        }
        return false;
      }

      // 4. White / Light Gray / Neutral Backdrops:
      // CRITICAL SUBJECT PRESERVATION FOR WHITE/LIGHT CLOTHING:
      if (isLightBg) {
        // Dark pixels are 100% subject
        if (pLum < 125) return false;

        // In clothing region (y >= 44% height):
        if (y >= Math.floor(height * 0.44)) {
          // If background is not pure white (e.g. gray or off-white background with bgLum < 235),
          // a white shirt is brighter than the background!
          if (bgLum < 235 && pLum > bgLum + 8) {
            return false; // This is a white shirt / collar / uniform!
          }
        }
      }

      const dr = r - bgR;
      const dg = g - bgG;
      const db = b - bgB;
      const colorDist = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 1.732;

      // Direct color distance match
      if (colorDist <= tolerance) {
        return true;
      }

      // Shadow on backdrop: only if smooth (no gradient) and chromaticity matches backdrop precisely
      if (grad[pIdx] < 18) {
        const pSum = Math.max(1, r + g + b);
        const cr = r / pSum;
        const cg = g / pSum;
        const cb = b / pSum;
        const chromaDist = Math.sqrt((cr - bgCr) ** 2 + (cg - bgCg) ** 2 + (cb - bgCb) ** 2) * 255;
        if (chromaDist < 14 && colorDist < tolerance * 1.8) {
          return true;
        }
      }

      return false;
    };

    // Landmark 1: Human skin tone is 100% protected subject everywhere!
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const pIdx = rowOffset + x;
        const i = pIdx * 4;
        if (this.isSkinTone(srcData[i], srcData[i + 1], srcData[i + 2], skinRef)) {
          classification[pIdx] = 2; // Protected skin/face/neck
        }
      }
    }

    // Landmark 2: Central Face, Eyes, Nose, Mouth and Inner Head Core
    // In formal pas foto framing, head and face are centered around (0.50 * width, 0.35 * height)
    const faceLeft = Math.floor(width * 0.34);
    const faceRight = Math.floor(width * 0.66);
    const faceTop = Math.floor(height * 0.18);
    const faceBottom = Math.floor(height * 0.48);
    for (let y = faceTop; y <= faceBottom; y++) {
      const rowOffset = y * width;
      for (let x = faceLeft; x <= faceRight; x++) {
        const pIdx = rowOffset + x;
        classification[pIdx] = 2; // Protected head core
      }
    }

    // Landmark 3: Torso, Neck, Collar, Tie, Badges & Shoulders Core
    // In formal pas foto framing, human shoulders start around y=44% and widen to occupy the lower area
    for (let y = Math.floor(height * 0.44); y < height; y++) {
      const rowOffset = y * width;
      const progress = (y - height * 0.44) / (height * 0.56); // 0.0 at neck to 1.0 at bottom
      const halfW = (0.28 + progress * 0.26) * width;
      const startX = Math.max(0, Math.floor(width * 0.50 - halfW));
      const endX = Math.min(width - 1, Math.floor(width * 0.50 + halfW));

      for (let x = startX; x <= endX; x++) {
        const pIdx = rowOffset + x;
        // The central chest is ALWAYS protected (tie, badges, buttons, collar):
        const isCentralChest = (x >= width * 0.32 && x <= width * 0.68);
        if (!isCentralChest && (isBlueBg || isRedBg || isGreenBg) && isPixelBackground(x, y, pIdx)) {
          continue;
        }
        classification[pIdx] = 2; // Protected torso/clothing core
      }
    }

    // 7. Safe Exterior Seeded Flood Fill
    const queue = new Int32Array(width * height);
    let qHead = 0;
    let qTail = 0;

    // Seed top border: only pixels that match background color
    for (let x = 0; x < width; x++) {
      const pIdx = x;
      if (classification[pIdx] === 0 && isPixelBackground(x, 0, pIdx)) {
        classification[pIdx] = 1;
        queue[qTail++] = pIdx;
      }
    }

    // Seed side borders ONLY above shoulder level (y < 35% height) to prevent seeding into clothing/sleeves
    const maxSideSeedY = Math.floor(height * 0.35);
    for (let y = 1; y < maxSideSeedY; y++) {
      const leftIdx = y * width;
      if (classification[leftIdx] === 0 && isPixelBackground(0, y, leftIdx)) {
        classification[leftIdx] = 1;
        queue[qTail++] = leftIdx;
      }
      const rightIdx = y * width + (width - 1);
      if (classification[rightIdx] === 0 && isPixelBackground(width - 1, y, rightIdx)) {
        classification[rightIdx] = 1;
        queue[qTail++] = rightIdx;
      }
    }

    // 8. Flood Fill Propagation with Anatomical Edge Barriers
    // Threshold to stop at subject boundary:
    const edgeThreshold = (isBlueBg || isRedBg) ? 18 : 12;

    while (qHead < qTail) {
      const curr = queue[qHead++];
      const cx = curr % width;
      const cy = Math.floor(curr / width);

      const neighbors = [
        cx > 0 ? curr - 1 : -1,
        cx < width - 1 ? curr + 1 : -1,
        cy > 0 ? curr - width : -1,
        cy < height - 1 ? curr + width : -1,
      ];

      for (let k = 0; k < 4; k++) {
        const nIdx = neighbors[k];
        if (nIdx >= 0 && classification[nIdx] === 0) {
          const nx = nIdx % width;
          const ny = Math.floor(nIdx / width);

          // Stop at anatomical boundary edge (hairline, hijab hem, shoulder line, collar)
          if (grad[nIdx] > edgeThreshold) {
            continue;
          }

          // Spatial boundary: never flood into the lower central body
          if (ny > height * 0.52 && nx > width * 0.22 && nx < width * 0.78) {
            continue;
          }

          if (isPixelBackground(nx, ny, nIdx)) {
            classification[nIdx] = 1;
            queue[qTail++] = nIdx;
          }
        }
      }
    }

    // 9. TOPOLOGICAL HOLE CLOSING & MUTLAK SUBJECT PRESERVATION:
    // Any pixel that was NOT reached by the exterior flood fill from the borders
    // is completely enclosed within the subject contour (face, hair, hijab, clothes, tie, badge, buttons).
    // It is 100% FOREGROUND (classification = 2)!
    for (let pIdx = 0; pIdx < width * height; pIdx++) {
      if (classification[pIdx] === 0) {
        classification[pIdx] = 2; // Locked as subject foreground!
      }
    }

    // Morphological hole closing: clean any 1-2 pixel isolated background noise inside the subject
    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width;
      for (let x = 1; x < width - 1; x++) {
        const pIdx = rowOffset + x;
        if (classification[pIdx] === 1) {
          let fgNeighbors = 0;
          if (classification[pIdx - 1] === 2) fgNeighbors++;
          if (classification[pIdx + 1] === 2) fgNeighbors++;
          if (classification[pIdx - width] === 2) fgNeighbors++;
          if (classification[pIdx + width] === 2) fgNeighbors++;
          if (classification[pIdx - width - 1] === 2) fgNeighbors++;
          if (classification[pIdx - width + 1] === 2) fgNeighbors++;
          if (classification[pIdx + width - 1] === 2) fgNeighbors++;
          if (classification[pIdx + width + 1] === 2) fgNeighbors++;
          if (fgNeighbors >= 6) {
            classification[pIdx] = 2; // Close isolated hole inside subject
          }
        }
      }
    }

    // 10. Natural Non-Destructive Alpha Mask Construction:
    // - Every subject pixel (classification === 2) is guaranteed 100% OPAQUE (mask = 1.0).
    //   Zero transparency, zero erosion on face, hair, hijab, or clothing!
    // - Background pixels (classification === 1) are 0.0.
    // - Feathering is ONLY applied as smooth anti-aliasing on the exterior boundary pixels
    //   (pixels classified as 1 that touch the subject contour) so edges are smooth without jaggedness.
    const mask = new Float32Array(width * height);

    for (let i = 0; i < width * height; i++) {
      mask[i] = classification[i] === 2 ? 1.0 : 0.0;
    }

    if (settings.edgeFeather > 0) {
      // Find boundary pixels and apply anti-aliasing only on the outer background rim touching the subject
      for (let y = 1; y < height - 1; y++) {
        const rowOffset = y * width;
        for (let x = 1; x < width - 1; x++) {
          const pIdx = rowOffset + x;
          if (classification[pIdx] === 1) {
            let hasFgNeighbor = false;
            if (classification[pIdx - 1] === 2 || classification[pIdx + 1] === 2 ||
                classification[pIdx - width] === 2 || classification[pIdx + width] === 2) {
              hasFgNeighbor = true;
            }

            if (hasFgNeighbor) {
              // Outer rim anti-aliasing (never touches or erodes the subject interior)
              const i = pIdx * 4;
              const r = srcData[i];
              const g = srcData[i + 1];
              const b = srcData[i + 2];
              const dr = r - bgR;
              const dg = g - bgG;
              const db = b - bgB;
              const colorDist = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 1.732;
              const aaAlpha = Math.max(0.12, Math.min(0.35, (colorDist / Math.max(1, tolerance * 1.2)) * 0.35));
              mask[pIdx] = aaAlpha;
            }
          }
        }
      }
    }

    // 11. Terapkan Mask Manual Kustom Pengguna (jika tersedia dari kuas manual)
    if (customMask && customMask.length === width * height) {
      for (let i = 0; i < mask.length; i++) {
        mask[i] = customMask[i];
      }
    }

    return { mask, safety, bgR, bgG, bgB, skinRef };
  }

  public static applyBackgroundReplacement(
    targetCanvas: HTMLCanvasElement,
    bgType: BackgroundType,
    customBgImage?: HTMLImageElement | null,
    settings: BackgroundSettings = DEFAULT_BG_SETTINGS,
    precomputedMask?: Float32Array | { mask: Float32Array; safety: SegmentationResult; bgR: number; bgG: number; bgB: number; skinRef?: any },
    subjectImageData?: ImageData,
    mode: PhotoMode = 'color'
  ): SegmentationResult {
    const width = targetCanvas.width;
    const height = targetCanvas.height;
    const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { isSafe: false, confidence: 0 };

    // 1. Capture current source subject image data
    const sourceImageData = ctx.getImageData(0, 0, width, height);

    // 2. Compute or reuse subject mask and color background profile
    const maskInfo = (precomputedMask && (precomputedMask as any).bgR !== undefined)
      ? (precomputedMask as any)
      : this.computeSubjectMask(sourceImageData, settings);
    const mask = (precomputedMask instanceof Float32Array)
      ? precomputedMask
      : maskInfo.mask;
    const safety = maskInfo.safety;
    const bgR = maskInfo.bgR;
    const bgG = maskInfo.bgG;
    const bgB = maskInfo.bgB;
    const skinRef = maskInfo.skinRef;

    // Source data for cutout (allows pre-adjusted subject)
    const cutoutSource = subjectImageData
      ? new Uint8ClampedArray(subjectImageData.data)
      : new Uint8ClampedArray(sourceImageData.data);

    // 4. Targeted Spill Decontamination & Defringing (Konservatif pada Pita Tepi)
    // Menghilangkan fringe/halo warna latar lama pada helai rambut, telinga, kerah baju, dan bahu
    // tanpa mengubah warna asli interior tubuh/pakaian.
    if (settings.spillRemoval > 0 && bgType !== 'preserve') {
      const spillFactor = Math.min(1.0, Math.max(0.0, settings.spillRemoval / 100));
      const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
      const isBlueBg = (bgB > bgR + 12 && bgB > bgG + 10);
      const isRedBg = (bgR > bgG + 16 && bgR > bgB + 16);
      const isGreenBg = (bgG > bgR + 14 && bgG > bgB + 14);
      const isLightBg = bgLum > 165;

      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const pIdx = rowOffset + x;
          const alpha = mask[pIdx];
          if (alpha <= 0.001) continue;

          // Target HANYA pada piksel pita tepi (transisi semi-transparan atau berjarak <= 2 piksel dari latar)
          const isNearEdge = alpha < 0.99 || (
            (x > 0 && mask[pIdx - 1] < 0.92) ||
            (x < width - 1 && mask[pIdx + 1] < 0.92) ||
            (y > 0 && mask[pIdx - width] < 0.92) ||
            (y < height - 1 && mask[pIdx + width] < 0.92) ||
            (x > 1 && mask[pIdx - 2] < 0.80) ||
            (x < width - 2 && mask[pIdx + 2] < 0.80)
          );

          if (!isNearEdge) continue;

          const i = pIdx * 4;
          let r = cutoutSource[i];
          let g = cutoutSource[i + 1];
          let b = cutoutSource[i + 2];
          const pLum = 0.299 * r + 0.587 * g + 0.114 * b;

          // A. Mathematical Color Unmixing untuk piksel semi-transparan (0.10 < alpha < 0.88)
          // Memulihkan warna murni subjek (foreground) dari campuran optik latar lama
          if (alpha < 0.88 && alpha > 0.10) {
            const bgWeight = (1.0 - alpha) * 0.40 * spillFactor;
            r = Math.round(Math.max(0, Math.min(255, r - bgWeight * (bgR - 128))));
            g = Math.round(Math.max(0, Math.min(255, g - bgWeight * (bgG - 128))));
            b = Math.round(Math.max(0, Math.min(255, b - bgWeight * (bgB - 128))));
          }

          // B. De-fringing Latar Biru Resmi (Pas Foto Biru)
          if (isBlueBg) {
            const maxRG = Math.max(r, g);
            if (b > maxRG) {
              const excessB = b - maxRG;
              b = Math.round(b - excessB * spillFactor * 0.94);
            }
            // Kerah baju putih / pakaian terang (menghilangkan halo biru)
            if (r >= 110 && g >= 110 && Math.abs(r - g) < 26) {
              const maxChan = Math.max(r, g, b);
              r = Math.max(r, Math.round(maxChan * 0.96));
              g = Math.max(g, Math.round(maxChan * 0.96));
              b = Math.min(b, Math.max(r, g));
            }
            // Rambut hitam / gelap (menghilangkan pantulan biru pada helai rambut)
            if (pLum < 90) {
              b = Math.min(b, Math.max(r, g));
            }
          }

          // C. De-fringing Latar Merah Resmi (Pas Foto Merah)
          if (isRedBg) {
            const isSkin = skinRef ? this.isSkinTone(r, g, b, skinRef) : (r > g && g > b && r - b > 20);
            const maxGB = Math.max(g, b);
            if (!isSkin) {
              // Tepi rambut, hijab, jas, kerah, bahu
              if (r > maxGB) {
                const excessR = r - maxGB;
                r = Math.round(r - excessR * spillFactor * 0.94);
              }
              // Kerah kemeja putih (menghilangkan semburat merah muda/pink pada kain putih)
              if (g >= 110 && b >= 110 && Math.abs(g - b) < 26) {
                const targetR = Math.round((g + b) * 0.5);
                r = Math.round(r * (1 - spillFactor) + targetR * spillFactor);
              }
              // Rambut / kain gelap
              if (pLum < 95) {
                r = Math.min(r, Math.round(maxGB * 1.05));
              }
            } else {
              // Kulit (telinga/leher/pipi): lindungi rona kulit alami, hanya redam flare merah berlebih
              const naturalMaxR = Math.min(255, Math.round(g * 1.30 + 15));
              if (r > naturalMaxR) {
                r = Math.round(r * (1 - spillFactor * 0.6) + naturalMaxR * (spillFactor * 0.6));
              }
            }
          }

          // D. De-fringing Latar Hijau
          if (isGreenBg) {
            const maxRB = Math.max(r, b);
            if (g > maxRB) {
              const excessG = g - maxRB;
              g = Math.round(g - excessG * spillFactor * 0.94);
            }
          }

          // E. De-fringing Latar Putih Terang / Overexposure Glow
          if (isLightBg && pLum > 75 && pLum < 195) {
            const isNeutralDark = Math.abs(r - g) < 22 && Math.abs(g - b) < 22;
            if (isNeutralDark) {
              const damp = 1.0 - (spillFactor * 0.22);
              r = Math.round(r * damp);
              g = Math.round(g * damp);
              b = Math.round(b * damp);
            }
          }

          cutoutSource[i] = r;
          cutoutSource[i + 1] = g;
          cutoutSource[i + 2] = b;
        }
      }
    }

    // 5. Create Isolated Subject Canvas (Cutout with Alpha Channel)
    const subjectCanvas = document.createElement('canvas');
    subjectCanvas.width = width;
    subjectCanvas.height = height;
    const subCtx = subjectCanvas.getContext('2d');
    if (!subCtx) return { isSafe: false, confidence: 0 };

    const subImgData = subCtx.createImageData(width, height);
    const subData = subImgData.data;

    for (let pIdx = 0; pIdx < width * height; pIdx++) {
      const i = pIdx * 4;
      subData[i] = cutoutSource[i];
      subData[i + 1] = cutoutSource[i + 1];
      subData[i + 2] = cutoutSource[i + 2];
      subData[i + 3] = Math.round(cutoutSource[i + 3] * mask[pIdx]);
    }
    subCtx.putImageData(subImgData, 0, 0);

    // 6. RENDER NEW BACKGROUND ON TARGET CANVAS
    ctx.clearRect(0, 0, width, height);

    if (bgType !== 'transparent') {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = width;
      bgCanvas.height = height;
      const bCtx = bgCanvas.getContext('2d');

      if (bCtx) {
        if (bgType === 'custom' && customBgImage) {
          // Draw custom background with cover fit (no stretch, aspect ratio preserved)
          this.drawImageCover(bCtx, customBgImage, width, height);
        } else if (bgType === 'preserve') {
          // Draw original cropped image as background
          bCtx.putImageData(sourceImageData, 0, 0);
          if (mode === 'bw') {
            const bData = bCtx.getImageData(0, 0, width, height);
            const d = bData.data;
            for (let i = 0; i < d.length; i += 4) {
              const y = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
              d[i] = y;
              d[i + 1] = y;
              d[i + 2] = y;
            }
            bCtx.putImageData(bData, 0, 0);
          }
        } else {
          // Draw Studio Preset Background
          this.drawPresetBackground(bCtx, width, height, bgType);
        }

        // Apply Depth of Field Blur, Brightness, and Contrast to Background
        const filters: string[] = [];
        if (settings.bgBlur > 0) {
          filters.push(`blur(${settings.bgBlur}px)`);
        }
        if (settings.bgBrightness !== 0) {
          filters.push(`brightness(${100 + settings.bgBrightness}%)`);
        }
        if (settings.bgContrast !== 0) {
          filters.push(`contrast(${100 + settings.bgContrast}%)`);
        }

        ctx.save();
        if (filters.length > 0) {
          ctx.filter = filters.join(' ');
        }
        // Draw slightly oversized if blurred to prevent edge fade
        if (settings.bgBlur > 0) {
          const expand = Math.min(width * 0.05, settings.bgBlur * 2);
          ctx.drawImage(bgCanvas, -expand, -expand, width + expand * 2, height + expand * 2);
        } else {
          ctx.drawImage(bgCanvas, 0, 0, width, height);
        }
        ctx.restore();
      }
    }

    // 7. Calculate Subject Placement Transformations (Offset X/Y, Scale, Rotation, Flip)
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const offsetX = (settings.subjectOffsetX / 100) * width;
    const offsetY = (settings.subjectOffsetY / 100) * height;
    const scale = settings.subjectScale || 1.0;
    const rotationRad = ((settings.subjectRotation || 0) * Math.PI) / 180;
    const flipX = settings.subjectFlipX ? -1 : 1;

    // 8. Contact Depth Shadow behind Subject (Creates realistic natural 3D depth)
    if (settings.contactShadow > 0 && bgType !== 'transparent') {
      ctx.save();
      ctx.translate(centerX + offsetX, centerY + offsetY);
      ctx.rotate(rotationRad);
      ctx.scale(scale * flipX, scale);
      ctx.translate(-centerX, -centerY);

      ctx.shadowColor = `rgba(0, 0, 0, ${(settings.contactShadow / 100) * 0.45})`;
      ctx.shadowBlur = Math.max(4, width * 0.03);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.max(3, height * 0.02);

      // Draw shadow silhouette
      ctx.drawImage(subjectCanvas, 0, 0);
      ctx.restore();
    }

    // 9. DRAW TRANSFORMED SUBJECT OVER NEW BACKGROUND
    ctx.save();
    ctx.translate(centerX + offsetX, centerY + offsetY);
    ctx.rotate(rotationRad);
    ctx.scale(scale * flipX, scale);
    ctx.translate(-centerX, -centerY);
    ctx.drawImage(subjectCanvas, 0, 0);
    ctx.restore();

    // 10. LIGHT HARMONIZATION (Ambient color bounce / natural light matching)
    if (settings.lightHarmonization > 0 && bgType !== 'transparent') {
      this.applyLightHarmonization(ctx, width, height, mask, settings.lightHarmonization);
    }

    return {
      isSafe: true,
      confidence: safety.confidence,
      detectedBgColor: safety.detectedBgColor,
    };
  }

  /**
   * Helper to draw an image centered and scaled with 'cover' rule (no distortion)
   */
  public static drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    canvasWidth: number,
    canvasHeight: number
  ) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasWidth / canvasHeight;
    let renderW = canvasWidth;
    let renderH = canvasHeight;
    let renderX = 0;
    let renderY = 0;

    if (imgRatio > canvasRatio) {
      renderH = canvasHeight;
      renderW = canvasHeight * imgRatio;
      renderX = (canvasWidth - renderW) / 2;
    } else {
      renderW = canvasWidth;
      renderH = canvasWidth / imgRatio;
      renderY = (canvasHeight - renderH) / 2;
    }

    ctx.drawImage(img, renderX, renderY, renderW, renderH);
  }

  /**
   * Samples the background color and applies subtle ambient lighting tone to harmoniously integrate the subject
   */
  private static applyLightHarmonization(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    subjectMask: Float32Array,
    intensityPct: number
  ) {
    const factor = (intensityPct / 100) * 0.18; // Keep subtle and natural
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Sample perimeter background average color
    let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
    for (let x = 0; x < width; x += 4) {
      const topIdx = x * 4;
      bgR += data[topIdx];
      bgG += data[topIdx + 1];
      bgB += data[topIdx + 2];
      bgCount++;
    }
    if (bgCount === 0) return;
    bgR /= bgCount;
    bgG /= bgCount;
    bgB /= bgCount;

    const bgAvgLum = (bgR + bgG + bgB) / 3;
    const rShift = (bgR - bgAvgLum) * factor;
    const gShift = (bgG - bgAvgLum) * factor;
    const bShift = (bgB - bgAvgLum) * factor;

    // Apply color temperature tone shift to subject highlights and midtones
    for (let pIdx = 0; pIdx < width * height; pIdx++) {
      const alpha = subjectMask[pIdx];
      if (alpha > 0.15) {
        const i = pIdx * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Weight towards midtones and highlights (where ambient light bounces)
        const toneWeight = (lum / 255) * alpha;

        data[i] = Math.max(0, Math.min(255, Math.round(r + rShift * toneWeight)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g + gShift * toneWeight)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b + bShift * toneWeight)));
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Renders only the background onto a context (color, preset, or custom image),
   * applying background blur, brightness, and contrast.
   */
  public static renderBackgroundOnly(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bgType: BackgroundType,
    customBgImage?: HTMLImageElement | null,
    settings: BackgroundSettings = DEFAULT_BG_SETTINGS,
    sourceImageData?: ImageData,
    mode: PhotoMode = 'color'
  ): void {
    if (bgType === 'transparent') {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bCtx = bgCanvas.getContext('2d');
    if (!bCtx) return;

    if (bgType === 'custom' && customBgImage) {
      this.drawImageCover(bCtx, customBgImage, width, height);
    } else if (bgType === 'preserve' && sourceImageData) {
      bCtx.putImageData(sourceImageData, 0, 0);
      if (mode === 'bw') {
        const bData = bCtx.getImageData(0, 0, width, height);
        const d = bData.data;
        for (let i = 0; i < d.length; i += 4) {
          const y = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
          d[i] = y;
          d[i + 1] = y;
          d[i + 2] = y;
        }
        bCtx.putImageData(bData, 0, 0);
      }
    } else {
      this.drawPresetBackground(bCtx, width, height, bgType);
    }

    const filters: string[] = [];
    if (settings.bgBlur > 0) {
      filters.push(`blur(${settings.bgBlur}px)`);
    }
    if (settings.bgBrightness !== 0) {
      filters.push(`brightness(${100 + settings.bgBrightness}%)`);
    }
    if (settings.bgContrast !== 0) {
      filters.push(`contrast(${100 + settings.bgContrast}%)`);
    }

    ctx.save();
    if (filters.length > 0) {
      ctx.filter = filters.join(' ');
    }
    if (settings.bgBlur > 0) {
      const expand = Math.min(width * 0.05, settings.bgBlur * 2);
      ctx.drawImage(bgCanvas, -expand, -expand, width + expand * 2, height + expand * 2);
    } else {
      ctx.drawImage(bgCanvas, 0, 0, width, height);
    }
    ctx.restore();
  }

  /**
   * Fast detection whether an image has transparency (alpha channel < 250).
   */
  public static detectTransparency(img: HTMLImageElement): boolean {
    try {
      if (typeof document === 'undefined') return false;
      const canvas = document.createElement('canvas');
      const w = Math.min(100, img.naturalWidth || img.width || 100);
      const h = Math.min(100, img.naturalHeight || img.height || 100);
      if (w <= 0 || h <= 0) return false;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return false;
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 250) {
          return true;
        }
      }
    } catch (e) {
      // Ignored
    }
    return false;
  }

  /**
   * Renders a crisp B&W mask canvas (white = 100% foreground, black = background).
   */
  public static renderMaskCanvas(
    mask: Float32Array,
    width: number,
    height: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let i = 0; i < mask.length; i++) {
      const val = Math.round(Math.max(0, Math.min(1, mask[i])) * 255);
      const dIdx = i * 4;
      data[dIdx] = val;
      data[dIdx + 1] = val;
      data[dIdx + 2] = val;
      data[dIdx + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  /**
   * Renders diagnostic overlay: original photo with semi-transparent tinted mask overlay
   * showing preserved subject vs removed background.
   */
  public static renderOverlayCanvas(
    sourceCanvas: HTMLCanvasElement,
    mask: Float32Array
  ): HTMLCanvasElement {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.drawImage(sourceCanvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let i = 0; i < mask.length; i++) {
      const m = Math.max(0, Math.min(1, mask[i]));
      const dIdx = i * 4;
      if (m < 0.98) {
        // Removed background: tint red/ruby (rgba 235, 45, 45)
        const bgWeight = (1.0 - m) * 0.52;
        data[dIdx] = Math.round(data[dIdx] * (1 - bgWeight) + 235 * bgWeight);
        data[dIdx + 1] = Math.round(data[dIdx + 1] * (1 - bgWeight) + 45 * bgWeight);
        data[dIdx + 2] = Math.round(data[dIdx + 2] * (1 - bgWeight) + 45 * bgWeight);
      } else {
        // Protected subject: subtle emerald/cyan tint at outer edge to visualize crisp boundary
        // Retain subject natural colors perfectly
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  /**
   * Applies an interactive brush stroke directly to a mask Float32Array.
   * x, y are coordinates in canvas space.
   * mode: 'restore' paints 1.0 (foreground), 'erase' paints 0.0 (background).
   */
  public static applyBrushStroke(
    mask: Float32Array,
    width: number,
    height: number,
    x: number,
    y: number,
    brush: MaskBrushSettings
  ): void {
    const radius = Math.max(1, Math.round(brush.size / 2));
    const targetVal = brush.mode === 'restore' ? 1.0 : 0.0;
    const hardness = Math.max(0, Math.min(1, brush.hardness ?? 0.85));
    const innerRadius = radius * hardness;

    const minX = Math.max(0, Math.floor(x - radius));
    const maxX = Math.min(width - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius));
    const maxY = Math.min(height - 1, Math.ceil(y + radius));

    for (let py = minY; py <= maxY; py++) {
      const rowOffset = py * width;
      const dy = py - y;
      for (let px = minX; px <= maxX; px++) {
        const dx = px - x;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const pIdx = rowOffset + px;
        if (dist <= innerRadius) {
          mask[pIdx] = targetVal;
        } else {
          const factor = (radius - dist) / Math.max(1e-5, radius - innerRadius);
          if (brush.mode === 'restore') {
            mask[pIdx] = Math.max(mask[pIdx], factor);
          } else {
            mask[pIdx] = Math.min(mask[pIdx], 1.0 - factor);
          }
        }
      }
    }
  }
}
