import {
  AdjustmentParams,
  BackgroundRemovalMode,
  BackgroundSettings,
  BackgroundType,
  CropRect,
  DEFAULT_BG_SETTINGS,
  DEFAULT_FRAMING_SETTINGS,
  DEFAULT_PRINTER_COMPENSATION,
  DiagnosticPreviewMode,
  EditTargetMode,
  FaceSharpenSettings,
  FramingSettings,
  OutputDimension,
  PhotoMode,
  PrinterCompensationSettings,
  TargetTone,
} from '../types/analysis';
import { ToneEngine } from './ToneEngine';
import { SharpenEngine } from './SharpenEngine';
import { BackgroundEngine, SegmentationResult } from './BackgroundEngine';
import { PrinterCompensationEngine } from './PrinterCompensationEngine';

export interface ProcessOptions {
  sourceImage: HTMLImageElement;
  cropRect: CropRect;
  rotation?: number; // Sudut rotasi foto dalam derajat (-180 hingga +180)
  params: AdjustmentParams;
  mode: PhotoMode;
  targetTone: TargetTone;
  backgroundType: BackgroundType;
  bgRemovalMode?: BackgroundRemovalMode; // 'remove' (default / AI segment) | 'skip' (pass-through / pre-transparent PNG)
  customBgImage?: HTMLImageElement | null;
  bgSettings?: BackgroundSettings;
  targetDimension: OutputDimension;
  isHighResExport?: boolean;
  editTargetMode?: EditTargetMode;
  printerCompensation?: PrinterCompensationSettings;
  framingSettings?: FramingSettings;
  faceSharpenSettings?: FaceSharpenSettings;
  customMask?: Float32Array;
  diagnosticMode?: DiagnosticPreviewMode;
}

export interface ProcessResult {
  canvas: HTMLCanvasElement; // MASTER CANVAS (Selalu True Grayscale R = G = B pada mode 'bw')
  printCanvas: HTMLCanvasElement; // PRINT VERSION (Hasil kompensasi printer terpisah)
  segmentationResult?: SegmentationResult;
  mask?: Float32Array; // Subjek foreground alpha mask (1.0 = solid subject, 0.0 = background)
  rawCroppedCanvas?: HTMLCanvasElement; // Foto sumber yang dicrop sebelum pemrosesan
}

/**
 * Lightweight in-memory cache for downsampled preview source images.
 * Keeps sourceImage untouched while providing lightning-fast redraws during slider dragging.
 */
export class PreviewSourceCache {
  private static cache = new WeakMap<HTMLImageElement, { canvas: HTMLCanvasElement; scale: number }>();

  /**
   * Retrieves or creates a downsampled preview copy of the source image.
   * If source image is already <= maxDim (1200px), returns the original sourceImage with scale 1.0.
   * NEVER upscales smaller images.
   */
  public static getOrCreatePreviewSource(
    sourceImage: HTMLImageElement,
    maxDim = 1200
  ): { source: CanvasImageSource; scale: number } {
    const width = sourceImage.naturalWidth || sourceImage.width;
    const height = sourceImage.naturalHeight || sourceImage.height;

    // Do not downscale or upscale if image is already within bounds
    if (width <= maxDim && height <= maxDim) {
      return { source: sourceImage, scale: 1.0 };
    }

    const cached = this.cache.get(sourceImage);
    if (cached) {
      return { source: cached.canvas, scale: cached.scale };
    }

    let targetW = width;
    let targetH = height;
    if (width > height) {
      targetH = Math.round((height * maxDim) / width);
      targetW = maxDim;
    } else {
      targetW = Math.round((width * maxDim) / height);
      targetH = maxDim;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceImage, 0, 0, targetW, targetH);
    }

    const scale = targetW / width;
    const entry = { canvas, scale };
    this.cache.set(sourceImage, entry);
    return { source: canvas, scale };
  }
}

export class ImageProcessor {
  /**
   * Processes the image through the entire non-generative pipeline.
   * Separates fast preview rendering and full-resolution 600 DPI output.
   */
  public static processImage(options: ProcessOptions): ProcessResult {
    const {
      sourceImage,
      cropRect,
      params,
      mode,
      targetTone,
      backgroundType,
      customBgImage,
      bgSettings = DEFAULT_BG_SETTINGS,
      targetDimension,
      isHighResExport = false,
      editTargetMode = 'subject_only',
      printerCompensation = DEFAULT_PRINTER_COMPENSATION,
      framingSettings,
      faceSharpenSettings,
    } = options;

    const canvas = document.createElement('canvas');

    // Determine target canvas dimensions
    let outWidth = targetDimension.targetWidthPx;
    let outHeight = targetDimension.targetHeightPx;

    // For interactive preview, scale down if larger than 1000px to maintain 60 FPS slider reactivity
    if (!isHighResExport) {
      const maxPreviewDim = 1000;
      if (outWidth > maxPreviewDim || outHeight > maxPreviewDim) {
        if (outWidth > outHeight) {
          outHeight = Math.round((outHeight * maxPreviewDim) / outWidth);
          outWidth = maxPreviewDim;
        } else {
          outWidth = Math.round((outWidth * maxPreviewDim) / outHeight);
          outHeight = maxPreviewDim;
        }
      }
    }

    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Tidak dapat membuat konteks grafis 2D.');
    }

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. CROP & DRAW (No stretch, aspect ratio strictly preserved, with optional rotation around crop center)
    const rotation = options.rotation || 0;
    const rad = (rotation * Math.PI) / 180;

    if (rotation !== 0) {
      ctx.save();
      ctx.translate(outWidth / 2, outHeight / 2);
      ctx.rotate(rad);
      if (!isHighResExport) {
        // PREVIEW PATH: Draw from downsampled preview buffer for ultra-fast slider reactivity
        const { source: previewSource, scale } = PreviewSourceCache.getOrCreatePreviewSource(sourceImage, 1200);
        const pCenterX = (cropRect.x + cropRect.width / 2) * scale;
        const pCenterY = (cropRect.y + cropRect.height / 2) * scale;
        const pCropW = Math.max(1, cropRect.width * scale);
        const pCropH = Math.max(1, cropRect.height * scale);

        ctx.scale(outWidth / pCropW, outHeight / pCropH);
        ctx.drawImage(previewSource, -pCenterX, -pCenterY);
      } else {
        // FULL-RESOLUTION EXPORT PATH: Draw directly from 100% full original sourceImage
        const cropCenterX = cropRect.x + cropRect.width / 2;
        const cropCenterY = cropRect.y + cropRect.height / 2;

        ctx.scale(outWidth / cropRect.width, outHeight / cropRect.height);
        ctx.drawImage(sourceImage, -cropCenterX, -cropCenterY);
      }
      ctx.restore();
    } else {
      if (!isHighResExport) {
        // PREVIEW PATH: Draw from downsampled preview buffer for ultra-fast slider reactivity
        const { source: previewSource, scale } = PreviewSourceCache.getOrCreatePreviewSource(sourceImage, 1200);
        const srcX = Math.round(cropRect.x * scale);
        const srcY = Math.round(cropRect.y * scale);
        const srcW = Math.max(1, Math.round(cropRect.width * scale));
        const srcH = Math.max(1, Math.round(cropRect.height * scale));

        ctx.drawImage(
          previewSource,
          srcX,
          srcY,
          srcW,
          srcH,
          0,
          0,
          outWidth,
          outHeight
        );
      } else {
        // FULL-RESOLUTION EXPORT PATH: Draw directly from 100% full original sourceImage
        ctx.drawImage(
          sourceImage,
          cropRect.x,
          cropRect.y,
          cropRect.width,
          cropRect.height,
          0,
          0,
          outWidth,
          outHeight
        );
      }
    }

    // 2. CAPTURE ORIGINAL CROPPED DATA
    const rawCropData = ctx.getImageData(0, 0, outWidth, outHeight);

    const isSkipBgRemoval = options.bgRemovalMode === 'skip';
    let segResult: SegmentationResult | undefined = undefined;
    let computedMask: Float32Array | undefined = undefined;

    if (isSkipBgRemoval) {
      // -------------------------------------------------------------
      // MODE B: JANGAN HAPUS BACKGROUND
      // -------------------------------------------------------------
      // Lewati seluruh proses penghapusan latar dan langsung gunakan gambar sumber.
      // Tidak menjalankan segmentasi, AI background removal, atau pembuatan mask baru.
      // Mempertahankan piksel dan alpha channel sumber.

      computedMask = new Float32Array(outWidth * outHeight);
      const rawData = rawCropData.data;
      for (let i = 0; i < computedMask.length; i++) {
        computedMask[i] = rawData[i * 4 + 3] / 255;
      }

      const adjCropData = new ImageData(
        new Uint8ClampedArray(rawCropData.data),
        outWidth,
        outHeight
      );
      ToneEngine.applyTonalAdjustments(adjCropData, params, mode, targetTone);
      SharpenEngine.applySmartDetailSharpening(adjCropData, params, mode, null);
      if (faceSharpenSettings?.enabled) {
        SharpenEngine.applyFaceSharpenFilter(adjCropData, faceSharpenSettings, mode, null);
      }

      if (backgroundType === 'preserve') {
        // Keep original: pertahankan foto asli dan transparansi bawaan (jika ada)
        ctx.clearRect(0, 0, outWidth, outHeight);
        ctx.putImageData(adjCropData, 0, 0);
      } else {
        // Ganti warna latar atau custom background di belakang gambar sumber
        ctx.clearRect(0, 0, outWidth, outHeight);
        BackgroundEngine.renderBackgroundOnly(
          ctx,
          outWidth,
          outHeight,
          backgroundType,
          customBgImage,
          bgSettings,
          rawCropData,
          mode
        );

        // Tumpangkan gambar sumber berpenyesuaian (Porter-Duff source-over)
        // Jika PNG transparan, latar baru langsung tampil rapi di area transparan!
        // Jika foto berlatar solid, latar solid tetap utuh tanpa dipotong paksa.
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = outWidth;
        tempCanvas.height = outHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.putImageData(adjCropData, 0, 0);
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }

      segResult = { isSafe: true, confidence: 100 };
    } else {
      // -------------------------------------------------------------
      // MODE A: HAPUS BACKGROUND (Pipeline Segmentasi & Masking AI/Canvas)
      // -------------------------------------------------------------
      const maskInfo = BackgroundEngine.computeSubjectMask(rawCropData, bgSettings, options.customMask);
      const mask = maskInfo.mask;
      computedMask = mask;
      const safety = maskInfo.safety;
      segResult = safety;

      // Check whether any subject transform (scale, rotation, offset, flip) or background effect (blur, brightness, contrast, shadow, harmonization) is active
      const hasTransformOrBgEffect =
        bgSettings.subjectScale !== 1.0 ||
        bgSettings.subjectRotation !== 0 ||
        bgSettings.subjectOffsetX !== 0 ||
        bgSettings.subjectOffsetY !== 0 ||
        bgSettings.subjectFlipX ||
        bgSettings.bgBlur > 0 ||
        bgSettings.bgBrightness !== 0 ||
        bgSettings.bgContrast !== 0 ||
        bgSettings.contactShadow > 0 ||
        bgSettings.lightHarmonization > 0;

      if (backgroundType === 'preserve' && !hasTransformOrBgEffect) {
      if (editTargetMode === 'all') {
        // Terapkan pengaturan Manual Adjustment pada seluruh gambar (subjek + latar belakang)
        const imgData = ctx.getImageData(0, 0, outWidth, outHeight);
        ToneEngine.applyTonalAdjustments(imgData, params, mode, targetTone);
        SharpenEngine.applySmartDetailSharpening(imgData, params, mode, null);
        if (faceSharpenSettings?.enabled) {
          SharpenEngine.applyFaceSharpenFilter(imgData, faceSharpenSettings, mode, null);
        }
        ctx.putImageData(imgData, 0, 0);
      } else {
        // SUBJEK ONLY (Default):
        // Terapkan seluruh pengaturan Manual Adjustment hanya pada area subjek (wajah, rambut/hijab, pakaian, tubuh)
        // Latar belakang tidak boleh ikut berubah.
        const adjCropData = new ImageData(
          new Uint8ClampedArray(rawCropData.data),
          outWidth,
          outHeight
        );
        ToneEngine.applyTonalAdjustments(adjCropData, params, mode, targetTone);
        SharpenEngine.applySmartDetailSharpening(adjCropData, params, mode, mask);
        if (faceSharpenSettings?.enabled) {
          SharpenEngine.applyFaceSharpenFilter(adjCropData, faceSharpenSettings, mode, mask);
        }

        let baseCropData: ImageData;
        if (mode === 'bw') {
          // In B&W mode, the background baseline is neutral B&W without any manual slider adjustment
          baseCropData = new ImageData(
            new Uint8ClampedArray(rawCropData.data),
            outWidth,
            outHeight
          );
          const neutralParams: AdjustmentParams = {
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
          };
          ToneEngine.applyTonalAdjustments(baseCropData, neutralParams, mode, 'natural');
        } else {
          baseCropData = rawCropData;
        }

        const finalImgData = ctx.createImageData(outWidth, outHeight);
        const finalData = finalImgData.data;
        const bData = baseCropData.data;
        const aData = adjCropData.data;

        for (let pIdx = 0; pIdx < outWidth * outHeight; pIdx++) {
          const i = pIdx * 4;
          const alpha = mask[pIdx];

          if (alpha <= 0) {
            finalData[i] = bData[i];
            finalData[i + 1] = bData[i + 1];
            finalData[i + 2] = bData[i + 2];
            finalData[i + 3] = bData[i + 3];
          } else if (alpha >= 1) {
            finalData[i] = aData[i];
            finalData[i + 1] = aData[i + 1];
            finalData[i + 2] = aData[i + 2];
            finalData[i + 3] = aData[i + 3];
          } else {
            finalData[i] = Math.round(bData[i] * (1 - alpha) + aData[i] * alpha);
            finalData[i + 1] = Math.round(bData[i + 1] * (1 - alpha) + aData[i + 1] * alpha);
            finalData[i + 2] = Math.round(bData[i + 2] * (1 - alpha) + aData[i + 2] * alpha);
            finalData[i + 3] = Math.round(bData[i + 3] * (1 - alpha) + aData[i + 3] * alpha);
          }
        }
        ctx.putImageData(finalImgData, 0, 0);
      }
    } else {
      // backgroundType !== 'preserve' ATAU ada penyesuaian lanjutan aktif pada latar asli (skala/posisi/rotasi/flip/blur/shadow/lighting)
      if (editTargetMode === 'subject_only') {
        // Terapkan penyesuaian hanya pada subjek sebelum ditempatkan ke latar belakang
        const adjCropData = new ImageData(
          new Uint8ClampedArray(rawCropData.data),
          outWidth,
          outHeight
        );
        ToneEngine.applyTonalAdjustments(adjCropData, params, mode, targetTone);
        SharpenEngine.applySmartDetailSharpening(adjCropData, params, mode, mask);
        if (faceSharpenSettings?.enabled) {
          SharpenEngine.applyFaceSharpenFilter(adjCropData, faceSharpenSettings, mode, mask);
        }

        segResult = BackgroundEngine.applyBackgroundReplacement(
          canvas,
          backgroundType,
          customBgImage,
          bgSettings,
          maskInfo,
          adjCropData,
          mode
        );
      } else {
        // editTargetMode === 'all'
        // Ganti latar belakang atau terapkan transformasi terlebih dahulu
        segResult = BackgroundEngine.applyBackgroundReplacement(
          canvas,
          backgroundType,
          customBgImage,
          bgSettings,
          maskInfo,
          undefined,
          mode
        );

        // Terapkan penyesuaian pada seluruh kanvas (subjek + latar belakang)
        const imgData = ctx.getImageData(0, 0, outWidth, outHeight);
        ToneEngine.applyTonalAdjustments(imgData, params, mode, targetTone);
        SharpenEngine.applySmartDetailSharpening(imgData, params, mode, null);
        if (faceSharpenSettings?.enabled) {
          SharpenEngine.applyFaceSharpenFilter(imgData, faceSharpenSettings, mode, null);
        }
        ctx.putImageData(imgData, 0, 0);
      }
    }
  }

    // Master Canvas is now completely rendered.
    // Pada mode 'bw', Master Canvas dijamin True Grayscale (R = G = B).

    // Buat PRINT VERSION terpisah melalui PrinterCompensationEngine
    let printCanvas: HTMLCanvasElement;
    if (mode === 'bw' && printerCompensation) {
      printCanvas = PrinterCompensationEngine.createPrintCanvas(canvas, printerCompensation);
    } else {
      printCanvas = canvas;
    }

    // 4. FRAMING BORDERS & GUIDELINES (Garis Putih Inner & Garis Hitam Outer)
    if (framingSettings) {
      const heightMm = targetDimension.heightCm * 10;
      const pxPerMm = outHeight / heightMm;

      const renderFramingBorders = (targetCtx: CanvasRenderingContext2D) => {
        // A. Garis Putih (Inner Border)
        if (framingSettings.innerBorderEnabled && framingSettings.innerBorderWidthMm > 0) {
          const borderWidthPx = Math.max(1, Math.round(framingSettings.innerBorderWidthMm * pxPerMm));
          targetCtx.save();
          targetCtx.fillStyle = '#ffffff';
          targetCtx.fillRect(0, 0, outWidth, borderWidthPx);
          targetCtx.fillRect(0, outHeight - borderWidthPx, outWidth, borderWidthPx);
          targetCtx.fillRect(0, 0, borderWidthPx, outHeight);
          targetCtx.fillRect(outWidth - borderWidthPx, 0, borderWidthPx, outHeight);
          targetCtx.restore();
        }

        // B. Garis Hitam (Outer Cutting Line)
        if (framingSettings.outerCutLineEnabled && framingSettings.outerCutLineWidthMm > 0) {
          const cutLineWidthPx = Math.max(1, Math.round(framingSettings.outerCutLineWidthMm * pxPerMm));
          const opacity = Math.max(0, Math.min(1, (framingSettings.outerCutLineOpacity ?? 100) / 100));
          targetCtx.save();
          targetCtx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
          targetCtx.lineWidth = cutLineWidthPx;
          targetCtx.strokeRect(
            cutLineWidthPx / 2,
            cutLineWidthPx / 2,
            outWidth - cutLineWidthPx,
            outHeight - cutLineWidthPx
          );
          targetCtx.restore();
        }
      };

      const shouldRenderLines = !isHighResExport || framingSettings.renderLinesOnExport !== false;
      if (shouldRenderLines) {
        renderFramingBorders(ctx);
        if (printCanvas && printCanvas !== canvas) {
          const pCtx = printCanvas.getContext('2d');
          if (pCtx) renderFramingBorders(pCtx);
        }
      }
    }

    // Capture clean raw cropped canvas for diagnostic / comparison
    const rawCroppedCanvas = document.createElement('canvas');
    rawCroppedCanvas.width = outWidth;
    rawCroppedCanvas.height = outHeight;
    const rawCtx = rawCroppedCanvas.getContext('2d');
    if (rawCtx) {
      rawCtx.putImageData(rawCropData, 0, 0);
    }

    let finalCanvas = canvas;
    let finalPrintCanvas = printCanvas;

    // Handle Diagnostic Preview Modes (Hasil Komposit, Overlay Mask, Mask Subjek, Foto Asli)
    if (computedMask && options.diagnosticMode && options.diagnosticMode !== 'composite') {
      if (options.diagnosticMode === 'original') {
        finalCanvas = rawCroppedCanvas;
        finalPrintCanvas = rawCroppedCanvas;
      } else if (options.diagnosticMode === 'mask') {
        const maskCanvas = BackgroundEngine.renderMaskCanvas(computedMask, outWidth, outHeight);
        finalCanvas = maskCanvas;
        finalPrintCanvas = maskCanvas;
      } else if (options.diagnosticMode === 'overlay') {
        const overlayCanvas = BackgroundEngine.renderOverlayCanvas(rawCroppedCanvas, computedMask);
        finalCanvas = overlayCanvas;
        finalPrintCanvas = overlayCanvas;
      }
    }

    return {
      canvas: finalCanvas, // MASTER CANVAS (or Diagnostic View)
      printCanvas: finalPrintCanvas, // PRINT VERSION
      segmentationResult: segResult,
      mask: computedMask,
      rawCroppedCanvas,
    };
  }

  /**
   * Generates a 600 DPI full-resolution export and triggers browser download.
   * Mendukung ekspor MASTER GRAYSCALE (R=G=B murni) atau PRINT VERSION (kompensasi printer).
   */
  public static async exportPhoto(
    options: ProcessOptions,
    exportTarget: 'master' | 'print' = 'master',
    format: 'png' | 'jpeg' = 'png',
    jpegQuality: number = 1.0
  ): Promise<string> {
    const result = this.processImage({
      ...options,
      isHighResExport: true, // Forces exact 600 DPI physical pixel dimensions
      diagnosticMode: 'composite', // Ekspor selalu menggunakan hasil komposit final bersih
    });

    let exportCanvas = exportTarget === 'print' ? result.printCanvas : result.canvas;
    if (format === 'jpeg') {
      // JPEG tidak mendukung transparansi, kompositkan pada latar putih solid jika ada area transparan
      const whiteCanvas = document.createElement('canvas');
      whiteCanvas.width = exportCanvas.width;
      whiteCanvas.height = exportCanvas.height;
      const wCtx = whiteCanvas.getContext('2d');
      if (wCtx) {
        wCtx.fillStyle = '#ffffff';
        wCtx.fillRect(0, 0, whiteCanvas.width, whiteCanvas.height);
        wCtx.drawImage(exportCanvas, 0, 0);
        exportCanvas = whiteCanvas;
      }
    }
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dim = options.targetDimension;
    const dimSlug = `${dim.widthCm}x${dim.heightCm}cm`.replace('.', '_');

    let filename = '';
    if (options.mode === 'bw') {
      if (exportTarget === 'print') {
        const pComp = options.printerCompensation;
        const pSlug = pComp?.printerProfile === 'epson_l1210' ? 'epson-l1210' : 'generic';
        filename = `pas-foto-${dimSlug}-${dim.dpi}dpi-print-${pSlug}.${format}`;
      } else {
        filename = `pas-foto-${dimSlug}-${dim.dpi}dpi-grayscale.${format}`;
      }
    } else {
      filename = `pas-foto-ijazah-${dimSlug}-${dim.dpi}dpi.${format}`;
    }

    return new Promise((resolve, reject) => {
      exportCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Gagal mengonversi foto ke blob data.'));
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          resolve(filename);
        },
        mime,
        jpegQuality
      );
    });
  }
}
