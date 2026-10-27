import React, { useState } from 'react';
import {
  Download,
  FileCheck,
  CheckCircle2,
  ShieldCheck,
  Printer,
  Sparkles,
  Layers,
  Sliders,
  Archive,
  Loader2,
} from 'lucide-react';
import { BatchPhotoItem, OutputDimension, PrinterProfile } from '../types/analysis';

interface ExportPanelProps {
  onExport: (exportTarget: 'master' | 'print', format: 'png' | 'jpeg', quality: number) => Promise<string>;
  targetDimension: OutputDimension;
  mode: 'bw' | 'color';
  printerProfile?: PrinterProfile;
  isPrinterCompensationEnabled?: boolean;
  onOpenPrinterTab?: () => void;
  isBatchMode?: boolean;
  batchItems?: BatchPhotoItem[];
  onExportBatchZip?: (format: 'png' | 'jpeg', quality: number) => Promise<void>;
  isExportingBatch?: boolean;
  exportFormat?: 'png' | 'jpeg';
  onChangeFormat?: (format: 'png' | 'jpeg') => void;
  exportQuality?: number;
  onChangeQuality?: (quality: number) => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  onExport,
  targetDimension,
  mode,
  printerProfile = 'generic',
  isPrinterCompensationEnabled = false,
  onOpenPrinterTab,
  isBatchMode = false,
  batchItems = [],
  onExportBatchZip,
  isExportingBatch = false,
  exportFormat,
  onChangeFormat,
  exportQuality,
  onChangeQuality,
}) => {
  const [internalFormat, setInternalFormat] = useState<'png' | 'jpeg'>('png');
  const [internalQuality, setInternalQuality] = useState<number>(1.0);
  const [exportingTarget, setExportingTarget] = useState<'master' | 'print' | null>(null);
  const [lastExportedFile, setLastExportedFile] = useState<string | null>(null);

  const format = exportFormat ?? internalFormat;
  const setFormat = (newFmt: 'png' | 'jpeg') => {
    setInternalFormat(newFmt);
    onChangeFormat?.(newFmt);
  };

  const quality = exportQuality ?? internalQuality;
  const setQuality = (newQuality: number) => {
    setInternalQuality(newQuality);
    onChangeQuality?.(newQuality);
  };

  const dimSlug = `${targetDimension.widthCm}x${targetDimension.heightCm}cm`.replace('.', '_');
  const printerSlug = printerProfile === 'epson_l1210' ? 'epson-l1210' : 'generic';

  const masterFilename =
    mode === 'bw'
      ? `pas-foto-${dimSlug}-${targetDimension.dpi}dpi-grayscale.${format}`
      : `pas-foto-ijazah-${dimSlug}-${targetDimension.dpi}dpi.${format}`;

  const printFilename = `pas-foto-${dimSlug}-${targetDimension.dpi}dpi-print-${printerSlug}.${format}`;

  const handleDownload = async (target: 'master' | 'print') => {
    setExportingTarget(target);
    try {
      const filename = await onExport(target, format, quality);
      setLastExportedFile(filename);
    } catch (err: any) {
      alert(`Gagal mengekspor foto: ${err.message}`);
    } finally {
      setExportingTarget(null);
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono font-semibold tracking-wider uppercase text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
            Langkah Terakhir — Cetak & Simpan
          </span>
          <h3 className="text-2xl font-bold text-white mt-2 flex items-center gap-2">
            <Download className="w-6 h-6 text-amber-400" />
            Export Pas Foto Resolusi Penuh 600 DPI
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Siap cetak untuk Ijazah, Buku Nikah, Paspor, SKCK, SNPMB, dan dokumen kedinasan resmi.
          </p>
        </div>

        {/* Technical specs pill */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-right">
          <div className="text-xs text-slate-400 font-mono">Standar Cetak Lab:</div>
          <div className="text-sm font-bold text-emerald-400 font-mono">
            {targetDimension.targetWidthPx} × {targetDimension.targetHeightPx} Pixel
          </div>
          <div className="text-[11px] text-amber-400/90 font-mono">
            {targetDimension.widthCm} × {targetDimension.heightCm} cm @ {targetDimension.dpi} DPI
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Format Selector */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-300 block mb-3">
            PILIHAN FORMAT FILE
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat('png')}
              className={`py-2.5 px-3 rounded-lg border font-semibold text-xs transition-all cursor-pointer ${
                format === 'png'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              PNG (Lossless)
              <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                Default Resmi
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFormat('jpeg')}
              className={`py-2.5 px-3 rounded-lg border font-semibold text-xs transition-all cursor-pointer ${
                format === 'jpeg'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              JPEG (Photo)
              <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                Cetak Studio
              </span>
            </button>
          </div>
        </div>

        {/* JPEG Quality Selector (if applicable) */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-300 block mb-3">
            KUALITAS KOMPRESI
          </label>
          {format === 'jpeg' ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-mono">
                <span>Kualitas:</span>
                <span className="text-amber-400 font-bold">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.80"
                max="1.0"
                step="0.01"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex items-center gap-1.5 pt-1">
                {[0.85, 0.90, 0.95, 1.0].map((presetQ) => (
                  <button
                    key={presetQ}
                    type="button"
                    onClick={() => setQuality(presetQ)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                      Math.abs(quality - presetQ) < 0.005
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {Math.round(presetQ * 100)}%{presetQ === 1.0 ? ' (Maks)' : ''}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-amber-300/90 block leading-tight pt-1">
                ⚠️ Format JPEG menggunakan kompresi lossy. Untuk standar resmi dan arsip ijazah tanpa penurunan kualitas, disarankan memilih PNG (Lossless).
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 pt-1">
              <span className="text-emerald-400 font-semibold block mb-1">
                Kompresi Lossless Aktif
              </span>
              Setiap detail piksel, tekstur kulit, dan ketajaman mata disimpan 100% sempurna tanpa penurunan mutu.
            </div>
          )}
        </div>

        {/* Output Filenames Preview */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            PREVIEW NAMA FILE HASIL
          </label>
          {mode === 'bw' ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5 font-sans">Master Grayscale:</span>
                <span className="text-emerald-300 break-all select-all font-bold">{masterFilename}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5 font-sans">Print Version:</span>
                <span className="text-amber-300 break-all select-all font-bold">{printFilename}</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-amber-300 break-all select-all">
                {masterFilename}
              </div>
              <span className="text-[11px] text-slate-500 block mt-2">
                Sesuai standar penamaan arsip ijazah (ukuran + DPI).
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bagian I: Tombol Download Terpisah untuk Mode B&W / TRUE GRAYSCALE */}
      {mode === 'bw' ? (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Pilihan Output Ekspor (Master Netral vs Print Terkalibrasi)
            </span>
            {onOpenPrinterTab && (
              <button
                type="button"
                onClick={onOpenPrinterTab}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                Atur Profil Kompensasi Cetak
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opsi 1: EXPORT MASTER GRAYSCALE */}
            <div className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-5 flex flex-col justify-between transition-all">
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    MASTER — R = G = B
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <h4 className="text-base font-bold text-white">
                  Master True Grayscale
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Grayscale 100% netral murni tanpa color cast. Disimpan sebagai master source untuk arsip digital resmi, pangkalan data Dikti, dan verifikasi institusi.
                </p>
                <div className="text-[11px] font-mono text-slate-500">
                  Target file: <span className="text-slate-300">{masterFilename}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDownload('master')}
                disabled={exportingTarget !== null}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm tracking-wide border border-slate-700 hover:border-emerald-400/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {exportingTarget === 'master' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mengekspor Master 600 DPI...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-emerald-400" />
                    EXPORT MASTER GRAYSCALE
                  </>
                )}
              </button>
            </div>

            {/* Opsi 2: EXPORT PRINT VERSION */}
            <div className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 rounded-xl p-5 flex flex-col justify-between transition-all">
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                    PRINT VERSION — {printerProfile === 'epson_l1210' ? 'EPSON L1210' : 'GENERIC'}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${isPrinterCompensationEnabled ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                    Kompensasi: {isPrinterCompensationEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white">
                  Versi Cetak Printer (Terkalibrasi)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Menerapkan kompensasi warna mikro terisolasi untuk mengantisipasi ketidaksempurnaan tinta printer & kertas foto, menjaga cetakan fisik tampak netral.
                </p>
                <div className="text-[11px] font-mono text-slate-500">
                  Target file: <span className="text-slate-300">{printFilename}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDownload('print')}
                disabled={exportingTarget !== null}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm tracking-wide shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {exportingTarget === 'print' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Mengekspor Print Version 600 DPI...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    EXPORT PRINT VERSION
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Standar Color Mode Download Button */
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Foto hanya diproses selama sesi browser aktif dan tidak disimpan ke server publik.
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleDownload('master')}
            disabled={exportingTarget !== null}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base tracking-wide shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {exportingTarget !== null ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Menghasilkan File 600 DPI...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                DOWNLOAD PAS FOTO (600 DPI)
              </>
            )}
          </button>
        </div>
      )}

      {lastExportedFile && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            File <strong className="font-mono text-white">{lastExportedFile}</strong> berhasil
            diunduh ke perangkat Anda.
          </span>
        </div>
      )}

      {/* Batch ZIP Export Section */}
      {isBatchMode && batchItems.length > 0 && onExportBatchZip && (
        <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/15 via-slate-950 to-slate-950 border border-amber-500/30 rounded-2xl p-5 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-amber-400 bg-amber-400/20 px-2.5 py-0.5 rounded border border-amber-400/30">
                  PAKET EKSPOR BATCH ZIP
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {batchItems.filter((i) => i.status === 'done').length} dari {batchItems.length} Foto Selesai
                </span>
              </div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Archive className="w-4 h-4 text-amber-400" />
                Unduh Semua Foto Batch dalam File ZIP (600 DPI)
              </h4>
              <p className="text-xs text-slate-300 max-w-xl">
                Semua foto yang berstatus selesai akan dikemas otomatis ke dalam file .ZIP dengan resolusi cetak lab 600 DPI (format {format.toUpperCase()}), termasuk Master Grayscale dan Versi Cetak Terkalibrasi.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onExportBatchZip(format, quality)}
              disabled={isExportingBatch || batchItems.filter((i) => i.status === 'done').length === 0}
              className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50 shrink-0"
            >
              {isExportingBatch ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengemas Arsip ZIP...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  UNDUH PAKET BATCH (.ZIP)
                </>
              )}
            </button>
          </div>
        </div>
      )}
      {/* Banner Unduh APK Android Release */}
      <div className="mt-6 pt-5 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-white">Pas Foto Ijazah Studio untuk Android</h5>
              <p className="text-[11px] text-slate-400">Versi aplikasi mandiri (APK Release) dengan seluruh fitur studio non-generatif 600 DPI identik.</p>
            </div>
          </div>
          <a
            href="./Pas-Foto-Ijazah-Studio-Release.apk"
            download="Pas-Foto-Ijazah-Studio-Release.apk"
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all shadow-md shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Unduh APK Android</span>
          </a>
        </div>
      </div>
    </div>
  );
};
