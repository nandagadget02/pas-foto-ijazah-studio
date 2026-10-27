import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Split,
  Columns,
  Eye,
  Info,
  Maximize2,
  Lock,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BackgroundType, ImageMetadata, OutputDimension, PrinterProfile, CropRect } from '../types/analysis';
import { HasilPasFotoPanel } from './HasilPasFotoPanel';

interface ComparisonViewerProps {
  originalImage: HTMLImageElement | null;
  processedCanvas: HTMLCanvasElement | null;
  masterCanvas?: HTMLCanvasElement | null;
  printCanvas?: HTMLCanvasElement | null;
  cropRect?: CropRect | null;
  imageMetadata: ImageMetadata | null;
  targetDimension: OutputDimension;
  mode: 'bw' | 'color';
  backgroundType?: BackgroundType;
  onOpenBackgroundTab?: () => void;
  activePreviewTarget?: 'master' | 'print';
  onSelectPreviewTarget?: (target: 'master' | 'print') => void;
  printerProfile?: PrinterProfile;
  isPrinterCompensationEnabled?: boolean;
  activePhotoLabel?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  originalImage,
  processedCanvas,
  masterCanvas,
  printCanvas,
  cropRect,
  imageMetadata,
  targetDimension,
  mode,
  backgroundType = 'preserve',
  onOpenBackgroundTab,
  activePreviewTarget = 'master',
  onSelectPreviewTarget,
  printerProfile = 'generic',
  isPrinterCompensationEnabled = false,
  activePhotoLabel,
  isExpanded: controlledExpanded,
  onToggleExpand,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'side_by_side'>('side_by_side');
  const [mobileTab, setMobileTab] = useState<'original' | 'result'>('result');
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0 to 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [internalExpanded, setInternalExpanded] = useState<boolean>(false); // Default: ringkas / collapsed
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpanded = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const effectiveCanvas =
    mode === 'bw' && activePreviewTarget === 'print' && printCanvas
      ? printCanvas
      : masterCanvas || processedCanvas;

  // Drag interaction for split view slider
  const handleMouseDown = () => setIsDragging(true);
  const handleTouchStart = () => setIsDragging(true);

  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isDragging || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
      setSliderPosition(pct);
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) handleMove(e.touches[0].clientX);
    };

    const handleUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);

  const processedDataUrl = effectiveCanvas ? effectiveCanvas.toDataURL('image/png') : null;

  // 1. MODE RINGKAS (COLLAPSED STATE)
  if (!isExpanded) {
    return (
      <div
        onClick={toggleExpanded}
        className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 select-none"
        title="Klik untuk membuka komparasi Before / After"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Eye className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Before / After
            </h3>
            <span className="text-slate-600 font-bold">·</span>
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md shrink-0">
              {activePhotoLabel || 'Foto Aktif'}
            </span>
            <span className="text-slate-600 hidden sm:inline font-bold">·</span>
            <span className="text-xs text-slate-400 hidden sm:inline truncate group-hover:text-slate-300 transition-colors">
              Klik untuk membandingkan
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Lock className="w-3 h-3" /> Subject Lock
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="hidden xs:inline text-[11px]">Buka</span>
            <ChevronDown className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>
    );
  }

  // 2. MODE PERBANDINGAN PENUH (EXPANDED STATE)
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-sm transition-all">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Before / After
              </h3>
              <span className="text-xs font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md">
                {activePhotoLabel || 'Foto Aktif'}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Lock className="w-3 h-3" /> Absolute Subject Lock
              </span>
              {backgroundType !== 'preserve' && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Layers className="w-3 h-3 text-amber-400" />
                  Latar Baru: {backgroundType === 'custom' ? 'Foto Unggahan' : backgroundType === 'red' ? 'Merah Ijazah' : backgroundType === 'blue' ? 'Biru Ijazah' : backgroundType === 'white' ? 'Putih Bersih' : backgroundType}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluasi kejelasan midtone wajah, hilangnya color cast, dan ketajaman tekstur jas/hijab.
            </p>
          </div>
        </div>

        {/* View Toggle Buttons and Quick Background Action */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onOpenBackgroundTab && (
            <button
              type="button"
              onClick={onOpenBackgroundTab}
              className="hidden md:flex px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-400/30 hover:border-amber-400/50 text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              {backgroundType === 'preserve' ? 'Ganti Latar Foto' : 'Edit Latar'}
            </button>
          )}
          {/* Mobile Tab switch */}
          <div className="flex sm:hidden p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setMobileTab('original')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mobileTab === 'original'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Original
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('result')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mobileTab === 'result'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hasil Ijazah
            </button>
          </div>

          {/* Desktop View Modes */}
          <div className="hidden sm:flex p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('side_by_side')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'side_by_side'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" /> Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Split className="w-3.5 h-3.5" /> Interactive Slider
            </button>
          </div>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={toggleExpanded}
            title="Ciutkan Panel Komparasi"
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">Tutup</span>
            <ChevronUp className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Main Comparison Stage */}
      <div className="relative">
        {/* DESKTOP SIDE BY SIDE */}
        <div className="hidden sm:block">
          {viewMode === 'side_by_side' ? (
            <div className="grid grid-cols-2 gap-6">
              {/* ORIGINAL */}
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
                  <span className="font-semibold uppercase tracking-wider text-slate-400">
                    FOTO ORIGINAL (SOURCE OF TRUTH)
                  </span>
                  <span className="font-mono text-[11px]">
                    {imageMetadata?.width} × {imageMetadata?.height} px
                  </span>
                </div>

                <div className="w-full flex items-center justify-center p-3 rounded-lg bg-slate-900/60 min-h-[360px] max-h-[460px] overflow-hidden">
                  {originalImage && (
                    <img
                      src={originalImage.src}
                      alt="Original"
                      className="max-h-[420px] max-w-full object-contain rounded shadow-lg"
                    />
                  )}
                </div>

                <div className="w-full mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between font-mono">
                  <span>Format: {imageMetadata?.format}</span>
                  <span>
                    Size:{' '}
                    {imageMetadata?.sizeBytes
                      ? (imageMetadata.sizeBytes / 1024).toFixed(1)
                      : 0}{' '}
                    KB
                  </span>
                </div>
              </div>

              {/* RESULT */}
              <div className="flex flex-col">
                <HasilPasFotoPanel
                  processedCanvas={processedCanvas}
                  masterCanvas={masterCanvas}
                  printCanvas={printCanvas}
                  sourceImage={originalImage}
                  cropRect={cropRect}
                  targetDimension={targetDimension}
                  mode={mode}
                  isLivePreview={false}
                  sizeVariant="standard"
                  className="w-full h-full"
                  activePreviewTarget={activePreviewTarget}
                  onSelectPreviewTarget={onSelectPreviewTarget}
                  printerProfile={printerProfile}
                  isPrinterCompensationEnabled={isPrinterCompensationEnabled}
                />
              </div>
            </div>
          ) : (
            /* INTERACTIVE SPLIT SLIDER VIEW */
            <div
              ref={splitContainerRef}
              className="relative w-full h-[460px] rounded-xl overflow-hidden select-none bg-slate-950 border border-slate-800 flex items-center justify-center cursor-ew-resize"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Processed (After) Image - Background layer */}
              {processedDataUrl && (
                <img
                  src={processedDataUrl}
                  alt="After"
                  className="absolute inset-0 w-full h-full object-contain p-4"
                />
              )}

              {/* Original (Before) Image - Clipped layer */}
              {originalImage && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={originalImage.src}
                    alt="Before"
                    className="absolute inset-0 w-full h-full object-contain p-4 max-w-none"
                    style={{
                      width: splitContainerRef.current?.clientWidth || '100%',
                    }}
                  />
                  {/* Left Label */}
                  <div className="absolute top-4 left-4 bg-slate-900/90 text-slate-300 text-xs font-mono font-semibold px-2.5 py-1 rounded shadow-md border border-slate-700">
                    ORIGINAL
                  </div>
                </div>
              )}

              {/* Right Label */}
              <div className="absolute top-4 right-4 bg-amber-500 text-slate-950 text-xs font-mono font-bold px-2.5 py-1 rounded shadow-md">
                {mode === 'bw' && activePreviewTarget === 'print'
                  ? `PRINT PREVIEW (${printerProfile === 'epson_l1210' ? 'EPSON L1210' : 'GENERIC'})`
                  : 'HASIL IJAZAH (600 DPI)'}
              </div>

              {/* Split Line Divider */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] z-20 pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg border-2 border-slate-900">
                  <Split className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MOBILE VIEW (Tabbed & Swipe) */}
        <div className="block sm:hidden">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
              <span className="font-semibold uppercase tracking-wider text-amber-400">
                {mobileTab === 'original' ? 'FOTO ORIGINAL' : 'HASIL IJAZAH'}
              </span>
              <span className="font-mono text-[11px]">
                {mobileTab === 'original'
                  ? `${imageMetadata?.width} × ${imageMetadata?.height} px`
                  : `${targetDimension.targetWidthPx} × ${targetDimension.targetHeightPx} px`}
              </span>
            </div>

            <div className="w-full flex items-center justify-center p-2 rounded-lg bg-slate-900/60 min-h-[340px] overflow-hidden">
              {mobileTab === 'original' && originalImage && (
                <img
                  src={originalImage.src}
                  alt="Original Mobile"
                  className="max-h-[340px] max-w-full object-contain rounded"
                />
              )}
              {mobileTab === 'result' && processedDataUrl && (
                <img
                  src={processedDataUrl}
                  alt="Result Mobile"
                  className="max-h-[340px] max-w-full object-contain rounded"
                />
              )}
            </div>

            <div className="w-full mt-3 text-center text-xs text-slate-400">
              Gunakan tab <strong className="text-amber-300">Original | Hasil</strong> di atas untuk berpindah tampilan.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
