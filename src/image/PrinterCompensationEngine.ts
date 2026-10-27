import { PrinterCompensationSettings } from '../types/analysis';

/**
 * PRINTER COMPENSATION ENGINE
 * Khusus untuk mode B&W / TRUE GRAYSCALE.
 *
 * Menerapkan kompensasi warna halus (subtle color cast compensation)
 * pada PRINT VERSION untuk mengantisipasi ketidaksempurnaan kombinasi
 * printer, tinta, dan kertas, dengan tetap menjaga:
 * 1. Master Grayscale 100% netral (R = G = B)
 * 2. Konservatif & sangat kecil (anti-slop, tidak menghasilkan foto berwarna)
 * 3. Luminansi Rec. 709 terjaga (exposure, contrast, shadow, highlight tidak bergeser)
 * 4. Berlaku pada seluruh kanvas print version (tidak terikat subject lock).
 */
export class PrinterCompensationEngine {
  /**
   * Menghitung delta RGB yang sangat konservatif dan terisolasi luminansinya.
   */
  public static calculateChannelOffsets(settings: PrinterCompensationSettings): {
    deltaR: number;
    deltaG: number;
    deltaB: number;
  } {
    if (!settings.enabled) {
      return { deltaR: 0, deltaG: 0, deltaB: 0 };
    }

    let rawR = 0;
    let rawG = 0;
    let rawB = 0;

    // 1. Profil Printer Base Offset (Konservatif ~0.5 - 1.5 nilai piksel)
    if (settings.printerProfile === 'epson_l1210') {
      // Epson EcoTank L1210 dengan tinta dye 4 warna (C, M, Y, K) pada kertas foto
      // memiliki kecenderungan bawaan sedikit dingin/cyan-magenta pada grayscale.
      // Profil bawaan memberikan kompensasi penyeimbang mikro (+ kehangatan halus).
      rawR += 1.2;
      rawG += 0.4;
      rawB -= 1.0;
    }

    // 2. Profil Kertas Base Offset
    if (settings.paperProfile === 'matte') {
      // Kertas matte menyerap tinta lebih dalam, menghasilkan shadow yang sedikit terkesan kebiruan/dingin
      rawR += 0.6;
      rawG += 0.2;
      rawB -= 0.6;
    } else if (settings.paperProfile === 'silky_luster') {
      // Kertas luster memiliki lapisan mikropori yang sedikit menyerap highlight
      rawR += 0.2;
      rawG += 0.1;
      rawB -= 0.2;
    } else if (settings.paperProfile === 'plain') {
      // Kertas HVS/plain paper
      rawR += 0.4;
      rawG += 0.2;
      rawB -= 0.4;
    }

    // 3. Neutral Bias Slider (-100 Cool/Blue <---> +100 Warm/Yellow)
    // Skala maksimum dibatasi sangat konservatif: maks ±3.0 nilai piksel dari 255.
    const nbNorm = Math.max(-100, Math.min(100, settings.neutralBias)) / 100;
    if (nbNorm > 0) {
      // Warm / Yellow
      rawR += nbNorm * 2.6;
      rawG += nbNorm * 1.2;
      rawB -= nbNorm * 2.4;
    } else if (nbNorm < 0) {
      // Cool / Blue
      const coolFactor = Math.abs(nbNorm);
      rawR -= coolFactor * 2.4;
      rawG -= coolFactor * 0.4;
      rawB += coolFactor * 2.6;
    }

    // 4. Fine Compensation Sliders (-100 to +100)
    // Skala mikro presisi: rentang -100 hingga +100
    // Pada step ±1 sampai ±5, pergeseran sub-piksel halus menjamin tidak ada dead-control.
    const blueNorm = Math.max(-100, Math.min(100, settings.blueBias)) / 100;
    rawB += blueNorm * 8.0;

    const yellowNorm = Math.max(-100, Math.min(100, settings.yellowBias)) / 100;
    rawR += yellowNorm * 6.4;
    rawG += yellowNorm * 4.8;
    rawB -= yellowNorm * 7.0;

    const redNorm = Math.max(-100, Math.min(100, settings.redBias)) / 100;
    rawR += redNorm * 8.0;

    const greenNorm = Math.max(-100, Math.min(100, settings.greenBias)) / 100;
    rawG += greenNorm * 8.0;

    // 5. Normalisasi Konservasi Luminansi (ITU-R BT.709)
    // lum = 0.2126*R + 0.7152*G + 0.0722*B
    // Menghilangkan net shift pada luminansi agar Exposure, Brightness, Contrast,
    // Highlights, Shadows, Whites, dan Blacks tetap 100% terjaga dan tidak berubah!
    const netLumShift = 0.2126 * rawR + 0.7152 * rawG + 0.0722 * rawB;
    const finalDeltaR = rawR - netLumShift;
    const finalDeltaG = rawG - netLumShift;
    const finalDeltaB = rawB - netLumShift;

    return {
      deltaR: finalDeltaR,
      deltaG: finalDeltaG,
      deltaB: finalDeltaB,
    };
  }

  // Bayer 8x8 matrix terdistribusi merata (0..1) untuk respons rendering sub-pixel (Anti Dead Control)
  // Menjamin step ±1 sekecil apapun langsung memicu perubahan piksel di kanvas tanpa artifak atau banding
  private static readonly BAYER_8X8: number[] = [
     0, 32,  8, 40,  2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44,  4, 36, 14, 46,  6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
     3, 35, 11, 43,  1, 33,  9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47,  7, 39, 13, 45,  5, 37,
    63, 31, 55, 23, 61, 29, 53, 21,
  ].map((v) => (v + 0.5) / 64);

  /**
   * Menerapkan delta saluran warna dengan dither halus sub-pixel.
   * Jika delta = 0 (netral), nilai piksel dijamin 100% tidak tersentuh (R = G = B).
   */
  private static applyDeltaWithDither(current: number, delta: number, threshold: number): number {
    if (delta === 0) return current;
    const base = Math.trunc(delta);
    const frac = delta - base;
    let offset = base;
    if (frac > 0) {
      if (threshold < frac) offset += 1;
    } else if (frac < 0) {
      if (threshold < -frac) offset -= 1;
    }
    return Math.max(0, Math.min(255, current + offset));
  }

  /**
   * Menerapkan pengaturan Print Brightness, Highlight Recovery, White Point,
   * dan White Garment Detail khusus untuk Print Version (Non-generatif).
   */
  public static applyPrintTonalAdjustments(
    imgData: ImageData,
    settings: PrinterCompensationSettings
  ): void {
    const {
      printBrightness = 0,
      highlightRecovery = 0,
      whitePoint = 0,
      whiteGarmentDetail = 0,
    } = settings;

    if (
      printBrightness === 0 &&
      highlightRecovery <= 0 &&
      whitePoint === 0 &&
      whiteGarmentDetail <= 0
    ) {
      return;
    }

    const data = imgData.data;
    const width = imgData.width;
    const height = imgData.height;
    const totalPixels = width * height;

    // 1. Precompute 1D Look-Up Table (LUT) untuk kurva tonal global
    const lut = new Uint8Array(256);

    const bNorm = Math.max(-50, Math.min(50, printBrightness)) / 100;
    const gamma = bNorm > 0 ? 1.0 - bNorm * 0.38 : 1.0 + Math.abs(bNorm) * 0.42;

    const hRecFactor = Math.max(0, Math.min(100, highlightRecovery)) / 100;
    const wPtFactor = Math.max(-50, Math.min(50, whitePoint)) / 50;

    for (let i = 0; i < 256; i++) {
      let y = i;

      // 1a. Print Brightness (Gamma Curve)
      if (bNorm !== 0) {
        const normY = y / 255;
        y = Math.pow(normY, gamma) * 255;
      }

      // 1b. Highlight Recovery (Soft compression pada y >= 170)
      if (hRecFactor > 0 && y >= 170) {
        const excess = y - 170; // 0..85
        const compressedExcess = (excess * 85) / (85 + excess * (hRecFactor * 1.3));
        const deltaH = (compressedExcess - excess) * hRecFactor;
        y += deltaH;
      }

      // 1c. White Point (Batas intensitas putih paling terang)
      if (wPtFactor !== 0 && y >= 160) {
        const wRatio = (y - 160) / 95; // 0 at 160, 1.0 at 255
        const deltaW = wPtFactor * 16.0 * (wRatio * wRatio);
        y += deltaW;
      }

      lut[i] = Math.max(0, Math.min(255, Math.round(y)));
    }

    // 2. Jika White Garment Detail aktif, hitung peta tekstur kain putih (high-pass filter)
    let garmentTextureDelta: Float32Array | null = null;
    if (whiteGarmentDetail > 0) {
      garmentTextureDelta = new Float32Array(totalPixels);
      const gFactor = (whiteGarmentDetail / 100) * 1.75;

      for (let y = 1; y < height - 1; y++) {
        const prevRow = (y - 1) * width;
        const currRow = y * width;
        const nextRow = (y + 1) * width;

        for (let x = 1; x < width - 1; x++) {
          const idx = (currRow + x) * 4;
          const center = data[idx];

          if (center < 170) continue;

          const blurVal =
            (data[(prevRow + x - 1) * 4] +
              data[(prevRow + x) * 4] * 2 +
              data[(prevRow + x + 1) * 4] +
              data[(currRow + x - 1) * 4] * 2 +
              center * 4 +
              data[(currRow + x + 1) * 4] * 2 +
              data[(nextRow + x - 1) * 4] +
              data[(nextRow + x) * 4] * 2 +
              data[(nextRow + x + 1) * 4]) /
            16;

          const diff = center - blurVal;

          if (Math.abs(diff) > 0.8) {
            const whiteWeight = Math.min(1.0, (center - 170) / 60);
            // Cegah halo/ringing pada tepi batas siluet dengan membatasi micro-delta tekstur
            const clampedDiff = Math.max(-20, Math.min(20, diff));
            garmentTextureDelta[currRow + x] = clampedDiff * gFactor * whiteWeight;
          }
        }
      }
    }

    // Batas plafon putih (White Point ceiling) dari kurva LUT
    const maxWhiteCeiling = lut[255];

    // 3. Terapkan LUT dan Tekstur Kain Putih ke data piksel
    let pIdx = 0;
    for (let i = 0; i < totalPixels; i++, pIdx += 4) {
      const origR = data[pIdx];
      const origG = data[pIdx + 1];
      const origB = data[pIdx + 2];

      if (origR === origG && origG === origB) {
        let val = lut[origR];
        if (garmentTextureDelta) {
          const tex = garmentTextureDelta[i];
          if (tex !== 0) {
            val = Math.max(0, Math.min(maxWhiteCeiling, Math.round(val + tex)));
          }
        }
        data[pIdx] = val;
        data[pIdx + 1] = val;
        data[pIdx + 2] = val;
      } else {
        const lum = Math.round(0.299 * origR + 0.587 * origG + 0.114 * origB);
        let targetLum = lut[lum];
        if (garmentTextureDelta) {
          const tex = garmentTextureDelta[i];
          if (tex !== 0) {
            targetLum = Math.max(0, Math.min(maxWhiteCeiling, Math.round(targetLum + tex)));
          }
        }
        const delta = targetLum - lum;
        data[pIdx] = Math.max(0, Math.min(255, origR + delta));
        data[pIdx + 1] = Math.max(0, Math.min(255, origG + delta));
        data[pIdx + 2] = Math.max(0, Math.min(255, origB + delta));
      }
    }
  }

  /**
   * Membuat print canvas baru dari master canvas.
   * Master canvas sama sekali tidak disentuh atau dimodifikasi.
   */
  public static createPrintCanvas(
    masterCanvas: HTMLCanvasElement,
    settings: PrinterCompensationSettings
  ): HTMLCanvasElement {
    const printCanvas = document.createElement('canvas');
    printCanvas.width = masterCanvas.width;
    printCanvas.height = masterCanvas.height;

    const ctx = printCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return masterCanvas;
    }

    // Salin gambar master secara tepat
    ctx.drawImage(masterCanvas, 0, 0);

    // Jika kompensasi printer tidak aktif, kembalikan salinan identik (R = G = B)
    if (!settings.enabled) {
      return printCanvas;
    }

    const hasTonalAdjustment =
      (settings.printBrightness ?? 0) !== 0 ||
      (settings.highlightRecovery ?? 0) > 0 ||
      (settings.whitePoint ?? 0) !== 0 ||
      (settings.whiteGarmentDetail ?? 0) > 0;

    const { deltaR, deltaG, deltaB } = this.calculateChannelOffsets(settings);
    const hasColorOffset = deltaR !== 0 || deltaG !== 0 || deltaB !== 0;

    // Jika tidak ada tonal adjustment dan tidak ada color offset, gambar identik
    if (!hasTonalAdjustment && !hasColorOffset) {
      return printCanvas;
    }

    const imgData = ctx.getImageData(0, 0, printCanvas.width, printCanvas.height);
    const data = imgData.data;

    // 1. Terapkan Tonal & White Detail (Anti-Silau & Tekstur Pakaian)
    if (hasTonalAdjustment) {
      this.applyPrintTonalAdjustments(imgData, settings);
    }

    // 2. Terapkan Kompensasi Warna Mikro & Dither jika ada offset
    if (hasColorOffset) {
      const width = printCanvas.width;
      const height = printCanvas.height;
      const bayer = this.BAYER_8X8;
      let idx = 0;

      for (let y = 0; y < height; y++) {
        const bayerRowOffset = (y & 7) * 8;
        for (let x = 0; x < width; x++, idx += 4) {
          const threshold = bayer[bayerRowOffset + (x & 7)];
          data[idx] = this.applyDeltaWithDither(data[idx], deltaR, threshold);
          data[idx + 1] = this.applyDeltaWithDither(data[idx + 1], deltaG, threshold);
          data[idx + 2] = this.applyDeltaWithDither(data[idx + 2], deltaB, threshold);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return printCanvas;
  }
}
