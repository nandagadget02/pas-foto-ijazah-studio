/**
 * PAS FOTO IJAZAH STUDIO
 * Studio Analisis & Koreksi Pas Foto Ijazah Non-Generatif 600 DPI
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Camera,
  RotateCcw,
  Printer,
  Sliders,
  Layers,
  Upload,
  Eye,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  Scissors,
  Check,
  Key,
  Archive,
  Play,
  Plus,
  Trash2,
  RefreshCw,
  FolderSync,
  Download,
} from 'lucide-react';

import {
  AdjustmentParams,
  AnalysisMethod,
  BackgroundRemovalMode,
  BackgroundSettings,
  BackgroundType,
  BatchErrorType,
  BatchPhotoItem,
  CropRect,
  DEFAULT_BG_SETTINGS,
  DEFAULT_FACE_SHARPEN_SETTINGS,
  DEFAULT_FRAMING_SETTINGS,
  DEFAULT_MASK_BRUSH,
  DEFAULT_PRINTER_COMPENSATION,
  DiagnosticPreviewMode,
  EditTargetMode,
  FaceSharpenSettings,
  FramingSettings,
  ImageMetadata,
  MaskBrushSettings,
  OutputDimension,
  PhotoInputMode,
  PhotoMode,
  PhotoAnalysisResult,
  PrinterCompensationSettings,
  TargetTone,
} from './types/analysis';
import { GeminiService } from './services/GeminiService';
import { ImageProcessor } from './image/ImageProcessor';
import { BackgroundEngine } from './image/BackgroundEngine';
import { STANDARD_OUTPUT_DIMENSIONS, CropEngine } from './image/CropEngine';
import { BatchProcessingService } from './services/BatchProcessingService';

import { UploadZone } from './components/UploadZone';
import { AnalysisPanel } from './components/AnalysisPanel';
import { TargetModeSelector } from './components/TargetModeSelector';
import { ComparisonViewer } from './components/ComparisonViewer';
import { ManualAdjustmentSliders } from './components/ManualAdjustmentSliders';
import { HasilPasFotoPanel } from './components/HasilPasFotoPanel';
import { BackgroundSelector } from './components/BackgroundSelector';
import { DimensionAndCrop } from './components/DimensionAndCrop';
import { ExportPanel } from './components/ExportPanel';
import { PrinterCompensationPanel } from './components/PrinterCompensationPanel';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PhotoRoomKeyModal } from './components/PhotoRoomKeyModal';
import { PhotoRoomService } from './services/PhotoRoomService';
import { AIRecommendationPresetModal } from './components/AIRecommendationPresetModal';
import { AIRecommendationPreset } from './types/analysis';
import { StudioNavigationStrip, StudioStepTab } from './components/StudioNavigationStrip';
import { BatchManagerPanel } from './components/BatchManagerPanel';
import { QuickBatchNavigator } from './components/QuickBatchNavigator';

export default function App() {
  // 0. Photo Input Mode & Batch State
  const [inputMode, setInputMode] = useState<PhotoInputMode>('single');
  const [batchItems, setBatchItems] = useState<BatchPhotoItem[]>([]);
  const [activeBatchItemId, setActiveBatchItemId] = useState<string | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [isExportingBatch, setIsExportingBatch] = useState<boolean>(false);
  const [showBatchManagerInStudio, setShowBatchManagerInStudio] = useState<boolean>(true);

  // 1. Source Image State
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);

  // 1b. Gemini API Configuration & Model State
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('pasfoto_gemini_api_key') || '';
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('pasfoto_gemini_model') || 'gemini-2.5-flash-lite';
  });
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  // 2. Analysis State (Default: 'local' - Mandiri Tanpa API)
  const [analysisMethod, setAnalysisMethod] = useState<AnalysisMethod>(() => {
    const saved = localStorage.getItem('pasfoto_analysis_method');
    return saved === 'gemini' ? 'gemini' : 'local';
  });
  const [isShowingAnalysisDetails, setIsShowingAnalysisDetails] = useState<boolean>(false);
  const [localAnalysisResult, setLocalAnalysisResult] = useState<PhotoAnalysisResult | null>(null);
  const [geminiAnalysisResult, setGeminiAnalysisResult] = useState<PhotoAnalysisResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStepText, setAnalysisStepText] = useState<string>('Menganalisis foto...');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [previousAdjustments, setPreviousAdjustments] = useState<AdjustmentParams | null>(null);

  const handleSetAnalysisMethod = useCallback((method: AnalysisMethod) => {
    setAnalysisMethod(method);
    localStorage.setItem('pasfoto_analysis_method', method);
    const activeRes = method === 'gemini' ? geminiAnalysisResult : localAnalysisResult;
    setAnalysisResult(activeRes);
    setAnalysisError(null);
  }, [geminiAnalysisResult, localAnalysisResult]);

  // 3. Target Mode & Tone
  const [photoMode, setPhotoMode] = useState<PhotoMode>('bw'); // Default B&W / GRAYSCALE
  const [targetTone, setTargetTone] = useState<TargetTone>('natural'); // Default Natural / Ijazah

  // 4. Adjustments State
  const [adjustments, setAdjustments] = useState<AdjustmentParams>(
    GeminiService.getInitialAdjustments()
  );
  const [editTargetMode, setEditTargetMode] = useState<EditTargetMode>('subject_only'); // Default: SUBJEK ONLY

  // 4b. Printer Compensation State (Khusus B&W / True Grayscale)
  const [printerCompensation, setPrinterCompensation] = useState<PrinterCompensationSettings>(
    DEFAULT_PRINTER_COMPENSATION
  );
  const [activePreviewTarget, setActivePreviewTarget] = useState<'master' | 'print'>('master');

  // 5. Background State
  const [bgType, setBgType] = useState<BackgroundType>('preserve'); // Default Pertahankan
  const [bgRemovalMode, setBgRemovalMode] = useState<BackgroundRemovalMode>('remove'); // 'remove' = Hapus Background, 'skip' = Jangan Hapus Background
  const [customBgImage, setCustomBgImage] = useState<HTMLImageElement | null>(null);
  const [customBgPreviewUrl, setCustomBgPreviewUrl] = useState<string | null>(null);
  const [bgSettings, setBgSettings] = useState<BackgroundSettings>(DEFAULT_BG_SETTINGS);
  const [detectedBgColor, setDetectedBgColor] = useState<string | undefined>(undefined);
  const [segmentationWarning, setSegmentationWarning] = useState<string | null>(null);
  // PhotoRoom Cloud AI State
  const [selectedBgEngine, setSelectedBgEngine] = useState<'local' | 'photoroom'>('local');
  const [isPhotoRoomModalOpen, setIsPhotoRoomModalOpen] = useState<boolean>(false);
  const [isProcessingPhotoRoom, setIsProcessingPhotoRoom] = useState<boolean>(false);
  const [photoRoomError, setPhotoRoomError] = useState<string | null>(null);
  const [isPhotoRoomMaskActive, setIsPhotoRoomMaskActive] = useState<boolean>(false);
  const [photoRoomApiKey, setPhotoRoomApiKey] = useState<string>(() => PhotoRoomService.getApiKey());

  // PhotoRoom Cloud AI Background Removal Handlers
  const handleProcessWithPhotoRoom = useCallback(async () => {
    if (!sourceImage) {
      alert('Unggah foto sumber terlebih dahulu sebelum menjalankan PhotoRoom AI.');
      return;
    }
    const key = PhotoRoomService.getApiKey();
    if (!key) {
      setIsPhotoRoomModalOpen(true);
      return;
    }

    setIsProcessingPhotoRoom(true);
    setPhotoRoomError(null);
    try {
      // Prioritaskan kanvas terpotong agar hemat token dan sesuai framing
      const targetSource = rawCroppedCanvasRef.current || sourceImage;
      const res = await PhotoRoomService.removeBackground(targetSource, key);
      if (res.ok && res.mask) {
        setCustomMask(res.mask);
        setMaskVersion((v) => v + 1);
        setIsPhotoRoomMaskActive(true);
        setBgRemovalMode('remove');
        previewCacheRef.current.clear();
      } else {
        setPhotoRoomError(res.error || 'Gagal memproses gambar dengan PhotoRoom API.');
      }
    } catch (err: any) {
      setPhotoRoomError(err?.message || 'Terjadi kesalahan saat memproses PhotoRoom API.');
    } finally {
      setIsProcessingPhotoRoom(false);
    }
  }, [sourceImage]);

  const handleResetPhotoRoomMask = useCallback(() => {
    setCustomMask(null);
    setMaskVersion((v) => v + 1);
    setIsPhotoRoomMaskActive(false);
    previewCacheRef.current.clear();
  }, []);

  // 6. Dimension & Crop State
  const [selectedDimension, setSelectedDimension] = useState<OutputDimension>(
    STANDARD_OUTPUT_DIMENSIONS[0] // Default 3x4 cm
  );
  const [cropRect, setCropRect] = useState<CropRect>({
    x: 0,
    y: 0,
    width: 600,
    height: 800,
  });
  const [cropWarning, setCropWarning] = useState<string | null>(null);
  const [framingSettings, setFramingSettings] = useState<FramingSettings>(DEFAULT_FRAMING_SETTINGS);
  const [faceSharpenSettings, setFaceSharpenSettings] = useState<FaceSharpenSettings>(DEFAULT_FACE_SHARPEN_SETTINGS);

  // 6b. Photo Rotation & Straighten State (-180° to +180°)
  const [rotation, setRotation] = useState<number>(0);
  const [previousRotation, setPreviousRotation] = useState<number | null>(null);

  // 7. Rendered Canvases for Before/After & Print Preview
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [masterCanvas, setMasterCanvas] = useState<HTMLCanvasElement | null>(null);
  const [printCanvas, setPrintCanvas] = useState<HTMLCanvasElement | null>(null);

  // 7b. Collapsible Before/After Comparison State (Default: ringkas / collapsed)
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);

  // 7c. Export Settings State (Format & Quality, Default 100% / 1.0)
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [exportQuality, setExportQuality] = useState<number>(1.0);

  // 7d. Diagnostic Mask Preview & Manual Brush Correction State
  const [diagnosticMode, setDiagnosticMode] = useState<DiagnosticPreviewMode>('composite');
  const [brushSettings, setBrushSettings] = useState<MaskBrushSettings>(DEFAULT_MASK_BRUSH);
  const [isBrushActive, setIsBrushActive] = useState<boolean>(false);
  const [customMask, setCustomMask] = useState<Float32Array | null>(null);
  const [maskVersion, setMaskVersion] = useState<number>(0);
  const [maskHistory, setMaskHistory] = useState<Float32Array[]>([]);
  const [maskRedoStack, setMaskRedoStack] = useState<Float32Array[]>([]);
  const activeMaskRef = useRef<Float32Array | null>(null);
  const rawCroppedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastCompositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [edgeInspectionFocus, setEdgeInspectionFocus] = useState<'fit' | 'hair' | 'ears' | 'collar' | 'shoulders'>('fit');

  // In-flight abort controllers to prevent hanging promises and memory leaks
  const singleAnalysisAbortControllerRef = useRef<AbortController | null>(null);
  const batchAbortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Loading & preview status indicators
  const [isProcessingPreview, setIsProcessingPreview] = useState<boolean>(false);

  // Always up-to-date batchItems ref for safe async access
  const batchItemsRef = useRef<BatchPhotoItem[]>(batchItems);
  batchItemsRef.current = batchItems;
  useEffect(() => {
    batchItemsRef.current = batchItems;
  }, [batchItems]);

  // Active Navigation Step for focused tabs
  const activeStepTabRef = useRef<StudioStepTab>('adjust');
  const [activeStepTab, setActiveStepTab] = useState<StudioStepTab>('adjust');
  const studioToolsRef = useRef<HTMLDivElement>(null);

  // Reset printer tab jika berpindah ke mode color
  useEffect(() => {
    if (photoMode === 'color' && activeStepTab === 'printer') {
      setActiveStepTab('adjust');
    }
  }, [photoMode, activeStepTab]);

  // Trigger Gemini Analysis automatically on new image upload
  const runAnalysis = useCallback(
    async (
      img: HTMLImageElement,
      file: File,
      customKey?: string,
      customModel?: string
    ) => {
      // Abort any existing in-flight single analysis to prevent race conditions
      if (singleAnalysisAbortControllerRef.current) {
        singleAnalysisAbortControllerRef.current.abort();
      }
      const controller = new AbortController();
      singleAnalysisAbortControllerRef.current = controller;

      setIsAnalyzing(true);
      setAnalysisError(null);

      const activeKey = customKey !== undefined ? customKey : apiKey;
      const activeModel = customModel !== undefined ? customModel : selectedModel;

      // Staged status messages as required by FITUR 15
      const steps = [
        `Menghubungkan ke Gemini (${activeModel})...`,
        'Menganalisis subjek (pencahayaan & kontras wajah)...',
        'Menganalisis background (segmentasi & keseragaman)...',
        'Menentukan target tonal standar ijazah...',
        'Menentukan sharpening konservatif...',
      ];

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep = (currentStep + 1) % steps.length;
        setAnalysisStepText(steps[currentStep]);
      }, 700);

      try {
        const fingerprint = GeminiService.getFileFingerprint(file);
        const cached = GeminiService.getCachedAnalysis(fingerprint);
        if (cached) {
          clearInterval(interval);
          setAnalysisStepText('Memuat analisis dari cache...');
          setAnalysisResult(cached);
          setIsAnalyzing(false);
          return;
        }

        // Convert to base64 for API transmission
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64Data = await base64Promise;
        const result = await GeminiService.analyzePhoto(
          base64Data,
          file.type,
          activeKey,
          activeModel,
          {
            signal: controller.signal,
            timeoutMs: 25000,
            cacheKey: fingerprint,
          }
        );

        if (controller.signal.aborted) return;

        clearInterval(interval);
        setAnalysisStepText('Selesai.');
        setGeminiAnalysisResult(result);
        if (analysisMethod === 'gemini') {
          setAnalysisResult(result);
        }

        // Jika dalam mode batch, simpan hasil analisis pada item aktif
        if (activeBatchItemId) {
          setBatchItems((prev) =>
            prev.map((it) => (it.id === activeBatchItemId ? { ...it, geminiAnalysisResult: result, analysisResult: result } : it))
          );
        }

        // Check background safety from Gemini
        if (!result.background.isSafeToPreserve && result.background.segmentationConfidence < 70) {
          setSegmentationWarning(
            'Segmentasi kurang yakin — background asli dipertahankan untuk menjaga keaslian subjek.'
          );
        } else {
          setSegmentationWarning(null);
        }
      } catch (err: any) {
        clearInterval(interval);
        if (controller.signal.aborted) {
          return; // Ignore aborted requests silently
        }
        console.warn('Gemini cloud analysis failed, offering local fallback:', err);
        setAnalysisError(
          err.message || 'Layanan Gemini cloud tidak dapat dihubungi. Anda dapat menggunakan Analisis Mandiri Lokal.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsAnalyzing(false);
        }
      }
    },
    [apiKey, selectedModel, activeBatchItemId, analysisMethod]
  );

  // Fallback Local Image Analysis (no API required)
  const runLocalAnalysis = useCallback(async () => {
    if (!sourceImage) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStepText('Menghitung histogram luminansi dan kontras lokal...');

    try {
      const localResult = await GeminiService.analyzeLocally(sourceImage);
      setLocalAnalysisResult(localResult);
      if (analysisMethod === 'local') {
        setAnalysisResult(localResult);
      }
      setAnalysisStepText('Analisis lokal selesai.');

      // Jika dalam mode batch, simpan hasil analisis pada item aktif
      if (activeBatchItemId) {
        setBatchItems((prev) =>
          prev.map((it) => (it.id === activeBatchItemId ? { ...it, localAnalysisResult: localResult, analysisResult: localResult } : it))
        );
      }
    } catch (err: any) {
      setAnalysisError(`Gagal melakukan analisis lokal: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [sourceImage, activeBatchItemId, analysisMethod]);

  // Unified manual analysis trigger (Gemini or Local)
  const handleRunAnalysis = useCallback(async () => {
    if (!sourceImage) return;

    if (analysisMethod === 'gemini') {
      if (!apiKey || apiKey.trim().length === 0) {
        setIsApiKeyModalOpen(true);
        return;
      }
      if (sourceFile) {
        await runAnalysis(sourceImage, sourceFile);
      }
    } else {
      // Local Analysis (Default) - 100% in-browser, no API call
      await runLocalAnalysis();
    }
  }, [sourceImage, sourceFile, analysisMethod, apiKey, runAnalysis, runLocalAnalysis]);

  // Apply AI Recommended parameters to sliders
  const applyAIRecommendations = useCallback(() => {
    const activeRes = analysisMethod === 'gemini' ? geminiAnalysisResult : localAnalysisResult;
    if (!activeRes) return;
    const { subject, recommendation } = activeRes;

    // Save previous adjustments for Undo
    setPreviousAdjustments(adjustments);

    const newAdjustments: AdjustmentParams = {
      exposureEV: subject.exposureEV,
      brightness: subject.brightness,
      contrast: subject.contrast,
      highlights: subject.highlights,
      shadows: subject.shadows,
      whites: subject.whites,
      blacks: subject.blacks,
      sharpening: subject.sharpening,
      noiseProtection: subject.noiseProtection,
      faceDetail: subject.faceDetail ?? 8,
      eyeDetail: subject.eyeDetail ?? 10,
      hairDetail: subject.hairDetail ?? 8,
      skinProtection: subject.skinProtection ?? 12,
      saturation: 0,
      temperature: recommendation.temperature,
      tint: recommendation.tint,
    };

    setAdjustments(newAdjustments);
    setTargetTone(recommendation.targetTone);
    setActiveStepTab('adjust');

    if (activeBatchItemId) {
      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === activeBatchItemId
            ? { ...it, customAdjustments: newAdjustments, analysisResult: activeRes }
            : it
        )
      );
    }
  }, [analysisMethod, geminiAnalysisResult, localAnalysisResult, adjustments, activeBatchItemId]);

  // Apply adjustments to all batch photos
  const handleApplyAdjustmentsToAllBatch = useCallback(() => {
    if (batchItems.length === 0) return;
    const confirmed = window.confirm(
      `Terapkan parameter penyesuaian foto aktif ke seluruh ${batchItems.length} foto dalam antrean batch?`
    );
    if (!confirmed) return;

    setBatchItems((prev) =>
      prev.map((it) => ({
        ...it,
        customAdjustments: { ...adjustments },
      }))
    );
  }, [batchItems.length, adjustments]);

  // Reset to neutral sliders with confirmation if modified
  const resetToNeutral = useCallback(() => {
    const initial = GeminiService.getInitialAdjustments();
    const isChanged =
      Math.abs(adjustments.exposureEV - initial.exposureEV) > 0.01 ||
      Math.abs(adjustments.contrast - initial.contrast) > 0.01 ||
      Math.abs(adjustments.shadows - initial.shadows) > 0.01 ||
      targetTone !== 'natural';

    if (isChanged) {
      const confirmed = window.confirm('Kembalikan semua slider parameter penyesuaian ke nilai netral?');
      if (!confirmed) return;
    }

    setPreviousAdjustments(adjustments);
    setAdjustments(initial);
    setTargetTone('natural');

    if (activeBatchItemId) {
      setBatchItems((prev) =>
        prev.map((it) => (it.id === activeBatchItemId ? { ...it, customAdjustments: initial } : it))
      );
    }
  }, [adjustments, targetTone, activeBatchItemId]);

  // Undo last adjustment change
  const handleUndo = useCallback(() => {
    if (!previousAdjustments) return;
    const current = adjustments;
    setAdjustments(previousAdjustments);
    setPreviousAdjustments(current);

    if (activeBatchItemId) {
      setBatchItems((prev) =>
        prev.map((it) => (it.id === activeBatchItemId ? { ...it, customAdjustments: previousAdjustments } : it))
      );
    }
  }, [previousAdjustments, adjustments, activeBatchItemId]);

  // ----------------------------------------------------
  // AI RECOMMENDATION PRESET HANDLERS
  // ----------------------------------------------------
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);
  const [presetModalMode, setPresetModalMode] = useState<'manage' | 'save'>('manage');

  const handleOpenPresetModal = useCallback((mode: 'manage' | 'save') => {
    setPresetModalMode(mode);
    setIsPresetModalOpen(true);
  }, []);

  const handleApplyPresetToActive = useCallback(
    (preset: AIRecommendationPreset) => {
      // 1. Simpan penyesuaian sebelumnya untuk undo
      setPreviousAdjustments({ ...adjustments });

      // 2. Terapkan parameter preset ke slider aktif
      setAdjustments({ ...preset.parameters });
      if (preset.targetTone) {
        setTargetTone(preset.targetTone);
      }

      // 3. Sinkronkan customAdjustments pada foto aktif jika dalam batch mode
      if (activeBatchItemId) {
        setBatchItems((prev) =>
          prev.map((it) =>
            it.id === activeBatchItemId
              ? {
                  ...it,
                  customAdjustments: { ...preset.parameters },
                  customTargetTone: preset.targetTone,
                }
              : it
          )
        );
      }
    },
    [adjustments, activeBatchItemId]
  );

  const handleApplyPresetToAllBatch = useCallback(
    (preset: AIRecommendationPreset) => {
      if (batchItems.length === 0) return;

      // 1. Simpan penyesuaian sebelumnya untuk undo pada foto aktif
      setPreviousAdjustments({ ...adjustments });

      // 2. Terapkan ke foto aktif
      setAdjustments({ ...preset.parameters });
      if (preset.targetTone) {
        setTargetTone(preset.targetTone);
      }

      // 3. Terapkan ke seluruh foto dalam antrean batch
      setBatchItems((prev) =>
        prev.map((it) => ({
          ...it,
          customAdjustments: { ...preset.parameters },
          customTargetTone: preset.targetTone,
        }))
      );
    },
    [adjustments, batchItems.length]
  );

  // ----------------------------------------------------
  // FACE SHARPEN (AI) HANDLERS
  // ----------------------------------------------------
  const handleUpdateFaceSharpenSettings = useCallback(
    (newSettings: FaceSharpenSettings) => {
      setFaceSharpenSettings(newSettings);
      if (activeBatchItemId) {
        setBatchItems((prev) =>
          prev.map((it) =>
            it.id === activeBatchItemId ? { ...it, faceSharpenSettings: newSettings } : it
          )
        );
      }
    },
    [activeBatchItemId]
  );

  const handleApplyFaceSharpenToAllBatch = useCallback(() => {
    if (batchItems.length === 0) return;
    const confirmed = window.confirm(
      `Terapkan pengaturan Penajaman Wajah (AI) foto aktif ke seluruh ${batchItems.length} foto dalam antrean batch?`
    );
    if (!confirmed) return;
    setBatchItems((prev) =>
      prev.map((it) => ({
        ...it,
        faceSharpenSettings: { ...faceSharpenSettings },
      }))
    );
  }, [batchItems.length, faceSharpenSettings]);

  // ----------------------------------------------------
  // DIAGNOSTIC PREVIEW & MANUAL MASK BRUSH HANDLERS
  // ----------------------------------------------------
  const handleSelectDiagnosticMode = useCallback((mode: DiagnosticPreviewMode) => {
    setDiagnosticMode(mode);
    if (activeBatchItemId) {
      setBatchItems((prev) =>
        prev.map((it) => (it.id === activeBatchItemId ? { ...it, diagnosticMode: mode } : it))
      );
    }

    // INSTANT SYNCHRONOUS PREVIEW REFRESH:
    // Jika rawCroppedCanvas & activeMask sudah tersedia di memori,
    // langsung ganti tampilan canvas secara instan tanpa menunggu debounce timer!
    if (rawCroppedCanvasRef.current && activeMaskRef.current) {
      const mask = activeMaskRef.current;
      const rawCanvas = rawCroppedCanvasRef.current;
      const w = rawCanvas.width;
      const h = rawCanvas.height;

      let diagCanvas: HTMLCanvasElement;
      if (mode === 'original') {
        diagCanvas = rawCanvas;
      } else if (mode === 'mask') {
        diagCanvas = BackgroundEngine.renderMaskCanvas(mask, w, h);
      } else if (mode === 'overlay') {
        diagCanvas = BackgroundEngine.renderOverlayCanvas(rawCanvas, mask);
      } else {
        // composite
        diagCanvas = lastCompositeCanvasRef.current || masterCanvas || rawCanvas;
      }

      setMasterCanvas(diagCanvas);
      setProcessedCanvas(diagCanvas);
    }
  }, [activeBatchItemId, masterCanvas]);

  const handleToggleBrush = useCallback(() => {
    setIsBrushActive((prev) => !prev);
  }, []);

  const handleBrushPaint = useCallback(
    (canvasX: number, canvasY: number) => {
      if (!activeMaskRef.current || !rawCroppedCanvasRef.current) return;
      const mask = activeMaskRef.current;
      const rawCanvas = rawCroppedCanvasRef.current;
      const w = rawCanvas.width;
      const h = rawCanvas.height;

      BackgroundEngine.applyBrushStroke(
        mask,
        w,
        h,
        canvasX,
        canvasY,
        brushSettings
      );

      // Tampilan live responsif langsung saat mouse di-drag pada canvas preview!
      let liveCanvas: HTMLCanvasElement;
      if (diagnosticMode === 'mask') {
        liveCanvas = BackgroundEngine.renderMaskCanvas(mask, w, h);
      } else {
        liveCanvas = BackgroundEngine.renderOverlayCanvas(rawCanvas, mask);
      }
      setMasterCanvas(liveCanvas);
      setProcessedCanvas(liveCanvas);
    },
    [brushSettings, diagnosticMode]
  );

  const handleBrushStrokeEnd = useCallback(() => {
    if (!activeMaskRef.current) return;
    const snapshot = new Float32Array(activeMaskRef.current);
    setMaskHistory((prev) => [...prev.slice(-14), snapshot]);
    setMaskRedoStack([]);
    setCustomMask(new Float32Array(activeMaskRef.current));
    setMaskVersion((v) => v + 1);

    if (activeBatchItemId) {
      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === activeBatchItemId ? { ...it, customMask: snapshot } : it
        )
      );
    }
  }, [activeBatchItemId]);

  const handleUndoMask = useCallback(() => {
    if (maskHistory.length === 0 || !activeMaskRef.current) return;
    const current = new Float32Array(activeMaskRef.current);
    const newHistory = [...maskHistory];
    const prevMask = newHistory.pop()!;
    setMaskRedoStack((prev) => [...prev, current]);
    setMaskHistory(newHistory);
    activeMaskRef.current.set(prevMask);
    setCustomMask(new Float32Array(prevMask));
    setMaskVersion((v) => v + 1);

    // Refresh kanvas secara instan
    if (rawCroppedCanvasRef.current) {
      const rawCanvas = rawCroppedCanvasRef.current;
      let updatedCanvas: HTMLCanvasElement;
      if (diagnosticMode === 'mask') {
        updatedCanvas = BackgroundEngine.renderMaskCanvas(prevMask, rawCanvas.width, rawCanvas.height);
      } else {
        updatedCanvas = BackgroundEngine.renderOverlayCanvas(rawCanvas, prevMask);
      }
      setMasterCanvas(updatedCanvas);
      setProcessedCanvas(updatedCanvas);
    }

    if (activeBatchItemId) {
      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === activeBatchItemId ? { ...it, customMask: new Float32Array(prevMask) } : it
        )
      );
    }
  }, [maskHistory, diagnosticMode, activeBatchItemId]);

  const handleRedoMask = useCallback(() => {
    if (maskRedoStack.length === 0 || !activeMaskRef.current) return;
    const nextMask = maskRedoStack[maskRedoStack.length - 1];
    setMaskHistory((prev) => [...prev, new Float32Array(activeMaskRef.current!)]);
    setMaskRedoStack((prev) => prev.slice(0, -1));
    activeMaskRef.current.set(nextMask);
    setCustomMask(new Float32Array(nextMask));
    setMaskVersion((v) => v + 1);

    // Refresh kanvas secara instan
    if (rawCroppedCanvasRef.current) {
      const rawCanvas = rawCroppedCanvasRef.current;
      let updatedCanvas: HTMLCanvasElement;
      if (diagnosticMode === 'mask') {
        updatedCanvas = BackgroundEngine.renderMaskCanvas(nextMask, rawCanvas.width, rawCanvas.height);
      } else {
        updatedCanvas = BackgroundEngine.renderOverlayCanvas(rawCanvas, nextMask);
      }
      setMasterCanvas(updatedCanvas);
      setProcessedCanvas(updatedCanvas);
    }

    if (activeBatchItemId) {
      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === activeBatchItemId ? { ...it, customMask: new Float32Array(nextMask) } : it
        )
      );
    }
  }, [maskRedoStack, diagnosticMode, activeBatchItemId]);

  const handleResetMask = useCallback(() => {
    setCustomMask(null);
    setMaskHistory([]);
    setMaskRedoStack([]);
    activeMaskRef.current = null;
    setMaskVersion((v) => v + 1);

    if (activeBatchItemId) {
      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === activeBatchItemId ? { ...it, customMask: undefined } : it
        )
      );
    }
  }, [activeBatchItemId]);

  // ----------------------------------------------------
  // BATCH MANAGEMENT HANDLERS
  // ----------------------------------------------------

  // 1. Select a batch item to inspect/tweak in Studio
  const handleSelectBatchItem = useCallback(
    (id: string, itemOverride?: BatchPhotoItem) => {
      // Simpan penyesuaian individual foto aktif sebelumnya sebelum berpindah
      if (activeBatchItemId && activeBatchItemId !== id) {
        setBatchItems((prev) => {
          const updated = prev.map((it) =>
            it.id === activeBatchItemId
              ? {
                  ...it,
                  customAdjustments: adjustments,
                  cropRect: cropRect,
                  rotation: rotation,
                  bgSettings: bgSettings,
                  bgType: bgType,
                  bgRemovalMode: bgRemovalMode,
                  diagnosticMode: diagnosticMode,
                  customMask: customMask ? new Float32Array(customMask) : undefined,
                  framingSettings: framingSettings,
                  faceSharpenSettings: faceSharpenSettings,
                  printerCompensation: printerCompensation,
                  photoMode: photoMode,
                  targetTone: targetTone,
                  selectedDimension: selectedDimension,
                  editTargetMode: editTargetMode,
                  processedCanvas: processedCanvas || it.processedCanvas,
                  masterCanvas: masterCanvas || it.masterCanvas,
                  printCanvas: printCanvas || it.printCanvas,
                  localAnalysisResult: localAnalysisResult || it.localAnalysisResult,
                  geminiAnalysisResult: geminiAnalysisResult || it.geminiAnalysisResult,
                  analysisResult: (analysisMethod === 'gemini' ? geminiAnalysisResult : localAnalysisResult) || it.analysisResult,
                }
              : it
          );
          batchItemsRef.current = updated;
          return updated;
        });
      }

      setActiveBatchItemId(id);
      const item =
        itemOverride ||
        batchItemsRef.current.find((it) => it.id === id) ||
        batchItems.find((it) => it.id === id);
      if (!item) return;

      setSourceImage(item.sourceImage);
      setSourceFile(item.file);
      setImageMetadata(item.metadata);

      const itemLocal = item.localAnalysisResult || (item.analysisResult?.analysisSource === 'local' ? item.analysisResult : null);
      const itemGemini = item.geminiAnalysisResult || (item.analysisResult?.analysisSource === 'gemini' ? item.analysisResult : null);
      setLocalAnalysisResult(itemLocal);
      setGeminiAnalysisResult(itemGemini);
      const activeRes = analysisMethod === 'gemini' ? itemGemini : itemLocal;
      setAnalysisResult(activeRes);
      setPreviousAdjustments(null);
      setAnalysisError(null);
      setIsAnalyzing(false);

      // Isolasi State: Pulihkan pengaturan individual foto terpilih atau reset ke default bersih (Mencegah Leaking antar foto)
      const activeBgSettings = item.bgSettings ? { ...item.bgSettings } : DEFAULT_BG_SETTINGS;
      const activeBgType = item.bgType || 'preserve';
      const activeBgRemoval = item.bgRemovalMode || (item.metadata?.hasTransparency ? 'skip' : 'remove');
      setBgSettings(activeBgSettings);
      setBgType(activeBgType);
      setBgRemovalMode(activeBgRemoval);
      const activeDiag = item.diagnosticMode || 'composite';
      setDiagnosticMode(activeDiag);
      setCustomMask(item.customMask ? new Float32Array(item.customMask) : null);

      const activeFraming = item.framingSettings ? { ...item.framingSettings } : DEFAULT_FRAMING_SETTINGS;
      setFramingSettings(activeFraming);

      const activeSharpen = item.faceSharpenSettings ? { ...item.faceSharpenSettings } : DEFAULT_FACE_SHARPEN_SETTINGS;
      setFaceSharpenSettings(activeSharpen);

      const activePrinterComp = item.printerCompensation ? { ...item.printerCompensation } : DEFAULT_PRINTER_COMPENSATION;
      setPrinterCompensation(activePrinterComp);

      const activeMode = item.photoMode || photoMode;
      if (item.photoMode) setPhotoMode(item.photoMode);

      const activeTone = item.targetTone || targetTone;
      if (item.targetTone) setTargetTone(item.targetTone);

      const activeDim = item.selectedDimension || selectedDimension;
      if (item.selectedDimension) setSelectedDimension(item.selectedDimension);

      const activeEditTarget = item.editTargetMode || editTargetMode;
      if (item.editTargetMode) setEditTargetMode(item.editTargetMode);

      const baseCrop = CropEngine.getInitialCropRect(
        item.metadata.width,
        item.metadata.height,
        activeDim.aspectRatio
      );
      const framingCrop = CropEngine.calculateFramingCrop(
        item.metadata.width,
        item.metadata.height,
        activeDim,
        baseCrop,
        activeFraming.faceZoomEnabled,
        activeFraming.faceZoomPercent,
        activeFraming.headroomEnabled,
        activeFraming.headroomMm
      );
      const crop = item.cropRect || framingCrop;
      setCropRect(crop);
      setRotation(item.rotation ?? 0);
      setPreviousRotation(null);

      const activeAdjustments: AdjustmentParams = item.customAdjustments
        ? { ...item.customAdjustments }
        : item.analysisResult
        ? {
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
          }
        : GeminiService.getInitialAdjustments();

      setAdjustments(activeAdjustments);

      // Render instant preview so canvas is never empty or stuck
      if (item.masterCanvas) {
        setMasterCanvas(item.masterCanvas);
        setPrintCanvas(item.printCanvas || null);
        const activeCanvas =
          activeMode === 'bw' && activePreviewTarget === 'print' && item.printCanvas
            ? item.printCanvas
            : item.masterCanvas;
        setProcessedCanvas(activeCanvas);
      } else {
        try {
          const quick = ImageProcessor.processImage({
            sourceImage: item.sourceImage,
            cropRect: crop,
            rotation: item.rotation ?? 0,
            params: activeAdjustments,
            mode: activeMode,
            targetTone: activeTone,
            backgroundType: activeBgType,
            bgRemovalMode: item.bgRemovalMode || (item.metadata?.hasTransparency ? 'skip' : 'remove'),
            customBgImage,
            bgSettings: activeBgSettings,
            targetDimension: activeDim,
            isHighResExport: false,
            editTargetMode: activeEditTarget,
            printerCompensation: activePrinterComp,
            framingSettings: activeFraming,
            faceSharpenSettings: activeSharpen,
          });
          setMasterCanvas(quick.canvas);
          setPrintCanvas(quick.printCanvas);
          const activeCanvas =
            activeMode === 'bw' && activePreviewTarget === 'print'
              ? quick.printCanvas
              : quick.canvas;
          setProcessedCanvas(activeCanvas);
        } catch (err) {
          console.warn('Quick preview generation failed, using sourceImage directly:', err);
        }
      }
    },
    [
      activeBatchItemId,
      adjustments,
      cropRect,
      rotation,
      processedCanvas,
      masterCanvas,
      printCanvas,
      batchItems,
      selectedDimension,
      bgSettings,
      bgType,
      bgRemovalMode,
      framingSettings,
      faceSharpenSettings,
      printerCompensation,
      photoMode,
      targetTone,
      editTargetMode,
      localAnalysisResult,
      geminiAnalysisResult,
      analysisMethod,
      activePreviewTarget,
      customBgImage,
    ]
  );

  // Apply current framing & borders to all batch photos
  const handleApplyFramingToAllBatch = useCallback(() => {
    if (batchItems.length === 0) return;
    setBatchItems((prev) =>
      prev.map((it) => ({
        ...it,
        framingSettings: { ...framingSettings },
      }))
    );
  }, [batchItems.length, framingSettings]);

  // Apply current background to all batch photos
  const handleApplyBackgroundToAllBatch = useCallback(() => {
    if (batchItems.length === 0) return;
    setBatchItems((prev) =>
      prev.map((it) => ({
        ...it,
        bgType,
        bgRemovalMode,
        bgSettings: { ...bgSettings },
      }))
    );
  }, [batchItems.length, bgType, bgRemovalMode, bgSettings]);

  // Apply current background removal mode to all batch photos
  const handleApplyBgRemovalModeToAllBatch = useCallback(() => {
    if (batchItems.length === 0) return;
    setBatchItems((prev) =>
      prev.map((it) => ({
        ...it,
        bgRemovalMode,
      }))
    );
  }, [batchItems.length, bgRemovalMode]);

  // Apply current printer compensation to all batch photos
  const handleApplyPrinterCompensationToAllBatch = useCallback(() => {
    if (batchItems.length === 0) return;
    setBatchItems((prev) =>
      prev.map((it) => ({
        ...it,
        printerCompensation: { ...printerCompensation },
      }))
    );
  }, [batchItems.length, printerCompensation]);

  // Apply current dimension & aspect ratio to all batch photos
  const handleApplyDimensionToAllBatch = useCallback(() => {
    if (batchItems.length === 0) return;
    setBatchItems((prev) =>
      prev.map((it) => {
        const baseCrop = CropEngine.getInitialCropRect(
          it.metadata.width,
          it.metadata.height,
          selectedDimension.aspectRatio
        );
        const activeFraming = it.framingSettings || framingSettings;
        const framingCrop = CropEngine.calculateFramingCrop(
          it.metadata.width,
          it.metadata.height,
          selectedDimension,
          baseCrop,
          activeFraming.faceZoomEnabled,
          activeFraming.faceZoomPercent,
          activeFraming.headroomEnabled,
          activeFraming.headroomMm
        );
        return {
          ...it,
          selectedDimension,
          cropRect: framingCrop,
        };
      })
    );
  }, [batchItems.length, selectedDimension, framingSettings]);

  // Apply current photo mode & target tone to all batch photos
  const handleApplyPhotoModeToAllBatch = useCallback(() => {
    if (batchItems.length === 0) return;
    setBatchItems((prev) =>
      prev.map((it) => ({
        ...it,
        photoMode,
        targetTone,
      }))
    );
  }, [batchItems.length, photoMode, targetTone]);

  // Apply current rotation angle to all batch photos
  const handleApplyRotationToAllBatch = useCallback(() => {
    if (batchItems.length === 0) return;
    setBatchItems((prev) =>
      prev.map((it) => ({
        ...it,
        rotation,
      }))
    );
  }, [batchItems.length, rotation]);

  // 2. Add batch files
  const handleAddBatchFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newItems: BatchPhotoItem[] = [];

      for (const f of fileArray) {
        try {
          const item = await BatchProcessingService.createBatchItem(f, {
            selectedDimension,
            framingSettings,
          });
          newItems.push(item);
        } catch (err: any) {
          console.warn('Gagal memuat file batch:', err);
          alert(err.message || `Gagal memuat file: ${f.name}`);
        }
      }

      if (newItems.length > 0) {
        const updated = [...batchItemsRef.current, ...newItems];
        batchItemsRef.current = updated;
        setBatchItems(updated);

        // Jika belum ada foto yang aktif, langsung aktifkan foto pertama segera!
        if (!activeBatchItemId) {
          handleSelectBatchItem(newItems[0].id, newItems[0]);
        }
      }
    },
    [activeBatchItemId, handleSelectBatchItem, selectedDimension, framingSettings]
  );

  // 2b. Replace file on active batch item without deleting other photos
  const handleReplaceActiveBatchItem = useCallback(
    async (file: File) => {
      if (!activeBatchItemId) return;
      try {
        const newItem = await BatchProcessingService.createBatchItem(file, {
          selectedDimension,
          framingSettings,
        });
        const replacedItem = { ...newItem, id: activeBatchItemId };
        const updated = batchItemsRef.current.map((it) =>
          it.id === activeBatchItemId ? replacedItem : it
        );
        batchItemsRef.current = updated;
        setBatchItems(updated);
        handleSelectBatchItem(activeBatchItemId, replacedItem);
      } catch (err: any) {
        alert(err.message || 'Gagal mengganti foto.');
      }
    },
    [activeBatchItemId, handleSelectBatchItem, selectedDimension, framingSettings]
  );

  // 3. Remove a single batch item
  const handleRemoveBatchItem = useCallback(
    (id: string) => {
      // Abort ongoing network or processing for this item if active
      const activeController = batchAbortControllersRef.current.get(id);
      if (activeController) {
        activeController.abort();
        batchAbortControllersRef.current.delete(id);
      }

      const target = batchItemsRef.current.find((it) => it.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const removedIndex = batchItemsRef.current.findIndex((it) => it.id === id);
      const filtered = batchItemsRef.current.filter((it) => it.id !== id);
      batchItemsRef.current = filtered;
      setBatchItems(filtered);

      if (activeBatchItemId === id) {
        if (filtered.length > 0) {
          // Pilih foto terdekat yang masih tersedia (tetap di posisi indeks atau indeks terakhir)
          const nextIndex = Math.min(Math.max(0, removedIndex), filtered.length - 1);
          const nextItem = filtered[nextIndex];
          handleSelectBatchItem(nextItem.id, nextItem);
        } else {
          setActiveBatchItemId(null);
          setSourceImage(null);
          setSourceFile(null);
          setImageMetadata(null);
          setAnalysisResult(null);
          setProcessedCanvas(null);
          setMasterCanvas(null);
          setPrintCanvas(null);
        }
      }
    },
    [activeBatchItemId, handleSelectBatchItem]
  );

  // 4. Clear all batch items
  const handleClearAllBatch = useCallback(() => {
    // Abort all in-flight batch operations
    batchAbortControllersRef.current.forEach((ctrl) => ctrl.abort());
    batchAbortControllersRef.current.clear();

    batchItems.forEach((it) => {
      if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
    });
    batchItemsRef.current = [];
    setBatchItems([]);
    setActiveBatchItemId(null);
    setSourceImage(null);
    setSourceFile(null);
    setImageMetadata(null);
    setAnalysisResult(null);
    setProcessedCanvas(null);
    setMasterCanvas(null);
    setPrintCanvas(null);
  }, [batchItems]);

  // 5. Start Batch Processing (Centralized Queue, Conservative Concurrency: 1 at a time)
  const handleStartBatchProcessing = useCallback(async () => {
    if (isBatchProcessing || batchItemsRef.current.length === 0) return;
    setIsBatchProcessing(true);

    // Sinkronkan pengaturan aktif terkini ke dalam antrean batch
    if (activeBatchItemId) {
      const synced = batchItemsRef.current.map((it) =>
        it.id === activeBatchItemId
          ? {
              ...it,
              customAdjustments: adjustments,
              cropRect: cropRect,
              bgSettings: bgSettings,
              bgType: bgType,
              framingSettings: framingSettings,
              faceSharpenSettings: faceSharpenSettings,
              printerCompensation: printerCompensation,
              photoMode: photoMode,
              targetTone: targetTone,
              selectedDimension: selectedDimension,
              editTargetMode: editTargetMode,
            }
          : it
      );
      batchItemsRef.current = synced;
      setBatchItems(synced);
    }

    const itemsToProcess = batchItemsRef.current.filter(
      (it) => it.status !== 'done' && it.status !== 'processing' && it.status !== 'analyzing'
    );

    for (const item of itemsToProcess) {
      // Pastikan foto belum dihapus oleh user selama antrean berjalan
      if (!batchItemsRef.current.some((it) => it.id === item.id)) {
        continue;
      }

      const controller = new AbortController();
      batchAbortControllersRef.current.set(item.id, controller);

      const isGeminiBatch = analysisMethod === 'gemini';
      const initialStatus = item.analysisResult ? 'processing' : 'analyzing';
      const initialText = item.analysisResult
        ? 'Memproses piksel 600 DPI...'
        : (isGeminiBatch
            ? 'Menganalisis pencahayaan (Gemini AI)...'
            : 'Menghitung parameter tonal lokal...');

      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: initialStatus, progressText: initialText, errorMessage: undefined, errorType: undefined }
            : it
        )
      );

      try {
        const updatedFields = await BatchProcessingService.processItem(
          item,
          {
            photoMode,
            targetTone,
            selectedDimension,
            bgType,
            customBgImage,
            bgSettings,
            editTargetMode,
            printerCompensation,
            apiKey,
            model: selectedModel,
            analysisMethod,
            signal: controller.signal,
            timeoutMs: 25000,
          },
          (stageText) => {
            if (batchItemsRef.current.some((it) => it.id === item.id)) {
              setBatchItems((prev) =>
                prev.map((it) => (it.id === item.id ? { ...it, progressText: stageText } : it))
              );
            }
          }
        );

        if (batchItemsRef.current.some((it) => it.id === item.id)) {
          setBatchItems((prev) => {
            const updated = prev.map((it) => (it.id === item.id ? { ...it, ...updatedFields } : it));
            return updated;
          });

          // Refresh canvas foto aktif jika foto ini sedang dibuka
          if (activeBatchItemId === item.id && updatedFields.masterCanvas) {
            setProcessedCanvas(updatedFields.masterCanvas);
            setMasterCanvas(updatedFields.masterCanvas);
            if (updatedFields.printCanvas) setPrintCanvas(updatedFields.printCanvas);
            if (updatedFields.analysisResult) setAnalysisResult(updatedFields.analysisResult);
          }
        }
      } catch (err: any) {
        if (controller.signal.aborted) {
          continue;
        }
        console.error(`Gagal memproses foto ${item.name}:`, err);
        const errType: BatchErrorType = (err as any)?.details?.type || 'processing';
        const errMsg = (err as any)?.message || 'Gagal memproses foto';

        if (batchItemsRef.current.some((it) => it.id === item.id)) {
          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'error',
                    errorType: errType,
                    errorMessage: errMsg,
                    progressText: 'Gagal',
                  }
                : it
            )
          );
        }
      } finally {
        batchAbortControllersRef.current.delete(item.id);
      }

      // Small pause between photos for smooth UI reactivity & rate limit preservation
      await new Promise((res) => setTimeout(res, 80));
    }

    setIsBatchProcessing(false);
  }, [
    isBatchProcessing,
    photoMode,
    targetTone,
    selectedDimension,
    bgType,
    customBgImage,
    bgSettings,
    editTargetMode,
    printerCompensation,
    apiKey,
    selectedModel,
    analysisMethod,
    activeBatchItemId,
  ]);

  // 6. Retry a single failed item
  const handleRetryBatchItem = useCallback(
    async (id: string) => {
      const item = batchItemsRef.current.find((it) => it.id === id);
      if (!item) return;

      const controller = new AbortController();
      batchAbortControllersRef.current.set(id, controller);

      const isGeminiRetry = analysisMethod === 'gemini';
      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: 'analyzing',
                progressText: isGeminiRetry ? 'Mencoba ulang analisis (Gemini AI)...' : 'Mencoba ulang analisis lokal...',
                errorMessage: undefined,
                errorType: undefined,
              }
            : it
        )
      );

      try {
        const updatedFields = await BatchProcessingService.processItem(
          item,
          {
            photoMode,
            targetTone,
            selectedDimension,
            bgType,
            customBgImage,
            bgSettings,
            editTargetMode,
            printerCompensation,
            apiKey,
            model: selectedModel,
            analysisMethod,
            signal: controller.signal,
            timeoutMs: 25000,
          },
          (stageText) => {
            setBatchItems((prev) =>
              prev.map((it) => (it.id === id ? { ...it, progressText: stageText } : it))
            );
          }
        );

        setBatchItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, ...updatedFields } : it))
        );

        if (activeBatchItemId === id && updatedFields.masterCanvas) {
          setProcessedCanvas(updatedFields.masterCanvas);
          setMasterCanvas(updatedFields.masterCanvas);
          if (updatedFields.printCanvas) setPrintCanvas(updatedFields.printCanvas);
          if (updatedFields.analysisResult) setAnalysisResult(updatedFields.analysisResult);
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
        console.error(`Gagal mencoba ulang ${item.name}:`, err);
        const errType: BatchErrorType = (err as any)?.details?.type || 'processing';
        setBatchItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  status: 'error',
                  errorType: errType,
                  errorMessage: err.message || 'Gagal memproses ulang foto',
                  progressText: 'Gagal',
                }
              : it
          )
        );
      } finally {
        batchAbortControllersRef.current.delete(id);
      }
    },
    [
      photoMode,
      targetTone,
      selectedDimension,
      bgType,
      customBgImage,
      bgSettings,
      editTargetMode,
      printerCompensation,
      apiKey,
      selectedModel,
      analysisMethod,
      activeBatchItemId,
    ]
  );

  // 7. Apply current studio settings across all batch items
  const handleApplySettingsToAllBatch = useCallback(async () => {
    if (batchItems.length === 0 || isBatchProcessing) return;
    setIsBatchProcessing(true);

    for (const item of batchItems) {
      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: 'processing', progressText: 'Menerapkan pengaturan baru...' }
            : it
        )
      );

      try {
        const updatedFields = await BatchProcessingService.processItem(item, {
          photoMode,
          targetTone,
          selectedDimension,
          bgType,
          bgRemovalMode,
          customBgImage,
          bgSettings,
          framingSettings,
          faceSharpenSettings,
          rotation,
          editTargetMode,
          printerCompensation,
          apiKey,
          model: selectedModel,
          analysisMethod,
        });

        setBatchItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, ...updatedFields } : it))
        );
      } catch (err: any) {
        setBatchItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'error', errorMessage: err.message } : it
          )
        );
      }
    }

    setIsBatchProcessing(false);
  }, [
    batchItems,
    isBatchProcessing,
    photoMode,
    targetTone,
    selectedDimension,
    bgType,
    customBgImage,
    bgSettings,
    framingSettings,
    editTargetMode,
    printerCompensation,
    apiKey,
    selectedModel,
    analysisMethod,
  ]);

  // 8. Export Batch to ZIP (Lossless Full-Resolution 600 DPI directly from sourceImage)
  const handleExportBatchZip = useCallback(
    async (format: 'png' | 'jpeg', quality: number) => {
      if (batchItems.length === 0 || isExportingBatch) return;
      setIsExportingBatch(true);
      try {
        // Sinkronkan penyesuaian terkini foto aktif ke dalam antrean sebelum dikemas ke ZIP
        const synchronizedItems = batchItems.map((it) =>
          it.id === activeBatchItemId
            ? {
                ...it,
                customAdjustments: adjustments,
                cropRect: cropRect,
                rotation: rotation,
                bgSettings: bgSettings,
                bgType: bgType,
                bgRemovalMode: bgRemovalMode,
                framingSettings: framingSettings,
                faceSharpenSettings: faceSharpenSettings,
                printerCompensation: printerCompensation,
                photoMode: photoMode,
                targetTone: targetTone,
                selectedDimension: selectedDimension,
                editTargetMode: editTargetMode,
              }
            : it
        );

        await BatchProcessingService.exportBatchToZip(synchronizedItems, {
          photoMode,
          format,
          quality,
          targetDimension: selectedDimension,
          printerProfile: printerCompensation.printerProfile,
          targetTone,
          bgType,
          bgRemovalMode,
          customBgImage,
          bgSettings,
          framingSettings,
          faceSharpenSettings,
          rotation,
          editTargetMode,
          printerCompensation,
        });
      } catch (err: any) {
        alert(err.message || 'Gagal membuat file ZIP.');
      } finally {
        setIsExportingBatch(false);
      }
    },
    [
      batchItems,
      isExportingBatch,
      activeBatchItemId,
      adjustments,
      cropRect,
      rotation,
      bgSettings,
      bgType,
      bgRemovalMode,
      framingSettings,
      faceSharpenSettings,
      printerCompensation,
      photoMode,
      targetTone,
      selectedDimension,
      editTargetMode,
      customBgImage,
    ]
  );

  // Save API Key & Model (Manual analysis only, no automatic trigger)
  const handleSaveApiKey = useCallback(
    (newKey: string, newModel: string) => {
      setApiKey(newKey);
      setSelectedModel(newModel);
      localStorage.setItem('pasfoto_gemini_api_key', newKey);
      localStorage.setItem('pasfoto_gemini_model', newModel);
    },
    []
  );

  // Clear API Key
  const handleClearApiKey = useCallback(() => {
    setApiKey('');
    localStorage.removeItem('pasfoto_gemini_api_key');
  }, []);

  // Handle Image Selected (Manual analysis only, no automatic trigger on upload)
  const handleImageSelected = useCallback(
    (img: HTMLImageElement, file: File, meta: ImageMetadata) => {
      setSourceImage(img);
      setSourceFile(file);
      setImageMetadata(meta);

      // Calculate initial crop centered on face with active framing settings (Zoom & Headroom)
      const baseCrop = CropEngine.getInitialCropRect(
        meta.width,
        meta.height,
        selectedDimension.aspectRatio
      );
      const initialCrop = CropEngine.calculateFramingCrop(
        meta.width,
        meta.height,
        selectedDimension,
        baseCrop,
        framingSettings.faceZoomEnabled,
        framingSettings.faceZoomPercent,
        framingSettings.headroomEnabled,
        framingSettings.headroomMm
      );
      setCropRect(initialCrop);
      setRotation(0);
      setPreviousRotation(null);

      // Reset adjustments & background
      setAdjustments(GeminiService.getInitialAdjustments());
      setEditTargetMode('subject_only');
      setBgType('preserve');
      const defaultRemoval = meta.hasTransparency ? 'skip' : 'remove';
      setBgRemovalMode(defaultRemoval);
      setCustomBgImage(null);
      setCustomBgPreviewUrl(null);
      setBgSettings(DEFAULT_BG_SETTINGS);
      setDetectedBgColor(undefined);
      setSegmentationWarning(null);
      setLocalAnalysisResult(null);
      setGeminiAnalysisResult(null);
      setAnalysisResult(null);
      setPreviousAdjustments(null);
      setAnalysisError(null);
      setIsAnalyzing(false);

      // Nonaktifkan pemicu otomatis: analisis hanya dijalankan jika pengguna menekan tombol rekomendasi
    },
    [selectedDimension, framingSettings]
  );

  // Validate crop safety when crop changes
  useEffect(() => {
    if (imageMetadata) {
      const validation = CropEngine.validateCropSafety(
        cropRect,
        imageMetadata.width,
        imageMetadata.height
      );
      setCropWarning(validation.isSafe ? null : validation.warning || null);
    }
  }, [cropRect, imageMetadata]);

  // Debounce timer & LRU preview cache for 60 FPS slider reactivity
  const previewTimerRef = useRef<any>(null);
  const previewCacheRef = useRef<Map<string, { master: HTMLCanvasElement; print: HTMLCanvasElement; segResult?: any }>>(new Map());

  // Process and re-render image preview whenever any parameter changes
  useEffect(() => {
    if (!sourceImage) {
      setProcessedCanvas(null);
      setMasterCanvas(null);
      setPrintCanvas(null);
      setIsProcessingPreview(false);
      return;
    }

    // Generate unique preview cache key
    const previewKey = [
      sourceFile?.name || 'src',
      sourceFile?.size || 0,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      rotation.toFixed(2),
      photoMode,
      targetTone,
      bgType,
      bgRemovalMode,
      selectedDimension.id,
      editTargetMode,
      printerCompensation.enabled,
      printerCompensation.printerProfile,
      printerCompensation.paperProfile,
      printerCompensation.neutralBias,
      printerCompensation.blueBias,
      printerCompensation.yellowBias,
      printerCompensation.redBias,
      printerCompensation.greenBias,
      printerCompensation.printBrightness,
      printerCompensation.highlightRecovery,
      printerCompensation.whitePoint,
      printerCompensation.whiteGarmentDetail,
      adjustments.exposureEV,
      adjustments.brightness,
      adjustments.contrast,
      adjustments.highlights,
      adjustments.shadows,
      adjustments.whites,
      adjustments.blacks,
      adjustments.sharpening,
      adjustments.noiseProtection,
      adjustments.faceDetail,
      adjustments.eyeDetail,
      adjustments.hairDetail,
      adjustments.skinProtection,
      adjustments.temperature,
      adjustments.tint,
      bgSettings.subjectScale,
      bgSettings.subjectRotation,
      bgSettings.subjectOffsetX,
      bgSettings.subjectOffsetY,
      bgSettings.subjectFlipX,
      bgSettings.bgBlur,
      bgSettings.bgBrightness,
      bgSettings.bgContrast,
      bgSettings.lightHarmonization,
      bgSettings.edgeTolerance,
      bgSettings.edgeFeather,
      bgSettings.spillRemoval,
      bgSettings.contactShadow,
      customBgImage?.src || '',
      framingSettings.innerBorderEnabled,
      framingSettings.innerBorderWidthMm,
      framingSettings.outerCutLineEnabled,
      framingSettings.outerCutLineWidthMm,
      framingSettings.outerCutLineOpacity,
      framingSettings.faceZoomEnabled,
      framingSettings.faceZoomPercent,
      framingSettings.headroomEnabled,
      framingSettings.headroomMm,
      framingSettings.renderLinesOnExport,
      faceSharpenSettings.enabled,
      faceSharpenSettings.intensity,
      faceSharpenSettings.radius,
      faceSharpenSettings.threshold,
      diagnosticMode,
      customMask ? `cm_${maskVersion}` : 'nocm',
    ].join('|');

    // If result is already cached (e.g. switching back and forth between photos or repeated parameters)
    const cached = previewCacheRef.current.get(previewKey);
    if (cached) {
      if (cached.mask) activeMaskRef.current = cached.mask;
      if (cached.rawCroppedCanvas) rawCroppedCanvasRef.current = cached.rawCroppedCanvas;
      if (diagnosticMode === 'composite') lastCompositeCanvasRef.current = cached.master;
      setMasterCanvas(cached.master);
      setPrintCanvas(cached.print);
      const activeCanvas =
        photoMode === 'bw' && activePreviewTarget === 'print'
          ? cached.print
          : cached.master;
      setProcessedCanvas(activeCanvas);
      setIsProcessingPreview(false);
      if (cached.segResult) {
        if (!cached.segResult.isSafe) {
          setSegmentationWarning(
            cached.segResult.message ||
              'Segmentasi kurang yakin — background asli dipertahankan untuk menjaga subjek.'
          );
        } else {
          setSegmentationWarning(null);
        }
        if (cached.segResult.detectedBgColor) {
          setDetectedBgColor(cached.segResult.detectedBgColor);
        }
      }
      return;
    }

    // Cancel pending render frame
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }

    setIsProcessingPreview(true);

    // Schedule lightweight debounced preview render (35ms debounce for silky smooth slider scrubbing)
    previewTimerRef.current = setTimeout(() => {
      try {
        const result = ImageProcessor.processImage({
          sourceImage,
          cropRect,
          rotation,
          params: adjustments,
          mode: photoMode,
          targetTone,
          backgroundType: bgType,
          bgRemovalMode,
          customBgImage,
          bgSettings,
          targetDimension: selectedDimension,
          isHighResExport: false, // Fast reactivity for preview
          editTargetMode,
          printerCompensation,
          framingSettings,
          faceSharpenSettings,
          customMask: customMask || undefined,
          diagnosticMode,
        });

        if (result.mask) {
          activeMaskRef.current = result.mask;
        }
        if (result.rawCroppedCanvas) {
          rawCroppedCanvasRef.current = result.rawCroppedCanvas;
        }
        if (diagnosticMode === 'composite') {
          lastCompositeCanvasRef.current = result.canvas;
        }

        // Store in LRU preview cache (cap at 30 items)
        if (previewCacheRef.current.size > 30) {
          const firstKey = previewCacheRef.current.keys().next().value;
          if (firstKey) previewCacheRef.current.delete(firstKey);
        }
        previewCacheRef.current.set(previewKey, {
          master: result.canvas,
          print: result.printCanvas,
          segResult: result.segmentationResult,
          mask: result.mask,
          rawCroppedCanvas: result.rawCroppedCanvas,
        });

        setMasterCanvas(result.canvas);
        setPrintCanvas(result.printCanvas);

        // Tampilkan canvas sesuai mode preview yang dipilih
        const activeCanvas =
          photoMode === 'bw' && activePreviewTarget === 'print'
            ? result.printCanvas
            : result.canvas;
        setProcessedCanvas(activeCanvas);

        // Check if segmentation was warned
        if (result.segmentationResult) {
          if (!result.segmentationResult.isSafe) {
            setSegmentationWarning(
              result.segmentationResult.message ||
                'Segmentasi kurang yakin — background asli dipertahankan untuk menjaga subjek.'
            );
          } else {
            setSegmentationWarning(null);
          }
          if (result.segmentationResult.detectedBgColor) {
            setDetectedBgColor(result.segmentationResult.detectedBgColor);
          }
        }
      } catch (e) {
        console.error('Error during image processing:', e);
      } finally {
        setIsProcessingPreview(false);
      }
    }, 35);

    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, [
    sourceImage,
    sourceFile,
    cropRect,
    rotation,
    adjustments,
    photoMode,
    targetTone,
    bgType,
    bgRemovalMode,
    customBgImage,
    bgSettings,
    selectedDimension,
    editTargetMode,
    printerCompensation,
    activePreviewTarget,
    framingSettings,
    faceSharpenSettings,
    diagnosticMode,
    customMask,
    maskVersion,
  ]);

  // Handle Export high-res photo (Mendukung Master Grayscale dan Print Version)
  const handleExport = async (
    exportTarget: 'master' | 'print',
    format: 'png' | 'jpeg',
    quality: number
  ): Promise<string> => {
    if (!sourceImage) {
      throw new Error('Tidak ada foto yang dimuat.');
    }

    return ImageProcessor.exportPhoto(
      {
        sourceImage,
        cropRect,
        rotation,
        params: adjustments,
        mode: photoMode,
        targetTone,
        backgroundType: bgType,
        bgRemovalMode,
        customBgImage,
        bgSettings,
        targetDimension: selectedDimension,
        editTargetMode,
        printerCompensation,
        framingSettings,
        faceSharpenSettings,
        customMask: customMask || undefined,
      },
      exportTarget,
      format,
      quality
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Studio Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                  PAS FOTO IJAZAH STUDIO
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  STANDAR 600 DPI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Koreksi Pas Foto Non-Generatif • Parameter AI Gemini • Identitas 100% Terlindungi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-end">
            {/* Gemini API Key Config Button */}
            <button
              type="button"
              onClick={() => setIsApiKeyModalOpen(true)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                apiKey
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title="Konfigurasi API Key & Model Gemini (Flash Lite)"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline">Gemini API:</span>
                <span className="font-mono text-[11px] text-amber-200">
                  {selectedModel.includes('flash-lite')
                    ? selectedModel.includes('3.5')
                      ? '3.5 Flash Lite'
                      : selectedModel.includes('3.1')
                      ? '3.1 Flash Lite'
                      : selectedModel.includes('2.0')
                      ? '2.0 Flash Lite'
                      : '2.5 Flash Lite'
                    : selectedModel.replace('gemini-', '')}
                </span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${
                  apiKey ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400 animate-pulse'
                }`}
                title={apiKey ? 'API Key Terpasang' : 'Klik untuk Input API Key'}
              />
            </button>

            <a
              href="./Pas-Foto-Ijazah-Studio-Release.apk"
              download="Pas-Foto-Ijazah-Studio-Release.apk"
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 shadow-sm"
              title="Unduh Aplikasi Pas Foto Ijazah Studio (APK Release Android)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium">APK Android</span>
            </a>

            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="hidden md:inline">Absolute Subject Lock</span>
              <span className="md:hidden">Subject Lock</span>
            </div>

            {/* Reset / Ganti Foto Button */}
            {inputMode === 'batch' && batchItems.length > 0 ? (
              <div className="flex items-center gap-2">
                <input
                  ref={replaceFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleReplaceActiveBatchItem(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => replaceFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Ganti file foto yang sedang aktif tanpa menghapus foto lainnya"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  Ganti Foto Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Bersihkan semua foto batch dan kembali ke pemilihan awal?')) {
                      handleClearAllBatch();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:border-rose-700/50 hover:text-rose-300 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  Reset Batch ({batchItems.length})
                </button>
              </div>
            ) : sourceImage ? (
              <button
                type="button"
                onClick={() => {
                  setSourceImage(null);
                  setSourceFile(null);
                  setImageMetadata(null);
                  setLocalAnalysisResult(null);
                  setGeminiAnalysisResult(null);
                  setAnalysisResult(null);
                  setPreviousAdjustments(null);
                  setAnalysisError(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Ganti Foto
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Sticky Quick Batch Navigator - Navigasi cepat antar foto batch saat scroll di Peralatan Studio */}
      {inputMode === 'batch' && batchItems.length > 0 && (
        <QuickBatchNavigator
          items={batchItems}
          activeItemId={activeBatchItemId}
          onSelectItem={handleSelectBatchItem}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* If no image uploaded yet (Single) or no batch items (Batch) */}
        {(inputMode === 'single' && !sourceImage) || (inputMode === 'batch' && batchItems.length === 0) ? (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Mission Banner */}
            <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Standar Ijazah Resmi Republik Indonesia & Kedinasan
                  </h2>
                  <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                    Aplikasi ini dirancang khusus untuk mematuhi regulasi ketat verifikasi ijazah (Dikti, Kemenag, Sekolah Kedinasan, CPNS, dan Kedubes).
                    Kami <strong>TIDAK MENGGUNAKAN AI GENERATIVE</strong> untuk meredraw atau mengubah fitur wajah.
                    Wajah sumber Anda adalah <em>Source of Truth</em>. Pemrosesan dilakukan murni pada kurva pencahayaan, true grayscale, dan ketajaman 600 DPI.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-mono text-amber-300">
                    <span>✓ Bebas Filter Halusinasi AI</span>
                    <span>✓ True Grayscale Rec. 709</span>
                    <span>✓ Komputasi Cetak 600 DPI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Zone (Mendukung Single & Batch Mode) */}
            <UploadZone
              inputMode={inputMode}
              onChangeInputMode={setInputMode}
              onImageSelected={handleImageSelected}
              isLoading={isAnalyzing}
              batchItems={batchItems}
              onAddBatchFiles={handleAddBatchFiles}
              onRemoveBatchItem={handleRemoveBatchItem}
              onClearAllBatch={handleClearAllBatch}
              onStartBatchProcessing={handleStartBatchProcessing}
              isBatchProcessing={isBatchProcessing}
              activeBatchItemId={activeBatchItemId}
              onSelectBatchItem={handleSelectBatchItem}
              onRetryBatchItem={handleRetryBatchItem}
              onExportBatchZip={() => handleExportBatchZip(exportFormat, exportQuality)}
              isExportingZip={isExportingBatch}
            />
          </div>
        ) : (
          /* WORKFLOW AFTER UPLOAD (Single or Batch with loaded items) */
          <div className="space-y-8">
            {/* Khusus Mode Batch: Panel Pemantauan & Pilihan Foto Aktif */}
            {inputMode === 'batch' && batchItems.length > 0 && (
              <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded border border-amber-400/20">
                      ANTREAN BATCH ({batchItems.length})
                    </span>
                    <span className="text-xs text-slate-300">
                      Foto Aktif:{' '}
                      <strong className="text-amber-300 font-mono">
                        {batchItems.find((it) => it.id === activeBatchItemId)?.name || '-'}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowBatchManagerInStudio(!showBatchManagerInStudio)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      {showBatchManagerInStudio ? 'Sembunyikan Antrean' : 'Buka Panel Antrean'}
                    </button>

                    <button
                      type="button"
                      onClick={handleApplySettingsToAllBatch}
                      disabled={isBatchProcessing}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      title="Terapkan mode, ukuran, dan kompensasi cetak saat ini ke seluruh foto batch"
                    >
                      <FolderSync className="w-3.5 h-3.5 text-amber-400" />
                      Terapkan Pengaturan ke Semua
                    </button>
                  </div>
                </div>

                {/* Collapsible Batch Manager Panel */}
                {showBatchManagerInStudio && (
                  <BatchManagerPanel
                    items={batchItems}
                    onAddFiles={handleAddBatchFiles}
                    onRemoveItem={handleRemoveBatchItem}
                    onClearAll={handleClearAllBatch}
                    onStartProcessing={handleStartBatchProcessing}
                    isProcessing={isBatchProcessing}
                    activeItemId={activeBatchItemId}
                    onSelectItem={handleSelectBatchItem}
                    onRetryItem={handleRetryBatchItem}
                    onExportZip={() => handleExportBatchZip(exportFormat, exportQuality)}
                    isExportingZip={isExportingBatch}
                  />
                )}
              </div>
            )}

            {/* Step 3: Target Mode Selector (B&W vs Color, Target Tone) */}
            <TargetModeSelector
              mode={photoMode}
              onChangeMode={(newMode) => {
                setPhotoMode(newMode);
                if (activeBatchItemId) {
                  setBatchItems((prev) =>
                    prev.map((it) => (it.id === activeBatchItemId ? { ...it, photoMode: newMode } : it))
                  );
                }
              }}
              targetTone={targetTone}
              onChangeTargetTone={(newTone) => {
                setTargetTone(newTone);
                if (activeBatchItemId) {
                  setBatchItems((prev) =>
                    prev.map((it) => (it.id === activeBatchItemId ? { ...it, targetTone: newTone } : it))
                  );
                }
              }}
            />

            {/* Step 4: Comparison Viewer (Collapsible Panel ringkas Before / After) */}
            <ComparisonViewer
              originalImage={sourceImage}
              processedCanvas={processedCanvas}
              masterCanvas={masterCanvas}
              printCanvas={printCanvas}
              cropRect={cropRect}
              imageMetadata={imageMetadata}
              targetDimension={selectedDimension}
              mode={photoMode}
              backgroundType={bgType}
              onOpenBackgroundTab={() => setActiveStepTab('background')}
              activePreviewTarget={activePreviewTarget}
              onSelectPreviewTarget={setActivePreviewTarget}
              printerProfile={printerCompensation.printerProfile}
              isPrinterCompensationEnabled={printerCompensation.enabled}
              activePhotoLabel={
                inputMode === 'batch' && batchItems.length > 0
                  ? `Foto ${Math.max(1, batchItems.findIndex((it) => it.id === activeBatchItemId) + 1)}`
                  : 'Foto Utama'
              }
              isExpanded={isComparisonOpen}
              onToggleExpand={() => setIsComparisonOpen((prev) => !prev)}
            />

            {/* Navigation Tab bar for editing panels */}
            <div
              ref={studioToolsRef}
              id="peralatan-studio"
              className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 scroll-mt-24"
            >
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">
                Peralatan Studio:
              </span>
              <button
                type="button"
                onClick={() => setActiveStepTab('adjust')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeStepTab === 'adjust'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                1. Manual Adjustment
              </button>

              <button
                type="button"
                onClick={() => setActiveStepTab('crop')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeStepTab === 'crop'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                2. Ukuran & Crop Framing
              </button>

              <button
                type="button"
                onClick={() => setActiveStepTab('background')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeStepTab === 'background'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                3. Ganti Latar Belakang
                {bgType !== 'preserve' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                )}
              </button>

              {photoMode === 'bw' && (
                <button
                  type="button"
                  onClick={() => setActiveStepTab('printer')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeStepTab === 'printer'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  4. Kompensasi Cetak
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      printerCompensation.enabled
                        ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {printerCompensation.enabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveStepTab('export')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeStepTab === 'export'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                {photoMode === 'bw' ? '5.' : '4.'} Export & Download
              </button>
            </div>

            {/* Active Panel View */}
            {activeStepTab === 'adjust' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* KOLOM KIRI: HASIL PAS FOTO IJAZAH (LIVE PREVIEW) */}
                  <div className="w-full lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24">
                    <HasilPasFotoPanel
                      processedCanvas={processedCanvas}
                      masterCanvas={masterCanvas}
                      printCanvas={printCanvas}
                      rawCroppedCanvas={rawCroppedCanvasRef.current}
                      sourceImage={sourceImage}
                      cropRect={cropRect}
                      rotation={rotation}
                      isProcessingPreview={isProcessingPreview}
                      targetDimension={selectedDimension}
                      mode={photoMode}
                      isLivePreview={true}
                      sizeVariant="large"
                      activePreviewTarget={activePreviewTarget}
                      onSelectPreviewTarget={setActivePreviewTarget}
                      printerProfile={printerCompensation.printerProfile}
                      isPrinterCompensationEnabled={printerCompensation.enabled}
                      diagnosticMode={diagnosticMode}
                    />
                  </div>

                  {/* KOLOM KANAN: MANUAL ADJUSTMENT & FINE TUNING */}
                  <div className="w-full lg:col-span-7 xl:col-span-7">
                    <ManualAdjustmentSliders
                      params={adjustments}
                      onChange={(newAdj) => {
                        setAdjustments(newAdj);
                        if (activeBatchItemId) {
                          setBatchItems((prev) =>
                            prev.map((it) => (it.id === activeBatchItemId ? { ...it, customAdjustments: newAdj } : it))
                          );
                        }
                      }}
                      onResetToAI={applyAIRecommendations}
                      onResetToNeutral={resetToNeutral}
                      onUndo={handleUndo}
                      canUndo={Boolean(previousAdjustments)}
                      mode={photoMode}
                      hasAIRecommendations={Boolean(analysisMethod === 'gemini' ? geminiAnalysisResult : localAnalysisResult)}
                      editTargetMode={editTargetMode}
                      onChangeEditTargetMode={setEditTargetMode}
                      analysisMethod={analysisMethod}
                      onChangeAnalysisMethod={handleSetAnalysisMethod}
                      onRunAnalysis={handleRunAnalysis}
                      isAnalyzing={isAnalyzing}
                      analysisStepText={analysisStepText}
                      analysisResult={analysisMethod === 'gemini' ? geminiAnalysisResult : localAnalysisResult}
                      analysisError={analysisError}
                      onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                      apiKey={apiKey}
                      isBatchMode={inputMode === 'batch'}
                      onApplyAdjustmentsToAllBatch={handleApplyAdjustmentsToAllBatch}
                      onToggleViewAnalysisDetails={() => setIsShowingAnalysisDetails((prev) => !prev)}
                      isShowingAnalysisDetails={isShowingAnalysisDetails}
                      onOpenPresetModal={handleOpenPresetModal}
                      faceSharpenSettings={faceSharpenSettings}
                      onChangeFaceSharpenSettings={handleUpdateFaceSharpenSettings}
                      onApplyFaceSharpenToAllBatch={handleApplyFaceSharpenToAllBatch}
                    />
                  </div>
                </div>

                {/* RINCIAN ANALISIS KARAKTERISTIK FOTO (JIKA DIPERLUKAN OLEH USER) */}
                {isShowingAnalysisDetails && (analysisMethod === 'gemini' ? geminiAnalysisResult : localAnalysisResult) && (
                  <div className="pt-4 border-t border-slate-800">
                    <AnalysisPanel
                      analysis={analysisMethod === 'gemini' ? geminiAnalysisResult : localAnalysisResult}
                      isLoading={isAnalyzing}
                      loadingStepText={analysisStepText}
                      onApplyRecommendations={applyAIRecommendations}
                      onRunLocalAnalysis={runLocalAnalysis}
                      onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                      error={analysisError}
                    />
                  </div>
                )}
              </div>
            )}

            {activeStepTab === 'crop' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* KOLOM KIRI: HASIL PAS FOTO IJAZAH (LIVE PREVIEW DENGAN FRAMING & GARIS) */}
                <div className="w-full lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24">
                  <HasilPasFotoPanel
                    processedCanvas={processedCanvas}
                    masterCanvas={masterCanvas}
                    printCanvas={printCanvas}
                    rawCroppedCanvas={rawCroppedCanvasRef.current}
                    sourceImage={sourceImage}
                    cropRect={cropRect}
                    rotation={rotation}
                    isProcessingPreview={isProcessingPreview}
                    targetDimension={selectedDimension}
                    mode={photoMode}
                    isLivePreview={true}
                    sizeVariant="large"
                    activePreviewTarget={activePreviewTarget}
                    onSelectPreviewTarget={setActivePreviewTarget}
                    printerProfile={printerCompensation.printerProfile}
                    isPrinterCompensationEnabled={printerCompensation.enabled}
                    diagnosticMode={diagnosticMode}
                  />
                </div>

                {/* KOLOM KANAN: UKURAN OUTPUT, CROP FRAMING, BORDER & GARIS POTONG */}
                <div className="w-full lg:col-span-7 xl:col-span-7">
                  <DimensionAndCrop
                    selectedDimension={selectedDimension}
                    onSelectDimension={(newDim) => {
                      setSelectedDimension(newDim);
                      if (activeBatchItemId) {
                        setBatchItems((prev) =>
                          prev.map((it) => (it.id === activeBatchItemId ? { ...it, selectedDimension: newDim } : it))
                        );
                      }
                    }}
                    cropRect={cropRect}
                    onChangeCropRect={(newCrop) => {
                      setCropRect(newCrop);
                      if (activeBatchItemId) {
                        setBatchItems((prev) =>
                          prev.map((it) => (it.id === activeBatchItemId ? { ...it, cropRect: newCrop } : it))
                        );
                      }
                    }}
                    imageMetadata={imageMetadata}
                    cropWarning={cropWarning}
                    framingSettings={framingSettings}
                    onChangeFramingSettings={(newFraming) => {
                      setFramingSettings(newFraming);
                      if (activeBatchItemId) {
                        setBatchItems((prev) =>
                          prev.map((it) => (it.id === activeBatchItemId ? { ...it, framingSettings: newFraming } : it))
                        );
                      }
                    }}
                    isBatchMode={inputMode === 'batch'}
                    onApplyFramingToAllBatch={handleApplyFramingToAllBatch}
                    onApplyDimensionToAllBatch={handleApplyDimensionToAllBatch}
                    rotation={rotation}
                    onChangeRotation={(newRot) => {
                      setPreviousRotation(rotation);
                      setRotation(newRot);
                      if (activeBatchItemId) {
                        setBatchItems((prev) =>
                          prev.map((it) => (it.id === activeBatchItemId ? { ...it, rotation: newRot } : it))
                        );
                      }
                    }}
                    onUndoRotation={() => {
                      if (previousRotation !== null) {
                        const restored = previousRotation;
                        setPreviousRotation(null);
                        setRotation(restored);
                        if (activeBatchItemId) {
                          setBatchItems((prev) =>
                            prev.map((it) => (it.id === activeBatchItemId ? { ...it, rotation: restored } : it))
                          );
                        }
                      }
                    }}
                    canUndoRotation={previousRotation !== null && previousRotation !== rotation}
                    onApplyRotationToAllBatch={handleApplyRotationToAllBatch}
                  />
                </div>
              </div>
            )}

            {activeStepTab === 'background' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* KOLOM KIRI: HASIL PAS FOTO IJAZAH (LIVE PREVIEW 600 DPI) */}
                <div className="w-full lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24">
                  <HasilPasFotoPanel
                    processedCanvas={processedCanvas}
                    masterCanvas={masterCanvas}
                    printCanvas={printCanvas}
                    rawCroppedCanvas={rawCroppedCanvasRef.current}
                    sourceImage={sourceImage}
                    cropRect={cropRect}
                    rotation={rotation}
                    isProcessingPreview={isProcessingPreview}
                    targetDimension={selectedDimension}
                    mode={photoMode}
                    isLivePreview={true}
                    sizeVariant="large"
                    activePreviewTarget={activePreviewTarget}
                    onSelectPreviewTarget={setActivePreviewTarget}
                    printerProfile={printerCompensation.printerProfile}
                    isPrinterCompensationEnabled={printerCompensation.enabled}
                    diagnosticMode={diagnosticMode}
                    edgeInspectionFocus={edgeInspectionFocus}
                    onSelectEdgeInspectionFocus={setEdgeInspectionFocus}
                    isBrushActive={isBrushActive}
                    brushSettings={brushSettings}
                    onBrushPaint={handleBrushPaint}
                    onBrushStrokeEnd={handleBrushStrokeEnd}
                  />
                </div>

                {/* KOLOM KANAN: GANTI LATAR BELAKANG PAS FOTO */}
                <div className="w-full lg:col-span-7 xl:col-span-7">
                  <BackgroundSelector
                    currentType={bgType}
                    onSelectType={(newType) => {
                      setBgType(newType);
                      if (activeBatchItemId) {
                        setBatchItems((prev) =>
                          prev.map((it) => (it.id === activeBatchItemId ? { ...it, bgType: newType } : it))
                        );
                      }
                    }}
                    customBgImage={customBgImage}
                    onCustomBgUploaded={(img) => {
                      setCustomBgImage(img);
                      setCustomBgPreviewUrl(img ? img.src : null);
                      setBgType('custom');
                      if (activeBatchItemId) {
                        setBatchItems((prev) =>
                          prev.map((it) => (it.id === activeBatchItemId ? { ...it, bgType: 'custom' } : it))
                        );
                      }
                    }}
                    customBgPreviewUrl={customBgPreviewUrl}
                    bgSettings={bgSettings}
                    onUpdateBgSettings={(newSettings) => {
                      setBgSettings(newSettings);
                      if (activeBatchItemId) {
                        setBatchItems((prev) =>
                          prev.map((it) => (it.id === activeBatchItemId ? { ...it, bgSettings: newSettings } : it))
                        );
                      }
                    }}
                    segmentationWarning={segmentationWarning}
                    segmentationConfidence={analysisResult?.background?.segmentationConfidence}
                    detectedBgColor={detectedBgColor}
                    isBatchMode={inputMode === 'batch'}
                    onApplyBackgroundToAllBatch={handleApplyBackgroundToAllBatch}
                    bgRemovalMode={bgRemovalMode}
                    onSelectBgRemovalMode={(newMode) => {
                      setBgRemovalMode(newMode);
                      if (activeBatchItemId) {
                        setBatchItems((prev) =>
                          prev.map((it) => (it.id === activeBatchItemId ? { ...it, bgRemovalMode: newMode } : it))
                        );
                      }
                    }}
                    hasTransparency={Boolean(imageMetadata?.hasTransparency)}
                    onApplyBgRemovalModeToAllBatch={handleApplyBgRemovalModeToAllBatch}
                    diagnosticMode={diagnosticMode}
                    onSelectDiagnosticMode={handleSelectDiagnosticMode}
                    brushSettings={brushSettings}
                    onUpdateBrushSettings={setBrushSettings}
                    isBrushActive={isBrushActive}
                    onToggleBrush={handleToggleBrush}
                    canUndoMask={maskHistory.length > 0}
                    canRedoMask={maskRedoStack.length > 0}
                    onUndoMask={handleUndoMask}
                    onRedoMask={handleRedoMask}
                    onResetMask={handleResetMask}
                    edgeInspectionFocus={edgeInspectionFocus}
                    onSelectEdgeInspectionFocus={setEdgeInspectionFocus}
                  />
                </div>
              </div>
            )}

            {activeStepTab === 'printer' && photoMode === 'bw' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* KOLOM KIRI: HASIL PAS FOTO IJAZAH (LIVE PREVIEW 600 DPI) */}
                <div className="w-full lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24">
                  <HasilPasFotoPanel
                    processedCanvas={processedCanvas}
                    masterCanvas={masterCanvas}
                    printCanvas={printCanvas}
                    rawCroppedCanvas={rawCroppedCanvasRef.current}
                    sourceImage={sourceImage}
                    cropRect={cropRect}
                    rotation={rotation}
                    isProcessingPreview={isProcessingPreview}
                    targetDimension={selectedDimension}
                    mode={photoMode}
                    isLivePreview={true}
                    sizeVariant="large"
                    activePreviewTarget={activePreviewTarget}
                    onSelectPreviewTarget={setActivePreviewTarget}
                    printerProfile={printerCompensation.printerProfile}
                    isPrinterCompensationEnabled={printerCompensation.enabled}
                    diagnosticMode={diagnosticMode}
                  />
                </div>

                {/* KOLOM KANAN: KOMPENSASI CETAK / PRINTER COMPENSATION */}
                <div className="w-full lg:col-span-7 xl:col-span-7">
                  <PrinterCompensationPanel
                    settings={printerCompensation}
                    onChange={(newSettings) => {
                      setPrinterCompensation(newSettings);
                      if (activeBatchItemId) {
                        setBatchItems((prev) =>
                          prev.map((it) =>
                            it.id === activeBatchItemId ? { ...it, printerCompensation: newSettings } : it
                          )
                        );
                      }
                    }}
                    activePreviewTarget={activePreviewTarget}
                    onSelectPreviewTarget={setActivePreviewTarget}
                    isBatchMode={inputMode === 'batch'}
                    onApplyCompensationToAllBatch={handleApplyPrinterCompensationToAllBatch}
                  />
                </div>
              </div>
            )}

            {activeStepTab === 'export' && (
              <ExportPanel
                onExport={handleExport}
                targetDimension={selectedDimension}
                mode={photoMode}
                printerProfile={printerCompensation.printerProfile}
                isPrinterCompensationEnabled={printerCompensation.enabled}
                onOpenPrinterTab={() => setActiveStepTab('printer')}
                isBatchMode={inputMode === 'batch'}
                batchItems={batchItems}
                onExportBatchZip={handleExportBatchZip}
                isExportingBatch={isExportingBatch}
                exportFormat={exportFormat}
                onChangeFormat={setExportFormat}
                exportQuality={exportQuality}
                onChangeQuality={setExportQuality}
              />
            )}

            {/* Studio Guided Step Navigation Strip */}
            <StudioNavigationStrip
              activeStepTab={activeStepTab}
              photoMode={photoMode}
              selectedDimension={selectedDimension}
              isBatchMode={inputMode === 'batch'}
              onNavigate={(tab) => {
                setActiveStepTab(tab);
                studioToolsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">PAS FOTO IJAZAH STUDIO</span>
            <span>•</span>
            <span>Non-Generative Photo Processing Engine</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
            <span>600 DPI Lab Calibration</span>
            <span>•</span>
            <span>ITU-R BT.709 True Grayscale</span>
            <span>•</span>
            <span>Strict Privacy (Ephemeral)</span>
          </div>
        </div>
      </footer>

      {/* Gemini API Key & Model Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        selectedModel={selectedModel}
        onSave={handleSaveApiKey}
        onClear={handleClearApiKey}
      />

      {/* PhotoRoom AI API Key Modal */}
      <PhotoRoomKeyModal
        isOpen={isPhotoRoomModalOpen}
        onClose={() => setIsPhotoRoomModalOpen(false)}
        onKeySaved={(newKey) => setPhotoRoomApiKey(newKey)}
      />

      {/* AI & Local Recommendation Presets Modal (Save, Reuse, Export, Import) */}
      <AIRecommendationPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        initialMode={presetModalMode}
        currentAnalysisResult={analysisMethod === 'gemini' ? geminiAnalysisResult : localAnalysisResult}
        currentAdjustments={adjustments}
        onApplyPresetToActive={handleApplyPresetToActive}
        onApplyPresetToAllBatch={handleApplyPresetToAllBatch}
        isBatchMode={inputMode === 'batch'}
        batchCount={batchItems.length}
      />
    </div>
  );
}
