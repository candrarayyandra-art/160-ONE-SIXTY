import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Store,
  CreditCard,
  Users,
  MapPin,
  History,
  Package,
  ArrowLeftRight,
  UserCheck,
  AlertTriangle,
  Boxes,
  Receipt,
  Wallet,
  Coins,
  CheckCircle2,
  Droplet,
  Wrench,
  Filter,
  FileSpreadsheet,
  MessageSquare,
  Database,
  Sliders,
  Cloud,
  ClipboardList
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getAllFromStore, STORES } from '../../db/indexedDb';
import { Order, Delivery } from '../../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { refreshCounter } = useApp();
  const [newOrderCount, setNewOrderCount] = useState<number>(0);
  const [activeDeliveryCount, setActiveDeliveryCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAllFromStore<Order>(STORES.ORDERS),
      getAllFromStore<Delivery>(STORES.DELIVERIES)
    ]).then(([orders, deliveries]) => {
      if (mounted) {
        // Badge Order: BARU atau DIPROSES
        const newOrders = orders.filter((o) => o.orderStatus === 'BARU' || o.orderStatus === 'DIPROSES').length;
        setNewOrderCount(newOrders);

        // Badge Delivery: SIAP DIKIRIM atau DALAM PERJALANAN
        const activeDeliv = deliveries.filter(
          (d) => d.status === 'MENUNGGU' || d.status === 'DITUGASKAN' || d.status === 'DALAM PERJALANAN'
        ).length;
        setActiveDeliveryCount(activeDeliv);
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  const navSections = [
    {
      title: 'UTAMA',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'TRANSAKSI',
      items: [
        { id: 'orders', label: 'Order / Pesanan', icon: ShoppingCart, badge: newOrderCount, badgeColor: 'bg-amber-500' },
        { id: 'deliveries', label: 'Pengiriman', icon: Truck, badge: activeDeliveryCount, badgeColor: 'bg-sky-600' },
        { id: 'direct_sale', label: 'Ambil di Depot', icon: Store },
        { id: 'payments', label: 'Pembayaran', icon: CreditCard }
      ]
    },
    {
      title: 'PELANGGAN',
      items: [
        { id: 'customers', label: 'Data Pelanggan', icon: Users },
        { id: 'customer_locations', label: 'Lokasi Pengiriman', icon: MapPin },
        { id: 'customer_history', label: 'Riwayat Pelanggan', icon: History }
      ]
    },
    {
      title: 'GALON & STOK',
      items: [
        { id: 'gallons', label: 'Stok Galon', icon: Package },
        { id: 'gallon_movements', label: 'Pergerakan Galon', icon: ArrowLeftRight },
        { id: 'gallon_borrowed', label: 'Galon Dipinjam', icon: UserCheck },
        { id: 'gallon_damaged', label: 'Galon Rusak / Hilang', icon: AlertTriangle },
        { id: 'inventory', label: 'Stok Perlengkapan', icon: Boxes }
      ]
    },
    {
      title: 'KEUANGAN',
      items: [
        { id: 'finance_receivables', label: 'Piutang', icon: Receipt },
        { id: 'finance_cash', label: 'Kas Masuk & Keluar', icon: Wallet },
        { id: 'finance_expenses', label: 'Beban Operasional', icon: Coins },
        { id: 'finance_closing', label: 'Closing Harian', icon: CheckCircle2 }
      ]
    },
    {
      title: 'OPERASIONAL DEPOT',
      items: [
        { id: 'ops_production', label: 'Produksi / Isi Ulang', icon: Droplet },
        { id: 'ops_maintenance', label: 'Maintenance Mesin RO', icon: Wrench },
        { id: 'ops_filter', label: 'Penggantian Filter', icon: Filter },
        { id: 'ops_quality', label: 'Catatan Kualitas', icon: CheckCircle2 }
      ]
    },
    {
      title: 'LAPORAN & OUTPUT',
      items: [
        { id: 'reports', label: 'Laporan & PDF', icon: FileSpreadsheet },
        { id: 'report_whatsapp', label: 'Laporan WhatsApp', icon: MessageSquare }
      ]
    },
    {
      title: 'ADMIN & DATABASE',
      items: [
        { id: 'master_data', label: 'Master Data', icon: Database },
        { id: 'settings', label: 'Pengaturan Usaha', icon: Sliders },
        { id: 'google_sheets', label: 'Google Sheets & Backup', icon: Cloud },
        { id: 'audit_log', label: 'Audit Log & Riwayat', icon: ClipboardList }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col h-screen sticky top-0 border-r border-slate-800 no-print select-none">
      {/* Brand logo top header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center font-black text-white text-base shadow-md shadow-cyan-500/20">
          160
        </div>
        <div>
          <h2 className="font-extrabold text-white text-sm tracking-wide">ONE SIXTY</h2>
          <p className="text-[10px] text-cyan-400 font-semibold tracking-wider uppercase">Depot Air RO</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5 text-xs">
        {navSections.map((sec) => (
          <div key={sec.title}>
            <p className="px-3 mb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              {sec.title}
            </p>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all ${
                      isActive
                        ? 'bg-sky-600 text-white font-semibold shadow-md shadow-sky-600/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full text-white ml-1 ${
                          item.badgeColor || 'bg-sky-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom version & system info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[10px] text-slate-500 flex items-center justify-between">
        <span>v1.0 • PWA Local First</span>
        <span className="text-cyan-400 font-mono">RO-160</span>
      </div>
    </aside>
  );
};
