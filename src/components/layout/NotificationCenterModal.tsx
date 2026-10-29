import React, { useState } from 'react';
import {
  X,
  Bell,
  CheckCircle,
  AlertCircle,
  Truck,
  ShoppingCart,
  Wallet,
  Wrench,
  Boxes,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppNotification } from '../../types';
import { formatDateTimeIndo } from '../../services/exportService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string, targetId?: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    unreadNotificationCount
  } = useApp();

  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const getIconForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'ORDER_BARU':
        return <ShoppingCart className="w-4 h-4 text-emerald-600" />;
      case 'ORDER_BATAL':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'DELIVERY':
        return <Truck className="w-4 h-4 text-sky-600" />;
      case 'PAYMENT':
      case 'PIUTANG':
        return <Wallet className="w-4 h-4 text-amber-600" />;
      case 'MAINTENANCE':
        return <Wrench className="w-4 h-4 text-purple-600" />;
      case 'STOK':
        return <Boxes className="w-4 h-4 text-orange-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
    if (notif.linkMenu) {
      onNavigateTab(notif.linkMenu, notif.targetId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 no-print">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Pusat Notifikasi</h3>
              <p className="text-[11px] text-slate-500">
                {unreadNotificationCount > 0
                  ? `${unreadNotificationCount} notifikasi belum dibaca`
                  : 'Semua notifikasi sudah dibaca'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter and Actions bar */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filter === 'UNREAD' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
              }`}
            >
              Belum Dibaca ({unreadNotificationCount})
            </button>
          </div>

          {unreadNotificationCount > 0 && (
            <button
              onClick={() => markAllNotificationsAsRead()}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Tandai Semua
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {filteredNotifs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">Tidak ada notifikasi saat ini.</p>
            </div>
          ) : (
            filteredNotifs.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`p-3 rounded-2xl transition cursor-pointer flex gap-3 items-start my-1 ${
                  !notif.isRead
                    ? 'bg-sky-50/80 hover:bg-sky-100/70 border border-sky-100'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  {getIconForType(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-bold ${!notif.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {formatDateTimeIndo(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                    {notif.message}
                  </p>
                  {notif.linkMenu && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                      <span>Buka detail</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
