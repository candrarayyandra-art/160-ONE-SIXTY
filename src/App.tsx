/**
 * 160 ONE SIXTY – SISTEM OPERASIONAL DEPOT AIR MINUM RO
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { NotificationCenterModal } from './components/layout/NotificationCenterModal';
import { PinModal } from './components/common/PinModal';
import { PrintModal } from './components/print/PrintModal';
import { MobileInstallBanner } from './components/common/MobileInstallBanner';

// Views
import { DashboardView } from './views/DashboardView';
import { OrdersView } from './views/OrdersView';
import { DeliveriesView } from './views/DeliveriesView';
import { DirectSaleView } from './views/DirectSaleView';
import { PaymentsView } from './views/PaymentsView';
import { CustomersView } from './views/CustomersView';
import { GallonView } from './views/GallonView';
import { FinanceView } from './views/FinanceView';
import { OperationsView } from './views/OperationsView';
import { ReportsView } from './views/ReportsView';
import { MasterDataView } from './views/MasterDataView';
import { SettingsView } from './views/SettingsView';
import { GoogleSheetsView } from './views/GoogleSheetsView';
import { AuditLogView } from './views/AuditLogView';
import { DriverPortalView } from './views/DriverPortalView';

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab, setSelectedOrderIdForDetail } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const handleNavigateFromNotification = (tabId: string, targetId?: string) => {
    setActiveTab(tabId);
    if (targetId && tabId === 'orders') {
      setSelectedOrderIdForDetail(targetId);
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'orders':
        return <OrdersView />;
      case 'deliveries':
        return <DeliveriesView />;
      case 'direct_sale':
        return <DirectSaleView />;
      case 'payments':
        return <PaymentsView />;

      // Pelanggan
      case 'customers':
      case 'customer_locations':
      case 'customer_history':
        return <CustomersView />;

      // Galon & Stok
      case 'gallons':
        return <GallonView initialSubTab="gallons" />;
      case 'gallon_movements':
        return <GallonView initialSubTab="movements" />;
      case 'gallon_borrowed':
        return <GallonView initialSubTab="borrowed" />;
      case 'gallon_damaged':
        return <GallonView initialSubTab="damaged" />;
      case 'inventory':
        return <GallonView initialSubTab="inventory" />;

      // Keuangan
      case 'finance_receivables':
        return <FinanceView initialSubTab="receivables" />;
      case 'finance_cash':
        return <FinanceView initialSubTab="cash" />;
      case 'finance_expenses':
        return <FinanceView initialSubTab="expenses" />;
      case 'finance_closing':
        return <FinanceView initialSubTab="closing" />;

      // Operasional Depot RO
      case 'ops_production':
        return <OperationsView initialSubTab="production" />;
      case 'ops_maintenance':
        return <OperationsView initialSubTab="maintenance" />;
      case 'ops_filter':
        return <OperationsView initialSubTab="filter" />;
      case 'ops_quality':
        return <OperationsView initialSubTab="quality" />;

      // Laporan
      case 'reports':
        return <ReportsView initialSubTab="reports" />;
      case 'report_whatsapp':
        return <ReportsView initialSubTab="whatsapp" />;

      // Admin & Database
      case 'master_data':
        return <MasterDataView />;
      case 'settings':
        return <SettingsView />;
      case 'google_sheets':
        return <GoogleSheetsView />;
      case 'audit_log':
        return <AuditLogView />;

      // Driver Special Portal
      case 'driver_portal':
        return <DriverPortalView />;

      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans text-slate-800">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:flex">
        <Sidebar currentTab={activeTab} onSelectTab={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          onOpenNotifications={() => setShowNotifications(true)}
          onOpenPinModal={() => setShowPinModal(true)}
        />

        {/* Scrollable View Content Container (with pb-20 on mobile to not be covered by bottom nav) */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          {renderActiveView()}
        </main>

        {/* Mobile Bottom Navigation (hidden on desktop) */}
        <MobileNav
          currentTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenPinModal={() => setShowPinModal(true)}
        />
      </div>

      {/* Modals */}
      <NotificationCenterModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNavigateTab={handleNavigateFromNotification}
      />

      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
      />

      <PrintModal />

      {/* Floating 1-click Mobile Install to Phone Banner */}
      <MobileInstallBanner />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
