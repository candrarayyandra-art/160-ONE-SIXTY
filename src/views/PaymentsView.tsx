import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Search,
  DollarSign,
  Printer,
  Calendar,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAllFromStore, STORES } from '../db/indexedDb';
import { Payment } from '../types';
import { QuickRecapBar, RecapItem } from '../components/common/QuickRecapBar';
import { Pagination } from '../components/common/Pagination';
import { formatRupiah, formatDateIndo } from '../services/exportService';

export const PaymentsView: React.FC = () => {
  const { isDateInPeriod, refreshCounter } = useApp();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    let mounted = true;
    getAllFromStore<Payment>(STORES.PAYMENTS).then((pays) => {
      if (mounted) {
        setPayments(pays.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!isDateInPeriod(p.date)) return false;
      if (methodFilter !== 'ALL' && p.method !== methodFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.id.toLowerCase().includes(q) ||
          p.orderId.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [payments, isDateInPeriod, methodFilter, searchQuery]);

  // Quick Recap (Requirement #7: Contoh PEMBAYARAN: Jumlah Pembayaran, Total Diterima, Piutang Terbayar, Sisa Piutang)
  const recapData: RecapItem[] = useMemo(() => {
    const totalPaymentsCount = filteredPayments.length;
    const totalDiterima = filteredPayments.reduce((s, p) => s + p.amount, 0);

    return [
      { label: 'Jumlah Pembayaran', value: `${totalPaymentsCount} Transaksi`, color: 'sky' },
      { label: 'Total Uang Diterima', value: formatRupiah(totalDiterima), color: 'emerald' }
    ];
  }, [filteredPayments]);

  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Riwayat Pembayaran</h2>
        <p className="text-xs text-slate-500">Histori penerimaan uang tunai, transfer bank & QRIS dari transaksi</p>
      </div>

      <QuickRecapBar items={recapData} />

      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari order, pelanggan, catatan..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <select
          value={methodFilter}
          onChange={(e) => {
            setMethodFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 w-full sm:w-auto"
        >
          <option value="ALL">Semua Metode</option>
          <option value="Tunai">Tunai</option>
          <option value="Transfer BCA">Transfer BCA</option>
          <option value="Transfer Mandiri">Transfer Mandiri</option>
          <option value="Transfer BRI">Transfer BRI</option>
          <option value="QRIS">QRIS</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Belum ada data pembayaran dalam periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-4">No. Bayar</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">No. Order</th>
                  <th className="py-2.5 px-3">Pelanggan</th>
                  <th className="py-2.5 px-3">Metode</th>
                  <th className="py-2.5 px-3 text-right">Jumlah Diterima</th>
                  <th className="py-2.5 px-3">Keterangan</th>
                  <th className="py-2.5 px-3">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">{p.id}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDateIndo(p.date)}</td>
                    <td className="py-3 px-3 font-mono">{p.orderId}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{p.customerName}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.method}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm">
                      {formatRupiah(p.amount)}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{p.notes || '-'}</td>
                    <td className="py-3 px-3 text-slate-500">{p.operatorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={filteredPayments.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};
