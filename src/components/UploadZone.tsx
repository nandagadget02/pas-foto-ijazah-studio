import React, { useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  AlertCircle,
  FileText,
  CheckCircle2,
  Sparkles,
  User,
  Layers,
} from 'lucide-react';
import { BatchPhotoItem, ImageMetadata, PhotoInputMode } from '../types/analysis';
import { BackgroundEngine } from '../image/BackgroundEngine';
import { BatchManagerPanel } from './BatchManagerPanel';

interface UploadZoneProps {
  inputMode?: PhotoInputMode;
  onChangeInputMode?: (mode: PhotoInputMode) => void;
  onImageSelected: (img: HTMLImageElement, file: File, meta: ImageMetadata) => void;
  isLoading?: boolean;
  batchItems?: BatchPhotoItem[];
  onAddBatchFiles?: (files: FileList | File[]) => void;
  onRemoveBatchItem?: (id: string) => void;
  onClearAllBatch?: () => void;
  onStartBatchProcessing?: () => void;
  isBatchProcessing?: boolean;
  activeBatchItemId?: string | null;
  onSelectBatchItem?: (id: string) => void;
  onRetryBatchItem?: (id: string) => void;
  onExportBatchZip?: () => void;
  isExportingZip?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  inputMode = 'single',
  onChangeInputMode,
  onImageSelected,
  isLoading = false,
  batchItems = [],
  onAddBatchFiles,
  onRemoveBatchItem,
  onClearAllBatch,
  onStartBatchProcessing,
  isBatchProcessing = false,
  activeBatchItemId = null,
  onSelectBatchItem,
  onRetryBatchItem,
  onExportBatchZip,
  isExportingZip = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      alert('Format foto harus berupa JPG, JPEG, PNG, atau WebP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const hasTrans = file.type === 'image/png' && BackgroundEngine.detectTransparency(img);
        const meta: ImageMetadata = {
          name: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: Number((img.naturalWidth / img.naturalHeight).toFixed(2)),
          format: file.type.split('/')[1].toUpperCase(),
          sizeBytes: file.size,
          hasTransparency: hasTrans,
        };
        onImageSelected(img, file, meta);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Preset sample studio photos generated on canvas so user can immediately test without external upload
  const loadSamplePhoto = (type: 'underexposed' | 'warm_cluttered') => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d')!;

    // Background
    if (type === 'underexposed') {
      const grad = ctx.createLinearGradient(0, 0, 0, 1600);
      grad.addColorStop(0, '#2b3648');
      grad.addColorStop(1, '#1e2430');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 1600);
    } else {
      // Warm room background with slight gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 1600);
      grad.addColorStop(0, '#664a38');
      grad.addColorStop(1, '#4a3222');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 1600);
    }

    // Body/Shoulders
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.ellipse(600, 1600, 480, 520, 0, 0, Math.PI * 2);
    ctx.fill();

    // White shirt collar
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(510, 1140);
    ctx.lineTo(600, 1320);
    ctx.lineTo(690, 1140);
    ctx.lineTo(600, 1100);
    ctx.closePath();
    ctx.fill();

    // Tie
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(585, 1280);
    ctx.lineTo(615, 1280);
    ctx.lineTo(625, 1600);
    ctx.lineTo(575, 1600);
    ctx.closePath();
    ctx.fill();

    // Head / Face
    ctx.fillStyle = type === 'underexposed' ? '#b88267' : '#e6ab8e';
    ctx.beginPath();
    ctx.ellipse(600, 720, 240, 310, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(600, 620, 248, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(510, 680, 22, 0, Math.PI * 2);
    ctx.arc(690, 680, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(505, 675, 7, 0, Math.PI * 2);
    ctx.arc(685, 675, 7, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(465, 635);
    ctx.lineTo(555, 635);
    ctx.moveTo(645, 635);
    ctx.lineTo(735, 635);
    ctx.stroke();

    // Nose
    ctx.strokeStyle = type === 'underexposed' ? '#8c5e4b' : '#c98a6d';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(600, 680);
    ctx.lineTo(590, 765);
    ctx.lineTo(615, 765);
    ctx.stroke();

    // Mouth
    ctx.fillStyle = type === 'underexposed' ? '#8a5c4e' : '#c27d6d';
    ctx.beginPath();
    ctx.ellipse(600, 840, 48, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Convert canvas to File
    canvas.toBlob((blob) => {
      if (!blob) return;
      const fileName = type === 'underexposed' ? 'sample_underexposed_id.jpg' : 'sample_warm_studio.jpg';
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      const img = new Image();
      img.onload = () => {
        const meta: ImageMetadata = {
          name: fileName,
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: Number((img.naturalWidth / img.naturalHeight).toFixed(2)),
          format: 'JPEG',
          sizeBytes: blob.size,
        };
        onImageSelected(img, file, meta);
      };
      img.src = canvas.toDataURL('image/jpeg', 0.95);
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="space-y-6">
      {/* MODE SELECTOR: SINGLE PHOTO vs BATCH PHOTO */}
      {onChangeInputMode && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
              Langkah 1 — Input Foto
            </span>
            <span className="text-xs text-slate-300 font-semibold hidden md:inline">
              Pilih Alur Kerja:
            </span>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onChangeInputMode('single')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                inputMode === 'single'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              SINGLE PHOTO
            </button>
            <button
              type="button"
              onClick={() => onChangeInputMode('batch')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                inputMode === 'batch'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              BATCH PHOTO
              {batchItems && batchItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-900 text-amber-300 font-bold border border-amber-400/30">
                  {batchItems.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Render Mode Terpilih */}
      {inputMode === 'batch' && onAddBatchFiles && onRemoveBatchItem && onClearAllBatch && onStartBatchProcessing && onSelectBatchItem && onRetryBatchItem ? (
        <BatchManagerPanel
          items={batchItems}
          onAddFiles={onAddBatchFiles}
          onRemoveItem={onRemoveBatchItem}
          onClearAll={onClearAllBatch}
          onStartProcessing={onStartBatchProcessing}
          isProcessing={isBatchProcessing}
          activeItemId={activeBatchItemId}
          onSelectItem={onSelectBatchItem}
          onRetryItem={onRetryBatchItem}
          onExportZip={onExportBatchZip}
          isExportingZip={isExportingZip}
        />
      ) : (
        /* SINGLE PHOTO UPLOAD ZONE */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Upload Foto Referensi Tunggal
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Mendukung format JPG, JPEG, PNG, dan WebP. Foto sumber adalah{' '}
                <strong className="text-amber-300 font-semibold">Source of Truth</strong> (identitas 100% terkunci).
              </p>
            </div>

            {/* Quick sample buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Contoh Siap Pakai:</span>
              <button
                type="button"
                onClick={() => loadSamplePhoto('underexposed')}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Contoh Gelap (Shadow)
              </button>
              <button
                type="button"
                onClick={() => loadSamplePhoto('warm_cluttered')}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Contoh Studio Hangat
              </button>
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
              isLoading
                ? 'border-amber-500/50 bg-amber-500/5 cursor-wait'
                : 'border-slate-700 hover:border-amber-400/60 hover:bg-slate-800/40 bg-slate-950/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-1">
              Tarik dan Lepas Foto di Sini, atau{' '}
              <span className="text-amber-400 hover:underline">Pilih dari Komputer</span>
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Unggah foto pas foto untuk langsung diedit dan disesuaikan. Analisis pencahayaan dan rekomendasi parameter dapat dijalankan secara mandiri (offline) atau via AI.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Resolusi Asli Terjaga
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Bebas Watermark
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Privasi Terjamin (Sesi Lokal)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
