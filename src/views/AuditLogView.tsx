import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Search, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAllFromStore, STORES } from '../db/indexedDb';
import { AuditLog } from '../types';
import { Pagination } from '../components/common/Pagination';
import { formatDateTimeIndo } from '../services/exportService';

export const AuditLogView: React.FC = () => {
  const { refreshCounter } = useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    let mounted = true;
    getAllFromStore<AuditLog>(STORES.AUDIT_LOGS).then((allLogs) => {
      if (mounted) {
        setLogs(allLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          l.module.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          (l.recordId || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, actionFilter, searchQuery]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Audit Log & Riwayat Aktivitas</h2>
        <p className="text-xs text-slate-500">
          Catatan kronologis seluruh aksi pengguna: login, transaksi, modifikasi, hapus data, closing dan backup
        </p>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari user, aksi, modul, rincian..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 w-full sm:w-auto"
        >
          <option value="ALL">Semua Aksi</option>
          <option value="LOGIN">LOGIN</option>
          <option value="TAMBAH">TAMBAH</option>
          <option value="EDIT">EDIT</option>
          <option value="HAPUS">HAPUS</option>
          <option value="CLOSING">CLOSING</option>
          <option value="SYNC">SYNC</option>
          <option value="BACKUP">BACKUP</option>
          <option value="RESTORE">RESTORE</option>
          <option value="RESET">RESET</option>
          <option value="STATUS_CHANGE">STATUS_CHANGE</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Belum ada catatan aktivitas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-3">Pengguna</th>
                  <th className="py-2.5 px-2 text-center">Aksi</th>
                  <th className="py-2.5 px-3">Modul</th>
                  <th className="py-2.5 px-4">Rincian Aktivitas</th>
                  <th className="py-2.5 px-3">ID Terkait</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateTimeIndo(log.timestamp)}
                    </td>
                    <td className="py-3 px-3">
                      <strong className="block text-slate-800">{log.userName}</strong>
                      <span className="text-[10px] text-sky-600 font-bold">{log.role}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.action === 'TAMBAH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action === 'HAPUS' || log.action === 'RESET'
                            ? 'bg-rose-100 text-rose-800'
                            : log.action === 'EDIT' || log.action === 'STATUS_CHANGE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700">{log.module}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">{log.details}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{log.recordId || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={filteredLogs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};
