// Global Application State Context for 160 ONE SIXTY
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  User,
  AppConfig,
  PeriodFilterOption,
  DateRange,
  AppNotification,
  AuditLog
} from '../types';
import {
  getAllFromStore,
  getByIdFromStore,
  putToStore,
  STORES,
  DEFAULT_APP_CONFIG,
  INITIAL_SUPER_ADMIN,
  openDatabase
} from '../db/indexedDb';
import { soundManager } from '../services/audio';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  appConfig: AppConfig;
  periodFilter: PeriodFilterOption;
  customDateRange: DateRange;
  activeTab: string;
  isOnline: boolean;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  refreshCounter: number;
  driverOrderIdToOpen: string | null;
  selectedOrderIdForDetail: string | null;
  printData: { type: 'order' | 'delivery' | 'closing'; data: unknown } | null;

  setCurrentUser: (user: User | null) => void;
  setPeriodFilter: (filter: PeriodFilterOption) => void;
  setCustomDateRange: (range: DateRange) => void;
  setActiveTab: (tab: string) => void;
  setSelectedOrderIdForDetail: (orderId: string | null) => void;
  setPrintData: (payload: { type: 'order' | 'delivery' | 'closing'; data: unknown } | null) => void;
  triggerRefresh: () => void;
  updateAppConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
  logAudit: (action: AuditLog['action'], module: string, details: string, recordId?: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  testAudio: () => void;
  isDateInPeriod: (dateStr: string) => boolean;
  getDateRangeForPeriod: (filter: PeriodFilterOption) => { start: string; end: string };
  openDriverPortalForOrder: (orderId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterOption>('TODAY');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    startDate: todayStr,
    endDate: todayStr
  });
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);
  const [driverOrderIdToOpen, setDriverOrderIdToOpen] = useState<string | null>(null);
  const [selectedOrderIdForDetail, setSelectedOrderIdForDetail] = useState<string | null>(null);
  const [printData, setPrintData] = useState<{ type: 'order' | 'delivery' | 'closing'; data: unknown } | null>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize DB and load base config and user
  useEffect(() => {
    let mounted = true;
    openDatabase().then(async () => {
      const config = await getByIdFromStore<AppConfig>(STORES.APP_CONFIG, 'config');
      const allUsers = await getAllFromStore<User>(STORES.USERS);
      const allNotifs = await getAllFromStore<AppNotification>(STORES.NOTIFICATIONS);

      if (mounted) {
        if (config) setAppConfig(config);
        setUsers(allUsers);
        setNotifications(allNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        // Default login as first user or Super Admin if none selected
        if (!currentUser) {
          const adminUser = allUsers.find((u) => u.role === 'SUPER ADMIN') || allUsers[0] || INITIAL_SUPER_ADMIN;
          setCurrentUser(adminUser);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  const updateAppConfig = async (newConfig: Partial<AppConfig>) => {
    const updated = { ...appConfig, ...newConfig, id: 'config' as const };
    await putToStore(STORES.APP_CONFIG, updated);
    setAppConfig(updated);
    triggerRefresh();
  };

  const logAudit = async (action: AuditLog['action'], module: string, details: string, recordId?: string) => {
    const newLog: AuditLog = {
      id: 'LOG-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || 'Sistem',
      role: currentUser?.role || 'SYSTEM',
      action,
      module,
      details,
      recordId
    };
    await putToStore(STORES.AUDIT_LOGS, newLog);
  };

  const markNotificationAsRead = async (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    if (notif) {
      const updated = { ...notif, isRead: true };
      await putToStore(STORES.NOTIFICATIONS, updated);
      triggerRefresh();
    }
  };

  const markAllNotificationsAsRead = async () => {
    for (const notif of notifications) {
      if (!notif.isRead) {
        await putToStore(STORES.NOTIFICATIONS, { ...notif, isRead: true });
      }
    }
    triggerRefresh();
  };

  const testAudio = () => {
    soundManager.playNewOrderChime(appConfig.soundVolume || 80);
  };

  const openDriverPortalForOrder = (orderId: string) => {
    setDriverOrderIdToOpen(orderId);
    setActiveTab('driver_portal');
  };

  // Date period helper
  const getDateRangeForPeriod = useCallback(
    (filter: PeriodFilterOption): { start: string; end: string } => {
      const now = new Date();
      const formatYMD = (d: Date) => d.toISOString().slice(0, 10);

      switch (filter) {
        case 'TODAY':
          return { start: formatYMD(now), end: formatYMD(now) };
        case 'YESTERDAY': {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          return { start: formatYMD(y), end: formatYMD(y) };
        }
        case 'LAST_7_DAYS': {
          const s = new Date(now);
          s.setDate(s.getDate() - 6);
          return { start: formatYMD(s), end: formatYMD(now) };
        }
        case 'THIS_WEEK': {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
          const monday = new Date(now.setDate(diff));
          const sunday = new Date(monday);
          sunday.setDate(sunday.getDate() + 6);
          return { start: formatYMD(monday), end: formatYMD(sunday) };
        }
        case 'THIS_MONTH': {
          const first = new Date(now.getFullYear(), now.getMonth(), 1);
          const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return { start: formatYMD(first), end: formatYMD(last) };
        }
        case 'LAST_MONTH': {
          const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const last = new Date(now.getFullYear(), now.getMonth(), 0);
          return { start: formatYMD(first), end: formatYMD(last) };
        }
        case 'THIS_YEAR': {
          const first = new Date(now.getFullYear(), 0, 1);
          const last = new Date(now.getFullYear(), 11, 31);
          return { start: formatYMD(first), end: formatYMD(last) };
        }
        case 'CUSTOM':
          return { start: customDateRange.startDate, end: customDateRange.endDate };
        case 'ALL':
        default:
          return { start: '1970-01-01', end: '2099-12-31' };
      }
    },
    [customDateRange]
  );

  const isDateInPeriod = useCallback(
    (dateStr: string): boolean => {
      if (!dateStr) return false;
      const target = dateStr.slice(0, 10);
      const { start, end } = getDateRangeForPeriod(periodFilter);
      return target >= start && target <= end;
    },
    [periodFilter, getDateRangeForPeriod]
  );

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        appConfig,
        periodFilter,
        customDateRange,
        activeTab,
        isOnline,
        notifications,
        unreadNotificationCount,
        refreshCounter,
        driverOrderIdToOpen,
        selectedOrderIdForDetail,
        printData,
        setCurrentUser,
        setPeriodFilter,
        setCustomDateRange,
        setActiveTab,
        setSelectedOrderIdForDetail,
        setPrintData,
        triggerRefresh,
        updateAppConfig,
        logAudit,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        testAudio,
        isDateInPeriod,
        getDateRangeForPeriod,
        openDriverPortalForOrder
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
