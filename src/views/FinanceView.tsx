import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Wallet,
  Coins,
  CheckCircle2,
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Printer,
  Calendar,
  Search,
  X,
  CreditCard
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getAllFromStore,
  putToStore,
  STORES
} from '../db/indexedDb';
import {
  Order,
  Payment,
  CashTransaction,
  Expense,
  ClosingRecord,
  GallonMovement
} from '../types';
import { QuickRecapBar, RecapItem } from '../components/common/QuickRecapBar';
import { formatRupiah, formatDateIndo } from '../services/exportService';

interface FinanceViewProps {
  initialSubTab?: 'receivables' | 'cash' | 'expenses' | 'closing';
}

export const FinanceView: React.FC<FinanceViewProps> = ({ initialSubTab = 'receivables' }) => {
  const {
    refreshCounter,
    triggerRefresh,
    isDateInPeriod,
    currentUser,
    logAudit,
    setPrintData
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'receivables' | 'cash' | 'expenses' | 'closing'>(initialSubTab);

  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cashTxs, setCashTxs] = useState<CashTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [closingRecords, setClosingRecords] = useState<ClosingRecord[]>([]);
  const [gallonMovements, setGallonMovements] = useState<GallonMovement[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddCashModal, setShowAddCashModal] = useState(false);
  const [showPayReceivableModal, setShowPayReceivableModal] = useState(false);
  const [selectedReceivableOrder, setSelectedReceivableOrder] = useState<Order | null>(null);

  // Form states
  const today = new Date().toISOString().slice(0, 10);
  const [expDate, setExpDate] = useState(today);
  const [expCategory, setExpCategory] = useState('Listrik & Air PLN');
  const [expAmount, setExpAmount] = useState(50000);
  const [expDesc, setExpDesc] = useState('');

  const [cashDate, setCashDate] = useState(today);
  const [cashType, setCashType] = useState<'IN' | 'OUT'>('IN');
  const [cashCategory, setCashCategory] = useState('Kas Masuk Lain-lain');
  const [cashAmount, setCashAmount] = useState(100000);
  const [cashDesc, setCashDesc] = useState('');

  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('Tunai');
  const [payNotes, setPayNotes] = useState('');

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAllFromStore<Order>(STORES.ORDERS),
      getAllFromStore<Payment>(STORES.PAYMENTS),
      getAllFromStore<CashTransaction>(STORES.CASH_TRANSACTIONS),
      getAllFromStore<Expense>(STORES.EXPENSES),
      getAllFromStore<ClosingRecord>(STORES.CLOSING_RECORDS),
      getAllFromStore<GallonMovement>(STORES.GALLON_MOVEMENTS)
    ]).then(([ords, pays, csh, exps, clos, movs]) => {
      if (mounted) {
        setOrders(ords.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setPayments(pays.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setCashTxs(csh.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setExpenses(exps.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setClosingRecords(clos.sort((a, b) => b.date.localeCompare(a.date)));
        setGallonMovements(movs);
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  // Outstanding Receivables List (orders with balance > 0)
  const outstandingReceivables = useMemo(() => {
    return orders.filter((o) => o.orderStatus !== 'BATAL' && o.balance > 0);
  }, [orders]);

  // Filtered Receivables
  const filteredReceivables = useMemo(() => {
    if (!searchQuery.trim()) return outstandingReceivables;
    const q = searchQuery.toLowerCase();
    return outstandingReceivables.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        (r.customerPhone || '').toLowerCase().includes(q)
    );
  }, [outstandingReceivables, searchQuery]);

  // Quick Recap for Receivables
  const receivableRecap: RecapItem[] = useMemo(() => {
    const totalOrderPiutang = outstandingReceivables.length;
    const totalNilaiPiutang = outstandingReceivables.reduce((s, r) => s + r.balance, 0);
    const totalNilaiAwal = outstandingReceivables.reduce((s, r) => s + r.total, 0);
    const totalSudahDibayar = outstandingReceivables.reduce((s, r) => s + r.totalPaid, 0);

    return [
      { label: 'Jumlah Order Piutang', value: `${totalOrderPiutang} Order`, color: 'amber' },
      { label: 'Total Nilai Order', value: formatRupiah(totalNilaiAwal), color: 'default' },
      { label: 'Sudah Dicicil', value: formatRupiah(totalSudahDibayar), color: 'emerald' },
      { label: 'Sisa Piutang Berjalan', value: formatRupiah(totalNilaiPiutang), color: 'rose' }
    ];
  }, [outstandingReceivables]);

  // Cash Calculations
  const filteredCashTxs = useMemo(() => {
    return cashTxs.filter((c) => isDateInPeriod(c.date));
  }, [cashTxs, isDateInPeriod]);

  const totalCashIn = filteredCashTxs.filter((c) => c.type === 'IN').reduce((s, c) => s + c.amount, 0);
  const totalCashOut = filteredCashTxs.filter((c) => c.type === 'OUT').reduce((s, c) => s + c.amount, 0);
  const netCashFlow = totalCashIn - totalCashOut;

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isDateInPeriod(e.date));
  }, [expenses, isDateInPeriod]);
  const totalExpenseInPeriod = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  // Handle Pay Receivable (Cicilan Piutang)
  const handlePayReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivableOrder) return;

    if (payAmount <= 0) {
      alert('Masukkan jumlah bayar yang valid!');
      return;
    }

    const newTotalPaid = selectedReceivableOrder.totalPaid + payAmount;
    const newBalance = Math.max(0, selectedReceivableOrder.total - newTotalPaid);
    const payStatus = newTotalPaid >= selectedReceivableOrder.total ? 'LUNAS' : 'SEBAGIAN';

    const updated: Order = {
      ...selectedReceivableOrder,
      totalPaid: newTotalPaid,
      balance: newBalance,
      paymentStatus: payStatus,
      updatedAt: new Date().toISOString()
    };

    await putToStore(STORES.ORDERS, updated);

    // Save payment
    const payId = `PAY-${today.replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const newPayment: Payment = {
      id: payId,
      date: today,
      orderId: selectedReceivableOrder.id,
      customerId: selectedReceivableOrder.customerId,
      customerName: selectedReceivableOrder.customerName,
      amount: payAmount,
      method: payMethod,
      notes: payNotes || `Pembayaran cicilan order ${selectedReceivableOrder.id}`,
      operatorName: currentUser?.name || 'Kasir',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await putToStore(STORES.PAYMENTS, newPayment);

    // Save cash in
    const cashTx: CashTransaction = {
      id: `CSH-${Date.now()}`,
      date: today,
      type: 'IN',
      category: 'Pembayaran Piutang',
      amount: payAmount,
      description: `Cicilan piutang ${selectedReceivableOrder.id} (${selectedReceivableOrder.customerName})`,
      referenceId: selectedReceivableOrder.id,
      operatorName: currentUser?.name || 'Kasir',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await putToStore(STORES.CASH_TRANSACTIONS, cashTx);

    await logAudit(
      'TAMBAH',
      'PEMBAYARAN_PIUTANG',
      `Pembayaran cicilan ${formatRupiah(payAmount)} untuk order ${selectedReceivableOrder.id}`,
      selectedReceivableOrder.id
    );

    setShowPayReceivableModal(false);
    setSelectedReceivableOrder(null);
    setPayNotes('');
    triggerRefresh();
  };

  // Handle Save Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0) {
      alert('Nominal beban harus lebih dari 0!');
      return;
    }

    const expId = `EXP-${Date.now()}`;
    const newExp: Expense = {
      id: expId,
      date: expDate,
      category: expCategory,
      amount: expAmount,
      description: expDesc,
      operatorName: currentUser?.name || 'Kasir',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await putToStore(STORES.EXPENSES, newExp);

    // Also record cash transaction OUT
    const cashTx: CashTransaction = {
      id: `CSH-${Date.now()}`,
      date: expDate,
      type: 'OUT',
      category: `Beban: ${expCategory}`,
      amount: expAmount,
      description: expDesc || `Pengeluaran ${expCategory}`,
      referenceId: expId,
      operatorName: currentUser?.name || 'Kasir',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await putToStore(STORES.CASH_TRANSACTIONS, cashTx);

    await logAudit('TAMBAH', 'BEBAN_OPERASIONAL', `Mencatat beban ${expCategory} senilai ${formatRupiah(expAmount)}`, expId);

    setShowAddExpenseModal(false);
    setExpDesc('');
    triggerRefresh();
  };

  // Handle Save Cash Transaction
  const handleSaveCashTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cashAmount <= 0) {
      alert('Nominal kas harus lebih dari 0!');
      return;
    }

    const cashId = `CSH-${Date.now()}`;
    const newCash: CashTransaction = {
      id: cashId,
      date: cashDate,
      type: cashType,
      category: cashCategory,
      amount: cashAmount,
      description: cashDesc,
      operatorName: currentUser?.name || 'Kasir',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await putToStore(STORES.CASH_TRANSACTIONS, newCash);
    await logAudit('TAMBAH', 'KAS_DEPOT', `Mencatat arus kas (${cashType}) ${formatRupiah(cashAmount)}`, cashId);

    setShowAddCashModal(false);
    setCashDesc('');
    triggerRefresh();
  };

  // Daily Closing Calculation & Submission (Requirement #32)
  const todaysOrders = useMemo(() => orders.filter((o) => o.date === today && o.orderStatus !== 'BATAL'), [orders, today]);
  const todaysPayments = useMemo(() => payments.filter((p) => p.date === today), [payments, today]);
  const todaysExpenses = useMemo(() => expenses.filter((e) => e.date === today), [expenses, today]);
  const todaysCashIn = useMemo(() => cashTxs.filter((c) => c.date === today && c.type === 'IN').reduce((s, c) => s + c.amount, 0), [cashTxs, today]);
  const todaysCashOut = useMemo(() => cashTxs.filter((c) => c.date === today && c.type === 'OUT').reduce((s, c) => s + c.amount, 0), [cashTxs, today]);

  const closingMetrics = useMemo(() => {
    const totalOrders = todaysOrders.length;
    const totalGalon = todaysOrders.reduce((s, o) => s + (o.totalGalon || 0), 0);
    const totalSales = todaysOrders.reduce((s, o) => s + (o.total || 0), 0);
    const totalPaid = todaysOrders.reduce((s, o) => s + (o.totalPaid || 0), 0);
    const newDebt = todaysOrders.reduce((s, o) => s + (o.balance || 0), 0);
    const totalExpense = todaysExpenses.reduce((s, e) => s + e.amount, 0);
    const cashBalance = todaysCashIn - todaysCashOut;

    // Galon movement today
    let galonOut = 0;
    let galonIn = 0;
    gallonMovements.filter((m) => m.date === today).forEach((m) => {
      if (m.type.includes('KELUAR') || m.type.includes('PINJAM')) galonOut += m.qty;
      if (m.type.includes('KEMBALI') || m.type.includes('MASUK')) galonIn += m.qty;
    });

    return {
      totalOrders,
      totalGalon,
      totalSales,
      totalPaid,
      newDebt,
      cashIn: todaysCashIn,
      cashOut: todaysCashOut,
      totalExpense,
      cashBalance,
      gallonOut: galonOut || totalGalon,
      gallonIn: galonIn
    };
  }, [todaysOrders, todaysExpenses, todaysCashIn, todaysCashOut, gallonMovements, today]);

  const existingTodayClosing = closingRecords.find((c) => c.date === today);

  const handlePerformClosing = async () => {
    if (!confirm('Lakukan closing harian untuk hari ini? Slip closing akan dicatat dan dapat dicetak.')) return;

    const closingId = `CLS-${today.replace(/-/g, '')}`;
    const newClosing: ClosingRecord = {
      id: closingId,
      date: today,
      status: 'SUDAH CLOSING',
      ...closingMetrics,
      closedBy: currentUser?.name || 'Petugas Closing',
      closedAt: new Date().toISOString(),
      notes: 'Closing harian operasional depot selesai',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await putToStore(STORES.CLOSING_RECORDS, newClosing);
    await logAudit('CLOSING', 'CLOSING_HARIAN', `Melakukan closing harian depot untuk tanggal ${today}`, closingId);

    // Open Print Modal for Closing Slip
    setPrintData({ type: 'closing', data: newClosing });
    triggerRefresh();
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Keuangan Depot</h2>
          <p className="text-xs text-slate-500">Kelola piutang pelanggan, buku kas, beban operasional & closing harian</p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'expenses' && (
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-rose-600/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              + Catat Beban
            </button>
          )}

          {activeSubTab === 'cash' && (
            <button
              onClick={() => setShowAddCashModal(true)}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-sky-600/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              + Transaksi Kas
            </button>
          )}

          {activeSubTab === 'closing' && (
            <button
              onClick={handlePerformClosing}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-emerald-600/20 transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              Closing Hari Ini
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 overflow-x-auto text-xs font-bold text-slate-600 shadow-2xs">
        <button
          onClick={() => setActiveSubTab('receivables')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'receivables' ? 'bg-amber-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Piutang Pelanggan ({outstandingReceivables.length})
        </button>
        <button
          onClick={() => setActiveSubTab('cash')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'cash' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Kas Masuk & Kas Keluar
        </button>
        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'expenses' ? 'bg-rose-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Beban Operasional
        </button>
        <button
          onClick={() => setActiveSubTab('closing')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeSubTab === 'closing' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Closing Harian Depot
        </button>
      </div>

      {/* 1. PIUTANG PELANGGAN */}
      {activeSubTab === 'receivables' && (
        <div className="space-y-4">
          <QuickRecapBar items={receivableRecap} />

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari pelanggan piutang, no order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredReceivables.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-600" />
                Semua tagihan lunas! Tidak ada piutang aktif saat ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-4">No. Order</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Pelanggan</th>
                      <th className="py-2.5 px-3 text-right">Total Tagihan</th>
                      <th className="py-2.5 px-3 text-right">Sudah Dicicil</th>
                      <th className="py-2.5 px-3 text-right">Sisa Piutang</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReceivables.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-sky-700">{rec.id}</td>
                        <td className="py-3 px-3 text-slate-500">{formatDateIndo(rec.date)}</td>
                        <td className="py-3 px-3">
                          <strong className="block text-slate-800">{rec.customerName}</strong>
                          {rec.customerPhone && <span className="text-[10px] text-slate-400">{rec.customerPhone}</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">{formatRupiah(rec.total)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                          {formatRupiah(rec.totalPaid)}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-amber-700 text-sm">
                          {formatRupiah(rec.balance)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {rec.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedReceivableOrder(rec);
                              setPayAmount(rec.balance);
                              setShowPayReceivableModal(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] shadow"
                          >
                            + Bayar Cicilan
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. KAS MASUK & KELUAR */}
      {activeSubTab === 'cash' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl">
              <span className="text-xs font-bold text-emerald-800 uppercase block">Total Kas Masuk</span>
              <p className="text-2xl font-black text-emerald-900 mt-1">{formatRupiah(totalCashIn)}</p>
              <span className="text-[11px] text-emerald-700">Penjualan & pelunasan piutang</span>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-3xl">
              <span className="text-xs font-bold text-rose-800 uppercase block">Total Kas Keluar</span>
              <p className="text-2xl font-black text-rose-900 mt-1">{formatRupiah(totalCashOut)}</p>
              <span className="text-[11px] text-rose-700">Beban operasional & pembelian</span>
            </div>

            <div className="p-4 bg-sky-50 border border-sky-200 rounded-3xl">
              <span className="text-xs font-bold text-sky-800 uppercase block">Arus Kas Bersih (Periode)</span>
              <p className="text-2xl font-black text-sky-900 mt-1">{formatRupiah(netCashFlow)}</p>
              <span className="text-[11px] text-sky-700">Saldo kas berjalan</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">Buku Kas Depot</h3>
              <span className="text-xs text-slate-500">{filteredCashTxs.length} transaksi</span>
            </div>

            {filteredCashTxs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">Belum ada transaksi kas dalam periode ini.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Tanggal</th>
                      <th className="py-2.5 px-3">Tipe</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Keterangan</th>
                      <th className="py-2.5 px-3 text-right">Nominal</th>
                      <th className="py-2.5 px-3">Petugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredCashTxs.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">{formatDateIndo(c.date)}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {c.type === 'IN' ? 'KAS MASUK' : 'KAS KELUAR'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">{c.category}</td>
                        <td className="py-3 px-3 text-slate-600">{c.description || '-'}</td>
                        <td className="py-3 px-3 text-right font-black text-sm">
                          <span className={c.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'}>
                            {c.type === 'IN' ? '+' : '-'} {formatRupiah(c.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{c.operatorName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. BEBAN OPERASIONAL */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-rose-800 uppercase block">Total Pengeluaran Beban</span>
              <p className="text-2xl font-black text-rose-900 mt-1">{formatRupiah(totalExpenseInPeriod)}</p>
              <span className="text-[11px] text-rose-700">{filteredExpenses.length} transaksi beban dalam periode</span>
            </div>
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow"
            >
              + Catat Beban Baru
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">Belum ada catatan beban operasional.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Tanggal</th>
                      <th className="py-2.5 px-3">Kategori Beban</th>
                      <th className="py-2.5 px-3">Keterangan</th>
                      <th className="py-2.5 px-3 text-right">Nominal</th>
                      <th className="py-2.5 px-3">Petugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">{formatDateIndo(exp.date)}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{exp.category}</td>
                        <td className="py-3 px-3 text-slate-600">{exp.description || '-'}</td>
                        <td className="py-3 px-3 text-right font-black text-rose-700 text-sm">
                          {formatRupiah(exp.amount)}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{exp.operatorName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. CLOSING HARIAN DEPOT */}
      {activeSubTab === 'closing' && (
        <div className="space-y-4">
          {/* Today's Closing Status Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-800">Status Closing Hari Ini ({formatDateIndo(today)})</h3>
                <p className="text-xs text-slate-500">Rekapitulasi penjualan, kas, piutang dan pergerakan galon hari ini</p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  existingTodayClosing
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800 animate-pulse'
                }`}
              >
                {existingTodayClosing ? 'SUDAH CLOSING' : 'BELUM CLOSING'}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Order</span>
                <span className="text-lg font-black text-slate-800">{closingMetrics.totalOrders} Pesanan</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Galon Terjual</span>
                <span className="text-lg font-black text-cyan-700">{closingMetrics.totalGalon} Galon</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Omzet Penjualan</span>
                <span className="text-lg font-black text-emerald-700">{formatRupiah(closingMetrics.totalSales)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Pembayaran Diterima</span>
                <span className="text-lg font-black text-emerald-800">{formatRupiah(closingMetrics.totalPaid)}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl">
                <span className="text-[10px] text-amber-700 font-bold uppercase block">Piutang Baru</span>
                <span className="text-lg font-black text-amber-800">{formatRupiah(closingMetrics.newDebt)}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-2xl">
                <span className="text-[10px] text-rose-700 font-bold uppercase block">Pengeluaran Beban</span>
                <span className="text-lg font-black text-rose-800">{formatRupiah(closingMetrics.totalExpense)}</span>
              </div>
              <div className="p-3 bg-sky-50 rounded-2xl">
                <span className="text-[10px] text-sky-700 font-bold uppercase block">Saldo Kas Hari Ini</span>
                <span className="text-lg font-black text-sky-900">{formatRupiah(closingMetrics.cashBalance)}</span>
              </div>
              <div className="p-3 bg-indigo-50 rounded-2xl">
                <span className="text-[10px] text-indigo-700 font-bold uppercase block">Galon Keluar / Kembali</span>
                <span className="text-lg font-black text-indigo-900">
                  {closingMetrics.gallonOut} / {closingMetrics.gallonIn}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              {existingTodayClosing && (
                <button
                  onClick={() => setPrintData({ type: 'closing', data: existingTodayClosing })}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Slip Closing
                </button>
              )}
              <button
                onClick={handlePerformClosing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95"
              >
                {existingTodayClosing ? 'Perbarui Closing Hari Ini' : 'Lakukan Closing Hari Ini'}
              </button>
            </div>
          </div>

          {/* Historical Closing List */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-800">Riwayat Closing Harian Sebelumnya</h3>
            </div>
            {closingRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">Belum ada riwayat closing sebelumnya.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Tanggal</th>
                      <th className="py-2.5 px-3 text-center">Order</th>
                      <th className="py-2.5 px-3 text-center">Galon</th>
                      <th className="py-2.5 px-3 text-right">Penjualan</th>
                      <th className="py-2.5 px-3 text-right">Kas Masuk</th>
                      <th className="py-2.5 px-3 text-right">Saldo Kas</th>
                      <th className="py-2.5 px-3">Penutup</th>
                      <th className="py-2.5 px-3 text-center">Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {closingRecords.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-800">{formatDateIndo(c.date)}</td>
                        <td className="py-3 px-3 text-center">{c.totalOrders}</td>
                        <td className="py-3 px-3 text-center font-bold text-cyan-700">{c.totalGalon}</td>
                        <td className="py-3 px-3 text-right font-medium">{formatRupiah(c.totalSales)}</td>
                        <td className="py-3 px-3 text-right font-medium text-emerald-700">{formatRupiah(c.cashIn)}</td>
                        <td className="py-3 px-3 text-right font-black text-sky-800">{formatRupiah(c.cashBalance)}</td>
                        <td className="py-3 px-3 text-slate-500">{c.closedBy || '-'}</td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => setPrintData({ type: 'closing', data: c })}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="Cetak Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL BAYAR CICILAN PIUTANG */}
      {showPayReceivableModal && selectedReceivableOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Input Pembayaran Piutang</h4>
              <button
                onClick={() => setShowPayReceivableModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayReceivable} className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Pelanggan:</span>
                <span className="font-bold text-slate-800">{selectedReceivableOrder.customerName}</span>
                <span className="block text-slate-400 font-mono">{selectedReceivableOrder.id}</span>
                <span className="block text-base font-black text-amber-700 mt-1">
                  Sisa: {formatRupiah(selectedReceivableOrder.balance)}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal yang Dibayar (Rp)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-200 rounded-xl font-bold text-right text-emerald-800"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Metode</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                >
                  <option value="Tunai">Tunai</option>
                  <option value="Transfer BCA">Transfer BCA</option>
                  <option value="Transfer Mandiri">Transfer Mandiri</option>
                  <option value="Transfer BRI">Transfer BRI</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan</label>
                <input
                  type="text"
                  placeholder="Keterangan..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayReceivableModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATAT BEBAN */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Catat Beban Operasional</h4>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kategori Beban</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                >
                  <option value="Listrik & Air PLN">Listrik & Air PLN</option>
                  <option value="Tutup & Segel Galon">Tutup & Segel Galon</option>
                  <option value="Maintenance & Filter">Maintenance & Filter</option>
                  <option value="BBM Driver & Kurir">BBM Driver & Kurir</option>
                  <option value="Gaji & Operasional">Gaji & Operasional</option>
                  <option value="Konsumsi & Lain-lain">Konsumsi & Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal Beban (Rp)</label>
                <input
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-200 rounded-xl font-bold text-right text-rose-700 text-base"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan</label>
                <input
                  type="text"
                  placeholder="Misal: Beli token PLN depot..."
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan Beban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSAKSI KAS */}
      {showAddCashModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Input Arus Kas Depot</h4>
              <button
                onClick={() => setShowAddCashModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCashTx} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCashType('IN')}
                  className={`py-2 rounded-xl font-bold border transition ${
                    cashType === 'IN' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-300' : ''
                  }`}
                >
                  Kas Masuk (IN)
                </button>
                <button
                  type="button"
                  onClick={() => setCashType('OUT')}
                  className={`py-2 rounded-xl font-bold border transition ${
                    cashType === 'OUT' ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-300' : ''
                  }`}
                >
                  Kas Keluar (OUT)
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal</label>
                <input
                  type="date"
                  value={cashDate}
                  onChange={(e) => setCashDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                <input
                  type="text"
                  placeholder="Setoran modal awal, penarikan owner..."
                  value={cashCategory}
                  onChange={(e) => setCashCategory(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-200 rounded-xl font-bold text-right text-base"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan</label>
                <input
                  type="text"
                  placeholder="Rincian..."
                  value={cashDesc}
                  onChange={(e) => setCashDesc(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCashModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan Transaksi Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
