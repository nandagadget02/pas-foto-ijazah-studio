import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Lock, Sparkles, CheckCircle2, Printer, Eye, Loader2, ScanEye, Contrast, ImageIcon, ZoomIn, SplitSquareVertical } from 'lucide-react';
import { OutputDimension, PhotoMode, PrinterProfile, CropRect, MaskBrushSettings, DiagnosticPreviewMode } from '../types/analysis';

interface HasilPasFotoPanelProps {
  processedCanvas?: HTMLCanvasElement | null;
  masterCanvas?: HTMLCanvasElement | null;
  printCanvas?: HTMLCanvasElement | null;
  rawCroppedCanvas?: HTMLCanvasElement | null;
  sourceImage?: HTMLImageElement | null;
  cropRect?: CropRect | null;
  rotation?: number;
  isProcessingPreview?: boolean;
  targetDimension: OutputDimension;
  mode: PhotoMode;
  isLivePreview?: boolean;
  className?: string;
  sizeVariant?: 'standard' | 'large';
  activePreviewTarget?: 'master' | 'print';
  onSelectPreviewTarget?: (target: 'master' | 'print') => void;
  printerProfile?: PrinterProfile;
  isPrinterCompensationEnabled?: boolean;
  diagnosticMode?: DiagnosticPreviewMode;
  edgeInspectionFocus?: 'fit' | 'hair' | 'ears' | 'collar' | 'shoulders';
  onSelectEdgeInspectionFocus?: (focus: 'fit' | 'hair' | 'ears' | 'collar' | 'shoulders') => void;
  // Kuas Koreksi Manual Mask
  isBrushActive?: boolean;
  brushSettings?: MaskBrushSettings;
  onBrushPaint?: (canvasX: number, canvasY: number) => void;
  onBrushStrokeEnd?: () => void;
}

export const HasilPasFotoPanel: React.FC<HasilPasFotoPanelProps> = ({
  processedCanvas,
  masterCanvas,
  printCanvas,
  rawCroppedCanvas,
  sourceImage,
  cropRect,
  rotation = 0,
  isProcessingPreview = false,
  targetDimension,
  mode,
  isLivePreview = true,
  className = '',
  sizeVariant = 'large',
  activePreviewTarget = 'master',
  onSelectPreviewTarget,
  printerProfile = 'generic',
  isPrinterCompensationEnabled = false,
  diagnosticMode = 'composite',
  edgeInspectionFocus,
  onSelectEdgeInspectionFocus,
  isBrushActive = false,
  brushSettings,
  onBrushPaint,
  onBrushStrokeEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Edge Inspection Focus state (Zoom 220% pada area rambut, telinga, leher/kerah, atau bahu)
  const [internalFocus, setInternalFocus] = useState<'fit' | 'hair' | 'ears' | 'collar' | 'shoulders'>('fit');
  const effectiveFocus = edgeInspectionFocus ?? internalFocus;
  const handleSetFocus = (focus: 'fit' | 'hair' | 'ears' | 'collar' | 'shoulders') => {
    setInternalFocus(focus);
    if (onSelectEdgeInspectionFocus) onSelectEdgeInspectionFocus(focus);
  };

  // State Before/After Peek (Bandingkan foto sebelum refinement vs setelah refinement)
  const [isBeforeActive, setIsBeforeActive] = useState<boolean>(false);

  // Tentukan canvas yang aktif untuk ditampilkan
  const effectiveMasterCanvas = masterCanvas || processedCanvas || null;
  const currentDisplayCanvas =
    isBeforeActive && rawCroppedCanvas
      ? rawCroppedCanvas
      : mode === 'bw' && activePreviewTarget === 'print' && printCanvas
      ? printCanvas
      : effectiveMasterCanvas;

  const hasProcessedCanvas = Boolean(currentDisplayCanvas);
  const hasSourceFallback = Boolean(sourceImage && cropRect);
  const isReadyToDisplay = hasProcessedCanvas || hasSourceFallback;

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isBrushActive || !onBrushPaint) return;
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    if (coords) onBrushPaint(coords.x, coords.y);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isBrushActive || !isDrawingRef.current || !onBrushPaint) return;
    const coords = getCanvasCoords(e);
    if (coords) onBrushPaint(coords.x, coords.y);
  };

  const handlePointerUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (onBrushStrokeEnd) onBrushStrokeEnd();
    }
  };

  // Directly sync active canvas or instant source image to the DOM canvas
  // Instant visual feedback with zero latency
  useEffect(() => {
    const targetCanvas = canvasRef.current;
    if (!targetCanvas) return;

    if (currentDisplayCanvas) {
      targetCanvas.width = currentDisplayCanvas.width;
      targetCanvas.height = currentDisplayCanvas.height;

      const ctx = targetCanvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.drawImage(currentDisplayCanvas, 0, 0);
      }
    } else if (sourceImage && cropRect) {
      // Instant Source Fallback: render source image immediately while filter pipeline processes
      targetCanvas.width = targetDimension.targetWidthPx;
      targetCanvas.height = targetDimension.targetHeightPx;

      const ctx = targetCanvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

        if (rotation !== 0) {
          ctx.save();
          ctx.translate(targetCanvas.width / 2, targetCanvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          const cropCenterX = cropRect.x + cropRect.width / 2;
          const cropCenterY = cropRect.y + cropRect.height / 2;
          ctx.scale(targetCanvas.width / cropRect.width, targetCanvas.height / cropRect.height);
          ctx.drawImage(sourceImage, -cropCenterX, -cropCenterY);
          ctx.restore();
        } else {
          ctx.drawImage(
            sourceImage,
            cropRect.x,
            cropRect.y,
            cropRect.width,
            cropRect.height,
            0,
            0,
            targetCanvas.width,
            targetCanvas.height
          );
        }
      }
    }
  }, [currentDisplayCanvas, sourceImage, cropRect, targetDimension, rotation]);

  // Format label sesuai instruksi Bagian E:
  // "MASTER — TRUE GRAYSCALE" atau "PRINT PREVIEW — EPSON L1210 / GENERIC"
  const printProfileName = printerProfile === 'epson_l1210' ? 'EPSON L1210' : 'GENERIC';
  const previewLabel =
    diagnosticMode === 'mask'
      ? 'DIAGNOSTIK — MASK SUBJEK (B&W)'
      : diagnosticMode === 'overlay'
      ? 'DIAGNOSTIK — OVERLAY MASK'
      : diagnosticMode === 'original'
      ? 'DIAGNOSTIK — FOTO ASLI'
      : mode === 'bw'
      ? activePreviewTarget === 'print'
        ? `PRINT PREVIEW — ${printProfileName}`
        : 'MASTER — TRUE GRAYSCALE'
      : 'FOTO BERWARNA';

  return (
    <div
      className={`bg-slate-950 rounded-2xl p-4 sm:p-5 border border-amber-500/40 shadow-2xl shadow-amber-500/10 flex flex-col items-center justify-between relative backdrop-blur-sm ${className}`}
    >
      {/* Header Info */}
      <div className="w-full flex items-center justify-between text-xs mb-3 px-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            HASIL PAS FOTO IJAZAH
          </span>

          {diagnosticMode === 'mask' ? (
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40 flex items-center gap-1 shadow-sm shadow-cyan-500/20">
              <Contrast className="w-3 h-3 text-cyan-300" />
              MASK SUBJEK (B&W)
            </span>
          ) : diagnosticMode === 'overlay' ? (
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-400/40 flex items-center gap-1 shadow-sm shadow-rose-500/20">
              <ScanEye className="w-3 h-3 text-rose-300" />
              OVERLAY MASK
            </span>
          ) : diagnosticMode === 'original' ? (
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 font-bold border border-slate-700 flex items-center gap-1 shadow-sm">
              <ImageIcon className="w-3 h-3 text-slate-300" />
              FOTO ASLI (CROP)
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 font-bold border border-amber-400/25">
              {previewLabel}
            </span>
          )}

          {isBrushActive && (
            <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 animate-pulse ${
              brushSettings?.mode === 'restore'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-400/40'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              KUAS: {brushSettings?.mode === 'restore' ? 'PULIHKAN SUBJEK' : 'HAPUS LATAR'} ({brushSettings?.size}px)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          {isLivePreview && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE PREVIEW
            </span>
          )}
          <span className="text-emerald-400 font-semibold">
            {targetDimension.name.split(' ')[0]} @ 600 DPI
          </span>
        </div>
      </div>

      {/* Diagnostic Callout Banner saat mode inspeksi aktif */}
      {diagnosticMode && diagnosticMode !== 'composite' && (
        <div className="w-full mb-3 flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-cyan-300">
            <ScanEye className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {diagnosticMode === 'mask' && 'Mode Mask: Putih = Subjek Utuh (100% Solid) • Hitam = Latar Dihapus'}
              {diagnosticMode === 'overlay' && 'Mode Overlay: Area merah transparan = Latar yang dipotong'}
              {diagnosticMode === 'original' && 'Mode Asli: Menampilkan foto sumber hasil crop tanpa masking'}
            </span>
          </div>
          {isBrushActive && (
            <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30 shrink-0">
              Koreksi aktif
            </span>
          )}
        </div>
      )}

      {/* Bagian E: Pilihan [ MASTER ] / [ PRINT PREVIEW ] pada mode B&W (hanya saat composite view) */}
      {mode === 'bw' && onSelectPreviewTarget && diagnosticMode === 'composite' && (
        <div className="w-full mb-3 flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelectPreviewTarget('master')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                activePreviewTarget === 'master'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              [ MASTER ]
            </button>
            <button
              type="button"
              onClick={() => onSelectPreviewTarget('print')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                activePreviewTarget === 'print'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              [ PRINT PREVIEW ]
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 pr-1 hidden sm:block">
            {activePreviewTarget === 'master' ? (
              <span className="text-emerald-400">R = G = B (Netral Murni)</span>
            ) : (
              <span className={isPrinterCompensationEnabled ? 'text-amber-300' : 'text-slate-400'}>
                Kompensasi: {isPrinterCompensationEnabled ? `${printProfileName} (ON)` : 'OFF (Sama dg Master)'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Toolbar Inspeksi Detail Tepi (Zoom 220% & Before/After) */}
      <div className="w-full mb-2.5 flex items-center justify-between gap-1.5 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
          <span className="text-[10px] font-mono text-slate-400 font-semibold px-1 flex items-center gap-1 shrink-0">
            <ZoomIn className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Inspeksi:</span>
          </span>

          <button
            type="button"
            onClick={() => handleSetFocus('fit')}
            className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
              effectiveFocus === 'fit'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Fit (100%)
          </button>
          <button
            type="button"
            onClick={() => handleSetFocus('hair')}
            className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
              effectiveFocus === 'hair'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rambut
          </button>
          <button
            type="button"
            onClick={() => handleSetFocus('ears')}
            className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
              effectiveFocus === 'ears'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Telinga
          </button>
          <button
            type="button"
            onClick={() => handleSetFocus('collar')}
            className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
              effectiveFocus === 'collar'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Kerah
          </button>
          <button
            type="button"
            onClick={() => handleSetFocus('shoulders')}
            className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
              effectiveFocus === 'shoulders'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bahu
          </button>
        </div>

        {/* Before / After Peek Button */}
        {rawCroppedCanvas && (
          <button
            type="button"
            onMouseDown={() => setIsBeforeActive(true)}
            onMouseUp={() => setIsBeforeActive(false)}
            onMouseLeave={() => setIsBeforeActive(false)}
            onTouchStart={() => setIsBeforeActive(true)}
            onTouchEnd={() => setIsBeforeActive(false)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer shrink-0 ${
              isBeforeActive
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Tekan dan tahan untuk melihat foto asli sebelum background removal"
          >
            <SplitSquareVertical className="w-3 h-3 text-amber-400" />
            <span>{isBeforeActive ? 'ASLI (BEFORE)' : 'TAHAN: BANDINGKAN'}</span>
          </button>
        )}
      </div>

      {/* Main Preview Screen - Preserves Aspect Ratio, No Stretch, Clear & Large */}
      <div
        className={`w-full flex items-center justify-center p-3 sm:p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 overflow-hidden relative ${
          sizeVariant === 'large'
            ? 'min-h-[380px] sm:min-h-[460px] max-h-[580px]'
            : 'min-h-[320px] max-h-[440px]'
        }`}
      >
        {isReadyToDisplay ? (
          <>
            <canvas
              ref={canvasRef}
              className={`max-h-[520px] max-w-full object-contain rounded-lg shadow-2xl border border-slate-700/60 ${
                isBrushActive ? 'cursor-crosshair select-none touch-none ring-2 ring-amber-400/50' : ''
              }`}
              style={{
                aspectRatio: `${targetDimension.aspectRatio}`,
                transform:
                  effectiveFocus === 'hair'
                    ? 'scale(2.2) translateY(24%)'
                    : effectiveFocus === 'ears'
                    ? 'scale(2.2) translateY(8%)'
                    : effectiveFocus === 'collar'
                    ? 'scale(2.2) translateY(-10%)'
                    : effectiveFocus === 'shoulders'
                    ? 'scale(2.2) translateY(-26%)'
                    : 'none',
                transformOrigin: 'center center',
                transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />

            {/* Floating indicator status saat Zoom atau Before/After aktif */}
            {isBeforeActive && (
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-rose-950/90 border border-rose-500/50 text-[10px] font-mono text-rose-200 flex items-center gap-1.5 shadow-lg backdrop-blur-sm z-20 animate-fadeIn">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <span>SEBELUM REFINEMENT (FOTO ASLI)</span>
              </div>
            )}
            {!isBeforeActive && effectiveFocus !== 'fit' && (
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/90 border border-amber-400/40 text-[10px] font-mono text-amber-300 flex items-center gap-1.5 shadow-lg backdrop-blur-sm z-20 animate-fadeIn">
                <ZoomIn className="w-3 h-3 text-amber-400" />
                <span>ZOOM 220% — {effectiveFocus.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => handleSetFocus('fit')}
                  className="ml-1 text-[9px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Reset Fit
                </button>
              </div>
            )}

            {/* Non-blocking subtle badge jika sedang menyempurnakan filter */}
            {(!hasProcessedCanvas || isProcessingPreview) && (
              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-slate-950/85 border border-amber-400/30 text-[10px] font-mono text-amber-300 flex items-center gap-1.5 shadow-lg backdrop-blur-sm z-10 animate-fadeIn">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
                <span>Menyempurnakan piksel...</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 gap-2 py-12">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
            <span className="text-xs font-mono">Membaca file foto...</span>
          </div>
        )}
      </div>

      {/* Footer Info & Verification Badges */}
      <div className="w-full mt-3 pt-2.5 border-t border-slate-800/90 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-1.5 font-mono">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">
            Target: {targetDimension.targetWidthPx} × {targetDimension.targetHeightPx} px
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">
            {targetDimension.widthCm} × {targetDimension.heightCm} cm
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Non-Generative Corrected</span>
        </div>
      </div>
    </div>
  );
};
