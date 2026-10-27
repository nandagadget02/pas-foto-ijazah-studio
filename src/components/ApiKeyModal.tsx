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
  Cpu,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { GeminiService } from '../services/GeminiService';

export const GEMINI_MODEL_OPTIONS = [
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    badge: 'Rekomendasi Default',
    desc: 'Model paling cepat, sangat hemat token, dan ideal untuk analisis parameter tonal pas foto.',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    badge: 'Cepat & Ringan',
    desc: 'Generasi 2.0 Flash Lite dengan latensi sangat rendah.',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    badge: 'Akurat & Keseimbangan Tinggi',
    desc: 'Kemampuan penalaran visual multimodal lebih mendalam untuk foto kompleks.',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    badge: 'Sangat Stabil',
    desc: 'Model produksi stabil standar dengan kompatibilitas luas.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Preview Terkini',
    desc: 'Versi generasi penerus Flash Lite untuk analisis inferensi modern.',
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    badge: 'Eksperimental',
    desc: 'Generasi Flash Lite terbaru untuk efisiensi komputasi maksimal.',
  },
  {
    id: 'custom',
    name: 'Custom Model ID',
    badge: 'Kustom',
    desc: 'Ketik identifier model Gemini khusus sesuai kebutuhan Anda.',
  },
];

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  selectedModel: string;
  onSave: (apiKey: string, model: string) => void;
  onClear: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey: initialApiKey,
  selectedModel: initialModel,
  onSave,
  onClear,
}) => {
  const [keyInput, setKeyInput] = useState<string>(initialApiKey);
  const [modelInput, setModelInput] = useState<string>(initialModel || 'gemini-2.5-flash-lite');
  const [customModelName, setCustomModelName] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    ok?: boolean;
    message?: string;
    model?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    setKeyInput(initialApiKey);
    const isStandardOption = GEMINI_MODEL_OPTIONS.some(
      (m) => m.id !== 'custom' && m.id === initialModel
    );
    if (isStandardOption) {
      setModelInput(initialModel);
      setCustomModelName('');
    } else if (initialModel) {
      setModelInput('custom');
      setCustomModelName(initialModel);
    } else {
      setModelInput('gemini-2.5-flash-lite');
      setCustomModelName('');
    }
    setTestResult(null);
  }, [initialApiKey, initialModel, isOpen]);

  if (!isOpen) return null;

  const effectiveModel =
    modelInput === 'custom' ? customModelName.trim() || 'gemini-2.5-flash-lite' : modelInput;

  const handleTestConnection = async () => {
    if (!keyInput.trim()) {
      setTestResult({
        ok: false,
        error: 'Harap masukkan API Key terlebih dahulu sebelum melakukan pengetesan.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await GeminiService.testApiKey(keyInput.trim(), effectiveModel);
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSave = () => {
    onSave(keyInput.trim(), effectiveModel);
    onClose();
  };

  const handleClear = () => {
    setKeyInput('');
    setTestResult(null);
    onClear();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Konfigurasi Gemini API Key
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                  Flash Lite Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pilih model Gemini Flash Lite untuk analisis pas foto non-generatif berkecepatan tinggi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Security Notice */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <strong>Penyimpanan Aman di Browser:</strong> API Key disimpan di peramban Anda (localStorage). Analisis hanya membaca histogram & kurva koreksi tonal secara <em>non-generatif</em> tanpa mengubah anatomi wajah asli.
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Google Gemini API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-normal text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
              >
                Dapatkan API Key Gratis di Google AI Studio
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                title={showKey ? 'Sembunyikan Key' : 'Tampilkan Key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              Model Gemini yang Digunakan
            </label>
            <div className="grid grid-cols-1 gap-2">
              {GEMINI_MODEL_OPTIONS.map((opt) => {
                const isSelected = modelInput === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setModelInput(opt.id)}
                    className={`text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-400/60 shadow-sm shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                          {opt.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                            isSelected
                              ? 'bg-amber-400/20 text-amber-200 border-amber-400/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{opt.desc}</p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400 text-slate-950'
                          : 'border-slate-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Model Name Input if 'custom' is selected */}
            {modelInput === 'custom' && (
              <div className="mt-2 pl-2 border-l-2 border-amber-400/40 space-y-1">
                <label className="text-[11px] font-mono text-slate-300">
                  Ketik Nama Model (contoh: gemini-3.5-flash-lite, gemini-3.8-flash, dll):
                </label>
                <input
                  type="text"
                  value={customModelName}
                  onChange={(e) => setCustomModelName(e.target.value)}
                  placeholder="gemini-3.5-flash-lite"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            )}
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold">
                  {testResult.ok ? 'Verifikasi Sukses' : 'Verifikasi Gagal'}
                </div>
                <div className="text-slate-300">
                  {testResult.message || testResult.error}
                </div>
                {testResult.model && (
                  <div className="text-[10px] font-mono text-emerald-400">
                    Model terkonfirmasi aktif: {testResult.model}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {keyInput && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:border-rose-700/50 hover:text-rose-300 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Hapus API Key tersimpan"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Key
              </button>
            )}

            <button
              type="button"
              disabled={isTesting || !keyInput.trim()}
              onClick={handleTestConnection}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  Menguji...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Test Koneksi
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Simpan & Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
