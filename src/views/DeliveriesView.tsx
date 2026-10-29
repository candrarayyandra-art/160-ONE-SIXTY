import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Search,
  MapPin,
  MessageSquare,
  Printer,
  CheckCircle2,
  Clock,
  Navigation,
  User,
  Plus,
  X,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getAllFromStore,
  putToStore,
  STORES
} from '../db/indexedDb';
import {
  Delivery,
  Order,
  User as UserType
} from '../types';
import { QuickRecapBar, RecapItem } from '../components/common/QuickRecapBar';
import { Pagination } from '../components/common/Pagination';
import { formatDateIndo, generateWhatsAppDeliveryInfo } from '../services/exportService';

export const DeliveriesView: React.FC = () => {
  const {
    isDateInPeriod,
    refreshCounter,
    triggerRefresh,
    appConfig,
    setPrintData,
    logAudit,
    currentUser
  } = useApp();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Assign Driver Modal
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('Motor Kurir 1');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAllFromStore<Delivery>(STORES.DELIVERIES),
      getAllFromStore<UserType>(STORES.USERS)
    ]).then(([delivs, allUsers]) => {
      if (mounted) {
        setDeliveries(delivs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setUsers(allUsers);
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  // Drivers list
  const driversList = useMemo(() => {
    const list = users.filter((u) => u.role === 'DRIVER');
    return list.length > 0 ? list : users;
  }, [users]);

  // Filtered deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      if (!isDateInPeriod(d.createdAt.slice(0, 10))) return false;
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.id.toLowerCase().includes(q) ||
          d.orderId.toLowerCase().includes(q) ||
          d.customerName.toLowerCase().includes(q) ||
          d.driverName.toLowerCase().includes(q) ||
          d.address.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [deliveries, isDateInPeriod, statusFilter, searchQuery]);

  // Quick Recap items for Deliveries (Requirement #7)
  const recapData: RecapItem[] = useMemo(() => {
    const totalDeliveries = filteredDeliveries.length;
    const totalGalon = filteredDeliveries.reduce((sum, d) => sum + (d.totalGalon || 0), 0);
    const selesai = filteredDeliveries.filter((d) => d.status === 'SELESAI').length;
    const dalamPerjalanan = filteredDeliveries.filter((d) => d.status === 'DALAM PERJALANAN').length;
    const belumDikirim = filteredDeliveries.filter((d) => d.status === 'MENUNGGU' || d.status === 'DITUGASKAN').length;

    return [
      { label: 'Jumlah Pengiriman', value: `${totalDeliveries} Antaran`, color: 'sky' },
      { label: 'Galon Dikirim', value: `${totalGalon} Galon`, color: 'sky' },
      { label: 'Selesai', value: `${selesai}`, color: 'emerald' },
      { label: 'Dalam Perjalanan', value: `${dalamPerjalanan}`, color: 'amber' },
      { label: 'Belum Dikirim', value: `${belumDikirim}`, color: 'rose' }
    ];
  }, [filteredDeliveries]);

  // Pagination
  const totalPages = Math.ceil(filteredDeliveries.length / pageSize);
  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDeliveries.slice(start, start + pageSize);
  }, [filteredDeliveries, currentPage, pageSize]);

  // Google Maps opener (Requirement #10): No API key needed!
  const handleOpenGoogleMaps = (delivery: Delivery) => {
    if (delivery.mapsUrl && delivery.mapsUrl.startsWith('http')) {
      window.open(delivery.mapsUrl, '_blank');
    } else {
      const q = encodeURIComponent(delivery.address || delivery.locationName || delivery.customerName);
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
    }
  };

  // WhatsApp sender
  const handleWhatsApp = (delivery: Delivery) => {
    const text = generateWhatsAppDeliveryInfo({
      depotName: appConfig.depotName || '160 ONE SIXTY',
      orderId: delivery.orderId,
      customerName: delivery.customerName,
      totalGalon: delivery.totalGalon,
      driverName: delivery.driverName,
      address: delivery.address
    });

    const cleanPhone = (delivery.customerPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const url = phoneWithCountry
      ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  // Status transitions
  const handleStartDelivery = async (delivery: Delivery) => {
    const now = new Date().toISOString();
    const updated: Delivery = {
      ...delivery,
      status: 'DALAM PERJALANAN',
      departedAt: now,
      updatedAt: now
    };
    await putToStore(STORES.DELIVERIES, updated);

    // Sync corresponding order status
    const allOrders = await getAllFromStore<Order>(STORES.ORDERS);
    const ord = allOrders.find((o) => o.id === delivery.orderId);
    if (ord) {
      await putToStore(STORES.ORDERS, {
        ...ord,
        orderStatus: 'DALAM PENGIRIMAN',
        driverName: delivery.driverName,
        updatedAt: now
      });
    }

    await logAudit('STATUS_CHANGE', 'PENGIRIMAN', `Pengiriman ${delivery.id} mulai dikirim oleh ${delivery.driverName}`, delivery.id);
    triggerRefresh();
  };

  const handleFinishDelivery = async (delivery: Delivery) => {
    const now = new Date().toISOString();
    const updated: Delivery = {
      ...delivery,
      status: 'SELESAI',
      arrivedAt: now,
      updatedAt: now
    };
    await putToStore(STORES.DELIVERIES, updated);

    // Sync order to SELESAI
    const allOrders = await getAllFromStore<Order>(STORES.ORDERS);
    const ord = allOrders.find((o) => o.id === delivery.orderId);
    if (ord) {
      await putToStore(STORES.ORDERS, {
        ...ord,
        orderStatus: 'SELESAI',
        updatedAt: now
      });
    }

    await logAudit('STATUS_CHANGE', 'PENGIRIMAN', `Pengiriman ${delivery.id} selesai diantar`, delivery.id);
    triggerRefresh();
  };

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDelivery) return;

    const now = new Date().toISOString();
    const updated: Delivery = {
      ...activeDelivery,
      driverName: selectedDriver || 'Driver Petugas',
      vehicle: selectedVehicle,
      notes: deliveryNotes,
      status: 'DITUGASKAN',
      updatedAt: now
    };
    await putToStore(STORES.DELIVERIES, updated);

    // Update order status to SIAP DIKIRIM
    const allOrders = await getAllFromStore<Order>(STORES.ORDERS);
    const ord = allOrders.find((o) => o.id === activeDelivery.orderId);
    if (ord) {
      await putToStore(STORES.ORDERS, {
        ...ord,
        orderStatus: 'SIAP DIKIRIM',
        driverName: selectedDriver,
        updatedAt: now
      });
    }

    await logAudit('EDIT', 'PENGIRIMAN', `Driver ${selectedDriver} ditugaskan untuk kiriman ${activeDelivery.id}`, activeDelivery.id);
    setShowAssignModal(false);
    setActiveDelivery(null);
    triggerRefresh();
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Pengiriman & Kurir</h2>
          <p className="text-xs text-slate-500">
            Jadwal pengantaran galon, rute Google Maps & status kurir
          </p>
        </div>
      </div>

      {/* Quick Recap Bar on Top of Table */}
      <QuickRecapBar items={recapData} />

      {/* Search & Filters */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari kurir, no delivery, pelanggan..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none w-full sm:w-auto"
        >
          <option value="ALL">Semua Status Kirim</option>
          <option value="MENUNGGU">MENUNGGU</option>
          <option value="DITUGASKAN">DITUGASKAN</option>
          <option value="DALAM PERJALANAN">DALAM PERJALANAN</option>
          <option value="SELESAI">SELESAI</option>
          <option value="BATAL">BATAL</option>
        </select>
      </div>

      {/* Deliveries List / Cards */}
      <div className="space-y-3">
        {filteredDeliveries.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-slate-600">Belum Ada Jadwal Pengiriman</p>
            <p className="text-xs text-slate-400 mt-1">
              Pengiriman dibuat secara otomatis ketika order berjenis "DELIVERY" dibuat.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedDeliveries.map((deliv) => {
              const isWaiting = deliv.status === 'MENUNGGU';
              const isAssigned = deliv.status === 'DITUGASKAN';
              const isInTransit = deliv.status === 'DALAM PERJALANAN';
              const isDone = deliv.status === 'SELESAI';

              return (
                <div
                  key={deliv.id}
                  className={`bg-white rounded-3xl border p-4 shadow-xs flex flex-col justify-between transition ${
                    isInTransit
                      ? 'border-sky-400 ring-2 ring-sky-200/50'
                      : isDone
                      ? 'border-emerald-200 bg-emerald-50/10'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header ID and Status */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-sky-700">{deliv.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isInTransit
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : isAssigned
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {deliv.status}
                      </span>
                    </div>

                    {/* Customer & Address */}
                    <div>
                      <h4 className="font-black text-sm text-slate-800">{deliv.customerName}</h4>
                      <p className="text-xs text-slate-600 font-medium mt-0.5 line-clamp-2">
                        {deliv.address}
                      </p>
                      {deliv.customerPhone && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Telp: {deliv.customerPhone}</p>
                      )}
                    </div>

                    {/* Gallons & Driver Info */}
                    <div className="p-2.5 bg-slate-50 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Jumlah Galon</span>
                        <span className="font-black text-slate-800 text-sm">{deliv.totalGalon} Galon RO</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Kurir / Driver</span>
                        <span className="font-bold text-sky-700">{deliv.driverName || 'Belum Ada'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Maps, WhatsApp, Kirim, Selesai (Driver & Admin Friendly) */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      {/* Buka Google Maps (Requirement #10) */}
                      <button
                        onClick={() => handleOpenGoogleMaps(deliv)}
                        className="py-2 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 transition"
                        title="Buka Google Maps"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Maps
                      </button>

                      {/* WhatsApp Hubungi */}
                      <button
                        onClick={() => handleWhatsApp(deliv)}
                        className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 transition"
                        title="Kirim Info WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        WA
                      </button>

                      {/* Print Surat Jalan */}
                      <button
                        onClick={() => setPrintData({ type: 'delivery', data: deliv })}
                        className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 transition"
                        title="Cetak Surat Jalan"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Surat Jalan
                      </button>
                    </div>

                    {/* Step Actions */}
                    {isWaiting && (
                      <button
                        onClick={() => {
                          setActiveDelivery(deliv);
                          setSelectedDriver(driversList[0]?.name || 'Driver 1');
                          setShowAssignModal(true);
                        }}
                        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                      >
                        <User className="w-3.5 h-3.5" />
                        Tugaskan Driver
                      </button>
                    )}

                    {isAssigned && (
                      <button
                        onClick={() => handleStartDelivery(deliv)}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Mulai Kirim (Dalam Perjalanan)
                      </button>
                    )}

                    {isInTransit && (
                      <button
                        onClick={() => handleFinishDelivery(deliv)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Selesai Antar
                      </button>
                    )}

                    {isDone && (
                      <div className="py-1 text-center text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-xl">
                        ✓ Berhasil Terkirim
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={filteredDeliveries.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* ASSIGN DRIVER MODAL */}
      {showAssignModal && activeDelivery && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Tugaskan Kurir / Driver</h4>
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignDriver} className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Tujuan:</span>
                <span className="font-bold text-slate-800">{activeDelivery.customerName}</span>
                <p className="text-[11px] text-slate-600 truncate">{activeDelivery.address}</p>
                <p className="text-[11px] font-bold text-sky-700 mt-0.5">{activeDelivery.totalGalon} Galon</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Driver / Kurir</label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                  required
                >
                  {driversList.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kendaraan</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                >
                  <option value="Motor Kurir 1">Motor Kurir 1</option>
                  <option value="Motor Kurir 2">Motor Kurir 2</option>
                  <option value="Motor Roda Tiga">Motor Roda Tiga (Tossa/Viar)</option>
                  <option value="Mobil Pickup">Mobil Pickup</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan untuk Driver</label>
                <input
                  type="text"
                  placeholder="Misal: telepon dulu sebelum tiba..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow"
                >
                  Tugaskan Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
