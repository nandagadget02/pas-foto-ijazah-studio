import React, { useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { BatchPhotoItem } from '../types/analysis';

interface QuickBatchNavigatorProps {
  items: BatchPhotoItem[];
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
  className?: string;
}

export const QuickBatchNavigator: React.FC<QuickBatchNavigatorProps> = ({
  items,
  activeItemId,
  onSelectItem,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);

  if (!items || items.length === 0) {
    return null;
  }

  const activeIndex = items.findIndex((it) => it.id === activeItemId);
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;
  const isFirst = safeActiveIndex === 0;
  const isLast = safeActiveIndex === items.length - 1;

  // Auto-scroll the active item button into view horizontally
  useEffect(() => {
    if (activeBtnRef.current) {
      activeBtnRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeItemId]);

  const handlePrev = () => {
    if (!isFirst && safeActiveIndex > 0) {
      onSelectItem(items[safeActiveIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (!isLast && safeActiveIndex < items.length - 1) {
      onSelectItem(items[safeActiveIndex + 1].id);
    }
  };

  const doneCount = items.filter((it) => it.status === 'done').length;

  return (
    <div
      className={`sticky top-[61px] sm:top-[69px] z-30 bg-slate-950/95 backdrop-blur-md border-y border-amber-500/30 shadow-lg shadow-black/40 py-2 px-3 sm:px-6 transition-all ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Left Side: Prev Button & Batch Counter */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirst}
            className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              isFirst
                ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:border-amber-400/50'
            }`}
            title={isFirst ? 'Sudah di foto pertama' : `Pindah ke Foto ${safeActiveIndex}`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {/* Current Index Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
            <span className="text-amber-400 font-bold">Foto {safeActiveIndex + 1}</span>
            <span className="text-slate-500">/</span>
            <span>{items.length}</span>
            <span className="text-[10px] text-emerald-400 font-semibold ml-1">
              ({doneCount} selesai)
            </span>
          </div>
        </div>

        {/* Center: Horizontally Scrollable Photo Buttons */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto flex items-center gap-1.5 sm:gap-2 py-0.5 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          {items.map((item, index) => {
            const isSelected = item.id === activeItemId;
            return (
              <button
                key={item.id}
                ref={isSelected ? activeBtnRef : undefined}
                type="button"
                onClick={() => onSelectItem(item.id)}
                className={`group flex items-center gap-2 py-1 px-2 sm:px-2.5 rounded-xl border text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-500/15 ring-1 ring-amber-400/50'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 hover:border-slate-700'
                }`}
                title={`Foto ${index + 1}: ${item.name}`}
              >
                {/* Tiny Thumbnail */}
                <div className="w-6 h-7 rounded bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative">
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Status Indicator Dot on thumbnail */}
                  {item.status === 'done' && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                  {(item.status === 'error' || item.status === 'analysis_error') && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-rose-400" />
                  )}
                  {(item.status === 'processing' || item.status === 'analyzing' || item.status === 'waiting_analysis' || item.status === 'waiting_processing') && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  )}
                </div>

                {/* Label & Filename */}
                <div className="text-left flex flex-col justify-center">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-bold leading-tight ${
                        isSelected ? 'text-amber-300' : 'text-slate-200'
                      }`}
                    >
                      Foto {index + 1}
                    </span>

                    {/* Status Icon */}
                    {item.status === 'done' && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    )}
                    {(item.status === 'error' || item.status === 'analysis_error') && (
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    )}
                    {(item.status === 'processing' || item.status === 'analyzing' || item.status === 'waiting_analysis' || item.status === 'waiting_processing') && (
                      <Loader2 className="w-3 h-3 text-blue-400 animate-spin shrink-0" />
                    )}
                  </div>

                  <span
                    className="text-[10px] text-slate-400 truncate max-w-[80px] sm:max-w-[110px] hidden md:inline leading-none mt-0.5"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side: Next Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleNext}
            disabled={isLast}
            className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              isLast
                ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:border-amber-400/50'
            }`}
            title={isLast ? 'Sudah di foto terakhir' : `Pindah ke Foto ${safeActiveIndex + 2}`}
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
