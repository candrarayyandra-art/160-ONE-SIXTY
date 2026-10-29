import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  MessageSquare,
  Navigation,
  CheckCircle2,
  Clock,
  ExternalLink,
  Phone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAllFromStore, putToStore, STORES } from '../db/indexedDb';
import { Delivery, Order } from '../types';
import { generateWhatsAppDeliveryInfo } from '../services/exportService';

export const DriverPortalView: React.FC = () => {
  const { currentUser, refreshCounter, triggerRefresh, appConfig, logAudit, driverOrderIdToOpen } = useApp();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filterMode, setFilterMode] = useState<'ACTIVE' | 'DONE'>('ACTIVE');

  useEffect(() => {
    let mounted = true;
    getAllFromStore<Delivery>(STORES.DELIVERIES).then((delivs) => {
      if (mounted) {
        // If current user is DRIVER, filter by driver name; otherwise show all
        let list = delivs;
        if (currentUser?.role === 'DRIVER') {
          list = delivs.filter((d) => d.driverName.toLowerCase() === currentUser.name.toLowerCase());
        }
        setDeliveries(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter, currentUser]);

  const activeList = deliveries.filter((d) => d.status !== 'SELESAI' && d.status !== 'BATAL');
  const doneList = deliveries.filter((d) => d.status === 'SELESAI');

  const displayedList = filterMode === 'ACTIVE' ? activeList : doneList;

  const handleOpenMaps = (deliv: Delivery) => {
    if (deliv.mapsUrl && deliv.mapsUrl.startsWith('http')) {
      window.open(deliv.mapsUrl, '_blank');
    } else {
      const q = encodeURIComponent(deliv.address || deliv.locationName || deliv.customerName);
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
    }
  };

  const handleWhatsApp = (deliv: Delivery) => {
    const text = generateWhatsAppDeliveryInfo({
      depotName: appConfig.depotName || '160 ONE SIXTY',
      orderId: deliv.orderId,
      customerName: deliv.customerName,
      totalGalon: deliv.totalGalon,
      driverName: deliv.driverName || currentUser?.name || 'Driver',
      address: deliv.address
    });

    const cleanPhone = (deliv.customerPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const url = phoneWithCountry
      ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  const handleStartDelivery = async (deliv: Delivery) => {
    const now = new Date().toISOString();
    const updated: Delivery = {
      ...deliv,
      status: 'DALAM PERJALANAN',
      departedAt: now,
      updatedAt: now
    };
    await putToStore(STORES.DELIVERIES, updated);

    // Sync order
    const allOrders = await getAllFromStore<Order>(STORES.ORDERS);
    const ord = allOrders.find((o) => o.id === deliv.orderId);
    if (ord) {
      await putToStore(STORES.ORDERS, {
        ...ord,
        orderStatus: 'DALAM PENGIRIMAN',
        driverName: deliv.driverName,
        updatedAt: now
      });
    }

    await logAudit('STATUS_CHANGE', 'DRIVER', `Driver memulai pengiriman order ${deliv.orderId}`, deliv.id);
    triggerRefresh();
  };

  const handleFinishDelivery = async (deliv: Delivery) => {
    const now = new Date().toISOString();
    const updated: Delivery = {
      ...deliv,
      status: 'SELESAI',
      arrivedAt: now,
      updatedAt: now
    };
    await putToStore(STORES.DELIVERIES, updated);

    // Sync order to SELESAI
    const allOrders = await getAllFromStore<Order>(STORES.ORDERS);
    const ord = allOrders.find((o) => o.id === deliv.orderId);
    if (ord) {
      await putToStore(STORES.ORDERS, {
        ...ord,
        orderStatus: 'SELESAI',
        updatedAt: now
      });
    }

    await logAudit('STATUS_CHANGE', 'DRIVER', `Driver menyelesaikan pengiriman order ${deliv.orderId}`, deliv.id);
    triggerRefresh();
  };

  return (
    <div className="p-3 sm:p-5 max-w-lg mx-auto space-y-4">
      {/* Top Header Card */}
      <div className="bg-sky-600 text-white p-4 rounded-3xl shadow-lg shadow-sky-600/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center font-black text-lg">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-base leading-tight">Portal Kurir & Driver</h2>
            <p className="text-xs text-sky-100">
              Halo, <strong>{currentUser?.name || 'Driver'}</strong>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black">{activeList.length}</span>
          <span className="text-[10px] text-sky-100 block">Antaran Aktif</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1 rounded-2xl">
        <button
          onClick={() => setFilterMode('ACTIVE')}
          className={`py-2 text-xs font-bold rounded-xl transition ${
            filterMode === 'ACTIVE' ? 'bg-white text-slate-800 shadow' : 'text-slate-600'
          }`}
        >
          Perlu Dikirim ({activeList.length})
        </button>
        <button
          onClick={() => setFilterMode('DONE')}
          className={`py-2 text-xs font-bold rounded-xl transition ${
            filterMode === 'DONE' ? 'bg-white text-slate-800 shadow' : 'text-slate-600'
          }`}
        >
          Sudah Selesai ({doneList.length})
        </button>
      </div>

      {/* Delivery Cards with Large Driver Buttons (Requirement #21) */}
      <div className="space-y-3">
        {displayedList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 text-xs">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Tidak ada jadwal antaran {filterMode === 'ACTIVE' ? 'yang aktif' : 'yang selesai'}.
          </div>
        ) : (
          displayedList.map((deliv) => {
            const isInTransit = deliv.status === 'DALAM PERJALANAN';
            const isDone = deliv.status === 'SELESAI';

            return (
              <div
                key={deliv.id}
                className={`bg-white rounded-3xl p-4 border shadow-xs space-y-3 transition ${
                  isInTransit ? 'border-sky-500 ring-2 ring-sky-200' : 'border-slate-200'
                }`}
              >
                {/* Header Info */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-sky-700">{deliv.orderId}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isInTransit
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : isDone
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {deliv.status}
                  </span>
                </div>

                {/* Customer & Large Qty */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">{deliv.customerName}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{deliv.address}</p>
                    {deliv.customerPhone && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {deliv.customerPhone}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-center shrink-0">
                    <span className="text-[10px] font-bold text-sky-800 uppercase block">Galon</span>
                    <span className="text-2xl font-black text-sky-900">{deliv.totalGalon}</span>
                  </div>
                </div>

                {deliv.notes && (
                  <div className="p-2.5 bg-amber-50 rounded-xl text-[11px] text-amber-900 font-medium">
                    📌 Catatan: {deliv.notes}
                  </div>
                )}

                {/* Large Action Buttons (Requirement #21: [MAPS], [WHATSAPP], [MULAI KIRIM], [SELESAI]) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* [MAPS] Button */}
                    <button
                      onClick={() => handleOpenMaps(deliv)}
                      className="py-3 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-sky-200"
                    >
                      <MapPin className="w-4 h-4 text-sky-600" />
                      BUKA MAPS
                    </button>

                    {/* [WHATSAPP] Button */}
                    <button
                      onClick={() => handleWhatsApp(deliv)}
                      className="py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-emerald-200"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      WHATSAPP
                    </button>
                  </div>

                  {/* Flow Buttons: Mulai Kirim vs Selesai */}
                  {!isInTransit && !isDone && (
                    <button
                      onClick={() => handleStartDelivery(deliv)}
                      className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition"
                    >
                      <Navigation className="w-4 h-4" />
                      MULAI KIRIM (JALAN SEKARANG)
                    </button>
                  )}

                  {isInTransit && (
                    <button
                      onClick={() => handleFinishDelivery(deliv)}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      SELESAI DIANTAR (SAMPAI DI LOKASI)
                    </button>
                  )}

                  {isDone && (
                    <div className="py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 rounded-2xl">
                      ✓ Pengantaran Selesai
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
