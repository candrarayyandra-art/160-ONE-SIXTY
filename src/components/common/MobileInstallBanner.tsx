import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles } from 'lucide-react';
import { InstallGuideModal } from './InstallGuideModal';

export const MobileInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if dismissed before in this session
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    setIsDismissed(dismissed);

    // Check if already running as installed app
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
      });
    } else {
      setShowModal(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <>
      <div className="md:hidden fixed bottom-14 left-2 right-2 z-30 no-print animate-in slide-in-from-bottom duration-300">
        <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white p-2.5 sm:p-3 rounded-2xl shadow-xl border border-sky-500/30 flex items-center justify-between gap-2.5 backdrop-blur-md">
          <div
            onClick={handleInstallClick}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center font-black text-white text-xs shadow-md shadow-sky-500/30 shrink-0">
              160
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-xs text-white leading-tight">Instal Langsung ke HP</span>
                <Sparkles className="w-3 h-3 text-cyan-300 shrink-0" />
              </div>
              <p className="text-[10px] text-sky-200 truncate">
                Jadikan aplikasi lokal mandiri & bekerja offline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="py-1.5 px-3 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white rounded-xl text-xs font-black shadow-md shadow-sky-500/20 active:scale-95 transition flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Instal
            </button>
            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300"
              title="Tutup banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <InstallGuideModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        deferredPrompt={deferredPrompt}
        onInstalled={() => setIsStandalone(true)}
      />
    </>
  );
};
