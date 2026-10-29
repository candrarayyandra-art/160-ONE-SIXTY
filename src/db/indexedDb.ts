// IndexedDB Engine for 160 ONE SIXTY - Sistem Operasional Depot Air Minum RO
// Clean, persistent, typed client-side database with zero dummy business data.

import {
  AppConfig,
  Customer,
  CustomerLocation,
  Product,
  Order,
  Delivery,
  Payment,
  GallonMovement,
  InventoryItem,
  InventoryMovement,
  CashTransaction,
  Expense,
  ClosingRecord,
  ProductionRecord,
  MaintenanceRecord,
  FilterReplacementRecord,
  WaterQualityRecord,
  User,
  AppNotification,
  AuditLog,
  MasterOptions
} from '../types';

const DB_NAME = '160_ONE_SIXTY_DEPOT_DB';
const DB_VERSION = 1;

export const STORES = {
  CUSTOMERS: 'customers',
  CUSTOMER_LOCATIONS: 'customer_locations',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  DELIVERIES: 'deliveries',
  PAYMENTS: 'payments',
  GALLON_MOVEMENTS: 'gallon_movements',
  INVENTORY_ITEMS: 'inventory_items',
  INVENTORY_MOVEMENTS: 'inventory_movements',
  CASH_TRANSACTIONS: 'cash_transactions',
  EXPENSES: 'expenses',
  CLOSING_RECORDS: 'closing_records',
  PRODUCTION_RECORDS: 'production_records',
  MAINTENANCE_RECORDS: 'maintenance_records',
  FILTER_RECORDS: 'filter_records',
  QUALITY_RECORDS: 'quality_records',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'audit_logs',
  APP_CONFIG: 'app_config',
  MASTER_OPTIONS: 'master_options'
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

export const DEFAULT_APP_CONFIG: AppConfig = {
  id: 'config',
  depotName: '160 ONE SIXTY',
  subtitle: 'Sistem Operasional Depot Air Minum RO',
  address: 'Jl. Raya Depot No. 160',
  phone: '081234567890',
  footerNote: 'Terima kasih atas kepercayaan Anda mengonsumsi air minum RO 160 ONE SIXTY.',
  signerName: 'Pengelola Depot',
  receiptSize: 'thermal_80',
  reminderClosingTime: '21:00',
  soundEnabled: true,
  soundVolume: 80,
  notificationSettings: {
    orderBaru: true,
    delivery: true,
    piutang: true,
    galon: true,
    stok: true,
    maintenance: true,
    closing: true,
    sync: true
  },
  sheetsUrl: '',
  sheetsToken: '',
  lastSyncAt: '',
  lastBackupAt: ''
};

export const DEFAULT_MASTER_OPTIONS: MasterOptions = {
  customerTypes: ['Rumah Tangga', 'Warung / Toko', 'Kantor / Instansi', 'Reseller', 'Lainnya'],
  paymentMethods: ['Tunai', 'Transfer BCA', 'Transfer Mandiri', 'Transfer BRI', 'QRIS'],
  expenseCategories: ['Listrik & Air PLN', 'Tutup & Segel Galon', 'Maintenance & Filter', 'BBM Driver', 'Gaji & Operasional', 'Lain-lain'],
  vehicleList: ['Motor Roda Tiga', 'Motor Kurir 1', 'Motor Kurir 2', 'Mobil Pickup']
};

export const INITIAL_SUPER_ADMIN: User = {
  id: 'USR-ADMIN-01',
  name: 'Super Admin',
  role: 'SUPER ADMIN',
  pin: '160160',
  phone: '081234567890',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      Object.values(STORES).forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      });
    };

    request.onsuccess = async (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Auto-initialize config and super admin if not present
      await bootstrapInitialConfig(db);
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

async function bootstrapInitialConfig(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    const tx = db.transaction([STORES.APP_CONFIG, STORES.MASTER_OPTIONS, STORES.USERS], 'readwrite');
    
    // Check config
    const configStore = tx.objectStore(STORES.APP_CONFIG);
    const configReq = configStore.get('config');
    configReq.onsuccess = () => {
      if (!configReq.result) {
        configStore.put(DEFAULT_APP_CONFIG);
      }
    };

    // Check master options
    const masterStore = tx.objectStore(STORES.MASTER_OPTIONS);
    const masterReq = masterStore.get('options');
    masterReq.onsuccess = () => {
      if (!masterReq.result) {
        masterStore.put({ id: 'options', ...DEFAULT_MASTER_OPTIONS });
      }
    };

    // Check users - only seed default Super Admin if users store is completely empty
    const usersStore = tx.objectStore(STORES.USERS);
    const usersCountReq = usersStore.count();
    usersCountReq.onsuccess = () => {
      if (usersCountReq.result === 0) {
        usersStore.put(INITIAL_SUPER_ADMIN);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve(); // Non-blocking
  });
}

// Generic CRUD methods
export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getByIdFromStore<T>(storeName: StoreName, id: string): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as T) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function putToStore<T extends { id: string }>(storeName: StoreName, item: T): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

export async function bulkPutToStore<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
  if (!items || items.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFromStore(storeName: StoreName, id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Reset functions strictly adhering to rules: NO DUMMY DATA CREATED ON RESET
export async function resetTransactionsOnly(): Promise<void> {
  const txStores: StoreName[] = [
    STORES.ORDERS,
    STORES.DELIVERIES,
    STORES.PAYMENTS,
    STORES.GALLON_MOVEMENTS,
    STORES.INVENTORY_MOVEMENTS,
    STORES.CASH_TRANSACTIONS,
    STORES.EXPENSES,
    STORES.CLOSING_RECORDS,
    STORES.PRODUCTION_RECORDS,
    STORES.NOTIFICATIONS
  ];
  for (const s of txStores) {
    await clearStore(s);
  }
}

export async function resetMasterAndTransactions(): Promise<void> {
  const storesToClear: StoreName[] = [
    STORES.CUSTOMERS,
    STORES.CUSTOMER_LOCATIONS,
    STORES.PRODUCTS,
    STORES.ORDERS,
    STORES.DELIVERIES,
    STORES.PAYMENTS,
    STORES.GALLON_MOVEMENTS,
    STORES.INVENTORY_ITEMS,
    STORES.INVENTORY_MOVEMENTS,
    STORES.CASH_TRANSACTIONS,
    STORES.EXPENSES,
    STORES.CLOSING_RECORDS,
    STORES.PRODUCTION_RECORDS,
    STORES.MAINTENANCE_RECORDS,
    STORES.FILTER_RECORDS,
    STORES.QUALITY_RECORDS,
    STORES.NOTIFICATIONS
  ];
  for (const s of storesToClear) {
    await clearStore(s);
  }
}

export async function resetTotalDatabase(): Promise<void> {
  const allStores = Object.values(STORES);
  for (const s of allStores) {
    await clearStore(s);
  }
  // Restore basic config and super admin
  const db = await openDatabase();
  await bootstrapInitialConfig(db);
}

// Full Export / Import JSON for offline backup file
export async function exportAllDataToJson(): Promise<Record<string, unknown[]>> {
  const result: Record<string, unknown[]> = {};
  for (const storeName of Object.values(STORES)) {
    result[storeName] = await getAllFromStore(storeName);
  }
  return result;
}

export async function importDataFromJson(jsonData: Record<string, unknown[]>): Promise<number> {
  let count = 0;
  for (const [storeName, records] of Object.entries(jsonData)) {
    if (Object.values(STORES).includes(storeName as StoreName) && Array.isArray(records)) {
      await bulkPutToStore(storeName as StoreName, records as Array<{ id: string }>);
      count += records.length;
    }
  }
  return count;
}
