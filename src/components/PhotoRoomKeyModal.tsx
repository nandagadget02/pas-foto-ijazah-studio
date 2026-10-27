import React, { useState, useEffect } from 'react';
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Trash2,
  X,
  Loader2,
  Scissors,
  ShieldCheck,
} from 'lucide-react';
import { PhotoRoomService } from '../services/PhotoRoomService';

interface PhotoRoomKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (apiKey: string) => void;
}

export const PhotoRoomKeyModal: React.FC<PhotoRoomKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved,
}) => {
  const [keyInput, setKeyInput] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    ok?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKeyInput(PhotoRoomService.getApiKey());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!keyInput.trim()) {
      setTestResult({
        ok: false,
        error: 'Harap masukkan Kunci API PhotoRoom terlebih dahulu.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await PhotoRoomService.testApiKey(keyInput.trim());
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSave = () => {
    PhotoRoomService.setApiKey(keyInput.trim());
    if (onKeySaved) onKeySaved(keyInput.trim());
    onClose();
  };

  const handleClear = () => {
    setKeyInput('');
    setTestResult(null);
    PhotoRoomService.clearApiKey();
    if (onKeySaved) onKeySaved('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Konfigurasi PhotoRoom API</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Sandbox & Live Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                AI Background Removal cloud untuk isolasi subjek super presisi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Info Banner Sandbox */}
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-200/90 leading-relaxed">
              <strong className="text-purple-300 font-semibold block mb-0.5">
                Gratis 1.000 Gambar / Bulan (Kunci Sandbox)
              </strong>
              Anda dapat menggunakan <strong>Kunci API Sandbox</strong> dari dashboard PhotoRoom untuk mencoba hingga 1.000 foto/bulan secara gratis.
            </div>
          </div>

          {/* Input Kunci API */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Kunci API PhotoRoom (Sandbox atau Live):
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sandbox_... atau live_..."
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showKey ? 'Sembunyikan Kunci' : 'Tampilkan Kunci'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Hasil Tes Koneksi */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs animate-in fade-in ${
                testResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 leading-relaxed">
                <span className="font-bold block">
                  {testResult.ok ? 'Verifikasi Sukses' : 'Verifikasi Gagal'}
                </span>
                <span>{testResult.message || testResult.error}</span>
              </div>
            </div>
          )}

          {/* Link ke Dashboard PhotoRoom */}
          <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Tersimpan privat di browser Anda
            </span>
            <a
              href="https://www.photoroom.com/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 hover:underline"
            >
              Dapatkan Kunci API
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {keyInput && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Hapus Kunci API dari perangkat"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            )}
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !keyInput.trim()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  Menguji...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Test Koneksi
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
            >
              Simpan & Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
