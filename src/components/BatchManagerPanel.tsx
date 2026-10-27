import React, { useRef, useState } from 'react';
import {
  Upload,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Archive,
  Eye,
  FileImage,
  Layers,
  Sparkles,
} from 'lucide-react';
import { BatchPhotoItem } from '../types/analysis';

interface BatchManagerPanelProps {
  items: BatchPhotoItem[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onStartProcessing: () => void;
  isProcessing: boolean;
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
  onRetryItem: (id: string) => void;
  onExportZip?: () => void;
  isExportingZip?: boolean;
}

export const BatchManagerPanel: React.FC<BatchManagerPanelProps> = ({
  items,
  onAddFiles,
  onRemoveItem,
  onClearAll,
  onStartProcessing,
  isProcessing,
  activeItemId,
  onSelectItem,
  onRetryItem,
  onExportZip,
  isExportingZip = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const totalCount = items.length;
  const doneCount = items.filter((it) => it.status === 'done').length;
  const processingCount = items.filter(
    (it) =>
      it.status === 'processing' ||
      it.status === 'analyzing' ||
      it.status === 'waiting_analysis' ||
      it.status === 'waiting_processing'
  ).length;
  const errorCount = items.filter(
    (it) => it.status === 'error' || it.status === 'analysis_error'
  ).length;
  const idleCount = items.filter(
    (it) => it.status === 'idle'
  ).length;

  const progressPercent =
    totalCount > 0 ? Math.round(((doneCount + errorCount) / totalCount) * 100) : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputError(null);
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      // Reset input value so same files can be re-selected if desired
      e.target.value = '';
    }
  };

  const handleLoadSampleBatch = () => {
    const generatePhoto = (type: 'underexposed' | 'warm_cluttered'): Promise<File> => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1600;
        const ctx = canvas.getContext('2d')!;

        if (type === 'underexposed') {
          const grad = ctx.createLinearGradient(0, 0, 0, 1600);
          grad.addColorStop(0, '#2b3648');
          grad.addColorStop(1, '#1e2430');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1200, 1600);
        } else {
          const grad = ctx.createLinearGradient(0, 0, 0, 1600);
          grad.addColorStop(0, '#664a38');
          grad.addColorStop(1, '#4a3222');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1200, 1600);
        }

        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.ellipse(600, 1600, 480, 520, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(510, 1140);
        ctx.lineTo(600, 1320);
        ctx.lineTo(690, 1140);
        ctx.lineTo(600, 1100);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = type === 'underexposed' ? '#9a7b68' : '#d2a688';
        ctx.fillRect(540, 960, 120, 200);

        ctx.beginPath();
        ctx.ellipse(600, 750, 250, 320, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.ellipse(600, 520, 260, 160, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(510, 720, 36, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(690, 720, 36, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#27272a';
        ctx.beginPath();
        ctx.arc(510, 720, 16, 0, Math.PI * 2);
        ctx.arc(690, 720, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#884444';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(600, 890, 40, 0.1, Math.PI - 0.1);
        ctx.stroke();

        canvas.toBlob(
          (blob) => {
            const name = type === 'underexposed' ? 'Contoh_Foto_Shadow_01.jpg' : 'Contoh_Foto_Studio_02.jpg';
            resolve(new File([blob!], name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.95
        );
      });
    };

    Promise.all([generatePhoto('underexposed'), generatePhoto('warm_cluttered')]).then((files) => {
      onAddFiles(files);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setInputError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles: File[] = [];
      const invalidNames: string[] = [];

      Array.from(e.dataTransfer.files).forEach((f) => {
        if (f.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
          validFiles.push(f);
        } else {
          invalidNames.push(f.name);
        }
      });

      if (invalidNames.length > 0) {
        setInputError(
          `${invalidNames.length} file ditolak karena bukan JPG, PNG, atau WebP: ${invalidNames.slice(0, 3).join(', ')}${invalidNames.length > 3 ? '...' : ''}`
        );
      }

      if (validFiles.length > 0) {
        onAddFiles(validFiles);
      }
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
      {/* Hidden Multi-file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded border border-amber-400/20">
              MODE BATCH PHOTO
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Total {totalCount} Foto
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Unggah banyak foto sekaligus, proses dengan parameter ijazah non-generatif 600 DPI, dan unduh paket ZIP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {totalCount === 0 && (
            <button
              type="button"
              onClick={handleLoadSampleBatch}
              disabled={isProcessing}
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Contoh Foto Batch
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            Tambah Foto
          </button>

          {totalCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              disabled={isProcessing}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 hover:border-rose-700/50 hover:text-rose-300 text-slate-400 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Hapus semua foto dalam antrean"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Semua
            </button>
          )}

          {idleCount > 0 || errorCount > 0 ? (
            <button
              type="button"
              onClick={onStartProcessing}
              disabled={isProcessing || totalCount === 0}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Memproses ({processingCount})...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  Mulai Proses Batch ({idleCount + errorCount})
                </>
              )}
            </button>
          ) : null}

          {doneCount > 0 && onExportZip && (
            <button
              type="button"
              onClick={onExportZip}
              disabled={isExportingZip}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExportingZip ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Membuat ZIP...
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  Download ZIP ({doneCount})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error Banner if any files failed validation */}
      {inputError && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{inputError}</span>
        </div>
      )}

      {/* Counters Bar */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Total</span>
            <span className="text-base font-bold text-white font-mono">{totalCount}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Menunggu</span>
            <span className="text-base font-bold text-amber-300 font-mono">{idleCount}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Diproses</span>
            <span className="text-base font-bold text-blue-400 font-mono">{processingCount}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Berhasil</span>
            <span className="text-base font-bold text-emerald-400 font-mono">{doneCount}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Gagal</span>
            <span className="text-base font-bold text-rose-400 font-mono">{errorCount}</span>
          </div>
        </div>
      )}

      {/* Progress Bar (Visible when processing or partially processed) */}
      {totalCount > 0 && (isProcessing || doneCount > 0 || errorCount > 0) && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Progres Batch:</span>
            <span className="text-amber-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Drop Zone (Compact when items exist, larger when empty) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl transition-all cursor-pointer text-center ${
          dragOver
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-slate-800 hover:border-amber-400/50 bg-slate-950/40 hover:bg-slate-950/70'
        } ${totalCount === 0 ? 'p-8 sm:p-12' : 'p-4'}`}
      >
        <div className="flex items-center justify-center gap-3">
          <Upload className={`text-amber-400 ${totalCount === 0 ? 'w-8 h-8 mb-2' : 'w-5 h-5'}`} />
          <div className="text-left">
            <p className="text-xs sm:text-sm font-semibold text-white">
              {totalCount === 0
                ? 'Tarik dan Lepas Banyak Foto di Sini, atau Pilih dari Komputer'
                : 'Tarik & Lepas Foto Tambahan di Sini (+ Tambah)'}
            </p>
            <p className="text-[11px] text-slate-400">
              Format: JPG, JPEG, PNG, WebP • Bisa pilih banyak sekaligus
            </p>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Daftar Foto Batch ({items.length})</span>
            <span className="text-[11px] font-normal text-slate-400">
              Klik foto untuk melihat & menyesuaikan di Studio
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const isSelected = activeItemId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item.id)}
                  className={`relative p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-16 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative">
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {item.status === 'done' && (
                      <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-slate-950" />
                      </span>
                    )}
                  </div>

                  {/* Info & Status */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate" title={item.name}>
                        #{idx + 1} {item.name}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                      <span>
                        {item.metadata.width}×{item.metadata.height}px
                      </span>
                      <span>•</span>
                      <span>{(item.file.size / 1024).toFixed(0)} KB</span>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.status === 'idle' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          Menunggu
                        </span>
                      )}
                      {(item.status === 'analyzing' || item.status === 'processing' || item.status === 'waiting_analysis' || item.status === 'waiting_processing') && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          {item.progressText || 'Memproses...'}
                        </span>
                      )}
                      {item.status === 'done' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          Selesai 600 DPI {item.durationMs ? `(${(item.durationMs / 1000).toFixed(1)}s)` : ''}
                        </span>
                      )}
                      {(item.status === 'error' || item.status === 'analysis_error') && (
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 truncate max-w-[170px]"
                          title={item.errorMessage}
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                          {item.errorType === 'timeout'
                            ? `Timeout: ${item.errorMessage || 'Waktu habis'}`
                            : item.errorType === 'rate_limit'
                            ? `Rate Limit 429: ${item.errorMessage || 'Batas request'}`
                            : item.errorType === 'quota'
                            ? `Kuota Habis: ${item.errorMessage || 'Kuota habis'}`
                            : item.errorType === 'auth'
                            ? `Auth: ${item.errorMessage || 'API Key bermasalah'}`
                            : item.errorMessage || 'Gagal'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions on Card */}
                  <div className="flex flex-col items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {(item.status === 'error' || item.status === 'analysis_error') && (
                      <button
                        type="button"
                        onClick={() => onRetryItem(item.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                        title="Coba proses ulang foto ini"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-40"
                      title="Hapus foto ini dari batch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
