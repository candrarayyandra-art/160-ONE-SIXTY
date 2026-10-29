import React, { useState, useEffect } from 'react';
import {
  Droplet,
  Wrench,
  Filter,
  CheckCircle2,
  Plus,
  AlertCircle,
  Calendar,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getAllFromStore,
  putToStore,
  STORES
} from '../db/indexedDb';
import {
  ProductionRecord,
  MaintenanceRecord,
  FilterReplacementRecord,
  WaterQualityRecord,
  GallonMovement
} from '../types';
import { formatDateIndo, formatRupiah } from '../services/exportService';
import { createNotification } from '../services/notificationService';

interface OperationsViewProps {
  initialSubTab?: 'production' | 'maintenance' | 'filter' | 'quality';
}

export const OperationsView: React.FC<OperationsViewProps> = ({ initialSubTab = 'production' }) => {
  const { refreshCounter, triggerRefresh, currentUser, logAudit } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'production' | 'maintenance' | 'filter' | 'quality'>(initialSubTab);

  const [productions, setProductions] = useState<ProductionRecord[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [filters, setFilters] = useState<FilterReplacementRecord[]>([]);
  const [qualities, setQualities] = useState<WaterQualityRecord[]>([]);

  // Modals
  const [showAddProdModal, setShowAddProdModal] = useState(false);
  const [showAddMaintModal, setShowAddMaintModal] = useState(false);
  const [showAddFilterModal, setShowAddFilterModal] = useState(false);
  const [showAddQualityModal, setShowAddQualityModal] = useState(false);

  // Form states
  const today = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

  // Production Form
  const [prodDate, setProdDate] = useState(today);
  const [prodTime, setProdTime] = useState(currentTime);
  const [prodQty, setProdQty] = useState(50);
  const [prodNotes, setProdNotes] = useState('');

  // Maintenance Form
  const [maintMachine, setMaintMachine] = useState('Mesin RO 2000 GPD');
  const [maintDate, setMaintDate] = useState(today);
  const [maintType, setMaintType] = useState<MaintenanceRecord['type']>('RUTIN');
  const [maintTech, setMaintTech] = useState('Teknisi Depot');
  const [maintCost, setMaintCost] = useState(0);
  const [maintNotes, setMaintNotes] = useState('');
  const [maintNextDate, setMaintNextDate] = useState('');

  // Filter Form
  const [filterType, setFilterType] = useState('Sedimen 5 Micron');
  const [filterInstallDate, setFilterInstallDate] = useState(today);
  const [filterNextDate, setFilterNextDate] = useState('');
  const [filterTech, setFilterTech] = useState('Operator');
  const [filterNotes, setFilterNotes] = useState('');

  // Quality Form
  const [qDate, setQDate] = useState(today);
  const [qTdsRaw, setQTdsRaw] = useState(180);
  const [qTdsRo, setQTdsRo] = useState(4);
  const [qPh, setQPh] = useState(7.2);
  const [qTemp, setQTemp] = useState(26);
  const [qTaste, setQTaste] = useState<'NORMAL' | 'BERBAU' | 'BERASA'>('NORMAL');
  const [qNotes, setQNotes] = useState('');

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAllFromStore<ProductionRecord>(STORES.PRODUCTION_RECORDS),
      getAllFromStore<MaintenanceRecord>(STORES.MAINTENANCE_RECORDS),
      getAllFromStore<FilterReplacementRecord>(STORES.FILTER_RECORDS),
      getAllFromStore<WaterQualityRecord>(STORES.QUALITY_RECORDS)
    ]).then(([prds, mnts, flts, qlts]) => {
      if (mounted) {
        setProductions(prds.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setMaintenances(mnts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setFilters(flts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setQualities(qlts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  // Handle Save Production
  const handleSaveProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    const prodId = `PRD-${Date.now()}`;
    const newProd: ProductionRecord = {
      id: prodId,
      date: prodDate,
      time: prodTime,
      gallonProduced: prodQty,
      operatorName: currentUser?.name || 'Operator',
      notes: prodNotes,
      createdAt: new Date().toISOString()
    };
    await putToStore(STORES.PRODUCTION_RECORDS, newProd);

    // Also record gallon movement ISI_PRODUKSI
    const gallonMove: GallonMovement = {
      id: `GAL-${Date.now()}`,
      date: prodDate,
      type: 'ISI_PRODUKSI',
      qty: prodQty,
      balanceBefore: 0,
      balanceAfter: 0,
      notes: `Produksi pengisian air RO (${prodQty} galon)`,
      operatorName: currentUser?.name || 'Operator',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await putToStore(STORES.GALLON_MOVEMENTS, gallonMove);

    await logAudit('TAMBAH', 'PRODUKSI_RO', `Mencatat produksi ${prodQty} galon air RO`, prodId);

    setShowAddProdModal(false);
    triggerRefresh();
  };

  // Handle Save Maintenance
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    const maintId = `MNT-${Date.now()}`;
    const newMaint: MaintenanceRecord = {
      id: maintId,
      machineType: maintMachine,
      maintenanceDate: maintDate,
      type: maintType,
      technician: maintTech,
      cost: maintCost,
      notes: maintNotes,
      nextScheduleDate: maintNextDate || undefined,
      status: 'SELESAI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await putToStore(STORES.MAINTENANCE_RECORDS, newMaint);
    await logAudit('TAMBAH', 'MAINTENANCE_RO', `Mencatat maintenance mesin ${maintMachine}`, maintId);

    setShowAddMaintModal(false);
    triggerRefresh();
  };

  // Handle Save Filter Replacement
  const handleSaveFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    const fltId = `FLT-${Date.now()}`;
    const newFilter: FilterReplacementRecord = {
      id: fltId,
      filterType: filterType,
      installDate: filterInstallDate,
      replaceDate: filterInstallDate,
      nextEstimatedReplaceDate: filterNextDate,
      technician: filterTech,
      notes: filterNotes,
      createdAt: new Date().toISOString()
    };

    await putToStore(STORES.FILTER_RECORDS, newFilter);

    // Schedule notification if next date is provided
    if (filterNextDate) {
      await createNotification({
        notificationKey: `MNT_FILTER_${fltId}`,
        title: '🔧 PENGGANTIAN FILTER',
        message: `Penggantian filter ${filterType} telah dicatat. Jadwal berikutnya: ${formatDateIndo(filterNextDate)}.`,
        type: 'MAINTENANCE',
        linkMenu: 'ops_filter',
        targetId: fltId
      });
    }

    await logAudit('TAMBAH', 'PENGGANTIAN_FILTER', `Mencatat penggantian ${filterType}`, fltId);

    setShowAddFilterModal(false);
    triggerRefresh();
  };

  // Handle Save Water Quality
  const handleSaveQuality = async (e: React.FormEvent) => {
    e.preventDefault();
    const qId = `QLT-${Date.now()}`;
    const newQ: WaterQualityRecord = {
      id: qId,
      date: qDate,
      tdsRawWater: qTdsRaw,
      tdsRoProduct: qTdsRo,
      phLevel: qPh,
      temperature: qTemp,
      tasteAndOdor: qTaste,
      inspector: currentUser?.name || 'Operator',
      notes: qNotes,
      createdAt: new Date().toISOString()
    };

    await putToStore(STORES.QUALITY_RECORDS, newQ);
    await logAudit('TAMBAH', 'KUALITAS_AIR', `Mencatat kualitas air RO: TDS ${qTdsRo} ppm, pH ${qPh}`, qId);

    setShowAddQualityModal(false);
    triggerRefresh();
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Operasional Mesin & RO</h2>
          <p className="text-xs text-slate-500">
            Pencatatan produksi air minum, perawatan mesin RO, penggantian filter & uji laboratorium kualitas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'production' && (
            <button
              onClick={() => setShowAddProdModal(true)}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow"
            >
              <Plus className="w-4 h-4" />
              + Catat Produksi
            </button>
          )}
          {activeSubTab === 'maintenance' && (
            <button
              onClick={() => setShowAddMaintModal(true)}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow"
            >
              <Plus className="w-4 h-4" />
              + Catat Maintenance
            </button>
          )}
          {activeSubTab === 'filter' && (
            <button
              onClick={() => setShowAddFilterModal(true)}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow"
            >
              <Plus className="w-4 h-4" />
              + Penggantian Filter
            </button>
          )}
          {activeSubTab === 'quality' && (
            <button
              onClick={() => setShowAddQualityModal(true)}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow"
            >
              <Plus className="w-4 h-4" />
              + Catat Kualitas Air
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 overflow-x-auto text-xs font-bold text-slate-600 shadow-2xs">
        <button
          onClick={() => setActiveSubTab('production')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'production' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Produksi / Isi Ulang
        </button>
        <button
          onClick={() => setActiveSubTab('maintenance')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'maintenance' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Maintenance Mesin RO
        </button>
        <button
          onClick={() => setActiveSubTab('filter')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'filter' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Penggantian Filter
        </button>
        <button
          onClick={() => setActiveSubTab('quality')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'quality' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Pemeriksaan Kualitas Air
        </button>
      </div>

      {/* 1. PRODUKSI AIR */}
      {activeSubTab === 'production' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Catatan Pengisian & Produksi Air RO</h3>
            <span className="text-xs text-slate-500">{productions.length} catatan</span>
          </div>

          {productions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">Belum ada riwayat produksi air RO.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Tanggal & Jam</th>
                    <th className="py-2.5 px-3 text-center">Jumlah Galon Diproduksi</th>
                    <th className="py-2.5 px-3">Operator</th>
                    <th className="py-2.5 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {productions.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-700">
                        {formatDateIndo(p.date)} {p.time}
                      </td>
                      <td className="py-3 px-3 text-center font-black text-cyan-700 text-sm">
                        {p.gallonProduced} Galon
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-semibold">{p.operatorName}</td>
                      <td className="py-3 px-3 text-slate-500">{p.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. MAINTENANCE MESIN RO */}
      {activeSubTab === 'maintenance' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Perawatan & Service Mesin RO</h3>
            <span className="text-xs text-slate-500">{maintenances.length} aktivitas</span>
          </div>

          {maintenances.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">Belum ada catatan maintenance mesin.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Tanggal</th>
                    <th className="py-2.5 px-3">Komponen / Mesin</th>
                    <th className="py-2.5 px-3">Jenis Service</th>
                    <th className="py-2.5 px-3">Teknisi</th>
                    <th className="py-2.5 px-3 text-right">Biaya</th>
                    <th className="py-2.5 px-3">Jadwal Berikutnya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {maintenances.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-700">{formatDateIndo(m.maintenanceDate)}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">{m.machineType}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{m.technician}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">
                        {m.cost > 0 ? formatRupiah(m.cost) : 'Rp 0'}
                      </td>
                      <td className="py-3 px-3 text-sky-700 font-semibold">
                        {m.nextScheduleDate ? formatDateIndo(m.nextScheduleDate) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. PENGGANTIAN FILTER */}
      {activeSubTab === 'filter' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Riwayat Penggantian Filter Cartridge & Membran</h3>
              <p className="text-xs text-slate-500">Mencegah penurunan kualitas air RO dengan penggantian terjadwal</p>
            </div>
          </div>

          {filters.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">Belum ada data penggantian filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Jenis Filter</th>
                    <th className="py-2.5 px-3">Tanggal Ganti</th>
                    <th className="py-2.5 px-3">Estimasi Ganti Berikutnya</th>
                    <th className="py-2.5 px-3">Petugas</th>
                    <th className="py-2.5 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filters.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-800">{f.filterType}</td>
                      <td className="py-3 px-3 text-slate-700">{formatDateIndo(f.replaceDate)}</td>
                      <td className="py-3 px-3 text-sky-700 font-bold">
                        {f.nextEstimatedReplaceDate ? formatDateIndo(f.nextEstimatedReplaceDate) : '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{f.technician}</td>
                      <td className="py-3 px-3 text-slate-500">{f.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. KUALITAS AIR */}
      {activeSubTab === 'quality' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Catatan Pengujian Kualitas Air RO</h3>
              <p className="text-xs text-slate-500">Standar air minum RO: TDS &lt; 10 ppm, pH netral 6.8 - 7.6</p>
            </div>
          </div>

          {qualities.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">Belum ada hasil pengujian laboratorium air.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Tanggal Uji</th>
                    <th className="py-2.5 px-3 text-center">TDS Air Baku</th>
                    <th className="py-2.5 px-3 text-center">TDS Produk RO</th>
                    <th className="py-2.5 px-3 text-center">pH Level</th>
                    <th className="py-2.5 px-3 text-center">Suhu</th>
                    <th className="py-2.5 px-3 text-center">Rasa / Bau</th>
                    <th className="py-2.5 px-3">Penguji</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {qualities.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-800">{formatDateIndo(q.date)}</td>
                      <td className="py-3 px-3 text-center text-slate-600">{q.tdsRawWater} ppm</td>
                      <td className="py-3 px-3 text-center font-black text-cyan-700 text-sm">
                        {q.tdsRoProduct} ppm
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{q.phLevel}</td>
                      <td className="py-3 px-3 text-center text-slate-600">{q.temperature}°C</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            q.tasteAndOdor === 'NORMAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {q.tasteAndOdor}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{q.inspector}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL CATAT PRODUKSI */}
      {showAddProdModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Catat Produksi Air RO</h4>
              <button
                onClick={() => setShowAddProdModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduction} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={prodDate}
                    onChange={(e) => setProdDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jam</label>
                  <input
                    type="time"
                    value={prodTime}
                    onChange={(e) => setProdTime(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jumlah Galon Diisi</label>
                <input
                  type="number"
                  min="1"
                  value={prodQty}
                  onChange={(e) => setProdQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-black text-center text-lg text-cyan-800"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Keterangan pengisian..."
                  value={prodNotes}
                  onChange={(e) => setProdNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProdModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan Produksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATAT MAINTENANCE */}
      {showAddMaintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Catat Perawatan Mesin RO</h4>
              <button
                onClick={() => setShowAddMaintModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mesin / Komponen</label>
                <input
                  type="text"
                  value={maintMachine}
                  onChange={(e) => setMaintMachine(e.target.value)}
                  placeholder="Mesin RO 2000 GPD, Pompa CNP, Membran..."
                  className="w-full p-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={maintDate}
                    onChange={(e) => setMaintDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis Service</label>
                  <select
                    value={maintType}
                    onChange={(e) => setMaintType(e.target.value as MaintenanceRecord['type'])}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                  >
                    <option value="RUTIN">Rutin</option>
                    <option value="PERBAIKAN">Perbaikan</option>
                    <option value="PENGGANTIAN_FILTER">Ganti Filter</option>
                    <option value="PEMBERSIHAN">Pembersihan / Flushing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teknisi</label>
                  <input
                    type="text"
                    value={maintTech}
                    onChange={(e) => setMaintTech(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Biaya (Rp)</label>
                  <input
                    type="number"
                    value={maintCost}
                    onChange={(e) => setMaintCost(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-right"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jadwal Perawatan Berikutnya</label>
                <input
                  type="date"
                  value={maintNextDate}
                  onChange={(e) => setMaintNextDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan</label>
                <input
                  type="text"
                  placeholder="Detail perbaikan..."
                  value={maintNotes}
                  onChange={(e) => setMaintNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMaintModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan Perawatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GANTI FILTER */}
      {showAddFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Catat Penggantian Filter</h4>
              <button
                onClick={() => setShowAddFilterModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFilter} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Jenis Filter</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
                >
                  <option value="Sedimen Spun 5 Micron">Sedimen Spun 5 Micron</option>
                  <option value="Sedimen Spun 1 Micron">Sedimen Spun 1 Micron</option>
                  <option value="CTO Karbon Blok">CTO Karbon Blok</option>
                  <option value="GAC Butiran Karbon">GAC Butiran Karbon</option>
                  <option value="Membran RO 2000 GPD">Membran RO 2000 GPD</option>
                  <option value="Post Karbon Taste Polish">Post Karbon Taste Polish</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Pasang</label>
                  <input
                    type="date"
                    value={filterInstallDate}
                    onChange={(e) => setFilterInstallDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jadwal Ganti Lagi</label>
                  <input
                    type="date"
                    value={filterNextDate}
                    onChange={(e) => setFilterNextDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Petugas / Teknisi</label>
                <input
                  type="text"
                  value={filterTech}
                  onChange={(e) => setFilterTech(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan</label>
                <input
                  type="text"
                  placeholder="Kondisi filter lama..."
                  value={filterNotes}
                  onChange={(e) => setFilterNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFilterModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan Jadwal Filter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UJI KUALITAS AIR */}
      {showAddQualityModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Catat Uji Kualitas Air</h4>
              <button
                onClick={() => setShowAddQualityModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuality} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal Pengujian</label>
                <input
                  type="date"
                  value={qDate}
                  onChange={(e) => setQDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">TDS Air Baku (ppm)</label>
                  <input
                    type="number"
                    value={qTdsRaw}
                    onChange={(e) => setQTdsRaw(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-center"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">TDS Air RO (ppm)</label>
                  <input
                    type="number"
                    value={qTdsRo}
                    onChange={(e) => setQTdsRo(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-center text-cyan-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">pH Air</label>
                  <input
                    type="number"
                    step="0.1"
                    value={qPh}
                    onChange={(e) => setQPh(parseFloat(e.target.value) || 7.0)}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-center"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Suhu (°C)</label>
                  <input
                    type="number"
                    value={qTemp}
                    onChange={(e) => setQTemp(parseInt(e.target.value) || 26)}
                    className="w-full p-2 border border-slate-200 rounded-xl text-center"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bau & Rasa</label>
                  <select
                    value={qTaste}
                    onChange={(e) => setQTaste(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="BERBAU">Berbau</option>
                    <option value="BERASA">Berasa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan</label>
                <input
                  type="text"
                  placeholder="Keterangan pengujian..."
                  value={qNotes}
                  onChange={(e) => setQNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddQualityModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan Uji Kualitas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
