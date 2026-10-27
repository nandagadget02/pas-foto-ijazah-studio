import React from 'react';
import { Moon, Sun, Check, Sparkles, Shield, Palette } from 'lucide-react';
import { PhotoMode, TargetTone } from '../types/analysis';

interface TargetModeSelectorProps {
  mode: PhotoMode;
  onChangeMode: (m: PhotoMode) => void;
  targetTone: TargetTone;
  onChangeTargetTone: (t: TargetTone) => void;
}

export const TargetModeSelector: React.FC<TargetModeSelectorProps> = ({
  mode,
  onChangeMode,
  targetTone,
  onChangeTargetTone,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono font-semibold tracking-wider uppercase text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
            Langkah 2 — Konfigurasi Target Ijazah
          </span>
          <h3 className="text-xl font-bold text-white mt-2">
            Target Foto & Mode Warna
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Standar Ijazah Indonesia mengutamakan kejernihan tonal netral (tanpa filter dramatis/kecantikan).
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
          <Shield className="w-3.5 h-3.5" />
          <span>True Neutral Standard</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. MODE: B&W vs FOTO BERWARNA */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-3">
            MODE FOTO (DEFAULT: B&W / GRAYSCALE)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* B&W Option */}
            <button
              type="button"
              onClick={() => onChangeMode('bw')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 relative ${
                mode === 'bw'
                  ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center shrink-0">
                <Moon className="w-5 h-5 text-slate-200" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    B&W / GRAYSCALE
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-400 font-semibold">
                    DEFAULT
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  True Luminance Rec.709 (R = G = B). Mutlak 0% color cast untuk cetak ijazah hitam putih resmi.
                </p>
              </div>
              {mode === 'bw' && (
                <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>

            {/* FOTO BERWARNA Option */}
            <button
              type="button"
              onClick={() => onChangeMode('color')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 relative ${
                mode === 'color'
                  ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Palette className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    FOTO BERWARNA
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Mempertahankan warna asli subjek dengan kalibrasi white balance dan pemulihan saturasi netral.
                </p>
              </div>
              {mode === 'color' && (
                <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 2. TARGET TONE: Natural / Ijazah, Sedikit Lebih Terang, Sedikit Lebih Lembut */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-3">
            TARGET TONE (DEFAULT: NATURAL / IJAZAH)
          </label>
          <div className="space-y-2.5">
            {[
              {
                id: 'natural' as TargetTone,
                title: 'Natural / Ijazah (DEFAULT)',
                desc: 'Kontras seimbang, midtone wajah optimal, detail rambut & pakaian terlindungi.',
                isDefault: true,
              },
              {
                id: 'brighter' as TargetTone,
                title: 'Sedikit Lebih Terang',
                desc: 'Menerangkan midtone wajah secara lembut untuk foto sumber yang agak redup.',
              },
              {
                id: 'softer' as TargetTone,
                title: 'Sedikit Lebih Lembut',
                desc: 'Meredam kontras tajam untuk subjek dengan pencahayaan keras di dahi atau pipi.',
              },
            ].map((tone) => {
              const isSelected = targetTone === tone.id;
              return (
                <div
                  key={tone.id}
                  onClick={() => onChangeTargetTone(tone.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {tone.title}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {tone.desc}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
