import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  ArrowLeftRight,
  Boxes,
  UserCheck,
  AlertTriangle,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Search,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getAllFromStore,
  putToStore,
  deleteFromStore,
  STORES
} from '../db/indexedDb';
import {
  GallonMovement,
  InventoryItem,
  InventoryMovement,
  Customer
} from '../types';
import { formatDateIndo } from '../services/exportService';
import { createNotification } from '../services/notificationService';

interface GallonViewProps {
  initialSubTab?: 'gallons' | 'movements' | 'borrowed' | 'damaged' | 'inventory';
}

export const GallonView: React.FC<GallonViewProps> = ({ initialSubTab = 'gallons' }) => {
  const { refreshCounter, triggerRefresh, currentUser, logAudit } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'gallons' | 'movements' | 'borrowed' | 'damaged' | 'inventory'>(initialSubTab);

  const [movements, setMovements] = useState<GallonMovement[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Modals
  const [showAddMovementModal, setShowAddMovementModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);

  // Form states for Gallon Movement
  const today = new Date().toISOString().slice(0, 10);
  const [moveDate, setMoveDate] = useState(today);
  const [moveType, setMoveType] = useState<GallonMovement['type']>('KEMBALI_DARI_PELANGGAN');
  const [moveCustomerId, setMoveCustomerId] = useState('');
  const [moveCustomerName, setMoveCustomerName] = useState('');
  const [moveQty, setMoveQty] = useState(1);
  const [moveNotes, setMoveNotes] = useState('');

  // Form states for Inventory Item
  const [invName, setInvName] = useState('');
  const [invCategory, setInvCategory] = useState('Segel & Tutup');
  const [invUnit, setInvUnit] = useState('Pcs');
  const [invCurrentStock, setInvCurrentStock] = useState(100);
  const [invMinStock, setInvMinStock] = useState(20);
  const [invCostPrice, setInvCostPrice] = useState(150);

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAllFromStore<GallonMovement>(STORES.GALLON_MOVEMENTS),
      getAllFromStore<InventoryItem>(STORES.INVENTORY_ITEMS),
      getAllFromStore<Customer>(STORES.CUSTOMERS)
    ]).then(([movs, invs, custs]) => {
      if (mounted) {
        setMovements(movs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setInventoryItems(invs);
        setCustomers(custs);
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  // Overall Gallon Summary
  const gallonStats = useMemo(() => {
    let kosongDiDepot = 0;
    let beredarDiPelanggan = 0;
    let rusak = 0;
    let hilang = 0;
    let totalMasuk = 0;
    let totalKeluar = 0;

    movements.forEach((m) => {
      if (m.type === 'KOSONG_MASUK') {
        kosongDiDepot += m.qty;
        totalMasuk += m.qty;
      }
      if (m.type === 'ISI_PRODUKSI') {
        kosongDiDepot -= m.qty;
      }
      if (m.type === 'KELUAR_PENGIRIMAN' || m.type === 'KELUAR_DEPOT' || m.type === 'PINJAM_PELANGGAN') {
        beredarDiPelanggan += m.qty;
        totalKeluar += m.qty;
      }
      if (m.type === 'KEMBALI_DARI_PELANGGAN') {
        beredarDiPelanggan = Math.max(0, beredarDiPelanggan - m.qty);
        kosongDiDepot += m.qty;
      }
      if (m.type === 'RUSAK') {
        rusak += m.qty;
        kosongDiDepot = Math.max(0, kosongDiDepot - m.qty);
      }
      if (m.type === 'HILANG') {
        hilang += m.qty;
        beredarDiPelanggan = Math.max(0, beredarDiPelanggan - m.qty);
      }
    });

    return {
      kosongDiDepot: Math.max(0, kosongDiDepot),
      beredarDiPelanggan: Math.max(0, beredarDiPelanggan),
      rusak,
      hilang,
      totalMasuk,
      totalKeluar
    };
  }, [movements]);

  // Customer Gallon Borrowed Balances
  const customerGallonBalances = useMemo(() => {
    const map: Record<string, { name: string; borrowed: number; returned: number; net: number }> = {};

    movements.forEach((m) => {
      const cName = m.customerName || 'Umum';
      if (!map[cName]) {
        map[cName] = { name: cName, borrowed: 0, returned: 0, net: 0 };
      }
      if (m.type === 'KELUAR_PENGIRIMAN' || m.type === 'PINJAM_PELANGGAN') {
        map[cName].borrowed += m.qty;
      }
      if (m.type === 'KEMBALI_DARI_PELANGGAN') {
        map[cName].returned += m.qty;
      }
      map[cName].net = Math.max(0, map[cName].borrowed - map[cName].returned);
    });

    return Object.values(map).filter((item) => item.borrowed > 0);
  }, [movements]);

  // Handle Save Gallon Movement
  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (moveQty <= 0) {
      alert('Jumlah galon harus lebih dari 0!');
      return;
    }

    const newMove: GallonMovement = {
      id: `GAL-${Date.now()}`,
      date: moveDate,
      type: moveType,
      customerId: moveCustomerId || undefined,
      customerName: moveCustomerName || (moveCustomerId ? customers.find((c) => c.id === moveCustomerId)?.name : 'Umum'),
      qty: moveQty,
      balanceBefore: gallonStats.kosongDiDepot,
      balanceAfter: gallonStats.kosongDiDepot,
      notes: moveNotes,
      operatorName: currentUser?.name || 'Petugas',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await putToStore(STORES.GALLON_MOVEMENTS, newMove);
    await logAudit('TAMBAH', 'PERGERAKAN_GALON', `Mencatat mutasi galon (${moveType}) sebanyak ${moveQty}`, newMove.id);

    setShowAddMovementModal(false);
    setMoveQty(1);
    setMoveNotes('');
    triggerRefresh();
  };

  // Handle Save Inventory Item
  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim()) {
      alert('Nama item wajib diisi!');
      return;
    }

    const now = new Date().toISOString();
    const itemId = `INV-${Date.now()}`;
    const newItem: InventoryItem = {
      id: itemId,
      name: invName,
      category: invCategory,
      unit: invUnit,
      currentStock: invCurrentStock,
      minStock: invMinStock,
      costPrice: invCostPrice,
      createdAt: now,
      updatedAt: now
    };

    await putToStore(STORES.INVENTORY_ITEMS, newItem);

    // If stock is below or equal to min stock, trigger notification (Requirement #36)
    if (invCurrentStock <= invMinStock) {
      await createNotification({
        notificationKey: `STOK_LOW_${itemId}`,
        title: '⚠️ STOK MENIPIS',
        message: `Stok ${invName} tersisa ${invCurrentStock} ${invUnit} (Batas minimum: ${invMinStock} ${invUnit}).`,
        type: 'STOK',
        linkMenu: 'inventory',
        targetId: itemId
      });
    }

    await logAudit('TAMBAH', 'STOK_PERLENGKAPAN', `Menambahkan master perlengkapan ${invName}`, itemId);

    setShowAddInventoryModal(false);
    setInvName('');
    triggerRefresh();
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Galon & Perlengkapan</h2>
          <p className="text-xs text-slate-500">
            Aset fisik depot: stok galon kosong/isi, galon dipinjam & perlengkapan tutup/segel
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddMovementModal(true)}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-sky-600/20 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            + Catat Mutasi Galon
          </button>
          <button
            onClick={() => setShowAddInventoryModal(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition active:scale-95"
          >
            <Boxes className="w-4 h-4" />
            + Item Perlengkapan
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 overflow-x-auto text-xs font-bold text-slate-600 shadow-2xs">
        <button
          onClick={() => setActiveSubTab('gallons')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'gallons' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Ringkasan Stok Galon
        </button>
        <button
          onClick={() => setActiveSubTab('movements')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'movements' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Histori Pergerakan
        </button>
        <button
          onClick={() => setActiveSubTab('borrowed')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'borrowed' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Galon Beredar / Dipinjam
        </button>
        <button
          onClick={() => setActiveSubTab('damaged')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'damaged' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Galon Rusak / Hilang
        </button>
        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'inventory' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Stok Perlengkapan (Segel/Tutup)
        </button>
      </div>

      {/* 1. RINGKASAN STOK GALON */}
      {activeSubTab === 'gallons' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Galon Kosong di Depot</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{gallonStats.kosongDiDepot}</p>
              <span className="text-[11px] text-slate-500">Siap untuk dicuci/diisi</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
              <span className="text-[10px] font-bold text-indigo-700 uppercase">Galon Beredar di Pelanggan</span>
              <p className="text-2xl sm:text-3xl font-black text-indigo-800 mt-1">
                {gallonStats.beredarDiPelanggan}
              </p>
              <span className="text-[11px] text-indigo-600">Dipinjam / belum kembali</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-rose-200 bg-rose-50/20 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-700 uppercase">Galon Rusak / Pecah</span>
              <p className="text-2xl sm:text-3xl font-black text-rose-800 mt-1">{gallonStats.rusak}</p>
              <span className="text-[11px] text-rose-600">Afkir / tidak layak pakai</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-amber-200 bg-amber-50/20 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase">Galon Hilang</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-800 mt-1">{gallonStats.hilang}</p>
              <span className="text-[11px] text-amber-600">Selisih perhitungan fisik</span>
            </div>
          </div>

          {/* Quick Explanation */}
          <div className="p-4 bg-sky-50 border border-sky-200 rounded-3xl text-xs text-sky-900 leading-relaxed">
            <strong className="block font-bold mb-1">Pentingnya Pemisahan Piutang Uang dan Galon Beredar:</strong>
            Sistem 160 ONE SIXTY secara ketat membedakan antara <strong>Piutang Uang</strong> (rupiah yang belum
            dibayar) dan <strong>Galon Beredar</strong> (aset fisik galon yang dipinjamkan ke pelanggan). Saldo galon
            diupdate melalui setiap pencatatan pengiriman, order depot, dan mutasi pengembalian galon.
          </div>
        </div>
      )}

      {/* 2. HISTORI PERGERAKAN GALON */}
      {activeSubTab === 'movements' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Catatan Pergerakan Galon (Audit Trail)</h3>
            <span className="text-xs text-slate-500">{movements.length} transaksi pergerakan</span>
          </div>

          {movements.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">Belum ada mutasi galon tercatat.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Tanggal</th>
                    <th className="py-2.5 px-3">Jenis Mutasi</th>
                    <th className="py-2.5 px-3">Pelanggan / Keterangan</th>
                    <th className="py-2.5 px-3 text-center">Jumlah</th>
                    <th className="py-2.5 px-3">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-600">{formatDateIndo(m.date)}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                            m.type.includes('KEMBALI') || m.type.includes('MASUK')
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.type.includes('RUSAK') || m.type.includes('HILANG')
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {m.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <strong className="block text-slate-800">{m.customerName || '-'}</strong>
                        {m.notes && <span className="text-[11px] text-slate-500">{m.notes}</span>}
                      </td>
                      <td className="py-3 px-3 text-center font-black text-slate-800 text-sm">{m.qty} Galon</td>
                      <td className="py-3 px-3 text-slate-500">{m.operatorName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. GALON DIPINJAM / BEREDAR */}
      {activeSubTab === 'borrowed' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-800">Rekap Galon Beredar per Pelanggan</h3>
            <p className="text-xs text-slate-500">Menampilkan pelanggan yang meminjam galon dan belum mengembalikan</p>
          </div>

          {customerGallonBalances.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Semua galon beredar sudah kembali ke depot atau belum ada data peminjaman.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Nama Pelanggan</th>
                    <th className="py-2.5 px-3 text-center">Total Dikirim / Dipinjam</th>
                    <th className="py-2.5 px-3 text-center">Sudah Kembali</th>
                    <th className="py-2.5 px-3 text-center">Sisa Galon di Luar</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerGallonBalances.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-800">{item.name}</td>
                      <td className="py-3 px-3 text-center text-slate-600">{item.borrowed}</td>
                      <td className="py-3 px-3 text-center text-emerald-700 font-semibold">{item.returned}</td>
                      <td className="py-3 px-3 text-center font-black text-indigo-700 text-sm">
                        {item.net} Galon
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            setMoveCustomerName(item.name);
                            setMoveType('KEMBALI_DARI_PELANGGAN');
                            setMoveQty(item.net);
                            setShowAddMovementModal(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[10px]"
                        >
                          Catat Kembali
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. GALON RUSAK / HILANG */}
      {activeSubTab === 'damaged' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Pencatatan Galon Rusak & Hilang</h3>
              <p className="text-xs text-slate-500">Mencatat galon bocor, pecah, atau hilang saat di lapangan</p>
            </div>
            <button
              onClick={() => {
                setMoveType('RUSAK');
                setShowAddMovementModal(true);
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow"
            >
              + Catat Rusak / Hilang
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <span className="text-xs font-bold text-rose-800">Total Galon Rusak</span>
              <p className="text-2xl font-black text-rose-900 mt-1">{gallonStats.rusak} Galon</p>
              <p className="text-[11px] text-rose-700 mt-0.5">Dikeluarkan dari peredaran</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <span className="text-xs font-bold text-amber-800">Total Galon Hilang</span>
              <p className="text-2xl font-black text-amber-900 mt-1">{gallonStats.hilang} Galon</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Perlu penggantian aset</p>
            </div>
          </div>
        </div>
      )}

      {/* 5. STOK PERLENGKAPAN (Requirement #36) */}
      {activeSubTab === 'inventory' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Stok Segel, Tutup & Perlengkapan Depot</h3>
              <p className="text-xs text-slate-500">Otomatis memberikan peringatan jika stok di bawah batas minimum</p>
            </div>
            <button
              onClick={() => setShowAddInventoryModal(true)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow"
            >
              + Tambah Item
            </button>
          </div>

          {inventoryItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Boxes className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Belum ada item perlengkapan (segel, tutup, tisu, filter) yang didaftarkan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Nama Barang</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-center">Stok Saat Ini</th>
                    <th className="py-2.5 px-3 text-center">Batas Minimum</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryItems.map((it) => {
                    const isLow = it.currentStock <= it.minStock;
                    return (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-800">{it.name}</td>
                        <td className="py-3 px-3 text-slate-600">{it.category}</td>
                        <td className="py-3 px-3 text-center font-black text-sm text-slate-800">
                          {it.currentStock} {it.unit}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500">
                          {it.minStock} {it.unit}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isLow
                                ? 'bg-rose-100 text-rose-800 animate-pulse'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isLow ? 'STOK MENIPIS' : 'AMAN'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={async () => {
                                const add = prompt(`Tambah stok untuk ${it.name}:`, '50');
                                if (add && parseInt(add)) {
                                  const updated = {
                                    ...it,
                                    currentStock: it.currentStock + parseInt(add)
                                  };
                                  await putToStore(STORES.INVENTORY_ITEMS, updated);
                                  triggerRefresh();
                                }
                              }}
                              className="px-2 py-1 bg-sky-50 text-sky-700 rounded-lg font-bold text-[10px]"
                            >
                              + Isi Stok
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Hapus item ${it.name}?`)) {
                                  await deleteFromStore(STORES.INVENTORY_ITEMS, it.id);
                                  triggerRefresh();
                                }
                              }}
                              className="p-1 bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL CATAT MUTASI GALON */}
      {showAddMovementModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Catat Pergerakan / Mutasi Galon</h4>
              <button
                onClick={() => setShowAddMovementModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal</label>
                <input
                  type="date"
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jenis Mutasi</label>
                <select
                  value={moveType}
                  onChange={(e) => setMoveType(e.target.value as GallonMovement['type'])}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                >
                  <option value="KEMBALI_DARI_PELANGGAN">Galon Kembali dari Pelanggan</option>
                  <option value="KOSONG_MASUK">Beli / Masuk Galon Kosong Baru</option>
                  <option value="PINJAM_PELANGGAN">Galon Dipinjamkan ke Pelanggan</option>
                  <option value="RUSAK">Galon Rusak / Pecah</option>
                  <option value="HILANG">Galon Hilang</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pelanggan Terkait (Opsional)</label>
                <input
                  type="text"
                  placeholder="Nama Pelanggan..."
                  value={moveCustomerName}
                  onChange={(e) => setMoveCustomerName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jumlah (Galon)</label>
                <input
                  type="number"
                  min="1"
                  value={moveQty}
                  onChange={(e) => setMoveQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2 border border-slate-200 rounded-xl font-bold text-center text-base"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan</label>
                <input
                  type="text"
                  placeholder="Keterangan mutasi..."
                  value={moveNotes}
                  onChange={(e) => setMoveNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMovementModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH STOK ITEM */}
      {showAddInventoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Tambah Item Perlengkapan</h4>
              <button
                onClick={() => setShowAddInventoryModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInventory} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Item</label>
                <input
                  type="text"
                  placeholder="Segel Galon Biru, Tutup Ulir, Tisu Alkohol..."
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={invCategory}
                    onChange={(e) => setInvCategory(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                  >
                    <option value="Segel & Tutup">Segel & Tutup</option>
                    <option value="Tisu & Sanitasi">Tisu & Sanitasi</option>
                    <option value="Filter & Media RO">Filter & Media RO</option>
                    <option value="Sparepart Depot">Sparepart Depot</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Satuan</label>
                  <input
                    type="text"
                    placeholder="Pcs, Lembar, Rol..."
                    value={invUnit}
                    onChange={(e) => setInvUnit(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Stok Awal</label>
                  <input
                    type="number"
                    value={invCurrentStock}
                    onChange={(e) => setInvCurrentStock(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-center"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batas Minimum (Alert)</label>
                  <input
                    type="number"
                    value={invMinStock}
                    onChange={(e) => setInvMinStock(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-center"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddInventoryModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
