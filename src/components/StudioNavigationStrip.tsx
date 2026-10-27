import React from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Sliders,
  Scissors,
  Layers,
  Printer,
  FileCheck,
} from 'lucide-react';
import { OutputDimension, PhotoMode } from '../types/analysis';

export type StudioStepTab = 'adjust' | 'crop' | 'background' | 'printer' | 'export';

export interface StudioStepInfo {
  id: StudioStepTab;
  stepNumber: number;
  label: string;
  shortName: string;
}

export function getStudioSteps(mode: PhotoMode): StudioStepInfo[] {
  if (mode === 'bw') {
    return [
      { id: 'adjust', stepNumber: 1, label: '1. Manual Adjustment', shortName: 'Manual Adjustment' },
      { id: 'crop', stepNumber: 2, label: '2. Ukuran & Crop Framing', shortName: 'Ukuran & Crop' },
      { id: 'background', stepNumber: 3, label: '3. Ganti Latar Belakang', shortName: 'Ganti Latar' },
      { id: 'printer', stepNumber: 4, label: '4. Kompensasi Cetak', shortName: 'Kompensasi Cetak' },
      { id: 'export', stepNumber: 5, label: '5. Export & Download', shortName: 'Export & Download' },
    ];
  }
  return [
    { id: 'adjust', stepNumber: 1, label: '1. Manual Adjustment', shortName: 'Manual Adjustment' },
    { id: 'crop', stepNumber: 2, label: '2. Ukuran & Crop Framing', shortName: 'Ukuran & Crop' },
    { id: 'background', stepNumber: 3, label: '3. Ganti Latar Belakang', shortName: 'Ganti Latar' },
    { id: 'export', stepNumber: 4, label: '4. Export & Download', shortName: 'Export & Download' },
  ];
}

export function getNextStep(currentTab: StudioStepTab, mode: PhotoMode): StudioStepInfo {
  const steps = getStudioSteps(mode);
  const currentIndex = steps.findIndex((s) => s.id === currentTab);
  if (currentIndex >= 0 && currentIndex < steps.length - 1) {
    return steps[currentIndex + 1];
  }
  return steps[steps.length - 1];
}

export function getPrevStep(currentTab: StudioStepTab, mode: PhotoMode): StudioStepInfo | null {
  const steps = getStudioSteps(mode);
  const currentIndex = steps.findIndex((s) => s.id === currentTab);
  if (currentIndex > 0) {
    return steps[currentIndex - 1];
  }
  return null;
}

interface StudioNavigationStripProps {
  activeStepTab: StudioStepTab;
  photoMode: PhotoMode;
  selectedDimension: OutputDimension;
  onNavigate: (tab: StudioStepTab) => void;
  className?: string;
  isBatchMode?: boolean;
}

export const StudioNavigationStrip: React.FC<StudioNavigationStripProps> = ({
  activeStepTab,
  photoMode,
  selectedDimension,
  onNavigate,
  className = '',
  isBatchMode = false,
}) => {
  // Hanya tampilkan jika belum di tahap ekspor akhir
  if (activeStepTab === 'export') {
    return null;
  }

  const steps = getStudioSteps(photoMode);
  const currentStepInfo = steps.find((s) => s.id === activeStepTab) || steps[0];
  const nextStepInfo = getNextStep(activeStepTab, photoMode);
  const prevStepInfo = getPrevStep(activeStepTab, photoMode);

  const getStepIcon = (tab: StudioStepTab) => {
    switch (tab) {
      case 'adjust':
        return <Sliders className="w-5 h-5 text-amber-400" />;
      case 'crop':
        return <Scissors className="w-5 h-5 text-amber-400" />;
      case 'background':
        return <Layers className="w-5 h-5 text-amber-400" />;
      case 'printer':
        return <Printer className="w-5 h-5 text-amber-400" />;
      case 'export':
        return <FileCheck className="w-5 h-5 text-amber-400" />;
    }
  };

  const handleNextClick = () => {
    onNavigate(nextStepInfo.id);
  };

  const handlePrevClick = () => {
    if (prevStepInfo) {
      onNavigate(prevStepInfo.id);
    }
  };

  return (
    <div
      className={`bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-sm ${className}`}
    >
      {/* Kolom Kiri: Informasi Tahap Saat Ini & Target Selanjutnya */}
      <div className="flex items-center gap-3.5 w-full sm:w-auto">
        <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
          {getStepIcon(activeStepTab)}
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              {isBatchMode ? 'BATCH • ' : ''}Tahap {currentStepInfo.stepNumber} dari {steps.length}
            </span>
            <span className="text-sm font-bold text-white">
              {currentStepInfo.shortName}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Berikutnya: <strong className="text-slate-200">{nextStepInfo.label}</strong> • {selectedDimension.name} @ {selectedDimension.dpi} DPI
          </p>
        </div>
      </div>

      {/* Kolom Kanan: Tombol Aksi Navigasi */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        {prevStepInfo && (
          <button
            type="button"
            onClick={handlePrevClick}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title={`Kembali ke ${prevStepInfo.label}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleNextClick}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
          title={`Lanjut ke tahap ${nextStepInfo.label}`}
        >
          <span>NEXT — TAHAP SELANJUTNYA</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
