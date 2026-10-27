import React, { useState } from 'react';
import {
  Scissors,
  Printer,
  Maximize2,
  AlertTriangle,
  Check,
  RotateCcw,
  RotateCw,
  Sparkles,
  ZoomIn,
  ArrowUpDown,
  Frame,
  Square,
  Layers,
  CheckCircle2,
  Sliders,
  Compass,
  Undo2,
} from 'lucide-react';
import {
  OutputDimension,
  CropRect,
  ImageMetadata,
  FramingSettings,
  DEFAULT_FRAMING_SETTINGS,
} from '../types/analysis';
import {
  STANDARD_OUTPUT_DIMENSIONS,
  CropEngine,
} from '../image/CropEngine';

interface DimensionAndCropProps {
  selectedDimension: OutputDimension;
  onSelectDimension: (dim: OutputDimension) => void;
  cropRect: CropRect;
  onChangeCropRect: (crop: CropRect) => void;
  imageMetadata: ImageMetadata | null;
  cropWarning?: string | null;
  framingSettings?: FramingSettings;
  onChangeFramingSettings?: (settings: FramingSettings) => void;
  isBatchMode?: boolean;
  onApplyFramingToAllBatch?: () => void;
  onApplyDimensionToAllBatch?: () => void;
  // Rotasi / Luruskan Foto
  rotation?: number;
  onChangeRotation?: (rotation: number) => void;
  onUndoRotation?: () => void;
  canUndoRotation?: boolean;
  onApplyRotationToAllBatch?: () => void;
}

export const DimensionAndCrop: React.FC<DimensionAndCropProps> = ({
  selectedDimension,
  onSelectDimension,
  cropRect,
  onChangeCropRect,
  imageMetadata,
  cropWarning,
  framingSettings = DEFAULT_FRAMING_SETTINGS,
  onChangeFramingSettings,
  isBatchMode = false,
  onApplyFramingToAllBatch,
  onApplyDimensionToAllBatch,
  rotation = 0,
  onChangeRotation,
  onUndoRotation,
  canUndoRotation = false,
  onApplyRotationToAllBatch,
}) => {
  const [customWidth, setCustomWidth] = useState<number>(3.5);
  const [customHeight, setCustomHeight] = useState<number>(4.5);
  const [customDpi, setCustomDpi] = useState<number>(600);
  const [batchToast, setBatchToast] = useState<string | null>(null);

  const handleCustomApply = () => {
    if (customWidth > 0 && customHeight > 0) {
      const customDim = CropEngine.createCustomDimension(
        customWidth,
        customHeight,
        customDpi
      );
      onSelectDimension(customDim);

      if (imageMetadata) {
        const newCrop = CropEngine.getInitialCropRect(
          imageMetadata.width,
          imageMetadata.height,
          customDim.aspectRatio
        );
        onChangeCropRect(newCrop);
      }
    }
  };

  // --- HANDLERS UNTUK FITUR ROTASI / LURUSKAN FOTO ---
  const handleSetRotation = (val: number) => {
    if (!onChangeRotation) return;
    const clamped = Math.max(-180, Math.min(180, Math.round(val * 10) / 10));
    onChangeRotation(clamped);
  };

  const handleStepRotation = (delta: number) => {
    handleSetRotation(rotation + delta);
  };

  const handleResetRotation = () => {
    handleSetRotation(0);
  };

  const handleBatchApplyRotation = () => {
    if (onApplyRotationToAllBatch) {
      onApplyRotationToAllBatch();
      setBatchToast(`Sudut rotasi (${rotation > 0 ? '+' : ''}${rotation.toFixed(1)}°) diterapkan ke semua foto batch!`);
      setTimeout(() => setBatchToast(null), 3000);
    }
  };

  const handleSelectPreset = (dim: OutputDimension) => {
    onSelectDimension(dim);
    if (imageMetadata) {
      const newCrop = CropEngine.getInitialCropRect(
        imageMetadata.width,
        imageMetadata.height,
        dim.aspectRatio
      );
      onChangeCropRect(newCrop);
    }
  };

  // Adjust crop position controls (pan & scale)
  const adjustCrop = (deltaX: number, deltaY: number, scaleFactor: number) => {
    if (!imageMetadata) return;

    let newWidth = cropRect.width * scaleFactor;
    let newHeight = newWidth / selectedDimension.aspectRatio;

    // Bounds limit
    if (newWidth > imageMetadata.width) {
      newWidth = imageMetadata.width;
      newHeight = newWidth / selectedDimension.aspectRatio;
    }
    if (newHeight > imageMetadata.height) {
      newHeight = imageMetadata.height;
      newWidth = newHeight * selectedDimension.aspectRatio;
    }

    let newX = cropRect.x + deltaX;
    let newY = cropRect.y + deltaY;

    // Constrain to image boundaries
    newX = Math.max(0, Math.min(imageMetadata.width - newWidth, newX));
    newY = Math.max(0, Math.min(imageMetadata.height - newHeight, newY));

    onChangeCropRect({
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    });
  };

  const resetCropToCenter = () => {
    if (!imageMetadata) return;
    const centerCrop = CropEngine.getInitialCropRect(
      imageMetadata.width,
      imageMetadata.height,
      selectedDimension.aspectRatio
    );
    onChangeCropRect(centerCrop);
  };

  // --- HANDLERS UNTUK FITUR FRAMING SESUAI REFERENSI ---
  const handleUpdateFaceZoom = (enabled: boolean, percent: number) => {
    if (!onChangeFramingSettings) return;
    const updated = {
      ...framingSettings,
      faceZoomEnabled: enabled,
      faceZoomPercent: percent,
    };
    onChangeFramingSettings(updated);

    if (imageMetadata) {
      const newCrop = CropEngine.calculateFramingCrop(
        imageMetadata.width,
        imageMetadata.height,
        selectedDimension,
        cropRect,
        enabled,
        percent,
        framingSettings.headroomEnabled,
        framingSettings.headroomMm
      );
      onChangeCropRect(newCrop);
    }
  };

  const handleUpdateHeadroom = (enabled: boolean, mm: number) => {
    if (!onChangeFramingSettings) return;
    const updated = {
      ...framingSettings,
      headroomEnabled: enabled,
      headroomMm: mm,
    };
    onChangeFramingSettings(updated);

    if (imageMetadata) {
      const newCrop = CropEngine.calculateFramingCrop(
        imageMetadata.width,
        imageMetadata.height,
        selectedDimension,
        cropRect,
        framingSettings.faceZoomEnabled,
        framingSettings.faceZoomPercent,
        enabled,
        mm
      );
      onChangeCropRect(newCrop);
    }
  };

  const handleUpdateInnerBorder = (enabled: boolean, widthMm: number) => {
    if (!onChangeFramingSettings) return;
    onChangeFramingSettings({
      ...framingSettings,
      innerBorderEnabled: enabled,
      innerBorderWidthMm: widthMm,
    });
  };

  const handleUpdateOuterCutLine = (
    enabled: boolean,
    widthMm: number,
    opacity: number
  ) => {
    if (!onChangeFramingSettings) return;
    onChangeFramingSettings({
      ...framingSettings,
      outerCutLineEnabled: enabled,
      outerCutLineWidthMm: widthMm,
      outerCutLineOpacity: opacity,
    });
  };

  const handleToggleRenderLinesOnExport = (enabled: boolean) => {
    if (!onChangeFramingSettings) return;
    onChangeFramingSettings({
      ...framingSettings,
      renderLinesOnExport: enabled,
    });
  };

  const handleBatchApply = () => {
    if (onApplyFramingToAllBatch) {
      onApplyFramingToAllBatch();
    }
    if (onApplyDimensionToAllBatch) {
      onApplyDimensionToAllBatch();
    }
    setBatchToast('✓ Ukuran, Framing & Garis berhasil diterapkan ke semua foto batch!');
    setTimeout(() => setBatchToast(null), 3500);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-7">
      {/* 1. Header Standar Cetak 600 DPI */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono font-semibold tracking-wider uppercase text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
            Standar Cetak 600 DPI
          </span>
          <h3 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            Ukuran Output & Komposisi Pas Foto
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Dihitung presisi rumus: <code className="text-amber-300 font-mono">pixel = (cm / 2.54) × 600 DPI</code>.
            Tanpa distorsi atau peregangan wajah.
          </p>
        </div>

        {/* Current resolution badge */}
        <div className="text-right">
          <div className="text-xs text-slate-400 font-mono">Resolusi Fisik:</div>
          <div className="text-sm font-bold text-emerald-400 font-mono">
            {selectedDimension.targetWidthPx} × {selectedDimension.targetHeightPx} px
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            @{selectedDimension.dpi} DPI (Presisi Laboratorium)
          </div>
        </div>
      </div>

      {/* Warning if crop cuts head or shoulders */}
      {cropWarning && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200">
            <strong className="text-amber-300 font-semibold block mb-0.5">
              Peringatan Komposisi Framing
            </strong>
            {cropWarning} Silakan gunakan tombol pergeseran framing di bawah untuk
            menaikkan atau melebarkan kotak crop.
          </div>
        </div>
      )}

      {/* 2. Preset Categories */}
      <div className="space-y-5">
        {/* Pas Foto Standar */}
        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
            Pas Foto Standar Ijazah & Dokumen Resmi
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STANDARD_OUTPUT_DIMENSIONS.filter((d) => d.category === 'pas_foto').map((dim) => {
              const isSelected = selectedDimension.id === dim.id;
              const isIjazahDefault = dim.id === '3x4';

              return (
                <button
                  type="button"
                  key={dim.id}
                  onClick={() => handleSelectPreset(dim)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  {isIjazahDefault && (
                    <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-bold tracking-tight">
                      STANDAR UTAMA
                    </span>
                  )}
                  <div className="text-sm font-bold text-white">{dim.name}</div>
                  <div className="text-xs font-mono text-amber-400/90 mt-1">
                    {dim.targetWidthPx} × {dim.targetHeightPx} px
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {dim.widthCm} × {dim.heightCm} cm @ 600 DPI
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cetak Foto Standar */}
        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
            Format Cetak & Pos Card
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {STANDARD_OUTPUT_DIMENSIONS.filter((d) => d.category === 'cetak').map((dim) => {
              const isSelected = selectedDimension.id === dim.id;

              return (
                <button
                  type="button"
                  key={dim.id}
                  onClick={() => handleSelectPreset(dim)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="text-sm font-bold text-white">{dim.name}</div>
                  <div className="text-xs font-mono text-amber-400/90 mt-1">
                    {dim.targetWidthPx} × {dim.targetHeightPx} px
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {dim.widthCm} × {dim.heightCm} cm @ 600 DPI
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Dimensions Form */}
        <div className="pt-3 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
            Ukuran Kustom (Manual)
          </h4>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Lebar (cm):</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="50"
                value={customWidth}
                onChange={(e) => setCustomWidth(parseFloat(e.target.value) || 1)}
                className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-white text-center focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Tinggi (cm):</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="50"
                value={customHeight}
                onChange={(e) => setCustomHeight(parseFloat(e.target.value) || 1)}
                className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-white text-center focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">DPI:</label>
              <input
                type="number"
                step="50"
                min="150"
                max="1200"
                value={customDpi}
                onChange={(e) => setCustomDpi(parseInt(e.target.value) || 600)}
                className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-white text-center focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="button"
              onClick={handleCustomApply}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              Terapkan Ukuran Kustom
            </button>
          </div>
        </div>
      </div>

      {/* 3. KONTROL FRAMING & PANDUAN GARIS SESUAI REFERENSI */}
      <div className="pt-5 border-t border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20">
                PANDUAN FRAMING & GARIS POTONG
              </span>
            </div>
            <h4 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Garis Putih (Inner), Garis Hitam (Outer), Zoom Wajah & Headroom
            </h4>
          </div>

          {/* Toast Notification Batch */}
          {batchToast && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{batchToast}</span>
            </div>
          )}
        </div>

        {/* 4 CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CARD 1: GARIS PUTIH (INNER) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Square className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Garis Putih (Inner)
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleUpdateInnerBorder(!framingSettings.innerBorderEnabled, framingSettings.innerBorderWidthMm)
                }
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  framingSettings.innerBorderEnabled
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {framingSettings.innerBorderEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Lebar Border:</span>
                <span className="font-mono text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-[11px]">
                  {framingSettings.innerBorderWidthMm.toFixed(1)} mm
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="5.0"
                step="0.1"
                disabled={!framingSettings.innerBorderEnabled}
                value={framingSettings.innerBorderWidthMm}
                onChange={(e) => handleUpdateInnerBorder(true, parseFloat(e.target.value) || 1.0)}
                className={`w-full accent-amber-400 cursor-pointer ${
                  !framingSettings.innerBorderEnabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-500 font-mono">Preset:</span>
              {[0.5, 1.0, 1.5, 2.0].map((presetMm) => {
                const isActive =
                  framingSettings.innerBorderEnabled &&
                  Math.abs(framingSettings.innerBorderWidthMm - presetMm) < 0.05;
                return (
                  <button
                    key={presetMm}
                    type="button"
                    onClick={() => handleUpdateInnerBorder(true, presetMm)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {presetMm === 1.0 ? '1,0 mm (Std)' : `${presetMm.toFixed(1)} mm`}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Panduan visual border putih bagian dalam foto. Tidak merusak foto sumber.
            </p>
          </div>

          {/* CARD 2: GARIS HITAM (OUTER) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Garis Hitam (Outer)
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleUpdateOuterCutLine(
                    !framingSettings.outerCutLineEnabled,
                    framingSettings.outerCutLineWidthMm,
                    framingSettings.outerCutLineOpacity
                  )
                }
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  framingSettings.outerCutLineEnabled
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {framingSettings.outerCutLineEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Slider 1: Garis Potong (mm) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Garis Potong:</span>
                <span className="font-mono text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-[11px]">
                  {framingSettings.outerCutLineWidthMm.toFixed(2)} mm
                </span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.40"
                step="0.01"
                disabled={!framingSettings.outerCutLineEnabled}
                value={framingSettings.outerCutLineWidthMm}
                onChange={(e) =>
                  handleUpdateOuterCutLine(
                    true,
                    parseFloat(e.target.value) || 0.01,
                    framingSettings.outerCutLineOpacity
                  )
                }
                className={`w-full accent-amber-400 cursor-pointer ${
                  !framingSettings.outerCutLineEnabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              />
            </div>

            {/* Slider 2: Opacity Garis (%) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Opacity Garis:</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {framingSettings.outerCutLineOpacity}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                disabled={!framingSettings.outerCutLineEnabled}
                value={framingSettings.outerCutLineOpacity}
                onChange={(e) =>
                  handleUpdateOuterCutLine(
                    true,
                    framingSettings.outerCutLineWidthMm,
                    parseInt(e.target.value, 10) || 100
                  )
                }
                className={`w-full accent-amber-400 cursor-pointer ${
                  !framingSettings.outerCutLineEnabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-slate-500 font-mono">Preset:</span>
              {[0.01, 0.04, 0.08, 0.15].map((presetMm) => {
                const isActive =
                  framingSettings.outerCutLineEnabled &&
                  Math.abs(framingSettings.outerCutLineWidthMm - presetMm) < 0.005;
                return (
                  <button
                    key={presetMm}
                    type="button"
                    onClick={() =>
                      handleUpdateOuterCutLine(true, presetMm, framingSettings.outerCutLineOpacity)
                    }
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {presetMm === 0.01 ? '0,01 mm (Std)' : `${presetMm.toFixed(2)} mm`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CARD 3: SKALA ZOOM WAJAH */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ZoomIn className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Skala Zoom Wajah
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleUpdateFaceZoom(!framingSettings.faceZoomEnabled, framingSettings.faceZoomPercent)
                }
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  framingSettings.faceZoomEnabled
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {framingSettings.faceZoomEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Face-Centric Framing:</span>
                <span className="font-mono text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-[11px]">
                  {framingSettings.faceZoomPercent}%
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="70"
                step="1"
                disabled={!framingSettings.faceZoomEnabled}
                value={framingSettings.faceZoomPercent}
                onChange={(e) => handleUpdateFaceZoom(true, parseInt(e.target.value, 10) || 36)}
                className={`w-full accent-amber-400 cursor-pointer ${
                  !framingSettings.faceZoomEnabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              />
            </div>

            {/* Quick Presets: 36%, 40%, 45%, 50%, 60% */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-500 font-mono">Preset:</span>
              {[36, 40, 45, 50, 60].map((presetPct) => {
                const isActive =
                  framingSettings.faceZoomEnabled && framingSettings.faceZoomPercent === presetPct;
                return (
                  <button
                    key={presetPct}
                    type="button"
                    onClick={() => handleUpdateFaceZoom(true, presetPct)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {presetPct}%
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Mengatur proporsi tinggi wajah terhadap foto. Tanpa meregangkan atau mendistorsi bentuk tubuh.
            </p>
          </div>

          {/* CARD 4: TOP MARGIN (HEADROOM) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Top Margin (Headroom)
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleUpdateHeadroom(!framingSettings.headroomEnabled, framingSettings.headroomMm)
                }
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  framingSettings.headroomEnabled
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {framingSettings.headroomEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Jarak Rambut ke Atas:</span>
                <span className="font-mono text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-[11px]">
                  {framingSettings.headroomMm.toFixed(1)} mm
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="20"
                step="0.5"
                disabled={!framingSettings.headroomEnabled}
                value={framingSettings.headroomMm}
                onChange={(e) => handleUpdateHeadroom(true, parseFloat(e.target.value) || 15)}
                className={`w-full accent-amber-400 cursor-pointer ${
                  !framingSettings.headroomEnabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              />
            </div>

            {/* Quick Presets: 8mm, 10mm, 12mm (Standar), 15mm */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-500 font-mono">Preset:</span>
              {[8, 10, 12, 15].map((presetMm) => {
                const isActive =
                  framingSettings.headroomEnabled &&
                  Math.abs(framingSettings.headroomMm - presetMm) < 0.1;
                return (
                  <button
                    key={presetMm}
                    type="button"
                    onClick={() => handleUpdateHeadroom(true, presetMm)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {presetMm === 12 ? '12 mm (Std)' : `${presetMm} mm`}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Menjaga jarak aman antara puncak kepala/rambut/hijab terhadap batas atas foto agar tidak terpotong.
            </p>
          </div>
        </div>

        {/* Options Bar: Export Toggle & Batch Sync */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
            <input
              type="checkbox"
              checked={framingSettings.renderLinesOnExport !== false}
              onChange={(e) => handleToggleRenderLinesOnExport(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
            />
            <span>Cetak garis border putih & garis potong pada hasil ekspor 600 DPI</span>
          </label>

          {isBatchMode && (
            <button
              type="button"
              onClick={handleBatchApply}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              Terapkan Framing & Garis ke Semua Foto Batch
            </button>
          )}
        </div>
      </div>

      {/* 4. ROTASI & LURUSKAN FOTO (NON-DESTRUCTIVE CROP-CENTRIC ROTATION) */}
      <div className="pt-5 border-t border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20">
                ROTASI & LURUSKAN FOTO
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                −180° s/d +180°
              </span>
            </div>
            <h4 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              Luruskan Sudut Kemiringan Foto & Subjek
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Putar atau luruskan kemiringan foto/kepala secara presisi tanpa distorsi, tanpa memotong subjek secara merusak, dan menjaga proporsi asli pas foto.
            </p>
          </div>

          {/* Active angle indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Sudut Aktif:</span>
            <div className={`px-3 py-1 rounded-lg font-mono font-black text-sm border flex items-center gap-1 shadow-sm ${
              rotation !== 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-amber-500/10'
                : 'bg-slate-800/60 text-slate-300 border-slate-700/60'
            }`}>
              {rotation > 0 ? `+${rotation.toFixed(1)}°` : `${rotation.toFixed(1)}°`}
            </div>
          </div>
        </div>

        {/* Card Kontrol Rotasi */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
          {/* Slider & Precision Number Input */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-9 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Slider Sudut Presisi:</span>
                <span className="font-mono text-slate-500 text-[10px]">-180° ← 0° (Netral) → +180°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="0.1"
                value={rotation}
                onChange={(e) => handleSetRotation(parseFloat(e.target.value) || 0)}
                className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            {/* Precision Input */}
            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs text-slate-400 block">Ketik Sudut (°):</label>
              <div className="relative">
                <input
                  type="number"
                  min="-180"
                  max="180"
                  step="0.1"
                  value={rotation}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    handleSetRotation(isNaN(parsed) ? 0 : parsed);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-right pr-6 focus:outline-none"
                />
                <span className="absolute right-2.5 top-1.5 text-slate-400 text-xs font-mono pointer-events-none">°</span>
              </div>
            </div>
          </div>

          {/* Quick Buttons Toolbar: Quick Turns, Micro-adjust, Reset, Undo */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
            {/* Quick 90 deg buttons & Micro Adjust */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStepRotation(-90)}
                title="Putar 90° berlawanan arah jarum jam"
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                -90° (Kiri)
              </button>

              <button
                type="button"
                onClick={() => handleStepRotation(90)}
                title="Putar 90° searah jarum jam"
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                +90° (Kanan)
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

              {/* Micro-adjustments */}
              <button
                type="button"
                onClick={() => handleStepRotation(-1.0)}
                title="Luruskan −1.0°"
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-mono transition-colors cursor-pointer"
              >
                −1,0°
              </button>

              <button
                type="button"
                onClick={() => handleStepRotation(-0.1)}
                title="Luruskan halus −0.1°"
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 hover:border-slate-700 text-xs font-mono font-semibold transition-colors cursor-pointer"
              >
                −0,1°
              </button>

              <button
                type="button"
                onClick={() => handleStepRotation(0.1)}
                title="Luruskan halus +0.1°"
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 hover:border-slate-700 text-xs font-mono font-semibold transition-colors cursor-pointer"
              >
                +0,1°
              </button>

              <button
                type="button"
                onClick={() => handleStepRotation(1.0)}
                title="Luruskan +1.0°"
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-mono transition-colors cursor-pointer"
              >
                +1,0°
              </button>
            </div>

            {/* Action buttons: Reset & Undo */}
            <div className="flex items-center gap-1.5 ml-auto">
              {canUndoRotation && onUndoRotation && (
                <button
                  type="button"
                  onClick={onUndoRotation}
                  title="Batalkan perubahan sudut terakhir"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Urungkan
                </button>
              )}

              <button
                type="button"
                onClick={handleResetRotation}
                disabled={rotation === 0}
                title="Reset sudut rotasi ke 0° (tegak lurus netral)"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  rotation !== 0
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    : 'bg-slate-900/60 text-slate-500 border border-slate-800/80 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset (0°)
              </button>
            </div>
          </div>

          {/* Batch Mode Sync Toolbar */}
          {isBatchMode && onApplyRotationToAllBatch && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40 p-2.5 rounded-lg">
              <span className="text-[11px] text-slate-400">
                Samakan sudut rotasi ({rotation > 0 ? `+${rotation.toFixed(1)}°` : `${rotation.toFixed(1)}°`}) ke seluruh antrean foto batch:
              </span>
              <button
                type="button"
                onClick={handleBatchApplyRotation}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Layers className="w-3.5 h-3.5" />
                Terapkan Sudut Rotasi ke Semua Foto Batch
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Fine-Tuning Framing & Crop Position Controller */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Scissors className="w-4 h-4 text-amber-400" />
          <span>Geser Manual Posisi Framing Foto:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => adjustCrop(0, -25, 1)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            ▲ Naik
          </button>
          <button
            type="button"
            onClick={() => adjustCrop(0, 25, 1)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            ▼ Turun
          </button>
          <button
            type="button"
            onClick={() => adjustCrop(-25, 0, 1)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            ◀ Kiri
          </button>
          <button
            type="button"
            onClick={() => adjustCrop(25, 0, 1)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            ▶ Kanan
          </button>
          <button
            type="button"
            onClick={() => adjustCrop(0, 0, 0.95)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 border border-slate-700 transition-colors cursor-pointer"
          >
            Zoom In (+)
          </button>
          <button
            type="button"
            onClick={() => adjustCrop(0, 0, 1.05)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 border border-slate-700 transition-colors cursor-pointer"
          >
            Zoom Out (-)
          </button>
          <button
            type="button"
            onClick={resetCropToCenter}
            title="Reset ke posisi tengah pas foto"
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>
    </div>
  );
};
