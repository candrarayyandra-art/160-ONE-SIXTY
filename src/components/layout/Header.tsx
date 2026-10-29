import React, { useState, useEffect } from 'react';
import {
  Bell,
  Wifi,
  WifiOff,
  User as UserIcon,
  Download,
  Volume2,
  Calendar,
  Lock,
  ChevronDown,
  Smartphone
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PeriodFilterOption } from '../../types';
import { InstallGuideModal } from '../common/InstallGuideModal';

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenPinModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotifications, onOpenPinModal }) => {
  const {
    currentUser,
    appConfig,
    isOnline,
    unreadNotificationCount,
    periodFilter,
    setPeriodFilter,
    customDateRange,
    setCustomDateRange,
    testAudio
  } = useApp();

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(() => {
        setInstallPrompt(null);
      });
    } else {
      setShowInstallGuide(true);
    }
  };

  const handlePeriodChange = (val: PeriodFilterOption) => {
    setPeriodFilter(val);
    if (val === 'CUSTOM') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2.5 flex items-center justify-between no-print">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white font-black shadow-md shadow-sky-500/20 text-sm sm:text-base tracking-wider shrink-0">
          160
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight">
              {appConfig.depotName || '160 ONE SIXTY'}
            </h1>
            {/* Online / Offline status indicator */}
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isOnline ? 'Terhubung (Online)' : 'Mode Offline (Data tersimpan lokal)'}
            >
              {isOnline ? <Wifi className="w-2.5 h-2.5 text-emerald-600" /> : <WifiOff className="w-2.5 h-2.5 text-amber-600" />}
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block truncate max-w-[280px]">
            {appConfig.subtitle || 'Sistem Operasional Depot Air Minum RO'}
          </p>
        </div>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Global Period Selector */}
        <div className="relative flex items-center">
          <div className="flex items-center bg-slate-100 hover:bg-slate-200/80 rounded-lg p-1 border border-slate-200 text-xs text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1 hidden sm:block" />
            <select
              value={periodFilter}
              onChange={(e) => handlePeriodChange(e.target.value as PeriodFilterOption)}
              className="bg-transparent font-medium text-xs py-1 px-1.5 focus:outline-none cursor-pointer text-slate-700"
            >
              <option value="TODAY">Hari Ini</option>
              <option value="YESTERDAY">Kemarin</option>
              <option value="LAST_7_DAYS">7 Hari Terakhir</option>
              <option value="THIS_WEEK">Minggu Ini</option>
              <option value="THIS_MONTH">Bulan Ini</option>
              <option value="LAST_MONTH">Bulan Lalu</option>
              <option value="THIS_YEAR">Tahun Ini</option>
              <option value="ALL">Semua Data</option>
              <option value="CUSTOM">Custom Tanggal</option>
            </select>
          </div>

          {showCustomDate && (
            <div className="absolute right-0 top-11 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 flex flex-col gap-2 min-w-[240px]">
              <span className="text-xs font-semibold text-slate-700">Pilih Rentang Tanggal</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                  className="w-full text-xs p-1.5 border rounded-lg border-slate-300"
                />
                <span className="text-xs text-slate-400">s/d</span>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                  className="w-full text-xs p-1.5 border rounded-lg border-slate-300"
                />
              </div>
              <button
                onClick={() => setShowCustomDate(false)}
                className="w-full py-1 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
              >
                Terapkan
              </button>
            </div>
          )}
        </div>

        {/* Test Audio Chime Button (Desktop quick test) */}
        <button
          onClick={testAudio}
          title="Tes Suara Notifikasi Order"
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Install App button (Prominent on Mobile and Desktop) */}
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl shadow-xs transition active:scale-95"
          title="Pasang Aplikasi di HP Sendiri (PWA / Offline)"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pasang di HP</span>
        </button>

        {/* Notification Bell with Badge */}
        <button
          onClick={onOpenNotifications}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition border border-slate-200"
          title="Notification Center"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center px-1 shadow animate-pulse">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </button>

        {/* User Account / Role switcher */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-1.5 py-1 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition text-xs"
          >
            <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden md:block">
              <p className="font-bold text-[11px] leading-tight text-slate-800 truncate max-w-[90px]">
                {currentUser?.name || 'Super Admin'}
              </p>
              <p className="text-[9px] font-semibold text-sky-600 leading-tight">
                {currentUser?.role || 'SUPER ADMIN'}
              </p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 top-11 bg-white border border-slate-200 rounded-xl shadow-xl py-2 w-48 z-50">
              <div className="px-3 py-1.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{currentUser?.name}</p>
                <p className="text-[10px] font-medium text-sky-600">{currentUser?.role}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  onOpenPinModal();
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Ganti User / PIN
              </button>
            </div>
          )}
        </div>
      </div>

      <InstallGuideModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        deferredPrompt={installPrompt}
        onInstalled={() => setInstallPrompt(null)}
      />
    </header>
  );
};
