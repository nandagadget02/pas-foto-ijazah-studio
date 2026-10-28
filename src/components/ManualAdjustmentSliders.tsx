import React from 'react';
import {
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Sun,
  Eye,
  Layers,
  Check,
  UserCheck,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Key,
  Copy,
  ChevronDown,
  ChevronUp,
  Loader2,
  Undo2,
  Bookmark,
  BookmarkPlus,
  ScanFace,
} from 'lucide-react';
import {
  AdjustmentParams,
  AnalysisMethod,
  DEFAULT_FACE_SHARPEN_SETTINGS,
  EditTargetMode,
  FaceSharpenSettings,
  PhotoAnalysisResult,
  PhotoMode,
} from '../types/analysis';

interface ManualAdjustmentSlidersProps {
  params: AdjustmentParams;
  onChange: (newParams: AdjustmentParams) => void;
  onResetToAI: () => void;
  onResetToNeutral: () => void;
  mode: PhotoMode;
  hasAIRecommendations: boolean;
  editTargetMode: EditTargetMode;
  onChangeEditTargetMode: (mode: EditTargetMode) => void;
  // Manual Analysis & AI Recommendation Controls
  analysisMethod: AnalysisMethod;
  onChangeAnalysisMethod: (method: AnalysisMethod) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  analysisStepText?: string;
  analysisResult?: PhotoAnalysisResult | null;
  analysisError?: string | null;
  onOpenApiKeyModal?: () => void;
  apiKey?: string;
  isBatchMode?: boolean;
  onApplyAdjustmentsToAllBatch?: () => void;
  onToggleViewAnalysisDetails?: () => void;
  isShowingAnalysisDetails?: boolean;
  onUndo?: () => void;
  canUndo?: boolean;
  onOpenPresetModal?: (mode: 'save' | 'manage') => void;
  faceSharpenSettings?: FaceSharpenSettings;
  onChangeFaceSharpenSettings?: (settings: FaceSharpenSettings) => void;
  onApplyFaceSharpenToAllBatch?: () => void;
}

interface SliderRowProps {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  defaultValue?: number;
  onChange: (val: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  sublabel,
  value,
  min,
  max,
  step,
  unit = '',
  defaultValue = 0,
  onChange,
}) => {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : defaultValue;

  const handleDecrement = () => {
    const next = Math.max(min, Number((safeValue - step).toFixed(2)));
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(max, Number((safeValue + step).toFixed(2)));
    onChange(next);
  };

  const handleReset = () => {
    onChange(defaultValue);
  };

  const isModified = Math.abs(safeValue - defaultValue) > 0.001;

  return (
    <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700/80 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-slate-200">{label}</span>
          {sublabel && <span className="text-[11px] text-slate-400 ml-1.5 hidden sm:inline">({sublabel})</span>}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
              isModified
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {safeValue > 0 && unit !== '%' ? `+${safeValue}` : safeValue}
            {unit}
          </span>
          {isModified && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset slider ini"
              className="text-slate-500 hover:text-amber-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={safeValue <= min}
          aria-label={`Kurangi ${label}`}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-700/60"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeValue}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            onChange(isNaN(parsed) ? defaultValue : parsed);
          }}
          className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300 focus:outline-none"
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={safeValue >= max}
          aria-label={`Tambah ${label}`}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-700/60"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const ManualAdjustmentSliders: React.FC<ManualAdjustmentSlidersProps> = ({
  params,
  onChange,
  onResetToAI,
  onResetToNeutral,
  mode,
  hasAIRecommendations,
  editTargetMode,
  onChangeEditTargetMode,
  analysisMethod,
  onChangeAnalysisMethod,
  onRunAnalysis,
  isAnalyzing,
  analysisStepText,
  analysisResult,
  analysisError,
  onOpenApiKeyModal,
  apiKey,
  isBatchMode,
  onApplyAdjustmentsToAllBatch,
  onToggleViewAnalysisDetails,
  isShowingAnalysisDetails,
  onUndo,
  canUndo,
  onOpenPresetModal,
  faceSharpenSettings,
  onChangeFaceSharpenSettings,
  onApplyFaceSharpenToAllBatch,
}) => {
  const [isAdvancedSharpenOpen, setIsAdvancedSharpenOpen] = React.useState(false);

  const currentFaceSharpen = faceSharpenSettings || DEFAULT_FACE_SHARPEN_SETTINGS;

  const handleToggleFaceSharpen = () => {
    if (onChangeFaceSharpenSettings) {
      onChangeFaceSharpenSettings({
        ...currentFaceSharpen,
        enabled: !currentFaceSharpen.enabled,
      });
    }
  };

  const handleUpdateFaceSharpenParam = (
    key: keyof Omit<FaceSharpenSettings, 'enabled'>,
    val: number
  ) => {
    if (onChangeFaceSharpenSettings) {
      onChangeFaceSharpenSettings({
        ...currentFaceSharpen,
        [key]: val,
      });
    }
  };
  const updateParam = (key: keyof AdjustmentParams, val: number) => {
    onChange({
      ...params,
      [key]: val,
    });
  };

  const isGemini = analysisMethod === 'gemini';
  const recommendationButtonLabel = isGemini ? 'Terapkan Rekomendasi AI' : 'Terapkan Rekomendasi Lokal';

  // Check if current adjustment values match the active recommendation
  const isApplied = Boolean(
    analysisResult &&
      Math.abs(params.exposureEV - analysisResult.subject.exposureEV) < 0.01 &&
      Math.abs(params.contrast - analysisResult.subject.contrast) < 0.01 &&
      Math.abs(params.shadows - analysisResult.subject.shadows) < 0.01 &&
      Math.abs(params.sharpening - analysisResult.subject.sharpening) < 0.01
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-sm">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col gap-4 pb-5 mb-5 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
              Koreksi Presisi
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-2 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-amber-400" />
              Manual Adjustment & Fine Tuning
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Setiap perubahan slider langsung memperbarui preview tanpa merusak struktur piksel asli.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Action Button: TERAPKAN REKOMENDASI (Satu tombol utama konsisten di header) */}
            {isAnalyzing ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-xl bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-2 shadow-md cursor-wait opacity-80"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>{analysisStepText || 'Menganalisis...'}</span>
              </button>
            ) : hasAIRecommendations ? (
              <button
                type="button"
                onClick={onResetToAI}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                  isApplied
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
                }`}
                title="Terapkan parameter rekomendasi ke slider"
              >
                {isApplied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{recommendationButtonLabel}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>{recommendationButtonLabel}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="Lakukan analisis sekarang terlebih dahulu untuk mendapatkan rekomendasi"
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-500 border border-slate-700/60 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{recommendationButtonLabel}</span>
              </button>
            )}

            {/* Secondary Action: Urungkan (Hanya tampil jika ada riwayat undo yang valid) */}
            {canUndo && onUndo && (
              <button
                type="button"
                onClick={onUndo}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Kembalikan perubahan parameter terakhir"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Urungkan
              </button>
            )}

            {/* Secondary Action: Reset Netral */}
            <button
              type="button"
              onClick={onResetToNeutral}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Kembalikan semua slider ke posisi netral"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Netral
            </button>

            {/* Batch Apply to All (Khusus Batch Mode) */}
            {isBatchMode && onApplyAdjustmentsToAllBatch && (
              <button
                type="button"
                onClick={onApplyAdjustmentsToAllBatch}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Terapkan seluruh parameter foto aktif ini ke semua foto di antrean batch"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Terapkan ke</span> Semua Foto
              </button>
            )}
          </div>
        </div>

        {/* 2. Sederhanakan Pilihan Metode (Segmented Control Ringkas) */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Metode Rekomendasi:
            </span>

            {/* Indikator API Key Ringkas & Rapi */}
            <div className="text-[11px]">
              {apiKey ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <Key className="w-3 h-3" /> API Key Aktif
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium underline cursor-pointer"
                >
                  <Key className="w-3 h-3" /> Atur API Key Gemini
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* 1. Analisis Lokal (Default) */}
            <button
              type="button"
              onClick={() => onChangeAnalysisMethod('local')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                analysisMethod === 'local'
                  ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  analysisMethod === 'local' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${analysisMethod === 'local' ? 'text-white' : 'text-slate-300'}`}>
                    Analisis Lokal
                  </span>
                  {analysisMethod === 'local' && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Analisis piksel langsung di perangkat, tanpa API.
                </p>
              </div>
            </button>

            {/* 2. Gemini AI */}
            <button
              type="button"
              onClick={() => onChangeAnalysisMethod('gemini')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                analysisMethod === 'gemini'
                  ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  analysisMethod === 'gemini' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${analysisMethod === 'gemini' ? 'text-white' : 'text-slate-300'}`}>
                    Gemini AI
                  </span>
                  {analysisMethod === 'gemini' && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Analisis menggunakan Gemini API. Dapat menggunakan kuota.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 3. Panel Hasil Rekomendasi (Satu panel yang konsisten menampilkan hasil metode aktif) */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col gap-3 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isAnalyzing
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : analysisResult
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : isGemini ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white">
                    Hasil Rekomendasi {isGemini ? 'Gemini AI' : 'Analisis Lokal'}
                  </span>

                  {/* Status Badges Konsisten */}
                  {isAnalyzing ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sedang Menganalisis
                    </span>
                  ) : analysisError ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                      Analisis Gagal
                    </span>
                  ) : analysisResult ? (
                    isApplied ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-cyan-400" />
                        Rekomendasi Diterapkan
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                        Rekomendasi Tersedia
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                      Belum Dianalisis
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-300 mt-0.5">
                  {isAnalyzing
                    ? (analysisStepText || 'Sedang memproses analisis foto...')
                    : analysisError
                    ? analysisError
                    : analysisResult
                    ? analysisResult.recommendation.summary
                    : 'Pilih metode analisis, lalu klik Analisis Sekarang untuk menghasilkan rekomendasi.'}
                </p>
              </div>
            </div>

            {/* Aksi Analisis & Preset */}
            <div className="w-full sm:w-auto shrink-0 flex flex-wrap items-center gap-2 justify-end">
              {onOpenPresetModal && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenPresetModal('manage')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Buka daftar preset rekomendasi (Gunakan, Ekspor, Impor)"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                    <span>Preset</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPresetModal('save')}
                    disabled={!analysisResult}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      analysisResult
                        ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 cursor-pointer'
                        : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                    }`}
                    title={
                      analysisResult
                        ? 'Simpan hasil analisis aktif sebagai preset'
                        : 'Jalankan analisis terlebih dahulu untuk menyimpan preset'
                    }
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Simpan Preset</span>
                  </button>
                </>
              )}

              {isAnalyzing ? (
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-slate-800 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-wait"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menganalisis...
                </button>
              ) : analysisResult ? (
                <button
                  type="button"
                  onClick={onRunAnalysis}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Jalankan ulang analisis foto ini"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  Analisis Ulang
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRunAnalysis}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20"
                >
                  {isGemini ? <Sparkles className="w-3.5 h-3.5 fill-slate-950" /> : <Zap className="w-3.5 h-3.5 fill-slate-950" />}
                  Analisis Sekarang
                </button>
              )}
            </div>
          </div>

          {/* Quick Chips Parameter Rekomendasi (Hanya Ditampilkan Jika Hasil Tersedia) */}
          {analysisResult && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2.5 border-t border-slate-800/80 text-[11px] font-mono">
              <span className="text-slate-400">
                Exposure: <strong className="text-amber-400">{analysisResult.subject.exposureEV > 0 ? `+${analysisResult.subject.exposureEV}` : analysisResult.subject.exposureEV} EV</strong>
              </span>
              <span className="text-slate-400">
                Contrast: <strong className="text-slate-200">{analysisResult.subject.contrast > 0 ? `+${analysisResult.subject.contrast}` : analysisResult.subject.contrast}</strong>
              </span>
              <span className="text-slate-400">
                Shadows: <strong className="text-emerald-400">{analysisResult.subject.shadows > 0 ? `+${analysisResult.subject.shadows}` : analysisResult.subject.shadows}</strong>
              </span>
              <span className="text-slate-400">
                Sharpening: <strong className="text-cyan-400">{analysisResult.subject.sharpening}</strong>
              </span>
              <span className="text-slate-400">
                Eye Detail: <strong className="text-cyan-300">+{analysisResult.subject.eyeDetail ?? 10}</strong>
              </span>
              <span className="text-slate-400">
                Skin Protection: <strong className="text-emerald-400">+{analysisResult.subject.skinProtection ?? 12}</strong>
              </span>

              {onToggleViewAnalysisDetails && (
                <button
                  type="button"
                  onClick={onToggleViewAnalysisDetails}
                  className="ml-auto text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-sans font-semibold underline"
                >
                  {isShowingAnalysisDetails ? (
                    <>Tutup Rincian <ChevronUp className="w-3.5 h-3.5" /></>
                  ) : (
                    <>Lihat Rincian Analisis Lengkap <ChevronDown className="w-3.5 h-3.5" /></>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Alert jika analisis gagal */}
          {analysisError && !isAnalyzing && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <span className="text-rose-300">{analysisError}</span>
              {isGemini && (
                <button
                  type="button"
                  onClick={() => {
                    onChangeAnalysisMethod('local');
                    onRunAnalysis();
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  Gunakan Analisis Lokal
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mode Pengeditan: SUBJEK ONLY (Default) vs SUBJEK + LATAR BELAKANG */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3.5">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Mode Pengeditan
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Pilih area penerapan Manual Adjustment
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* SUBJEK ONLY */}
          <button
            type="button"
            onClick={() => onChangeEditTargetMode('subject_only')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              editTargetMode === 'subject_only'
                ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-400/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">
                    SUBJEK ONLY
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-400 font-semibold border border-emerald-400/30">
                    DEFAULT
                  </span>
                </div>
                {editTargetMode === 'subject_only' && (
                  <div className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Terapkan seluruh pengaturan Manual Adjustment hanya pada area subjek (wajah, rambut/hijab, pakaian, dan tubuh). Latar belakang tidak boleh ikut berubah.
              </p>
            </div>
          </button>

          {/* SUBJEK + LATAR BELAKANG */}
          <button
            type="button"
            onClick={() => onChangeEditTargetMode('all')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              editTargetMode === 'all'
                ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-400/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">
                    SUBJEK + LATAR BELAKANG
                  </span>
                </div>
                {editTargetMode === 'all' && (
                  <div className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Terapkan pengaturan Manual Adjustment pada seluruh gambar, termasuk subjek dan latar belakang.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* KARTU FITUR PENAJAMAN WAJAH (AI) */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 shadow-inner">
        {/* Header Baris Atas: Ikon + Badge AI + Toggle ON/OFF */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ScanFace className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              PENAJAMAN WAJAH (AI)
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
              AI
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleFaceSharpen}
            aria-pressed={currentFaceSharpen.enabled}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              currentFaceSharpen.enabled
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-400/25 ring-2 ring-amber-400/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            {currentFaceSharpen.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Baris Mode & Nilai Status */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-300 font-medium">
            Filter Penajam Otomatis:
          </span>
          <span
            className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
              currentFaceSharpen.enabled
                ? 'bg-amber-400/10 border-amber-400/30 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {currentFaceSharpen.enabled ? `${currentFaceSharpen.intensity}%` : 'Nonaktif'}
          </span>
        </div>

        {/* Slider Utama Intensitas Penajaman */}
        <div className="mb-3">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              disabled={!currentFaceSharpen.enabled}
              value={currentFaceSharpen.intensity}
              onChange={(e) =>
                handleUpdateFaceSharpenParam('intensity', Number(e.target.value))
              }
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-400 ${
                currentFaceSharpen.enabled
                  ? 'bg-slate-800 hover:bg-slate-700'
                  : 'bg-slate-900 opacity-40 cursor-not-allowed'
              }`}
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[10px] text-slate-500 font-mono mr-1">Preset:</span>
            {[
              { label: '25% (Lembut)', val: 25 },
              { label: '40% (Std)', val: 40 },
              { label: '60% (Tegas)', val: 60 },
              { label: '80% (Maksimal)', val: 80 },
            ].map((p) => {
              const isActive = currentFaceSharpen.intensity === p.val;
              return (
                <button
                  key={p.val}
                  type="button"
                  disabled={!currentFaceSharpen.enabled}
                  onClick={() => handleUpdateFaceSharpenParam('intensity', p.val)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded transition-all ${
                    !currentFaceSharpen.enabled
                      ? 'bg-slate-900 text-slate-600 border border-slate-800/60 cursor-not-allowed'
                      : isActive
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 cursor-pointer'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Deskripsi Fitur */}
        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
          Menajamkan detail wajah secara lembut agar hasil cetak pas foto tajam dan tidak terlihat pudar.
        </p>

        {/* Header Toggle Pengaturan Lanjutan */}
        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsAdvancedSharpenOpen((prev) => !prev)}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            {isAdvancedSharpenOpen ? (
              <>
                Tutup Pengaturan Lanjutan <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Pengaturan Lanjutan <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {isBatchMode && onApplyFaceSharpenToAllBatch && (
            <button
              type="button"
              onClick={onApplyFaceSharpenToAllBatch}
              className="text-[11px] text-slate-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="Terapkan status dan pengaturan penajaman wajah aktif ke seluruh foto dalam batch"
            >
              <Copy className="w-3 h-3" />
              Terapkan ke Semua Foto
            </button>
          )}
        </div>

        {/* Area Pengaturan Lanjutan (Collapsible) */}
        {isAdvancedSharpenOpen && (
          <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex flex-col gap-3.5">
            {/* Radius Penajaman */}
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-xs font-bold text-slate-200">Radius Penajaman</span>
                  <span className="text-[10px] text-slate-400 block">Jangkauan area penyebaran ketajaman tepi</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {currentFaceSharpen.radius.toFixed(1)} px
                </span>
              </div>
              <input
                type="range"
                min={0.6}
                max={2.5}
                step={0.1}
                disabled={!currentFaceSharpen.enabled}
                value={currentFaceSharpen.radius}
                onChange={(e) =>
                  handleUpdateFaceSharpenParam('radius', Number(e.target.value))
                }
                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-400 ${
                  currentFaceSharpen.enabled
                    ? 'bg-slate-800 hover:bg-slate-700'
                    : 'bg-slate-900 opacity-40 cursor-not-allowed'
                }`}
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {[
                  { label: '0.8 px (Halus)', val: 0.8 },
                  { label: '1.2 px (Std)', val: 1.2 },
                  { label: '1.8 px (Lebar)', val: 1.8 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    disabled={!currentFaceSharpen.enabled}
                    onClick={() => handleUpdateFaceSharpenParam('radius', p.val)}
                    className={`text-[9px] font-mono px-2 py-0.5 rounded transition-all ${
                      !currentFaceSharpen.enabled
                        ? 'bg-slate-900 text-slate-600 border border-slate-800/60 cursor-not-allowed'
                        : Math.abs(currentFaceSharpen.radius - p.val) < 0.05
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 cursor-pointer'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ambang Detail (Noise Gate) */}
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-xs font-bold text-slate-200">Ambang Detail (Threshold)</span>
                  <span className="text-[10px] text-slate-400 block">Mencegah penajaman pada noise atau pori kulit datar</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {currentFaceSharpen.threshold}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                step={1}
                disabled={!currentFaceSharpen.enabled}
                value={currentFaceSharpen.threshold}
                onChange={(e) =>
                  handleUpdateFaceSharpenParam('threshold', Number(e.target.value))
                }
                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-400 ${
                  currentFaceSharpen.enabled
                    ? 'bg-slate-800 hover:bg-slate-700'
                    : 'bg-slate-900 opacity-40 cursor-not-allowed'
                }`}
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {[
                  { label: '2 (Sensitif)', val: 2 },
                  { label: '4 (Std)', val: 4 },
                  { label: '8 (Proteksi Tinggi)', val: 8 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    disabled={!currentFaceSharpen.enabled}
                    onClick={() => handleUpdateFaceSharpenParam('threshold', p.val)}
                    className={`text-[9px] font-mono px-2 py-0.5 rounded transition-all ${
                      !currentFaceSharpen.enabled
                        ? 'bg-slate-900 text-slate-600 border border-slate-800/60 cursor-not-allowed'
                        : currentFaceSharpen.threshold === p.val
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 cursor-pointer'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid of Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Tonal & Exposure */}
        <SliderRow
          label="Exposure (EV)"
          sublabel="Kompensasi Cahaya"
          value={params.exposureEV}
          min={-1.0}
          max={1.0}
          step={0.05}
          unit=" EV"
          defaultValue={0}
          onChange={(v) => updateParam('exposureEV', v)}
        />

        <SliderRow
          label="Brightness"
          sublabel="Midtone Wajah"
          value={params.brightness}
          min={-25}
          max={25}
          step={1}
          defaultValue={0}
          onChange={(v) => updateParam('brightness', v)}
        />

        <SliderRow
          label="Contrast"
          sublabel="Ketegasan Fitur"
          value={params.contrast}
          min={-25}
          max={25}
          step={1}
          defaultValue={0}
          onChange={(v) => updateParam('contrast', v)}
        />

        <SliderRow
          label="Highlights"
          sublabel="Redam Kilau Dahi"
          value={params.highlights}
          min={-25}
          max={25}
          step={1}
          defaultValue={0}
          onChange={(v) => updateParam('highlights', v)}
        />

        <SliderRow
          label="Shadows"
          sublabel="Detail Jas & Rambut"
          value={params.shadows}
          min={-25}
          max={25}
          step={1}
          defaultValue={0}
          onChange={(v) => updateParam('shadows', v)}
        />

        <SliderRow
          label="Whites"
          sublabel="Titik Putih Kemeja"
          value={params.whites}
          min={-20}
          max={20}
          step={1}
          defaultValue={0}
          onChange={(v) => updateParam('whites', v)}
        />

        <SliderRow
          label="Blacks"
          sublabel="Titik Hitam Tekstur"
          value={params.blacks}
          min={-20}
          max={20}
          step={1}
          defaultValue={0}
          onChange={(v) => updateParam('blacks', v)}
        />
      </div>

      {/* Smart Detail Sharpening Section (Non-Generative & Mask-Based) */}
      <div className="mt-6 pt-5 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-md border border-cyan-400/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Detail Sharpening
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-400/15 text-emerald-300 font-bold border border-emerald-400/25 hidden sm:inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Mask-Based • Non-Generative
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Enhance existing pixels • Anti-halo protection
          </span>
        </div>

        <p className="text-xs text-slate-300 mb-4 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
          Tingkatkan ketajaman lokal pada <span className="text-amber-300 font-medium">mata (iris/pupil/bulu mata)</span>, <span className="text-amber-300 font-medium">alis & bibir</span>, <span className="text-amber-300 font-medium">kontur wajah</span>, dan <span className="text-amber-300 font-medium">rambut/hijab</span> dengan proteksi kehalusan kulit wajah tanpa menciptakan noise atau pori buatan.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. EYE DETAIL (Priority 1) */}
          <SliderRow
            label="EYE DETAIL"
            sublabel="Iris, Pupil, Eyelid & Bulu Mata"
            value={params.eyeDetail}
            min={0}
            max={25}
            step={1}
            defaultValue={10}
            onChange={(v) => updateParam('eyeDetail', v)}
          />

          {/* 2. FACE DETAIL (Priority 2, 3, 4) */}
          <SliderRow
            label="FACE DETAIL"
            sublabel="Alis, Bibir & Kontur Wajah"
            value={params.faceDetail}
            min={0}
            max={25}
            step={1}
            defaultValue={8}
            onChange={(v) => updateParam('faceDetail', v)}
          />

          {/* 3. HAIR & HIJAB DETAIL */}
          <SliderRow
            label="HAIR & HIJAB DETAIL"
            sublabel="Tekstur Rambut & Tepi Hijab"
            value={params.hairDetail}
            min={0}
            max={25}
            step={1}
            defaultValue={8}
            onChange={(v) => updateParam('hairDetail', v)}
          />

          {/* 4. SKIN PROTECTION */}
          <SliderRow
            label="SKIN PROTECTION"
            sublabel="Proteksi Pori & Noise Dahi/Pipi"
            value={params.skinProtection}
            min={0}
            max={25}
            step={1}
            defaultValue={12}
            onChange={(v) => updateParam('skinProtection', v)}
          />

          {/* 5. Global Sharpening */}
          <SliderRow
            label="Sharpening"
            sublabel="Ketajaman Global Subjek"
            value={params.sharpening}
            min={0}
            max={20}
            step={1}
            defaultValue={6}
            onChange={(v) => updateParam('sharpening', v)}
          />

          {/* 6. Noise Protection Threshold */}
          <SliderRow
            label="Noise Protection"
            sublabel="Ambang Batas Filter Grain"
            value={params.noiseProtection}
            min={0}
            max={20}
            step={1}
            defaultValue={6}
            onChange={(v) => updateParam('noiseProtection', v)}
          />
        </div>
      </div>

      {/* Color Mode Sliders (shown only when mode is color) */}
      {mode === 'color' && (
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
              Koreksi Warna & White Balance
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <SliderRow
              label="Saturation"
              sublabel="Kepekatan Warna"
              value={params.saturation}
              min={-50}
              max={50}
              step={1}
              defaultValue={0}
              onChange={(v) => updateParam('saturation', v)}
            />

            <SliderRow
              label="Temperature"
              sublabel="Koreksi Kuning / Biru"
              value={params.temperature}
              min={-25}
              max={25}
              step={1}
              defaultValue={0}
              onChange={(v) => updateParam('temperature', v)}
            />

            <SliderRow
              label="Tint"
              sublabel="Koreksi Magenta / Hijau"
              value={params.tint}
              min={-25}
              max={25}
              step={1}
              defaultValue={0}
              onChange={(v) => updateParam('tint', v)}
            />
          </div>

          {/* Subbagian: SATURASI PER WARNA (SELECTIVE COLOR SATURATION) */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold tracking-wider uppercase text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-md border border-cyan-400/20">
                  Saturasi Per Warna (Selective Color Saturation)
                </span>
                <span className="hidden md:inline-block text-[11px] text-slate-400">
                  Koreksi saturasi selektif tanpa mengubah warna kulit berlebih
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChange({
                    ...params,
                    satRed: 0,
                    satYellow: 0,
                    satGreen: 0,
                    satCyan: 0,
                    satBlue: 0,
                    satMagenta: 0,
                  });
                }}
                className="self-start sm:self-auto px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-md transition-colors cursor-pointer"
                title="Reset semua 6 slider saturasi warna ke 0"
              >
                Reset Semua Warna
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <SliderRow
                label="Reds"
                sublabel="Merah"
                value={params.satRed ?? 0}
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                onChange={(v) => updateParam('satRed', v)}
              />

              <SliderRow
                label="Yellows"
                sublabel="Kuning"
                value={params.satYellow ?? 0}
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                onChange={(v) => updateParam('satYellow', v)}
              />

              <SliderRow
                label="Greens"
                sublabel="Hijau"
                value={params.satGreen ?? 0}
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                onChange={(v) => updateParam('satGreen', v)}
              />

              <SliderRow
                label="Cyans"
                sublabel="Sian"
                value={params.satCyan ?? 0}
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                onChange={(v) => updateParam('satCyan', v)}
              />

              <SliderRow
                label="Blues"
                sublabel="Biru"
                value={params.satBlue ?? 0}
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                onChange={(v) => updateParam('satBlue', v)}
              />

              <SliderRow
                label="Magentas"
                sublabel="Magenta"
                value={params.satMagenta ?? 0}
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                onChange={(v) => updateParam('satMagenta', v)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
