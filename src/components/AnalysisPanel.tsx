import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  User,
  Image as ImageIcon,
  Globe,
  Sliders,
  Check,
  AlertTriangle,
  RotateCcw,
  Zap,
  Key,
} from 'lucide-react';
import { PhotoAnalysisResult } from '../types/analysis';

interface AnalysisPanelProps {
  analysis: PhotoAnalysisResult | null;
  isLoading: boolean;
  loadingStepText: string;
  onApplyRecommendations: () => void;
  onRunLocalAnalysis: () => void;
  onOpenApiKeyModal?: () => void;
  error?: string | null;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  analysis,
  isLoading,
  loadingStepText,
  onApplyRecommendations,
  onRunLocalAnalysis,
  onOpenApiKeyModal,
  error,
}) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 animate-pulse" />
        <div className="relative z-10 max-w-md mx-auto">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
            <Zap className="w-7 h-7 animate-bounce" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Menganalisis Karakteristik Foto
          </h3>
          <p className="text-amber-400 font-mono text-sm tracking-wide mb-6">
            {loadingStepText}
          </p>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-4">
            <div className="bg-amber-400 h-full w-2/3 animate-[shimmer_2s_infinite]" />
          </div>

          <p className="text-xs text-slate-400">
            Gemini membaca histogram wajah, tekstur pakaian, dan segmentasi latar
            secara non-generatif.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-base font-semibold text-rose-300">
              Analisis Cloud Tidak Tersedia
            </h4>
            <p className="text-sm text-slate-300 mt-1 mb-4">{error}</p>
            <div className="flex flex-wrap items-center gap-3">
              {onOpenApiKeyModal && (
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Key className="w-4 h-4" />
                  Masukkan / Atur API Key Gemini
                </button>
              )}
              <button
                type="button"
                onClick={onRunLocalAnalysis}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                Gunakan Analisis Lokal (Mandiri Tanpa API)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const { subject, background, global: globalAnalysis, recommendation } = analysis;
  const analysisSourceLabel =
    analysis.analysisSource === 'gemini'
      ? (analysis.usedModel || 'Gemini Flash Lite')
      : 'Analisis Piksel Lokal';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
      {/* Header and Call to Action */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md border border-emerald-400/20 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Analisis Selesai ({analysisSourceLabel})
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Mode Asli: {analysis.sourceMode.toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-2">
            Rekomendasi Parameter Ijazah Resmi
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            {recommendation.summary}
          </p>
        </div>

        <button
          type="button"
          onClick={onApplyRecommendations}
          className="w-full md:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 fill-slate-950" />
          TERAPKAN REKOMENDASI {analysis.analysisSource === 'gemini' ? 'AI' : 'LOKAL'}
        </button>
      </div>

      {/* 3 Columns: Subjek, Background, Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* A. ANALISIS SUBJEK */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-3 font-semibold text-sm">
              <User className="w-4 h-4" />
              <span>A. ANALISIS SUBJEK</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Pencahayaan Wajah:</span>
                <span className="text-slate-200 font-medium">
                  {subject.faceExposureCondition || 'Terkoreksi'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Koreksi Exposure (EV):</span>
                <span className="text-amber-400 font-mono font-semibold">
                  {subject.exposureEV > 0 ? `+${subject.exposureEV}` : subject.exposureEV} EV
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Brightness / Midtone:</span>
                <span className="text-slate-200 font-mono font-medium">
                  {subject.brightness > 0 ? `+${subject.brightness}` : subject.brightness}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Kontras Wajah:</span>
                <span className="text-slate-200 font-mono font-medium">
                  {subject.contrast > 0 ? `+${subject.contrast}` : subject.contrast}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Highlights / Kilau Dahi:</span>
                <span className="text-slate-200 font-mono font-medium">
                  {subject.highlights > 0 ? `+${subject.highlights}` : subject.highlights}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Shadows / Detail Jas/Hijab:</span>
                <span className="text-emerald-400 font-mono font-medium">
                  {subject.shadows > 0 ? `+${subject.shadows}` : subject.shadows}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Sharpening Direkomendasikan:</span>
                <span className="text-cyan-400 font-mono font-medium">
                  {subject.sharpening} / 20
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Eye Detail (Iris/Bulu Mata):</span>
                <span className="text-cyan-300 font-mono font-semibold">
                  +{subject.eyeDetail ?? 10} / 25
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Face Detail (Alis/Bibir/Kontur):</span>
                <span className="text-cyan-300 font-mono font-semibold">
                  +{subject.faceDetail ?? 8} / 25
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Hair & Hijab Detail:</span>
                <span className="text-cyan-300 font-mono font-semibold">
                  +{subject.hairDetail ?? 8} / 25
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Skin Protection (Redam Noise):</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  +{subject.skinProtection ?? 12} / 25
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 italic">
            "{subject.detail}"
          </div>
        </div>

        {/* B. ANALISIS BACKGROUND */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 mb-3 font-semibold text-sm">
              <ImageIcon className="w-4 h-4" />
              <span>B. ANALISIS BACKGROUND</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Tone Latar:</span>
                <span className="text-slate-200 capitalize font-medium">
                  {background.tone}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Keseragaman:</span>
                <span className="text-slate-200 capitalize font-medium">
                  {background.uniformity}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Color Cast:</span>
                <span className="text-slate-200 font-medium">
                  {background.colorCast}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Keyakinan Segmentasi:</span>
                <span className="text-cyan-400 font-mono font-semibold">
                  {background.segmentationConfidence}%
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Aman Dipertahankan:</span>
                <span
                  className={
                    background.isSafeToPreserve
                      ? 'text-emerald-400 font-medium'
                      : 'text-amber-400 font-medium'
                  }
                >
                  {background.isSafeToPreserve ? 'Ya (Sangat Rapi)' : 'Perlu Perhatian'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span className="text-cyan-300 font-semibold block mb-0.5">Isolasi Exposure:</span>
            Pencahayaan background tidak mempengaruhi exposure wajah subjek.
          </div>
        </div>

        {/* C. ANALISIS GLOBAL */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-violet-400 mb-3 font-semibold text-sm">
              <Globe className="w-4 h-4" />
              <span>C. ANALISIS GLOBAL</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Pencahayaan Keseluruhan:</span>
                <span className="text-slate-200 font-medium">
                  {globalAnalysis.exposure}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Kontras Global:</span>
                <span className="text-slate-200 font-medium">
                  {globalAnalysis.contrast}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Ketajaman Asli:</span>
                <span className="text-slate-200 font-medium">
                  {globalAnalysis.sharpness}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Noise / Grain:</span>
                <span className="text-slate-200 font-medium">
                  {globalAnalysis.noise}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Kliping Cahaya:</span>
                <span className="text-slate-200 font-medium">
                  {globalAnalysis.clipping}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Target Tonal Ijazah:</span>
            <span className="font-semibold text-emerald-400 uppercase tracking-wider">
              {recommendation.targetTone}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
