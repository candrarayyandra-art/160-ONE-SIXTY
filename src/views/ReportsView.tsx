import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  MessageSquare,
  Printer,
  Download,
  Copy,
  Check,
  Calendar,
  DollarSign,
  Droplet,
  Truck,
  Users,
  Wallet
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getAllFromStore,
  STORES
} from '../db/indexedDb';
import {
  Order,
  Delivery,
  Customer,
  Payment,
  Expense,
  ClosingRecord,
  GallonMovement
} from '../types';
import {
  formatRupiah,
  formatDateIndo,
  exportToCsv,
  generateWhatsAppDailyReport
} from '../services/exportService';

interface ReportsViewProps {
  initialSubTab?: 'reports' | 'whatsapp';
}

export const ReportsView: React.FC<ReportsViewProps> = ({ initialSubTab = 'reports' }) => {
  const {
    refreshCounter,
    isDateInPeriod,
    periodFilter,
    appConfig
  } = useApp();

  const [activeTab, setActiveTab] = useState<'reports' | 'whatsapp'>(initialSubTab);

  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [closingRecords, setClosingRecords] = useState<ClosingRecord[]>([]);
  const [gallonMovements, setGallonMovements] = useState<GallonMovement[]>([]);

  const [reportType, setReportType] = useState<'PENJUALAN' | 'PENGIRIMAN' | 'PELANGGAN' | 'KEUANGAN' | 'GALON'>('PENJUALAN');
  const [copiedWA, setCopiedWA] = useState(false);

  useEffect(() => {
    setActiveTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAllFromStore<Order>(STORES.ORDERS),
      getAllFromStore<Delivery>(STORES.DELIVERIES),
      getAllFromStore<Customer>(STORES.CUSTOMERS),
      getAllFromStore<Payment>(STORES.PAYMENTS),
      getAllFromStore<Expense>(STORES.EXPENSES),
      getAllFromStore<ClosingRecord>(STORES.CLOSING_RECORDS),
      getAllFromStore<GallonMovement>(STORES.GALLON_MOVEMENTS)
    ]).then(([ords, delivs, custs, pays, exps, clos, movs]) => {
      if (mounted) {
        setOrders(ords);
        setDeliveries(delivs);
        setCustomers(custs);
        setPayments(pays);
        setExpenses(exps);
        setClosingRecords(clos);
        setGallonMovements(movs);
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  // Filtered by active global period
  const filteredOrders = useMemo(() => orders.filter((o) => isDateInPeriod(o.date)), [orders, isDateInPeriod]);
  const filteredDeliveries = useMemo(() => deliveries.filter((d) => isDateInPeriod(d.createdAt.slice(0, 10))), [deliveries, isDateInPeriod]);
  const filteredPayments = useMemo(() => payments.filter((p) => isDateInPeriod(p.date)), [payments, isDateInPeriod]);
  const filteredExpenses = useMemo(() => expenses.filter((e) => isDateInPeriod(e.date)), [expenses, isDateInPeriod]);

  // Overall financial summary
  const omzetTotal = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalPaidIn = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const totalExpenseAmount = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalNewDebt = filteredOrders.reduce((s, o) => s + (o.balance || 0), 0);
  const totalGalonSold = filteredOrders.reduce((s, o) => s + (o.totalGalon || 0), 0);

  // Gallon count in period
  const galonKeluar = filteredOrders.reduce((s, o) => s + o.totalGalon, 0);

  // WhatsApp text generation
  const waReportText = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return generateWhatsAppDailyReport({
      date: today,
      depotName: appConfig.depotName || '160 ONE SIXTY',
      totalOrders: filteredOrders.length,
      totalGalon: totalGalonSold,
      omzet: omzetTotal,
      totalPaid: totalPaidIn,
      newDebt: totalNewDebt,
      cashIn: totalPaidIn,
      cashOut: totalExpenseAmount,
      expenses: totalExpenseAmount,
      cashBalance: totalPaidIn - totalExpenseAmount,
      galonDipinjam: 0,
      galonKosong: 0,
      uncompletedDeliveries: filteredDeliveries.filter((d) => d.status !== 'SELESAI').length
    });
  }, [filteredOrders, filteredDeliveries, totalGalonSold, omzetTotal, totalPaidIn, totalNewDebt, totalExpenseAmount, appConfig]);

  const handleCopyWA = () => {
    navigator.clipboard.writeText(waReportText);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
  };

  const handleShareWA = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(waReportText)}`;
    window.open(url, '_blank');
  };

  // Export to Excel / CSV based on selected report type
  const handleExportExcel = () => {
    if (reportType === 'PENJUALAN') {
      const headers = ['No Order', 'Tanggal', 'Jam', 'Pelanggan', 'Tipe', 'Galon', 'Total Tagihan', 'Dibayar', 'Sisa', 'Status Bayar', 'Status Order'];
      const rows = filteredOrders.map((o) => [
        o.id,
        o.date,
        o.time,
        o.customerName,
        o.transactionType,
        o.totalGalon,
        o.total,
        o.totalPaid,
        o.balance,
        o.paymentStatus,
        o.orderStatus
      ]);
      exportToCsv(`Laporan_Penjualan_${periodFilter}`, headers, rows);
    } else if (reportType === 'PENGIRIMAN') {
      const headers = ['No Delivery', 'No Order', 'Tanggal', 'Pelanggan', 'Alamat', 'Galon', 'Driver', 'Status'];
      const rows = filteredDeliveries.map((d) => [
        d.id,
        d.orderId,
        d.createdAt.slice(0, 10),
        d.customerName,
        d.address,
        d.totalGalon,
        d.driverName,
        d.status
      ]);
      exportToCsv(`Laporan_Pengiriman_${periodFilter}`, headers, rows);
    } else if (reportType === 'KEUANGAN') {
      const headers = ['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Nominal', 'Petugas'];
      const rows = [
        ...filteredPayments.map((p) => [p.date, 'KAS MASUK', 'Pembayaran Pelanggan', p.notes || p.orderId, p.amount, p.operatorName]),
        ...filteredExpenses.map((e) => [e.date, 'KAS KELUAR', e.category, e.description || '-', e.amount, e.operatorName])
      ];
      exportToCsv(`Laporan_Keuangan_${periodFilter}`, headers, rows);
    } else if (reportType === 'PELANGGAN') {
      const headers = ['ID Pelanggan', 'Nama', 'Kategori', 'No HP', 'Alamat', 'Total Belanja', 'Piutang'];
      const rows = customers.map((c) => {
        const cOrders = orders.filter((o) => o.customerId === c.id);
        const cTotal = cOrders.reduce((s, o) => s + o.total, 0);
        const cDebt = cOrders.reduce((s, o) => s + o.balance, 0);
        return [c.id, c.name, c.customerType, c.phone, c.mainAddress, cTotal, cDebt];
      });
      exportToCsv(`Laporan_Pelanggan_${periodFilter}`, headers, rows);
    } else if (reportType === 'GALON') {
      const headers = ['Tanggal', 'Jenis Mutasi', 'Pelanggan', 'Jumlah', 'Petugas'];
      const rows = gallonMovements.map((m) => [m.date, m.type, m.customerName || '-', m.qty, m.operatorName]);
      exportToCsv(`Laporan_Galon_${periodFilter}`, headers, rows);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Laporan & Output</h2>
          <p className="text-xs text-slate-500">
            Rekapitulasi operasional, ekspor Excel, unduh PDF & broadcast laporan WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'reports' && (
            <>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition"
              >
                <Download className="w-4 h-4" />
                Ekspor Excel
              </button>
              <button
                onClick={handlePrintReport}
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition"
              >
                <Printer className="w-4 h-4" />
                Cetak / Download PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 overflow-x-auto text-xs font-bold text-slate-600 shadow-2xs no-print">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'reports' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Laporan Lengkap & PDF
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'whatsapp' ? 'bg-emerald-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Laporan WhatsApp Otomatis
        </button>
      </div>

      {/* 1. LAPORAN & PDF VIEW */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Report Type Selector */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto text-xs font-bold text-slate-700 no-print">
            {(['PENJUALAN', 'PENGIRIMAN', 'PELANGGAN', 'KEUANGAN', 'GALON'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setReportType(t)}
                className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
                  reportType === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Laporan {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Printable Report Document Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-5 printable-area">
            {/* Header Document Kop */}
            <div className="border-b-2 border-slate-900 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wider uppercase">
                  {appConfig.depotName || '160 ONE SIXTY'}
                </h1>
                <p className="text-xs font-bold text-sky-700">
                  {appConfig.subtitle || 'Sistem Operasional Depot Air Minum RO'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{appConfig.address} • Telp: {appConfig.phone}</p>
              </div>

              <div className="text-left sm:text-right text-xs">
                <span className="font-bold text-slate-900 block text-sm">
                  REKAP LAPORAN {reportType}
                </span>
                <span className="text-slate-500">Periode: <strong>{periodFilter}</strong></span>
              </div>
            </div>

            {/* Summary Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Transaksi</span>
                <span className="text-lg font-black text-slate-800">{filteredOrders.length} Pesanan</span>
              </div>
              <div className="p-3 bg-cyan-50 rounded-2xl border border-cyan-200">
                <span className="text-[10px] text-cyan-700 font-bold uppercase block">Galon Terjual</span>
                <span className="text-lg font-black text-cyan-900">{totalGalonSold} Galon</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">Omzet Penjualan</span>
                <span className="text-lg font-black text-emerald-900">{formatRupiah(omzetTotal)}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <span className="text-[10px] text-amber-700 font-bold uppercase block">Piutang Baru</span>
                <span className="text-lg font-black text-amber-900">{formatRupiah(totalNewDebt)}</span>
              </div>
            </div>

            {/* Table based on Report Type */}
            <div className="overflow-x-auto">
              {reportType === 'PENJUALAN' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">No. Order</th>
                      <th className="py-2.5 px-2">Tanggal</th>
                      <th className="py-2.5 px-3">Pelanggan</th>
                      <th className="py-2.5 px-2 text-center">Tipe</th>
                      <th className="py-2.5 px-2 text-center">Galon</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-3 text-right">Dibayar</th>
                      <th className="py-2.5 px-3 text-right">Sisa Piutang</th>
                      <th className="py-2.5 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">Tidak ada data order.</td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => (
                        <tr key={o.id}>
                          <td className="py-2 px-3 font-mono font-bold text-sky-700">{o.id}</td>
                          <td className="py-2 px-2 text-slate-600">{formatDateIndo(o.date)}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{o.customerName}</td>
                          <td className="py-2 px-2 text-center text-[10px] font-bold">{o.transactionType}</td>
                          <td className="py-2 px-2 text-center font-bold">{o.totalGalon}</td>
                          <td className="py-2 px-3 text-right font-medium">{formatRupiah(o.total)}</td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-semibold">{formatRupiah(o.totalPaid)}</td>
                          <td className="py-2 px-3 text-right text-amber-700 font-bold">{formatRupiah(o.balance)}</td>
                          <td className="py-2 px-2 text-center text-[10px] font-bold">{o.paymentStatus}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'PENGIRIMAN' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">No. Delivery</th>
                      <th className="py-2.5 px-3">Order</th>
                      <th className="py-2.5 px-3">Pelanggan</th>
                      <th className="py-2.5 px-4">Alamat</th>
                      <th className="py-2.5 px-2 text-center">Galon</th>
                      <th className="py-2.5 px-3">Driver</th>
                      <th className="py-2.5 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDeliveries.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 px-3 font-mono font-bold text-sky-700">{d.id}</td>
                        <td className="py-2 px-3 font-mono">{d.orderId}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{d.customerName}</td>
                        <td className="py-2 px-4 text-slate-600 line-clamp-1">{d.address}</td>
                        <td className="py-2 px-2 text-center font-bold">{d.totalGalon}</td>
                        <td className="py-2 px-3 text-slate-700">{d.driverName}</td>
                        <td className="py-2 px-2 text-center font-bold text-[10px]">{d.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'KEUANGAN' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-4">Keterangan</th>
                      <th className="py-2.5 px-3 text-right">Kas Masuk</th>
                      <th className="py-2.5 px-3 text-right">Kas Keluar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 text-slate-600">{formatDateIndo(p.date)}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">Pembayaran Order</td>
                        <td className="py-2 px-4 text-slate-600">{p.customerName} ({p.orderId})</td>
                        <td className="py-2 px-3 text-right font-black text-emerald-700">{formatRupiah(p.amount)}</td>
                        <td className="py-2 px-3 text-right text-slate-300">-</td>
                      </tr>
                    ))}
                    {filteredExpenses.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2 px-3 text-slate-600">{formatDateIndo(e.date)}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">Beban: {e.category}</td>
                        <td className="py-2 px-4 text-slate-600">{e.description || '-'}</td>
                        <td className="py-2 px-3 text-right text-slate-300">-</td>
                        <td className="py-2 px-3 text-right font-black text-rose-700">{formatRupiah(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Signature Bottom for Print Output */}
            <div className="pt-8 grid grid-cols-2 text-center text-xs">
              <div></div>
              <div>
                <p className="text-slate-500">Penanggung Jawab Depot,</p>
                <div className="h-16"></div>
                <p className="font-bold border-t border-slate-400 inline-block px-8 pt-1">
                  ( {appConfig.signerName || 'Pengelola Depot'} )
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LAPORAN WHATSAPP VIEW */}
      {activeTab === 'whatsapp' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Laporan WhatsApp Operasional</h3>
              <p className="text-xs text-slate-500">Format pesan rapi siap kirim ke grup WA Owner atau Manajemen</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyWA}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                {copiedWA ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedWA ? 'Tersalin!' : 'Salin Pesan'}
              </button>
              <button
                onClick={handleShareWA}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Buka di WhatsApp
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner">
            {waReportText}
          </div>
        </div>
      )}
    </div>
  );
};
