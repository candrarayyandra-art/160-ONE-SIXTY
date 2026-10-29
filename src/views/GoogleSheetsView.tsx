import React, { useState } from 'react';
import {
  Cloud,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Database,
  FileSpreadsheet,
  Server
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  testSheetsConnection,
  syncWithGoogleSheets,
  backupToGoogleSheets,
  checkCloudBackup,
  restoreFromCloudBackup,
  APPS_SCRIPT_CODE_TEMPLATE
} from '../services/sheetsSync';
import { exportAllDataToJson, importDataFromJson } from '../db/indexedDb';

export const GoogleSheetsView: React.FC = () => {
  const { appConfig, updateAppConfig, logAudit, triggerRefresh, currentUser } = useApp();

  const [url, setUrl] = useState(appConfig.sheetsUrl || '');
  const [token, setToken] = useState(appConfig.sheetsToken || '');
  const [showToken, setShowToken] = useState(false);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [progressStep, setProgressStep] = useState<string>('');

  const [copiedScript, setCopiedScript] = useState(false);
  const [previewBackupData, setPreviewBackupData] = useState<Record<string, any[]> | null>(null);

  // Test Connection
  const handleTestConnection = async () => {
    if (!url) {
      setStatusMessage({ text: 'Masukkan Web App URL terlebih dahulu.', type: 'error' });
      return;
    }
    setLoading(true);
    setStatusMessage({ text: 'Menguji koneksi ke Google Apps Script...', type: 'info' });
    const res = await testSheetsConnection(url, token);
    setLoading(false);
    setStatusMessage({ text: res.message, type: res.success ? 'success' : 'error' });
  };

  // Save Settings
  const handleSaveConnection = async () => {
    await updateAppConfig({ sheetsUrl: url, sheetsToken: token });
    await logAudit('EDIT', 'GOOGLE_SHEETS', 'Menyimpan konfigurasi URL & Token Google Sheets');
    setStatusMessage({ text: 'Pengaturan Google Sheets berhasil disimpan!', type: 'success' });
  };

  // 2-Way Sync (Pull -> Merge -> Upsert -> Push)
  const handleSync = async () => {
    if (!url) {
      setStatusMessage({ text: 'URL Google Apps Script belum disetel.', type: 'error' });
      return;
    }
    setLoading(true);
    const res = await syncWithGoogleSheets(url, token, (step) => setProgressStep(step));
    setLoading(false);
    setProgressStep('');

    if (res.success) {
      await updateAppConfig({ lastSyncAt: res.timestamp });
      await logAudit('SYNC', 'GOOGLE_SHEETS', res.message);
      setStatusMessage({ text: res.message, type: 'success' });
      triggerRefresh();
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  // Backup Now
  const handleBackupNow = async () => {
    if (!url) {
      setStatusMessage({ text: 'URL Google Apps Script belum disetel.', type: 'error' });
      return;
    }
    setLoading(true);
    const res = await backupToGoogleSheets(url, token, (step) => setProgressStep(step));
    setLoading(false);
    setProgressStep('');

    if (res.success) {
      const now = new Date().toISOString();
      await updateAppConfig({ lastBackupAt: now });
      await logAudit('BACKUP', 'GOOGLE_SHEETS', res.message);
      setStatusMessage({ text: res.message, type: 'success' });
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  // Check Cloud Backup
  const handleCheckBackup = async () => {
    if (!url) {
      setStatusMessage({ text: 'URL Google Apps Script belum disetel.', type: 'error' });
      return;
    }
    setLoading(true);
    setStatusMessage({ text: 'Mengecek data di Google Sheets...', type: 'info' });
    const res = await checkCloudBackup(url, token);
    setLoading(false);

    if (res.success && res.data) {
      setPreviewBackupData(res.data);
      const total = Object.values(res.data).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
      setStatusMessage({ text: `Backup ditemukan: ${total} total baris data pada Google Sheets.`, type: 'success' });
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  // Restore from Cloud (Manual with confirmation)
  const handleRestore = async () => {
    if (currentUser?.role !== 'SUPER ADMIN') {
      alert('Hanya Super Admin yang berhak melakukan Restore!');
      return;
    }
    if (!confirm('PERINGATAN: Memulihkan database dari Google Sheets akan menggabungkan data ke database lokal. Lanjutkan?')) return;

    setLoading(true);
    const res = await restoreFromCloudBackup(url, token, (step) => setProgressStep(step));
    setLoading(false);
    setProgressStep('');

    if (res.success) {
      await logAudit('RESTORE', 'GOOGLE_SHEETS', res.message);
      setStatusMessage({ text: res.message, type: 'success' });
      setPreviewBackupData(null);
      triggerRefresh();
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  // Offline File Backup / Restore JSON
  const handleExportOfflineJson = async () => {
    const data = await exportAllDataToJson();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Backup_160_ONE_SIXTY_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImportOfflineJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        const count = await importDataFromJson(json);
        alert(`Berhasil mengimpor ${count} data dari file offline!`);
        triggerRefresh();
      } catch (err) {
        alert('Gagal membaca file JSON: Format tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Google Sheets & Backup Cloud</h2>
        <p className="text-xs text-slate-500">
          Sinkronisasi dua arah, backup otomatis (1 baris per record) & pemulihan lintas perangkat HP & Komputer
        </p>
      </div>

      {/* Status banner if any */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-sky-50 text-sky-800 border border-sky-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Progress Step indicator */}
      {progressStep && (
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-800 flex items-center gap-2 animate-pulse">
          <RefreshCw className="w-4 h-4 text-sky-600 animate-spin" />
          <span>{progressStep}</span>
        </div>
      )}

      {/* 1. Koneksi Google Apps Script */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Server className="w-5 h-5 text-sky-600" />
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">Koneksi Google Apps Script Web App</h3>
            <p className="text-[11px] text-slate-500">Konektor spreadsheet Google Sheets tanpa butuh server backend mandiri</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Apps Script Web App URL</label>
            <input
              type="text"
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Secret Token</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="Token rahasia yang Anda setel di script"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-[11px] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <button
              onClick={handleTestConnection}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition disabled:opacity-50"
            >
              Uji Koneksi
            </button>
            <button
              onClick={handleSaveConnection}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow transition"
            >
              Simpan Koneksi
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tombol Operasi Sync, Backup, Restore */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <RefreshCw className="w-5 h-5 text-sky-600" />
          <h3 className="font-extrabold text-sm text-slate-800">Sinkronisasi & Backup</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Sinkronkan Dua Arah */}
          <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2 flex flex-col justify-between">
            <div>
              <strong className="block text-sky-900 font-bold text-xs">Sinkronkan Dua Arah</strong>
              <p className="text-[11px] text-sky-700 mt-1">
                Tarik perubahan terbaru dari Cloud, lalu kirimkan perubahan dari HP/Komputer ini.
              </p>
              {appConfig.lastSyncAt && (
                <span className="text-[10px] text-sky-600 block mt-2">
                  Terakhir: {new Date(appConfig.lastSyncAt).toLocaleString('id-ID')}
                </span>
              )}
            </div>
            <button
              onClick={handleSync}
              disabled={loading}
              className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sinkronkan Sekarang
            </button>
          </div>

          {/* Backup Sekarang */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2 flex flex-col justify-between">
            <div>
              <strong className="block text-emerald-900 font-bold text-xs">Backup ke Cloud</strong>
              <p className="text-[11px] text-emerald-700 mt-1">
                Kirim seluruh record lokal ke Google Sheets (1 record = 1 baris terpisah).
              </p>
              {appConfig.lastBackupAt && (
                <span className="text-[10px] text-emerald-600 block mt-2">
                  Terakhir: {new Date(appConfig.lastBackupAt).toLocaleString('id-ID')}
                </span>
              )}
            </div>
            <button
              onClick={handleBackupNow}
              disabled={loading}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              Backup Sekarang
            </button>
          </div>

          {/* Restore Data */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 flex flex-col justify-between">
            <div>
              <strong className="block text-amber-900 font-bold text-xs">Restore dari Cloud</strong>
              <p className="text-[11px] text-amber-700 mt-1">
                Cek cadangan data di Google Sheets dan pulihkan ke database lokal (Super Admin).
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleCheckBackup}
                disabled={loading}
                className="flex-1 py-2 bg-white border border-amber-300 text-amber-800 rounded-xl font-bold text-xs hover:bg-amber-100 transition"
              >
                Cek Backup
              </button>
              <button
                onClick={handleRestore}
                disabled={loading}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow transition disabled:opacity-50"
              >
                Restore
              </button>
            </div>
          </div>
        </div>

        {/* Backup Preview Table if available */}
        {previewBackupData && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
            <h4 className="font-bold text-slate-800">Pratinjau Lembar Kerja (Sheets) di Cloud:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(previewBackupData).map(([sheet, items]) => (
                <div key={sheet} className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700 block truncate">{sheet}</span>
                  <span className="text-[11px] text-sky-700 font-semibold">{items?.length || 0} baris data</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Backup Offline JSON (Tambahan untuk redundansi) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <h3 className="font-bold text-slate-800">Cadangan Berkas Offline (JSON File)</h3>
        <p className="text-slate-500">
          Unduh berkas database lengkap ke komputer/HP Anda sebagai cadangan offline tambahan tanpa koneksi internet.
        </p>
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button
            onClick={handleExportOfflineJson}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Berkas Backup JSON
          </button>

          <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Pulihkan dari File JSON
            <input type="file" accept=".json" onChange={handleImportOfflineJson} className="hidden" />
          </label>
        </div>
      </div>

      {/* 4. Kode Google Apps Script Siap Pasang */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Kode Google Apps Script (.gs)</h3>
            <p className="text-xs text-slate-500">Salin kode ini dan tempelkan di Extensions &gt; Apps Script Google Spreadsheet Anda</p>
          </div>
          <button
            onClick={handleCopyScript}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedScript ? 'Tersalin!' : 'Salin Kode Script'}
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] leading-relaxed border border-slate-800">
          <pre>{APPS_SCRIPT_CODE_TEMPLATE}</pre>
        </div>
      </div>
    </div>
  );
};
