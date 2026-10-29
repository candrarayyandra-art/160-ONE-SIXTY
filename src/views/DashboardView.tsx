import React, { useEffect, useState, useMemo } from 'react';
import {
  ShoppingCart,
  Droplet,
  DollarSign,
  CreditCard,
  Receipt,
  Wallet,
  Truck,
  Package,
  TrendingDown,
  AlertTriangle,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  Wrench,
  Boxes,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getAllFromStore,
  STORES
} from '../db/indexedDb';
import {
  Order,
  Delivery,
  Payment,
  GallonMovement,
  InventoryItem,
  Expense,
  MaintenanceRecord,
  ClosingRecord
} from '../types';
import { formatRupiah, formatDateIndo } from '../services/exportService';

export const DashboardView: React.FC = () => {
  const {
    setActiveTab,
    isDateInPeriod,
    periodFilter,
    refreshCounter,
    setSelectedOrderIdForDetail
  } = useApp();

  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [gallonMovements, setGallonMovements] = useState<GallonMovement[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [closingRecords, setClosingRecords] = useState<ClosingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      getAllFromStore<Order>(STORES.ORDERS),
      getAllFromStore<Delivery>(STORES.DELIVERIES),
      getAllFromStore<Payment>(STORES.PAYMENTS),
      getAllFromStore<GallonMovement>(STORES.GALLON_MOVEMENTS),
      getAllFromStore<InventoryItem>(STORES.INVENTORY_ITEMS),
      getAllFromStore<Expense>(STORES.EXPENSES),
      getAllFromStore<MaintenanceRecord>(STORES.MAINTENANCE_RECORDS),
      getAllFromStore<ClosingRecord>(STORES.CLOSING_RECORDS)
    ]).then(([ords, delivs, pays, gals, invs, exps, maints, clos]) => {
      if (mounted) {
        setOrders(ords);
        setDeliveries(delivs);
        setPayments(pays);
        setGallonMovements(gals);
        setInventoryItems(invs);
        setExpenses(exps);
        setMaintenances(maints);
        setClosingRecords(clos);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  // Filtered dataset according to active global period
  const filteredOrders = useMemo(() => orders.filter((o) => isDateInPeriod(o.date)), [orders, isDateInPeriod]);
  const filteredDeliveries = useMemo(() => deliveries.filter((d) => isDateInPeriod(d.createdAt.slice(0, 10))), [deliveries, isDateInPeriod]);
  const filteredPayments = useMemo(() => payments.filter((p) => isDateInPeriod(p.date)), [payments, isDateInPeriod]);
  const filteredExpenses = useMemo(() => expenses.filter((e) => isDateInPeriod(e.date)), [expenses, isDateInPeriod]);

  // Metrics calculation
  const totalOrdersCount = filteredOrders.length;
  const totalGalonCount = filteredOrders.reduce((sum, o) => sum + (o.totalGalon || 0), 0);
  const totalOmzet = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalPaymentIn = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Piutang: sum of unpaid balances across all active orders (regardless of period to show true outstanding debt)
  const totalOutstandingReceivables = orders
    .filter((o) => o.orderStatus !== 'BATAL' && o.balance > 0)
    .reduce((sum, o) => sum + o.balance, 0);

  // Kas Depot: total payments in minus total expenses
  const cashDepotEstimate = payments.reduce((sum, p) => sum + p.amount, 0) - expenses.reduce((sum, e) => sum + e.amount, 0);

  // Deliveries pending: MENUNGGU, DITUGASKAN, DALAM PERJALANAN
  const pendingDeliveriesCount = deliveries.filter(
    (d) => d.status === 'MENUNGGU' || d.status === 'DITUGASKAN' || d.status === 'DALAM PERJALANAN'
  ).length;

  // Gallon Inventory counts (calculated from movements)
  const gallonStats = useMemo(() => {
    let kosongDiDepot = 0;
    let beredarDiPelanggan = 0;

    gallonMovements.forEach((m) => {
      if (m.type === 'KOSONG_MASUK') kosongDiDepot += m.qty;
      if (m.type === 'ISI_PRODUKSI') kosongDiDepot -= m.qty;
      if (m.type === 'KELUAR_PENGIRIMAN' || m.type === 'KELUAR_DEPOT' || m.type === 'PINJAM_PELANGGAN') {
        beredarDiPelanggan += m.qty;
      }
      if (m.type === 'KEMBALI_DARI_PELANGGAN') {
        beredarDiPelanggan -= m.qty;
        kosongDiDepot += m.qty;
      }
      if (m.type === 'RUSAK' || m.type === 'HILANG') {
        kosongDiDepot = Math.max(0, kosongDiDepot - m.qty);
      }
    });

    return {
      kosongDiDepot: Math.max(0, kosongDiDepot),
      beredarDiPelanggan: Math.max(0, beredarDiPelanggan)
    };
  }, [gallonMovements]);

  // "PERLU PERHATIAN" section based on REAL conditions only (NO dummy alerts)
  const attentionItems = useMemo(() => {
    const list: Array<{ title: string; desc: string; tab: string; count?: number }> = [];

    // 1. Order Baru / Belum Diproses
    const newOrds = orders.filter((o) => o.orderStatus === 'BARU').length;
    if (newOrds > 0) {
      list.push({
        title: 'Order Baru Belum Diproses',
        desc: `Ada ${newOrds} pesanan baru yang menunggu untuk diproses atau dikirim.`,
        tab: 'orders',
        count: newOrds
      });
    }

    // 2. Pengiriman Belum Selesai
    if (pendingDeliveriesCount > 0) {
      list.push({
        title: 'Pengiriman Dalam Perjalanan / Tertunda',
        desc: `${pendingDeliveriesCount} jadwal pengiriman belum berstatus selesai.`,
        tab: 'deliveries',
        count: pendingDeliveriesCount
      });
    }

    // 3. Piutang Jatuh Tempo
    const today = new Date().toISOString().slice(0, 10);
    const overdueDebts = orders.filter((o) => o.balance > 0 && o.dueDate && o.dueDate <= today).length;
    if (overdueDebts > 0) {
      list.push({
        title: 'Piutang Jatuh Tempo',
        desc: `${overdueDebts} tagihan pelanggan telah melewati batas tanggal jatuh tempo.`,
        tab: 'finance_receivables',
        count: overdueDebts
      });
    }

    // 4. Stok Segel / Perlengkapan Menipis
    const lowStockItems = inventoryItems.filter((i) => i.currentStock <= i.minStock);
    if (lowStockItems.length > 0) {
      list.push({
        title: 'Stok Perlengkapan Menipis',
        desc: `${lowStockItems.length} item stok (seperti segel/tutup) di bawah batas minimum.`,
        tab: 'inventory',
        count: lowStockItems.length
      });
    }

    // 5. Maintenance RO Terjadwal
    const dueMaintenance = maintenances.filter((m) => m.status === 'TERJADWAL' && m.nextScheduleDate && m.nextScheduleDate <= today).length;
    if (dueMaintenance > 0) {
      list.push({
        title: 'Maintenance Mesin Terjadwal',
        desc: `${dueMaintenance} jadwal maintenance mesin RO / penggantian filter tiba waktunya.`,
        tab: 'ops_maintenance',
        count: dueMaintenance
      });
    }

    // 6. Closing Harian Belum Dilakukan untuk hari ini
    const todayClosed = closingRecords.some((c) => c.date === today && c.status === 'SUDAH CLOSING');
    if (!todayClosed && totalOrdersCount > 0) {
      list.push({
        title: 'Closing Harian Belum Dilakukan',
        desc: 'Hari ini memiliki aktivitas transaksi namun belum dilakukan closing harian.',
        tab: 'finance_closing'
      });
    }

    return list;
  }, [orders, pendingDeliveriesCount, inventoryItems, maintenances, closingRecords, totalOrdersCount]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-48"></div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Dashboard Operasional</h2>
          <p className="text-xs text-slate-500">
            Ringkasan data depot • Filter: <strong className="text-sky-700">{periodFilter}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('orders')}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-sky-600/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            + Buat Order Baru
          </button>
          <button
            onClick={() => setActiveTab('direct_sale')}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition active:scale-95"
          >
            Ambil di Depot
          </button>
        </div>
      </div>

      {/* 10 Required Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Order Hari Ini */}
        <div
          onClick={() => setActiveTab('orders')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-sky-300 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Order Periode</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-800">{totalOrdersCount}</span>
            <span className="text-[11px] text-slate-500 block">Pesanan</span>
          </div>
        </div>

        {/* 2. Galon Hari Ini */}
        <div
          onClick={() => setActiveTab('orders')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-sky-300 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Galon Terjual</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-cyan-700">{totalGalonCount}</span>
            <span className="text-[11px] text-slate-500 block">Galon RO</span>
          </div>
        </div>

        {/* 3. Omzet Hari Ini */}
        <div
          onClick={() => setActiveTab('orders')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Omzet</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-emerald-700 truncate block">
              {formatRupiah(totalOmzet)}
            </span>
            <span className="text-[11px] text-slate-500 block">Nilai Order</span>
          </div>
        </div>

        {/* 4. Pembayaran Masuk */}
        <div
          onClick={() => setActiveTab('payments')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Pembayaran Masuk</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-emerald-800 truncate block">
              {formatRupiah(totalPaymentIn)}
            </span>
            <span className="text-[11px] text-slate-500 block">{filteredPayments.length} transaksi diterima</span>
          </div>
        </div>

        {/* 5. Piutang Uang (Strictly separated from Galon Beredar!) */}
        <div
          onClick={() => setActiveTab('finance_receivables')}
          className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs hover:border-amber-400 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase">Total Piutang Uang</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-amber-800 truncate block">
              {formatRupiah(totalOutstandingReceivables)}
            </span>
            <span className="text-[11px] text-slate-500 block">Tagihan Belum Lunas</span>
          </div>
        </div>

        {/* 6. Kas Depot */}
        <div
          onClick={() => setActiveTab('finance_cash')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-sky-300 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Estimasi Kas Depot</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-slate-800 truncate block">
              {formatRupiah(cashDepotEstimate)}
            </span>
            <span className="text-[11px] text-slate-500 block">Arus Kas Masuk - Keluar</span>
          </div>
        </div>

        {/* 7. Pengiriman Belum Selesai */}
        <div
          onClick={() => setActiveTab('deliveries')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-sky-300 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Pengiriman Aktif</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-sky-700">{pendingDeliveriesCount}</span>
            <span className="text-[11px] text-slate-500 block">Dalam Proses Kirim</span>
          </div>
        </div>

        {/* 8. Galon Beredar / Dipinjam Pelanggan (Separated from money!) */}
        <div
          onClick={() => setActiveTab('gallon_borrowed')}
          className="bg-white p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-2xs hover:border-indigo-400 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase">Galon Beredar</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-indigo-800">
              {gallonStats.beredarDiPelanggan}
            </span>
            <span className="text-[11px] text-slate-500 block">Galon di Luar / Pelanggan</span>
          </div>
        </div>

        {/* 9. Galon Kosong di Depot */}
        <div
          onClick={() => setActiveTab('gallons')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-sky-300 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Galon di Depot</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-800">
              {gallonStats.kosongDiDepot}
            </span>
            <span className="text-[11px] text-slate-500 block">Stok Galon Kosong</span>
          </div>
        </div>

        {/* 10. Pengeluaran Hari Ini */}
        <div
          onClick={() => setActiveTab('finance_expenses')}
          className="bg-white p-3.5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs hover:border-rose-300 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase">Pengeluaran Beban</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-rose-800 truncate block">
              {formatRupiah(totalExpenseAmount)}
            </span>
            <span className="text-[11px] text-slate-500 block">{filteredExpenses.length} transaksi beban</span>
          </div>
        </div>
      </div>

      {/* PERLU PERHATIAN Section (Only real alerts, no sample dummy) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-800">Perlu Perhatian</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Berdasarkan data nyata depot</span>
        </div>

        {attentionItems.length === 0 ? (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-center gap-3 text-emerald-800">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <strong className="block font-bold">Semua Operasional Lancar</strong>
              <span>Tidak ada order menumpuk, piutang macet, atau peringatan stok saat ini.</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {attentionItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setActiveTab(item.tab)}
                className="p-3 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200 rounded-2xl transition cursor-pointer flex items-start justify-between gap-2"
              >
                <div>
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <span>{item.title}</span>
                    {item.count && (
                      <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                        {item.count}
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">{item.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600 shrink-0 mt-1" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('deliveries')}
          className="p-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-2xl transition text-left flex items-center gap-3"
        >
          <Truck className="w-5 h-5 text-sky-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-sky-900">Kelola Pengiriman</h4>
            <p className="text-[10px] text-sky-700">Driver & jadwal kirim</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('finance_receivables')}
          className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl transition text-left flex items-center gap-3"
        >
          <Receipt className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">Piutang Pelanggan</h4>
            <p className="text-[10px] text-amber-700">Tagihan & jatuh tempo</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('finance_closing')}
          className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl transition text-left flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-indigo-900">Closing Harian</h4>
            <p className="text-[10px] text-indigo-700">Rekap kas & cetak slip</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl transition text-left flex items-center gap-3"
        >
          <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-emerald-900">Laporan & PDF</h4>
            <p className="text-[10px] text-emerald-700">Rekapitulasi lengkap</p>
          </div>
        </button>
      </div>

      {/* Recent Orders in Active Period */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">Transaksi Pesanan Terkini</h3>
            <p className="text-[11px] text-slate-500">Daftar pesanan dalam periode terpilih</p>
          </div>
          <button
            onClick={() => setActiveTab('orders')}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            Lihat Semua Order <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-slate-600">Belum Ada Transaksi Order</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Database awal bersih tanpa dummy data. Silakan tekan tombol di bawah untuk membuat transaksi pertama.
            </p>
            <button
              onClick={() => setActiveTab('orders')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20"
            >
              <Plus className="w-4 h-4" />
              + Buat Order Pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-4">No. Order</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Pelanggan</th>
                  <th className="py-2.5 px-3 text-center">Galon</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center">Status Order</th>
                  <th className="py-2.5 px-3 text-center">Pembayaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrders.slice(0, 5).map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => {
                      setSelectedOrderIdForDetail(o.id);
                      setActiveTab('orders');
                    }}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">{o.id}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDateIndo(o.date)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{o.customerName}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{o.totalGalon}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800">{formatRupiah(o.total)}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.orderStatus === 'BARU'
                            ? 'bg-amber-100 text-amber-800'
                            : o.orderStatus === 'SELESAI'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {o.orderStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.paymentStatus === 'LUNAS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.paymentStatus === 'SEBAGIAN'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
