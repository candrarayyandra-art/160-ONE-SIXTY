import React, { useState } from 'react';
import {
  Sliders,
  Store,
  Printer,
  Volume2,
  Bell,
  Trash2,
  Save,
  Check,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  resetTransactionsOnly,
  resetMasterAndTransactions,
  resetTotalDatabase
} from '../db/indexedDb';

export const SettingsView: React.FC = () => {
  const { appConfig, updateAppConfig, testAudio, currentUser, logAudit, triggerRefresh } = useApp();

  const [depotName, setDepotName] = useState(appConfig.depotName || '160 ONE SIXTY');
  const [subtitle, setSubtitle] = useState(appConfig.subtitle || 'Sistem Operasional Depot Air Minum RO');
  const [address, setAddress] = useState(appConfig.address || 'Jl. Raya Depot No. 160');
  const [phone, setPhone] = useState(appConfig.phone || '081234567890');
  const [footerNote, setFooterNote] = useState(appConfig.footerNote || 'Terima kasih atas kepercayaan Anda.');
  const [signerName, setSignerName] = useState(appConfig.signerName || 'Pengelola Depot');
  const [receiptSize, setReceiptSize] = useState(appConfig.receiptSize || 'thermal_80');
  const [reminderTime, setReminderTime] = useState(appConfig.reminderClosingTime || '21:00');

  // Sound & Notification
  const [soundEnabled, setSoundEnabled] = useState(appConfig.soundEnabled ?? true);
  const [soundVolume, setSoundVolume] = useState(appConfig.soundVolume ?? 80);
  const [notifSettings, setNotifSettings] = useState(appConfig.notificationSettings || {
    orderBaru: true,
    delivery: true,
    piutang: true,
    galon: true,
    stok: true,
    maintenance: true,
    closing: true,
    sync: true
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAppConfig({
      depotName,
      subtitle,
      address,
      phone,
      footerNote,
      signerName,
      receiptSize,
      reminderClosingTime: reminderTime,
      soundEnabled,
      soundVolume,
      notificationSettings: notifSettings
    });

    await logAudit('EDIT', 'PENGATURAN', 'Memperbarui profil usaha, printer & notifikasi');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Reset Data functions strictly adhering to Requirement #72 & #73
  const handleResetTransactions = async () => {
    if (currentUser?.role !== 'SUPER ADMIN') {
      alert('Hanya Super Admin yang diizinkan melakukan reset!');
      return;
    }
    const pin = prompt('Konfirmasi: Masukkan PIN Super Admin untuk RESET TRANSAKSI:');
    if (pin !== currentUser.pin) {
      alert('PIN Salah!');
      return;
    }

    if (confirm('PERINGATAN: Semua order, pengiriman, pembayaran, kas, beban dan mutasi akan dihapus bersih tanpa data contoh. Lanjutkan?')) {
      await resetTransactionsOnly();
      await logAudit('RESET', 'DATABASE', 'Melakukan RESET TRANSAKSI');
      alert('Transaksi berhasil direset. Database kosong.');
      triggerRefresh();
    }
  };

  const handleResetMasterAndTx = async () => {
    if (currentUser?.role !== 'SUPER ADMIN') {
      alert('Hanya Super Admin yang diizinkan melakukan reset!');
      return;
    }
    const pin = prompt('Konfirmasi: Masukkan PIN Super Admin untuk RESET MASTER & TRANSAKSI:');
    if (pin !== currentUser.pin) {
      alert('PIN Salah!');
      return;
    }

    if (confirm('PERINGATAN: Semua pelanggan, produk, dan transaksi akan dikosongkan. Lanjutkan?')) {
      await resetMasterAndTransactions();
      await logAudit('RESET', 'DATABASE', 'Melakukan RESET MASTER & TRANSAKSI');
      alert('Master dan Transaksi berhasil direset.');
      triggerRefresh();
    }
  };

  const handleResetTotal = async () => {
    if (currentUser?.role !== 'SUPER ADMIN') {
      alert('Hanya Super Admin yang diizinkan melakukan reset total!');
      return;
    }
    const pin = prompt('Konfirmasi: Masukkan PIN Super Admin untuk RESET TOTAL:');
    if (pin !== currentUser.pin) {
      alert('PIN Salah!');
      return;
    }

    if (confirm('PERINGATAN TINGGI: Seluruh database lokal akan dikosongkan total! Lanjutkan?')) {
      await resetTotalDatabase();
      await logAudit('RESET', 'DATABASE', 'Melakukan RESET TOTAL DATABASE');
      alert('Database lokal berhasil direset total.');
      triggerRefresh();
      window.location.reload();
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Pengaturan Usaha & Sistem</h2>
        <p className="text-xs text-slate-500">Konfigurasi nama depot, struk nota, printer, notifikasi suara & reset database</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. Profil Usaha Depot */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Store className="w-5 h-5 text-sky-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Identitas Usaha Depot</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nama Depot *</label>
              <input
                type="text"
                value={depotName}
                onChange={(e) => setDepotName(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Subjudul / Slogan</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Jam Pengingat Closing Harian</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Alamat Lengkap Depot</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full p-2.5 border border-slate-200 rounded-xl resize-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Format Struk & Printer */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Printer className="w-5 h-5 text-sky-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Format Dokumen & Printer</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Ukuran Struk Nota</label>
              <select
                value={receiptSize}
                onChange={(e) => setReceiptSize(e.target.value as any)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold"
              >
                <option value="thermal_80">Thermal 80mm (Standar POS)</option>
                <option value="thermal_58">Thermal 58mm (Mini Portable)</option>
                <option value="a4">Kertas A4 / Surat Jalan</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nama Penandatangan (Slip/Nota)</label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Pengelola Depot, Kasir..."
                className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Catatan Kaki (Footer) Nota</label>
              <input
                type="text"
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* 3. Notifikasi & Suara Order Baru */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-sky-600" />
              <h3 className="font-extrabold text-sm text-slate-800">Suara & Notifikasi Order</h3>
            </div>
            <button
              type="button"
              onClick={testAudio}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Test Bunyi Chime
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
              <div>
                <strong className="block text-slate-800 font-bold">Suara Notifikasi Order Masuk</strong>
                <span className="text-slate-500 text-[11px]">
                  Memainkan nada lonceng jernih (Web Audio) saat pesanan baru masuk
                </span>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-5 h-5 accent-sky-600 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>Volume Suara</span>
                <span>{soundVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={soundVolume}
                onChange={(e) => setSoundVolume(parseInt(e.target.value) || 0)}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            {/* Checklist Notifikasi */}
            <div className="pt-2">
              <label className="font-bold text-slate-700 block mb-2">Jenis Notifikasi Aktif:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(notifSettings).map(([key, val]) => (
                  <label
                    key={key}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center gap-2 cursor-pointer font-medium text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => setNotifSettings({ ...notifSettings, [key]: e.target.checked })}
                      className="accent-sky-600 rounded"
                    />
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black text-xs sm:text-sm shadow-lg shadow-sky-600/20 flex items-center gap-2 transition active:scale-95"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savedSuccess ? 'Pengaturan Tersimpan!' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>

      {/* 4. RESET DATA (Strictly Super Admin Only) */}
      <div className="bg-rose-50/50 p-5 rounded-3xl border border-rose-200 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3 className="font-extrabold text-sm text-rose-900">Zona Bahaya: Reset Database Lokal</h3>
        </div>
        <p className="text-xs text-rose-800 leading-relaxed">
          Tindakan ini permanen. Sesuai aturan sistem 160 ONE SIXTY, setelah reset database akan <strong>bersih tanpa membuat data dummy atau sample</strong>.
        </p>

        <div className="flex flex-wrap gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleResetTransactions}
            className="px-3.5 py-2 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-xl font-bold text-xs shadow-2xs transition"
          >
            Reset Transaksi Saja
          </button>

          <button
            type="button"
            onClick={handleResetMasterAndTx}
            className="px-3.5 py-2 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-xl font-bold text-xs shadow-2xs transition"
          >
            Reset Master & Transaksi
          </button>

          <button
            type="button"
            onClick={handleResetTotal}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow transition"
          >
            Reset Total Database
          </button>
        </div>
      </div>
    </div>
  );
};
