import JSZip from 'jszip';
import {
  AdjustmentParams,
  BackgroundSettings,
  BackgroundType,
  BackgroundRemovalMode,
  BatchPhotoItem,
  CropRect,
  DEFAULT_BG_SETTINGS,
  DEFAULT_FRAMING_SETTINGS,
  DEFAULT_FACE_SHARPEN_SETTINGS,
  DEFAULT_PRINTER_COMPENSATION,
  EditTargetMode,
  FaceSharpenSettings,
  FramingSettings,
  ImageMetadata,
  OutputDimension,
  PhotoMode,
  PhotoAnalysisResult,
  PrinterCompensationSettings,
  PrinterProfile,
  TargetTone,
  AnalysisMethod,
} from '../types/analysis';
import { CropEngine, STANDARD_OUTPUT_DIMENSIONS } from '../image/CropEngine';
import { ImageProcessor } from '../image/ImageProcessor';
import { BackgroundEngine } from '../image/BackgroundEngine';
import { GeminiService } from './GeminiService';

export interface BatchProcessingOptions {
  photoMode: PhotoMode;
  targetTone: TargetTone;
  selectedDimension: OutputDimension;
  bgType: BackgroundType;
  bgRemovalMode?: BackgroundRemovalMode;
  customBgImage: HTMLImageElement | null;
  bgSettings: BackgroundSettings;
  framingSettings?: FramingSettings;
  faceSharpenSettings?: FaceSharpenSettings;
  editTargetMode: EditTargetMode;
  printerCompensation: PrinterCompensationSettings;
  rotation?: number;
  apiKey?: string;
  model?: string;
  analysisMethod?: AnalysisMethod;
}

export class BatchProcessingService {
  /**
   * Creates a BatchPhotoItem from an uploaded File.
   * Performs image decoding and extracts metadata.
   */
  public static async createBatchItem(
    file: File,
    options?: {
      selectedDimension?: OutputDimension;
      framingSettings?: FramingSettings;
    }
  ): Promise<BatchPhotoItem> {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      throw new Error(`Format ${file.name} tidak didukung. Harap unggah JPG, PNG, atau WebP.`);
    }

    const previewUrl = URL.createObjectURL(file);
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => {
        URL.revokeObjectURL(previewUrl);
        reject(new Error(`Gagal membaca file gambar: ${file.name}`));
      };
      img.src = previewUrl;
    });

    const hasTrans = file.type === 'image/png' && BackgroundEngine.detectTransparency(img);

    const metadata: ImageMetadata = {
      name: file.name,
      width: img.naturalWidth,
      height: img.naturalHeight,
      aspectRatio: Number((img.naturalWidth / img.naturalHeight).toFixed(2)),
      format: file.type.split('/')[1]?.toUpperCase() || 'JPEG',
      sizeBytes: file.size,
      hasTransparency: hasTrans,
    };

    const uniqueId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const targetDim = options?.selectedDimension || STANDARD_OUTPUT_DIMENSIONS[0];
    const framing = options?.framingSettings || DEFAULT_FRAMING_SETTINGS;
    const baseCrop = CropEngine.getInitialCropRect(
      img.naturalWidth,
      img.naturalHeight,
      targetDim.aspectRatio
    );
    const initialCrop = CropEngine.calculateFramingCrop(
      img.naturalWidth,
      img.naturalHeight,
      targetDim,
      baseCrop,
      framing.faceZoomEnabled,
      framing.faceZoomPercent,
      framing.headroomEnabled,
      framing.headroomMm
    );

    return {
      id: uniqueId,
      file,
      name: file.name,
      previewUrl,
      sourceImage: img,
      metadata,
      status: 'idle',
      progressText: 'Menunggu',
      cropRect: initialCrop,
      framingSettings: { ...framing },
      faceSharpenSettings: { ...DEFAULT_FACE_SHARPEN_SETTINGS },
      bgRemovalMode: hasTrans ? 'skip' : 'remove',
      selectedDimension: targetDim,
    };
  }

  /**
   * Performs semantic analysis (via Gemini Cloud API with cache/timeout or Local Canvas Fallback).
   * Does NOT run pixel processing.
   */
  public static async analyzeItem(
    item: BatchPhotoItem,
    options: {
      apiKey?: string;
      model?: string;
      signal?: AbortSignal;
      timeoutMs?: number;
      analysisMethod?: AnalysisMethod;
    },
    onProgress?: (stepText: string) => void
  ): Promise<PhotoAnalysisResult> {
    // If analysis already exists on item, return directly
    if (item.analysisResult) {
      return item.analysisResult;
    }

    const fingerprint = GeminiService.getFileFingerprint(item.file);
    const cached = GeminiService.getCachedAnalysis(fingerprint);
    if (cached) {
      if (onProgress) onProgress('Memuat analisis dari cache...');
      return cached;
    }

    const method = options.analysisMethod ?? 'local';

    // Gemini Cloud API only runs when explicitly requested by user AND apiKey is present
    if (method === 'gemini' && options.apiKey && options.apiKey.trim().length > 0) {
      if (onProgress) onProgress('Menganalisis karakteristik subjek dengan Gemini AI...');
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(item.file);
        });
        const base64Data = await base64Promise;

        const result = await GeminiService.analyzePhoto(
          base64Data,
          item.file.type,
          options.apiKey,
          options.model,
          {
            signal: options.signal,
            timeoutMs: options.timeoutMs ?? 25000,
            cacheKey: fingerprint,
          }
        );
        return result;
      } catch (err: any) {
        console.warn(`Analisis cloud gagal untuk ${item.name}, menggunakan fallback lokal:`, err);
        if (onProgress) onProgress('Cloud gagal/timeout, menerapkan Analisis Mandiri Lokal...');
        const localResult = await GeminiService.analyzeLocally(item.sourceImage);
        GeminiService.setCachedAnalysis(fingerprint, localResult);
        return localResult;
      }
    } else {
      // Default: Pure local non-generative canvas analysis (0 API calls, 100% private & fast)
      if (onProgress) onProgress('Menghitung parameter tonal & luminansi lokal...');
      const localResult = await GeminiService.analyzeLocally(item.sourceImage);
      GeminiService.setCachedAnalysis(fingerprint, localResult);
      return localResult;
    }
  }

  /**
   * Performs pure local 600 DPI non-generative pixel processing.
   * Completely deterministic, 0 network, runs in browser canvas.
   */
  public static processItemPixels(
    item: BatchPhotoItem,
    analysis: PhotoAnalysisResult,
    options: BatchProcessingOptions
  ): {
    cropRect: CropRect;
    analysisResult: PhotoAnalysisResult;
    customAdjustments: AdjustmentParams;
    processedCanvas: HTMLCanvasElement;
    masterCanvas: HTMLCanvasElement;
    printCanvas: HTMLCanvasElement;
  } {
    const targetDim = item.selectedDimension || options.selectedDimension;
    const framing = item.framingSettings || options.framingSettings || DEFAULT_FRAMING_SETTINGS;
    const baseCrop = CropEngine.getInitialCropRect(
      item.metadata.width,
      item.metadata.height,
      targetDim.aspectRatio
    );
    const framingCrop = CropEngine.calculateFramingCrop(
      item.metadata.width,
      item.metadata.height,
      targetDim,
      baseCrop,
      framing.faceZoomEnabled,
      framing.faceZoomPercent,
      framing.headroomEnabled,
      framing.headroomMm
    );
    const crop = item.cropRect || framingCrop;

    const adjustments: AdjustmentParams = item.customAdjustments || {
      exposureEV: analysis.subject.exposureEV,
      brightness: analysis.subject.brightness,
      contrast: analysis.subject.contrast,
      highlights: analysis.subject.highlights,
      shadows: analysis.subject.shadows,
      whites: analysis.subject.whites,
      blacks: analysis.subject.blacks,
      sharpening: analysis.subject.sharpening,
      noiseProtection: analysis.subject.noiseProtection,
      faceDetail: analysis.subject.faceDetail ?? 8,
      eyeDetail: analysis.subject.eyeDetail ?? 10,
      hairDetail: analysis.subject.hairDetail ?? 8,
      skinProtection: analysis.subject.skinProtection ?? 12,
      saturation: 0,
      temperature: analysis.recommendation.temperature,
      tint: analysis.recommendation.tint,
    };

    const effectiveMode = item.photoMode || options.photoMode;
    const effectiveTone = item.targetTone || options.targetTone;
    const effectiveEditTarget = item.editTargetMode || options.editTargetMode;

    const processResult = ImageProcessor.processImage({
      sourceImage: item.sourceImage,
      cropRect: crop,
      rotation: item.rotation ?? options.rotation ?? 0,
      params: adjustments,
      mode: effectiveMode,
      targetTone: effectiveTone,
      backgroundType: item.bgType || options.bgType,
      bgRemovalMode: item.bgRemovalMode || options.bgRemovalMode || 'remove',
      customBgImage: options.customBgImage,
      bgSettings: item.bgSettings || options.bgSettings,
      framingSettings: framing,
      faceSharpenSettings: item.faceSharpenSettings || options.faceSharpenSettings || DEFAULT_FACE_SHARPEN_SETTINGS,
      targetDimension: targetDim,
      isHighResExport: true,
      editTargetMode: effectiveEditTarget,
      printerCompensation: item.printerCompensation || options.printerCompensation,
      customMask: item.customMask,
      diagnosticMode: item.diagnosticMode,
    });

    return {
      cropRect: crop,
      analysisResult: analysis,
      customAdjustments: adjustments,
      processedCanvas: processResult.canvas,
      masterCanvas: processResult.canvas,
      printCanvas: processResult.printCanvas,
      customMask: item.customMask || processResult.mask,
      diagnosticMode: item.diagnosticMode,
    };
  }

  /**
   * Processes a single batch photo through analysis and the non-generative 600 DPI pipeline.
   */
  public static async processItem(
    item: BatchPhotoItem,
    options: BatchProcessingOptions & { signal?: AbortSignal; timeoutMs?: number },
    onProgress?: (stage: string) => void
  ): Promise<Partial<BatchPhotoItem>> {
    const startTime = performance.now();

    // 1. Analisis Semantik / Rekomendasi (Cloud atau Lokal)
    const analysis = await this.analyzeItem(
      item,
      {
        apiKey: options.apiKey,
        model: options.model,
        signal: options.signal,
        timeoutMs: options.timeoutMs,
        analysisMethod: options.analysisMethod,
      },
      onProgress
    );

    if (options.signal?.aborted) {
      throw new Error('Pemrosesan dibatalkan.');
    }

    // 2. Pemrosesan Piksel 600 DPI Non-Generatif (Murni Lokal)
    if (onProgress) onProgress('Memproses piksel 600 DPI non-generatif...');
    const pixelResult = this.processItemPixels(item, analysis, options);

    const durationMs = Math.round(performance.now() - startTime);

    return {
      ...pixelResult,
      status: 'done',
      progressText: `Selesai (${(durationMs / 1000).toFixed(1)}s)`,
      durationMs,
      errorMessage: undefined,
      errorType: undefined,
    };
  }

  /**
   * Bundles all successfully processed batch items into a single ZIP archive.
   * ALWAYS renders full-resolution 600 DPI directly from sourceImage (never uses preview bitmaps).
   */
  public static async exportBatchToZip(
    items: BatchPhotoItem[],
    options: {
      photoMode: PhotoMode;
      format: 'png' | 'jpeg';
      quality?: number;
      targetDimension: OutputDimension;
      printerProfile: PrinterProfile;
      targetTone?: TargetTone;
      bgType?: BackgroundType;
      customBgImage?: HTMLImageElement | null;
      bgSettings?: BackgroundSettings;
      framingSettings?: FramingSettings;
      faceSharpenSettings?: FaceSharpenSettings;
      editTargetMode?: EditTargetMode;
      printerCompensation?: PrinterCompensationSettings;
    }
  ): Promise<string> {
    const { photoMode, format, quality = 1.0, targetDimension, printerProfile } = options;
    const exportableItems = items.filter((it) => it.status !== 'error');

    if (exportableItems.length === 0) {
      throw new Error('Tidak ada foto yang valid untuk diekspor ke ZIP.');
    }

    const zip = new JSZip();
    const folderName = `pas-foto-${targetDimension.widthCm}x${targetDimension.heightCm}cm-${targetDimension.dpi}dpi`;
    const folder = zip.folder(folderName) || zip;
    const printerSlug = printerProfile === 'epson_l1210' ? 'epson-l1210' : 'generic';

    for (let i = 0; i < exportableItems.length; i++) {
      const item = exportableItems[i];
      const baseName = item.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

      const itemDimension = item.selectedDimension || targetDimension;
      const itemDimSlug = `${itemDimension.widthCm}x${itemDimension.heightCm}cm`.replace('.', '_');
      const framing = item.framingSettings || options.framingSettings || DEFAULT_FRAMING_SETTINGS;

      // Generate 100% full-resolution 600 DPI directly from sourceImage with precise framing crop
      const baseCrop = CropEngine.getInitialCropRect(
        item.metadata.width,
        item.metadata.height,
        itemDimension.aspectRatio
      );
      const framingCrop = CropEngine.calculateFramingCrop(
        item.metadata.width,
        item.metadata.height,
        itemDimension,
        baseCrop,
        framing.faceZoomEnabled,
        framing.faceZoomPercent,
        framing.headroomEnabled,
        framing.headroomMm
      );
      const crop = item.cropRect || framingCrop;

      const adjustments: AdjustmentParams = item.customAdjustments || (item.analysisResult ? {
        exposureEV: item.analysisResult.subject.exposureEV,
        brightness: item.analysisResult.subject.brightness,
        contrast: item.analysisResult.subject.contrast,
        highlights: item.analysisResult.subject.highlights,
        shadows: item.analysisResult.subject.shadows,
        whites: item.analysisResult.subject.whites,
        blacks: item.analysisResult.subject.blacks,
        sharpening: item.analysisResult.subject.sharpening,
        noiseProtection: item.analysisResult.subject.noiseProtection,
        faceDetail: item.analysisResult.subject.faceDetail ?? 8,
        eyeDetail: item.analysisResult.subject.eyeDetail ?? 10,
        hairDetail: item.analysisResult.subject.hairDetail ?? 8,
        skinProtection: item.analysisResult.subject.skinProtection ?? 12,
        saturation: 0,
        temperature: item.analysisResult.recommendation.temperature,
        tint: item.analysisResult.recommendation.tint,
      } : GeminiService.getInitialAdjustments());

      const itemMode = item.photoMode || photoMode;
      const itemTone = item.targetTone || options.targetTone || 'natural';
      const itemEditTarget = item.editTargetMode || options.editTargetMode || 'subject_only';

      const fullResResult = ImageProcessor.processImage({
        sourceImage: item.sourceImage,
        cropRect: crop,
        rotation: item.rotation ?? options.rotation ?? 0,
        params: adjustments,
        mode: itemMode,
        targetTone: itemTone,
        backgroundType: item.bgType || options.bgType || 'preserve',
        bgRemovalMode: item.bgRemovalMode || options.bgRemovalMode || 'remove',
        customBgImage: options.customBgImage,
        bgSettings: item.bgSettings || options.bgSettings || DEFAULT_BG_SETTINGS,
        framingSettings: framing,
        faceSharpenSettings: item.faceSharpenSettings || options.faceSharpenSettings || DEFAULT_FACE_SHARPEN_SETTINGS,
        targetDimension: itemDimension,
        isHighResExport: true, // Forces exact full physical 600 DPI resolution
        editTargetMode: itemEditTarget,
        printerCompensation: item.printerCompensation || options.printerCompensation,
        customMask: item.customMask,
      });

      // 1. Export Master Grayscale / Color
      const masterBlob = await new Promise<Blob | null>((resolve) => {
        fullResResult.canvas.toBlob(
          (b) => resolve(b),
          format === 'png' ? 'image/png' : 'image/jpeg',
          quality
        );
      });

      if (masterBlob) {
        const masterFilename =
          itemMode === 'bw'
            ? `${baseName}-${itemDimSlug}-${itemDimension.dpi}dpi-grayscale.${format}`
            : `${baseName}-${itemDimSlug}-${itemDimension.dpi}dpi.${format}`;
        folder.file(masterFilename, masterBlob);
      }

      // 2. Export Print Version (Khusus mode B&W)
      if (itemMode === 'bw' && fullResResult.printCanvas) {
        const printBlob = await new Promise<Blob | null>((resolve) => {
          fullResResult.printCanvas.toBlob(
            (b) => resolve(b),
            format === 'png' ? 'image/png' : 'image/jpeg',
            quality
          );
        });

        if (printBlob) {
          const printFilename = `${baseName}-${itemDimSlug}-${itemDimension.dpi}dpi-print-${printerSlug}.${format}`;
          folder.file(printFilename, printBlob);
        }
      }
    }

    const defaultDimSlug = `${targetDimension.widthCm}x${targetDimension.heightCm}cm`.replace('.', '_');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const zipFilename = `pas-foto-batch-${defaultDimSlug}-${targetDimension.dpi}dpi-${exportableItems.length}-foto.zip`;
    const downloadUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);

    return zipFilename;
  }
}
