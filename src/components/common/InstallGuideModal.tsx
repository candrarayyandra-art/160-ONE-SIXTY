import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Share,
  MoreVertical,
  CheckCircle2,
  HardDrive,
  WifiOff,
  Bell,
  X,
  PlusSquare,
  Sparkles
} from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstalled?: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled
}) => {
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop'>('android');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect iOS or Android
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    // Check if already running standalone
    const isAppInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isAppInstalled);
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        onInstalled?.();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-sky-600 to-cyan-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-white text-base shadow-sm">
              160
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">Pasang di HP Sendiri</h3>
              <p className="text-[11px] text-sky-100">Jadikan Aplikasi Lokal Tanpa Perlu APK</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status jika sudah terpasang */}
          {isStandalone ? (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="block font-bold">Aplikasi Sudah Terpasang!</strong>
                <span>Aplikasi 160 ONE SIXTY saat ini sedang berjalan sebagai aplikasi lokal mandiri di HP Anda.</span>
              </div>
            </div>
          ) : (
            <>
              {/* Tombol Pasang Langsung jika browser mendukung prompt */}
              {deferredPrompt && (
                <button
                  onClick={handleNativeInstall}
                  className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white rounded-2xl font-black text-sm shadow-md shadow-sky-600/20 active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Pasang Aplikasi Sekarang (1-Klik)
                </button>
              )}

              {/* Tab Pilihan Panduan HP */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setDeviceType('android')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition ${
                    deviceType === 'android' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  HP Android (Chrome)
                </button>
                <button
                  onClick={() => setDeviceType('ios')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition ${
                    deviceType === 'ios' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  iPhone (Safari)
                </button>
              </div>

              {/* Panduan Android */}
              {deviceType === 'android' && (
                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Smartphone className="w-4 h-4 text-sky-600" />
                    Cara Pasang di HP Android (Chrome / Samsung):
                  </div>
                  <ol className="space-y-2 text-slate-600 list-decimal pl-4 leading-relaxed">
                    <li>
                      Buka aplikasi ini menggunakan browser <strong>Google Chrome</strong> di HP Anda.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span>Ketuk menu titik tiga</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-bold text-[10px]">
                        <MoreVertical className="w-3 h-3 inline" /> Menu
                      </span>
                      <span>di sudut kanan atas layar Chrome.</span>
                    </li>
                    <li>
                      Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama" (Add to Home screen)</strong>.
                    </li>
                    <li>
                      Ketuk <strong>"Instal"</strong>. Ikon <strong>160 ONE SIXTY</strong> akan langsung muncul di layar utama (home screen) HP Anda seperti aplikasi bawaan!
                    </li>
                  </ol>
                </div>
              )}

              {/* Panduan iOS (iPhone) */}
              {deviceType === 'ios' && (
                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Smartphone className="w-4 h-4 text-sky-600" />
                    Cara Pasang di iPhone / iPad (Safari):
                  </div>
                  <ol className="space-y-2 text-slate-600 list-decimal pl-4 leading-relaxed">
                    <li>
                      Buka link aplikasi ini di browser <strong>Safari</strong> iPhone Anda.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span>Ketuk tombol</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-bold text-[10px]">
                        <Share className="w-3 h-3 inline" /> Bagikan (Share)
                      </span>
                      <span>di bilah bawah Safari.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span>Gulir ke bawah dan pilih</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-bold text-[10px]">
                        <PlusSquare className="w-3 h-3 inline" /> Tambahkan ke Layar Utama
                      </span>
                    </li>
                    <li>
                      Ketuk <strong>"Tambah"</strong> di kanan atas. Selesai!
                    </li>
                  </ol>
                </div>
              )}
            </>
          )}

          {/* Keunggulan Menjalankan Aplikasi dari HP Sendiri */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <span className="font-bold text-slate-800 block text-xs">
              Keunggulan Aplikasi Lokal di HP:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-sky-50/70 border border-sky-100 rounded-xl">
                <HardDrive className="w-4 h-4 text-sky-600 mb-1" />
                <strong className="block text-slate-800 font-bold">Database Lokal (HP)</strong>
                <span className="text-slate-500">Data tersimpan langsung di memori HP Anda tanpa server luar.</span>
              </div>

              <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <WifiOff className="w-4 h-4 text-emerald-600 mb-1" />
                <strong className="block text-slate-800 font-bold">Tetap Berjalan Offline</strong>
                <span className="text-slate-500">Bisa membuat pesanan dan mencatat kas walau internet mati.</span>
              </div>

              <div className="p-2.5 bg-purple-50/70 border border-purple-100 rounded-xl">
                <Bell className="w-4 h-4 text-purple-600 mb-1" />
                <strong className="block text-slate-800 font-bold">Suara Notifikasi Order</strong>
                <span className="text-slate-500">Bunyi lonceng jernih saat order baru masuk di HP Anda.</span>
              </div>

              <div className="p-2.5 bg-amber-50/70 border border-amber-100 rounded-xl">
                <Sparkles className="w-4 h-4 text-amber-600 mb-1" />
                <strong className="block text-slate-800 font-bold">Layar Penuh (Full App)</strong>
                <span className="text-slate-500">Tampilan bersih tanpa bilah URL browser seperti aplikasi pro.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
