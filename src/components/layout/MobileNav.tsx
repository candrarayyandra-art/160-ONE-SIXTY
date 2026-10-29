import React, { useState, useEffect } from 'react';
import {
  Home,
  ShoppingCart,
  Truck,
  Users,
  Menu,
  X,
  Package,
  Wallet,
  Wrench,
  FileSpreadsheet,
  Database,
  Sliders,
  Cloud,
  ClipboardList,
  Lock,
  ChevronRight,
  Store,
  CreditCard,
  Droplet,
  Smartphone,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getAllFromStore, STORES } from '../../db/indexedDb';
import { Order, Delivery } from '../../types';
import { InstallGuideModal } from '../common/InstallGuideModal';

interface MobileNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenPinModal: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab, onOpenPinModal }) => {
  const { refreshCounter, currentUser } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState<number>(0);
  const [activeDeliveryCount, setActiveDeliveryCount] = useState<number>(0);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAllFromStore<Order>(STORES.ORDERS),
      getAllFromStore<Delivery>(STORES.DELIVERIES)
    ]).then(([orders, deliveries]) => {
      if (mounted) {
        setNewOrderCount(orders.filter((o) => o.orderStatus === 'BARU' || o.orderStatus === 'DIPROSES').length);
        setActiveDeliveryCount(
          deliveries.filter((d) => d.status === 'MENUNGGU' || d.status === 'DITUGASKAN' || d.status === 'DALAM PERJALANAN').length
        );
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    setDrawerOpen(false);
  };

  const drawerMenuItems = [
    {
      category: 'TRANSAKSI CEPAT',
      items: [
        { id: 'direct_sale', label: 'Penjualan Langsung / Depot', icon: Store },
        { id: 'payments', label: 'Riwayat & Input Pembayaran', icon: CreditCard }
      ]
    },
    {
      category: 'GALON & STOK',
      items: [
        { id: 'gallons', label: 'Stok & Saldo Galon', icon: Package },
        { id: 'gallon_movements', label: 'Riwayat Pergerakan Galon', icon: Package },
        { id: 'gallon_borrowed', label: 'Galon Dipinjam / Di Luar', icon: Package },
        { id: 'inventory', label: 'Stok Perlengkapan (Segel/Tutup)', icon: Package }
      ]
    },
    {
      category: 'KEUANGAN DEPOT',
      items: [
        { id: 'finance_receivables', label: 'Daftar Piutang Pelanggan', icon: Wallet },
        { id: 'finance_cash', label: 'Buku Kas Masuk / Keluar', icon: Wallet },
        { id: 'finance_expenses', label: 'Beban Operasional', icon: Wallet },
        { id: 'finance_closing', label: 'Closing Harian Depot', icon: Wallet }
      ]
    },
    {
      category: 'OPERASIONAL RO',
      items: [
        { id: 'ops_production', label: 'Catatan Produksi Air', icon: Droplet },
        { id: 'ops_maintenance', label: 'Maintenance Mesin RO', icon: Wrench },
        { id: 'ops_filter', label: 'Jadwal Penggantian Filter', icon: Wrench },
        { id: 'ops_quality', label: 'Pemeriksaan Kualitas Air', icon: Droplet }
      ]
    },
    {
      category: 'LAPORAN & OUTPUT',
      items: [
        { id: 'reports', label: 'Laporan Rekap & Download PDF', icon: FileSpreadsheet },
        { id: 'report_whatsapp', label: 'Kirim Laporan WhatsApp', icon: FileSpreadsheet }
      ]
    },
    {
      category: 'ADMIN & PENGATURAN',
      items: [
        { id: 'master_data', label: 'Master Data (Produk, Harga, Metode)', icon: Database },
        { id: 'settings', label: 'Pengaturan Usaha & Printer', icon: Sliders },
        { id: 'google_sheets', label: 'Google Sheets & Backup', icon: Cloud },
        { id: 'audit_log', label: 'Audit Log & Riwayat', icon: ClipboardList }
      ]
    }
  ];

  return (
    <>
      {/* 5 Bottom Nav Buttons */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg no-print">
        <div className="grid grid-cols-5 gap-1">
          {/* 1. HOME */}
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
              currentTab === 'dashboard' ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-none">Home</span>
          </button>

          {/* 2. ORDER */}
          <button
            onClick={() => handleNavClick('orders')}
            className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
              currentTab === 'orders' ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingCart className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-none">Order</span>
            {newOrderCount > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {newOrderCount > 9 ? '9+' : newOrderCount}
              </span>
            )}
          </button>

          {/* 3. DELIVERY */}
          <button
            onClick={() => handleNavClick('deliveries')}
            className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
              currentTab === 'deliveries' ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-none">Delivery</span>
            {activeDeliveryCount > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-sky-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {activeDeliveryCount > 9 ? '9+' : activeDeliveryCount}
              </span>
            )}
          </button>

          {/* 4. PELANGGAN */}
          <button
            onClick={() => handleNavClick('customers')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
              currentTab === 'customers' ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-none">Pelanggan</span>
          </button>

          {/* 5. MENU */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
              drawerOpen ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-none">Menu</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Bottom Sheet */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end transition-opacity">
          <div
            className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black text-sm">
                  160
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Menu Operasional</h3>
                  <p className="text-[11px] text-slate-500">
                    Masuk sebagai: <strong className="text-sky-700">{currentUser?.name}</strong> ({currentUser?.role})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-sm pb-8">
              {/* Tombol Pasang di HP Sendiri */}
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  setShowInstallGuide(true);
                }}
                className="w-full p-3.5 bg-gradient-to-r from-sky-600 to-cyan-600 text-white rounded-2xl flex items-center justify-between shadow-md shadow-sky-600/20 active:scale-98 transition"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <strong className="block text-xs font-bold leading-tight">Pasang di HP Sendiri</strong>
                    <span className="text-[10px] text-sky-100">Buka cepat & simpan data lokal di HP</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold bg-white text-sky-700 px-2 py-1 rounded-lg">
                  Pasang
                </span>
              </button>

              {drawerMenuItems.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    {cat.category}
                  </span>
                  <div className="bg-slate-50 rounded-2xl p-1 border border-slate-200/70 space-y-0.5">
                    {cat.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition ${
                            isActive
                              ? 'bg-sky-600 text-white font-semibold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                            <span className="text-xs font-medium">{item.label}</span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Ganti Akun / PIN */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenPinModal();
                  }}
                  className="w-full py-3 px-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-bold shadow-md"
                >
                  <Lock className="w-4 h-4" />
                  Ganti Akun / Masukkan PIN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <InstallGuideModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        deferredPrompt={installPrompt}
        onInstalled={() => setInstallPrompt(null)}
      />
    </>
  );
};
