// Types for 160 ONE SIXTY - Sistem Operasional Depot Air Minum RO

export type UserRole = 'SUPER ADMIN' | 'ADMIN' | 'KASIR' | 'OPERATOR' | 'DRIVER' | 'OWNER';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // 4-6 digit PIN
  phone?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PeriodFilterOption =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'ALL'
  | 'CUSTOM';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface CustomerLocation {
  id: string;
  customerId: string;
  name: string; // e.g. "Rumah", "Toko Cabang", "Gudang"
  address: string;
  mapsUrl?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  deliveryNotes?: string;
  status: 'AKTIF' | 'NONAKTIF';
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  customerType: string; // "Rumah Tangga", "Warung / Toko", "Kantor", "Reseller", etc.
  phone: string;
  mainAddress: string;
  notes?: string;
  customPrice?: number;
  debtLimit: number;
  defaultDueDays: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  size: string; // e.g. "19 Liter", "330 ml", "600 ml"
  price: number;
  resellerPrice?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'BARU'
  | 'DIPROSES'
  | 'SIAP DIKIRIM'
  | 'DALAM PENGIRIMAN'
  | 'SELESAI'
  | 'BATAL';

export type PaymentStatus = 'BELUM BAYAR' | 'SEBAGIAN' | 'LUNAS';

export type TransactionType = 'DELIVERY' | 'DEPOT';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string; // ORD-YYYYMMDD-XXXX
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  locationId?: string;
  locationName?: string;
  shippingAddress?: string;
  mapsUrl?: string;
  transactionType: TransactionType;
  items: OrderItem[];
  totalGalon: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  totalPaid: number;
  balance: number; // Piutang jika > 0
  paymentMethod: string; // "Tunai", "Transfer", "QRIS", etc.
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  operatorName: string;
  driverName?: string;
  notes?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus =
  | 'MENUNGGU'
  | 'DITUGASKAN'
  | 'DALAM PERJALANAN'
  | 'SAMPAI'
  | 'SELESAI'
  | 'BATAL';

export interface Delivery {
  id: string; // DLV-YYYYMMDD-XXXX
  orderId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  locationName: string;
  address: string;
  mapsUrl?: string;
  totalGalon: number;
  driverName: string;
  vehicle?: string;
  assignedAt: string;
  departedAt?: string;
  arrivedAt?: string;
  status: DeliveryStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string; // PAY-YYYYMMDD-XXXX
  date: string;
  orderId: string;
  customerId?: string;
  customerName: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  operatorName: string;
  createdAt: string;
  updatedAt: string;
}

export type GallonMovementType =
  | 'KOSONG_MASUK'
  | 'ISI_PRODUKSI'
  | 'KELUAR_PENGIRIMAN'
  | 'KELUAR_DEPOT'
  | 'KEMBALI_DARI_PELANGGAN'
  | 'PINJAM_PELANGGAN'
  | 'RUSAK'
  | 'HILANG';

export interface GallonMovement {
  id: string;
  date: string;
  type: GallonMovementType;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  qty: number;
  balanceBefore: number;
  balanceAfter: number;
  notes?: string;
  operatorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string; // Segel, Tutup Galon, Label, Tisu, dsb.
  category: string;
  unit: string; // pcs, rol, lembar, box
  currentStock: number;
  minStock: number;
  costPrice: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  date: string;
  type: 'IN' | 'OUT';
  qty: number;
  notes?: string;
  operatorName: string;
  createdAt: string;
}

export interface CashTransaction {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  category: string;
  amount: number;
  description: string;
  referenceId?: string;
  operatorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  receiptPhoto?: string;
  operatorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClosingRecord {
  id: string; // CLS-YYYYMMDD
  date: string;
  status: 'BELUM CLOSING' | 'SUDAH CLOSING';
  totalOrders: number;
  totalGalon: number;
  totalSales: number;
  totalPaid: number;
  newDebt: number;
  cashIn: number;
  cashOut: number;
  totalExpense: number;
  cashBalance: number;
  gallonOut: number;
  gallonIn: number;
  closedBy?: string;
  closedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionRecord {
  id: string;
  date: string;
  time: string;
  gallonProduced: number;
  operatorName: string;
  notes?: string;
  createdAt: string;
}

export interface MaintenanceRecord {
  id: string;
  machineType: string; // e.g. "Mesin RO", "Pompa Tekanan Tinggi", "Membran RO", "Sand Filter", "Karbon Aktif"
  maintenanceDate: string;
  type: 'RUTIN' | 'PERBAIKAN' | 'PENGGANTIAN_FILTER' | 'PEMBERSIHAN';
  technician: string;
  cost: number;
  notes?: string;
  nextScheduleDate?: string;
  status: 'TERJADWAL' | 'SELESAI';
  createdAt: string;
  updatedAt: string;
}

export interface FilterReplacementRecord {
  id: string;
  filterType: string; // "Sedimen 5 Micron", "Sedimen 1 Micron", "CTO Karbon", "Membran RO", "Post Karbon"
  installDate: string;
  replaceDate: string;
  nextEstimatedReplaceDate: string;
  technician: string;
  notes?: string;
  createdAt: string;
}

export interface WaterQualityRecord {
  id: string;
  date: string;
  tdsRawWater: number; // Air Baku (ppm)
  tdsRoProduct: number; // Air Produk RO (ppm)
  phLevel: number;
  temperature: number;
  tasteAndOdor: 'NORMAL' | 'BERBAU' | 'BERASA';
  inspector: string;
  notes?: string;
  createdAt: string;
}

export type NotificationType =
  | 'ORDER_BARU'
  | 'ORDER_BATAL'
  | 'DELIVERY'
  | 'PAYMENT'
  | 'PIUTANG'
  | 'GALON'
  | 'STOK'
  | 'MAINTENANCE'
  | 'SYNC'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  notificationKey: string; // For anti-spam, e.g. "ORDER_NEW_ORD-20260930-0001"
  title: string;
  message: string;
  type: NotificationType;
  linkMenu?: string;
  targetId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  role: string;
  action: 'LOGIN' | 'TAMBAH' | 'EDIT' | 'HAPUS' | 'CLOSING' | 'SYNC' | 'BACKUP' | 'RESTORE' | 'RESET' | 'STATUS_CHANGE';
  module: string;
  details: string;
  recordId?: string;
}

export interface AppConfig {
  id: 'config';
  depotName: string;
  subtitle: string;
  address: string;
  phone: string;
  logoUrl?: string;
  footerNote: string;
  signerName: string;
  receiptSize: 'thermal_58' | 'thermal_80' | 'a4';
  reminderClosingTime: string; // e.g. "21:00"
  soundEnabled: boolean;
  soundVolume: number; // 0-100
  notificationSettings: {
    orderBaru: boolean;
    delivery: boolean;
    piutang: boolean;
    galon: boolean;
    stok: boolean;
    maintenance: boolean;
    closing: boolean;
    sync: boolean;
  };
  sheetsUrl?: string;
  sheetsToken?: string;
  lastSyncAt?: string;
  lastBackupAt?: string;
}

export interface MasterOptions {
  customerTypes: string[];
  paymentMethods: string[];
  expenseCategories: string[];
  vehicleList: string[];
}
