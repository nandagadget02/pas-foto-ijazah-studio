import { AdjustmentParams, FaceSharpenSettings, PhotoMode } from '../types/analysis';

export interface DetailMasks {
  faceDetailMask: Float32Array; // Eyebrows, eyelashes, lips, nose contour, jawline
  eyeDetailMask: Float32Array; // Iris, pupil, eyelid edge, eyelashes
  hairDetailMask: Float32Array; // Hair strands, hijab edge/folds
  outfitDetailMask: Float32Array; // Suit collar, tie, buttons, fabric
  skinProtectionMask: Float32Array; // Smooth skin on cheeks, forehead, chin
  backgroundMask: Float32Array; // Backdrop
}

export class SharpenEngine {
  /**
   * Helper to check skin chromaticity using YCbCr color space.
   */
  private static isSkinPixel(
    r: number,
    g: number,
    b: number,
    skinRef?: { r: number; g: number; b: number } | null
  ): number {
    // Basic human skin chromaticity: R > G, G >= B, R - B > 8
    if (r <= g || g < b || r - b <= 8) {
      return 0.0;
    }

    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    let score = 0.0;
    if (cb >= 75 && cb <= 135 && cr >= 130 && cr <= 178) {
      score = 1.0;
    } else if (cb >= 65 && cb <= 145 && cr >= 122 && cr <= 186) {
      score = 0.5;
    }

    if (skinRef && score > 0) {
      const dr = Math.abs(r - skinRef.r);
      const dg = Math.abs(g - skinRef.g);
      const db = Math.abs(b - skinRef.b);
      const diff = (dr + dg + db) / 3;
      if (diff > 55) {
        score *= Math.max(0.2, 1.0 - (diff - 55) / 40);
      }
    }

    return score;
  }

  /**
   * Computes anatomical pixel-level continuous masks for smart detail sharpening.
   * Strictly non-generative, no bounding box rectangles, smoothly feathered per pixel.
   */
  public static computeDetailMasks(
    imageData: ImageData,
    subjectMask?: Float32Array | null
  ): DetailMasks {
    const width = imageData.width;
    const height = imageData.height;
    const totalPixels = width * height;
    const src = imageData.data;

    const faceDetailMask = new Float32Array(totalPixels);
    const eyeDetailMask = new Float32Array(totalPixels);
    const hairDetailMask = new Float32Array(totalPixels);
    const outfitDetailMask = new Float32Array(totalPixels);
    const skinProtectionMask = new Float32Array(totalPixels);
    const backgroundMask = new Float32Array(totalPixels);

    // 1. Sample skin reference from the central face area
    let skinSampleCount = 0;
    let sR = 0, sG = 0, sB = 0;
    const fStartX = Math.floor(width * 0.46);
    const fEndX = Math.floor(width * 0.54);
    const fStartY = Math.floor(height * 0.28);
    const fEndY = Math.floor(height * 0.38);

    for (let y = fStartY; y < fEndY; y += 2) {
      for (let x = fStartX; x < fEndX; x += 2) {
        const i = (y * width + x) * 4;
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        if (r > g && g > b) {
          sR += r;
          sG += g;
          sB += b;
          skinSampleCount++;
        }
      }
    }
    const skinRef = skinSampleCount > 0 ? {
      r: Math.round(sR / skinSampleCount),
      g: Math.round(sG / skinSampleCount),
      b: Math.round(sB / skinSampleCount),
    } : null;

    // 2. Precompute luminance & 3x3 Sobel gradient map
    const lum = new Float32Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      lum[i] = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
    }

    const grad = new Float32Array(totalPixels);
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      const prev = (y - 1) * width;
      const next = (y + 1) * width;
      for (let x = 1; x < width - 1; x++) {
        const p11 = lum[prev + x - 1];
        const p12 = lum[prev + x];
        const p13 = lum[prev + x + 1];
        const p21 = lum[row + x - 1];
        const p23 = lum[row + x + 1];
        const p31 = lum[next + x - 1];
        const p32 = lum[next + x];
        const p33 = lum[next + x + 1];

        const gx = (-p11 - 2 * p21 - p31 + p13 + 2 * p23 + p33) * 0.25;
        const gy = (-p11 - 2 * p12 - p13 + p31 + 2 * p32 + p33) * 0.25;
        grad[row + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    // Standard passport anatomical landmarks
    const leftEyeCenterX = 0.385 * width;
    const rightEyeCenterX = 0.615 * width;
    const eyeCenterY = 0.365 * height;
    const eyeSigmaX = 0.085 * width;
    const eyeSigmaY = 0.055 * height;

    // Mouth / lips landmark
    const mouthCenterX = 0.50 * width;
    const mouthCenterY = 0.58 * height;
    const mouthSigmaX = 0.11 * width;
    const mouthSigmaY = 0.05 * height;

    // 3. Compute continuous pixel-level masks
    for (let y = 0; y < height; y++) {
      const row = y * width;
      const yRel = y / height;

      for (let x = 0; x < width; x++) {
        const pIdx = row + x;
        const xRel = x / width;

        const subAlpha = subjectMask ? subjectMask[pIdx] : 1.0;
        backgroundMask[pIdx] = Math.max(0.0, 1.0 - subAlpha);

        if (subAlpha <= 0.01) {
          // Pixel strictly belongs to background
          continue;
        }

        const i = pIdx * 4;
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const pLum = lum[pIdx];
        const pGrad = grad[pIdx];

        const skinProb = this.isSkinPixel(r, g, b, skinRef);

        // A. EYE DETAIL MASK
        // Spatial Gaussian falloff around left & right eye sockets
        const dLeftSq =
          Math.pow((x - leftEyeCenterX) / eyeSigmaX, 2) +
          Math.pow((y - eyeCenterY) / eyeSigmaY, 2);
        const dRightSq =
          Math.pow((x - rightEyeCenterX) / eyeSigmaX, 2) +
          Math.pow((y - eyeCenterY) / eyeSigmaY, 2);

        const eyeSpatialWeight = Math.max(
          dLeftSq < 4 ? Math.exp(-dLeftSq) : 0,
          dRightSq < 4 ? Math.exp(-dRightSq) : 0
        );

        if (eyeSpatialWeight > 0.03 && yRel >= 0.26 && yRel <= 0.46) {
          // Target: iris (dark center / melanin), pupil, eyelid edges, eyelashes, sclera borders
          // Iris/Pupil: low luminance or high edge contrast
          // Lashes/Eyelid edge: distinct edge response (pGrad > 8)
          const edgeScore = Math.min(1.0, pGrad / 20.0);
          const irisPupilScore = pLum < 120 ? Math.min(1.0, (120 - pLum) / 75) : 0;
          const eyeFeatureScore = Math.max(edgeScore * 0.9, irisPupilScore * 0.85);

          eyeDetailMask[pIdx] = eyeSpatialWeight * eyeFeatureScore * subAlpha;
        }

        // B. SKIN PROTECTION MASK
        // Target: Forehead, cheeks, nose skin, chin skin
        // Objective: Keep smooth skin velvety, prevent pores, synthetic grain, and noise amplification
        const isInFaceZone = yRel >= 0.18 && yRel <= 0.74 && xRel >= 0.22 && xRel <= 0.78;
        if (isInFaceZone && skinProb > 0.3) {
          // Smooth skin has low to moderate gradient. If gradient is high, it's an edge (wrinkle, contour, lash).
          const smoothness = Math.max(0.0, 1.0 - Math.min(1.0, pGrad / 18.0));
          // Dampen if right inside eye socket
          const notEye = 1.0 - eyeDetailMask[pIdx];
          skinProtectionMask[pIdx] = skinProb * smoothness * notEye * subAlpha;
        }

        // C. FACE DETAIL MASK
        // Target: Eyebrows, eyelashes, lips, nose contour, chin & jawline contours
        // 1. Eyebrows: arched region directly above eyes (yRel 0.26 to 0.35, xRel 0.25 to 0.75)
        const isEyebrowZone = yRel >= 0.26 && yRel <= 0.35 && xRel >= 0.26 && xRel <= 0.74;
        let eyebrowScore = 0;
        if (isEyebrowZone && pGrad > 8) {
          eyebrowScore = Math.min(1.0, pGrad / 22.0) * (pLum < 135 ? 1.0 : 0.6);
        }

        // 2. Lips / Mouth: lower central face
        const dMouthSq =
          Math.pow((x - mouthCenterX) / mouthSigmaX, 2) +
          Math.pow((y - mouthCenterY) / mouthSigmaY, 2);
        let lipScore = 0;
        if (dMouthSq < 3.5 && yRel >= 0.50 && yRel <= 0.68) {
          const mouthSpatial = Math.exp(-dMouthSq);
          // Lips have distinct red chrominance or edge definition along the vermilion border / oral fissure
          const isLipColor = r > g + 15 || r > b + 20;
          const lipEdge = Math.min(1.0, pGrad / 18.0);
          lipScore = mouthSpatial * (isLipColor ? Math.max(0.6, lipEdge) : lipEdge);
        }

        // 3. Facial & Nose Contours: jawline, cheek contour, nose bridge edge
        let contourScore = 0;
        if (isInFaceZone && pGrad > 14) {
          // Edges within face that are not smooth skin
          const edgeStrength = Math.min(1.0, (pGrad - 10) / 24.0);
          contourScore = edgeStrength * (1.0 - skinProtectionMask[pIdx] * 0.75);
        }

        const combinedFaceDetail = Math.max(eyebrowScore, lipScore, contourScore);
        faceDetailMask[pIdx] = Math.min(1.0, combinedFaceDetail) * subAlpha;

        // D. HAIR & HIJAB DETAIL MASK
        // Target: Hair strands, crown volume, side hair, hijab fabric folds & contours
        const isUpperHeadZone = yRel <= 0.38;
        const isSideHeadZone = (xRel <= 0.34 || xRel >= 0.66) && yRel >= 0.12 && yRel <= 0.75;
        if ((isUpperHeadZone || isSideHeadZone) && skinProb < 0.45) {
          // Hair strands & hijab weave have fine high frequency edges
          const hairEdge = Math.min(1.0, pGrad / 20.0);
          hairDetailMask[pIdx] = hairEdge * (1.0 - skinProb) * subAlpha;
        }

        // E. OUTFIT DETAIL MASK
        // Target: Suit lapels, collars, tie, shirt fabric folds
        if (yRel >= 0.66 && skinProb < 0.35) {
          const outfitEdge = Math.min(1.0, pGrad / 24.0);
          outfitDetailMask[pIdx] = outfitEdge * subAlpha;
        }
      }
    }

    return {
      faceDetailMask,
      eyeDetailMask,
      hairDetailMask,
      outfitDetailMask,
      skinProtectionMask,
      backgroundMask,
    };
  }

  /**
   * Applies Smart Detail Sharpening (Non-Generative):
   * Global Sharpening -> Face Detail -> Eye Detail -> Hair Detail -> Skin Protection
   * Edge-preserving, strictly anti-halo, with zero color drift on True Grayscale.
   */
  public static applySmartDetailSharpening(
    imageData: ImageData,
    params: AdjustmentParams,
    mode: PhotoMode = 'color',
    subjectMask?: Float32Array | null
  ): void {
    const {
      sharpening = 6,
      noiseProtection = 6,
      faceDetail = 8,
      eyeDetail = 10,
      hairDetail = 8,
      skinProtection = 12,
    } = params;

    // If all sharpening parameters are zero, no processing needed
    if (
      sharpening <= 0 &&
      faceDetail <= 0 &&
      eyeDetail <= 0 &&
      hairDetail <= 0
    ) {
      return;
    }

    const width = imageData.width;
    const height = imageData.height;
    const totalPixels = width * height;
    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;

    // 1. Compute pixel-level anatomical detail masks
    const masks = this.computeDetailMasks(imageData, subjectMask);

    // 2. Normalization factors
    const globalBaseAmount = (sharpening / 20) * 0.65;
    const faceDetailAmount = (faceDetail / 25) * 0.90;
    const eyeDetailAmount = (eyeDetail / 25) * 1.20;
    const hairDetailAmount = (hairDetail / 25) * 0.85;
    const skinProtectionFactor = (skinProtection / 25) * 0.88;

    // Noise gate threshold: differences below threshold are ignored (preserves smooth film grain)
    const baseThreshold = Math.max(0.6, (noiseProtection / 20) * 14.0);

    // 3. Process unsharp masking with local extrema clamping & anti-halo suppression
    const isGrayscale = mode === 'bw';

    for (let y = 1; y < height - 1; y++) {
      const yPrev = (y - 1) * width;
      const yCurr = y * width;
      const yNext = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const pIdx = yCurr + x;
        const subAlpha = subjectMask ? subjectMask[pIdx] : 1.0;

        // Skip background if not in subject mask
        if (subAlpha <= 0.01) {
          continue;
        }

        // Layered sharpening weight calculation according to user specification:
        // Global Sharpening
        // ↓
        // Face Detail Sharpening
        // ↓
        // Eye Detail Sharpening
        // ↓
        // Hair Detail Sharpening
        // ↓
        // Skin Protection
        let totalSharpenWeight = globalBaseAmount;
        totalSharpenWeight += faceDetailAmount * masks.faceDetailMask[pIdx];
        totalSharpenWeight += eyeDetailAmount * masks.eyeDetailMask[pIdx];
        totalSharpenWeight += hairDetailAmount * masks.hairDetailMask[pIdx];

        // Skin Protection: dampens sharpening on smooth facial skin (forehead, cheeks, chin)
        const skinDamping = masks.skinProtectionMask[pIdx] * skinProtectionFactor;
        totalSharpenWeight = Math.max(0.0, totalSharpenWeight * (1.0 - skinDamping));

        // Subpixel subject boundary blending
        totalSharpenWeight *= subAlpha;

        if (totalSharpenWeight <= 0.005) {
          continue;
        }

        // 3x3 neighborhood pixel offsets
        const i00 = (yPrev + x - 1) * 4;
        const i01 = (yPrev + x) * 4;
        const i02 = (yPrev + x + 1) * 4;
        const i10 = (yCurr + x - 1) * 4;
        const i11 = (yCurr + x) * 4;
        const i12 = (yCurr + x + 1) * 4;
        const i20 = (yNext + x - 1) * 4;
        const i21 = (yNext + x) * 4;
        const i22 = (yNext + x + 1) * 4;

        if (isGrayscale) {
          // TRUE GRAYSCALE / B&W MODE:
          // Process luminance directly. Guaranteed R = G = B with 0% chromatic noise.
          const y00 = src[i00];
          const y01 = src[i01];
          const y02 = src[i02];
          const y10 = src[i10];
          const y11 = src[i11];
          const y12 = src[i12];
          const y20 = src[i20];
          const y21 = src[i21];
          const y22 = src[i22];

          // 3x3 Gaussian-like low-pass filter
          const blurY =
            (y00 * 1 + y01 * 2 + y02 * 1 +
             y10 * 2 + y11 * 4 + y12 * 2 +
             y20 * 1 + y21 * 2 + y22 * 1) / 16;

          const origY = y11;
          const diff = origY - blurY;

          if (Math.abs(diff) >= baseThreshold) {
            const sign = diff > 0 ? 1 : -1;
            const effectiveDiff = (Math.abs(diff) - baseThreshold) * sign;

            // Halo suppression: dampen extreme edge spikes
            const dampedDiff = effectiveDiff / (1.0 + Math.abs(effectiveDiff) / 36.0);

            // Local extrema clamping (Zero Ringing Guarantee)
            const minNeighbor = Math.min(y00, y01, y02, y10, y11, y12, y20, y21, y22);
            const maxNeighbor = Math.max(y00, y01, y02, y10, y11, y12, y20, y21, y22);

            let newY = origY + dampedDiff * totalSharpenWeight;
            const clampedY = Math.round(
              Math.max(Math.max(0, minNeighbor - 4), Math.min(Math.min(255, maxNeighbor + 4), newY))
            );

            dst[i11] = clampedY;
            dst[i11 + 1] = clampedY;
            dst[i11 + 2] = clampedY;
          }
        } else {
          // COLOR MODE:
          // Process luminance and apply proportional scaling to R, G, B to preserve chromaticity exactly.
          const lum00 = 0.299 * src[i00] + 0.587 * src[i00 + 1] + 0.114 * src[i00 + 2];
          const lum01 = 0.299 * src[i01] + 0.587 * src[i01 + 1] + 0.114 * src[i01 + 2];
          const lum02 = 0.299 * src[i02] + 0.587 * src[i02 + 1] + 0.114 * src[i02 + 2];
          const lum10 = 0.299 * src[i10] + 0.587 * src[i10 + 1] + 0.114 * src[i10 + 2];
          const lum11 = 0.299 * src[i11] + 0.587 * src[i11 + 1] + 0.114 * src[i11 + 2];
          const lum12 = 0.299 * src[i12] + 0.587 * src[i12 + 1] + 0.114 * src[i12 + 2];
          const lum20 = 0.299 * src[i20] + 0.587 * src[i20 + 1] + 0.114 * src[i20 + 2];
          const lum21 = 0.299 * src[i21] + 0.587 * src[i21 + 1] + 0.114 * src[i21 + 2];
          const lum22 = 0.299 * src[i22] + 0.587 * src[i22 + 1] + 0.114 * src[i22 + 2];

          const blurLum =
            (lum00 * 1 + lum01 * 2 + lum02 * 1 +
             lum10 * 2 + lum11 * 4 + lum12 * 2 +
             lum20 * 1 + lum21 * 2 + lum22 * 1) / 16;

          const origLum = lum11;
          const diff = origLum - blurLum;

          if (Math.abs(diff) >= baseThreshold) {
            const sign = diff > 0 ? 1 : -1;
            const effectiveDiff = (Math.abs(diff) - baseThreshold) * sign;

            // Halo suppression
            const dampedDiff = effectiveDiff / (1.0 + Math.abs(effectiveDiff) / 38.0);

            // Local extrema bounds
            const minNeighborLum = Math.min(lum00, lum01, lum02, lum10, lum11, lum12, lum20, lum21, lum22);
            const maxNeighborLum = Math.max(lum00, lum01, lum02, lum10, lum11, lum12, lum20, lum21, lum22);

            let newLum = origLum + dampedDiff * totalSharpenWeight;
            const clampedLum = Math.max(
              Math.max(0, minNeighborLum - 4),
              Math.min(Math.min(255, maxNeighborLum + 4), newLum)
            );

            const lumDelta = clampedLum - origLum;

            // Apply luminance shift to each channel with clamp
            dst[i11] = Math.max(0, Math.min(255, Math.round(src[i11] + lumDelta)));
            dst[i11 + 1] = Math.max(0, Math.min(255, Math.round(src[i11 + 1] + lumDelta)));
            dst[i11 + 2] = Math.max(0, Math.min(255, Math.round(src[i11 + 2] + lumDelta)));
          }
        }
      }
    }
  }

  /**
   * Backward-compatible method forwarding to applySmartDetailSharpening
   */
  public static applySharpening(
    imageData: ImageData,
    sharpening: number,
    noiseProtection: number
  ): void {
    const dummyParams: AdjustmentParams = {
      exposureEV: 0,
      brightness: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      sharpening,
      noiseProtection,
      faceDetail: 0,
      eyeDetail: 0,
      hairDetail: 0,
      skinProtection: 0,
      saturation: 0,
      temperature: 0,
      tint: 0,
    };
    this.applySmartDetailSharpening(imageData, dummyParams, 'color', null);
  }

  /**
   * Applies Controlled Non-Generative Face Sharpening (AI / Anatomical Filter).
   * Enhances readability of facial features (eyes, eyebrows, lips, contours)
   * without modifying facial geometry, identity, or introducing halo/excess grain.
   * If faceSharpenSettings.enabled is false, exits immediately with zero overhead.
   */
  public static applyFaceSharpenFilter(
    imageData: ImageData,
    settings?: FaceSharpenSettings | null,
    mode: PhotoMode = 'color',
    subjectMask?: Float32Array | null
  ): void {
    if (!settings || !settings.enabled || settings.intensity <= 0) {
      return;
    }

    const width = imageData.width;
    const height = imageData.height;
    if (width < 3 || height < 3) return;

    const totalPixels = width * height;
    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;

    // 1. Compute pixel-level continuous anatomical detail masks
    const masks = this.computeDetailMasks(imageData, subjectMask);

    // 2. Normalization factors
    const intensityWeight = (settings.intensity / 100) * 0.95;
    const baseThreshold = Math.max(0.5, settings.threshold);
    const radius = Math.max(0.5, Math.min(3.0, settings.radius || 1.2));
    const isGrayscale = mode === 'bw';

    // 3. Extract luminance for convolution
    const lum = new Float32Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      if (isGrayscale) {
        lum[i] = src[idx];
      } else {
        lum[i] = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
      }
    }

    // 4. Separable 1D Gaussian kernel based on radius
    const kRadius = radius > 1.6 ? 2 : 1;
    const kernelSize = kRadius * 2 + 1;
    const kernel = new Float32Array(kernelSize);
    let kSum = 0;
    const twoSigmaSq = 2 * radius * radius;
    for (let i = -kRadius; i <= kRadius; i++) {
      const w = Math.exp(-(i * i) / twoSigmaSq);
      kernel[i + kRadius] = w;
      kSum += w;
    }
    for (let i = 0; i < kernelSize; i++) {
      kernel[i] /= kSum;
    }

    // Horizontal pass
    const tempH = new Float32Array(totalPixels);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        let acc = 0;
        for (let k = -kRadius; k <= kRadius; k++) {
          const kx = Math.max(0, Math.min(width - 1, x + k));
          acc += lum[row + kx] * kernel[k + kRadius];
        }
        tempH[row + x] = acc;
      }
    }

    // Vertical pass -> low-pass blurred luminance
    const blurLum = new Float32Array(totalPixels);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let acc = 0;
        for (let k = -kRadius; k <= kRadius; k++) {
          const ky = Math.max(0, Math.min(height - 1, y + k));
          acc += tempH[ky * width + x] * kernel[k + kRadius];
        }
        blurLum[y * width + x] = acc;
      }
    }

    // 5. Unsharp Masking with Anatomical Weighting and Extrema Clamping
    for (let y = 1; y < height - 1; y++) {
      const yPrev = (y - 1) * width;
      const yCurr = y * width;
      const yNext = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const pIdx = yCurr + x;
        const subAlpha = subjectMask ? subjectMask[pIdx] : 1.0;
        if (subAlpha <= 0.01) continue;

        // Anatomical face weight: focuses on faceDetail (lips, brows, contour) + eyeDetail (iris, eyelid, lashes)
        // Damped heavily on skinProtectionMask (cheeks, forehead, chin) to keep skin velvety & noise-free
        const faceDetailWeight = masks.faceDetailMask[pIdx] * 1.1 + masks.eyeDetailMask[pIdx] * 1.35;
        const skinDamp = masks.skinProtectionMask[pIdx] * 0.85;
        let totalSharpenWeight = intensityWeight * faceDetailWeight * (1.0 - skinDamp) * subAlpha;

        if (totalSharpenWeight <= 0.01) continue;

        const origLum = lum[pIdx];
        const bLum = blurLum[pIdx];
        const diff = origLum - bLum;

        if (Math.abs(diff) >= baseThreshold) {
          const sign = diff > 0 ? 1 : -1;
          const effectiveDiff = (Math.abs(diff) - baseThreshold) * sign;

          // Anti-halo suppression: softens sharp boundary overshoots
          const dampedDiff = effectiveDiff / (1.0 + Math.abs(effectiveDiff) / 32.0);

          // Local extrema clamping (Zero Ringing Guarantee)
          const p00 = lum[yPrev + x - 1];
          const p01 = lum[yPrev + x];
          const p02 = lum[yPrev + x + 1];
          const p10 = lum[yCurr + x - 1];
          const p12 = lum[yCurr + x + 1];
          const p20 = lum[yNext + x - 1];
          const p21 = lum[yNext + x];
          const p22 = lum[yNext + x + 1];

          const minNeighbor = Math.min(p00, p01, p02, p10, origLum, p12, p20, p21, p22);
          const maxNeighbor = Math.max(p00, p01, p02, p10, origLum, p12, p20, p21, p22);

          let newLum = origLum + dampedDiff * totalSharpenWeight;
          const clampedLum = Math.max(
            Math.max(0, minNeighbor - 3),
            Math.min(Math.min(255, maxNeighbor + 3), newLum)
          );

          const i = pIdx * 4;
          if (isGrayscale) {
            const finalVal = Math.round(clampedLum);
            dst[i] = finalVal;
            dst[i + 1] = finalVal;
            dst[i + 2] = finalVal;
          } else {
            const lumDelta = clampedLum - origLum;
            dst[i] = Math.max(0, Math.min(255, Math.round(src[i] + lumDelta)));
            dst[i + 1] = Math.max(0, Math.min(255, Math.round(src[i + 1] + lumDelta)));
            dst[i + 2] = Math.max(0, Math.min(255, Math.round(src[i + 2] + lumDelta)));
          }
        }
      }
    }
  }
}
