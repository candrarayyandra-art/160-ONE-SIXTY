import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  ShoppingCart,
  Printer,
  MessageSquare,
  DollarSign,
  Truck,
  CheckCircle,
  Eye,
  Trash2,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getAllFromStore,
  putToStore,
  deleteFromStore,
  STORES
} from '../db/indexedDb';
import {
  Order,
  Customer,
  CustomerLocation,
  Product,
  Delivery,
  Payment,
  GallonMovement,
  CashTransaction
} from '../types';
import { QuickRecapBar, RecapItem } from '../components/common/QuickRecapBar';
import { Pagination } from '../components/common/Pagination';
import {
  formatRupiah,
  parseRupiahInput,
  formatDateIndo,
  generateWhatsAppOrderReceipt
} from '../services/exportService';
import { createNotification } from '../services/notificationService';

export const OrdersView: React.FC = () => {
  const {
    isDateInPeriod,
    refreshCounter,
    triggerRefresh,
    currentUser,
    appConfig,
    logAudit,
    setPrintData,
    selectedOrderIdForDetail,
    setSelectedOrderIdForDetail
  } = useApp();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<CustomerLocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Search, Filter & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Partial Payment Modal inside Detail
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payMethodInput, setPayMethodInput] = useState('Tunai');
  const [payNotesInput, setPayNotesInput] = useState('');

  // Form State for New Order
  const today = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

  const [formDate, setFormDate] = useState(today);
  const [formTime, setFormTime] = useState(currentTime);
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formLocationId, setFormLocationId] = useState('');
  const [formLocationName, setFormLocationName] = useState('Lokasi Utama');
  const [formShippingAddress, setFormShippingAddress] = useState('');
  const [formMapsUrl, setFormMapsUrl] = useState('');
  const [formTransactionType, setFormTransactionType] = useState<'DELIVERY' | 'DEPOT'>('DELIVERY');
  const [formProductId, setFormProductId] = useState('');
  const [formProductName, setFormProductName] = useState('Air Minum RO 19L');
  const [formQty, setFormQty] = useState(1);
  const [formPrice, setFormPrice] = useState(7000);
  const [formShippingFee, setFormShippingFee] = useState(0);
  const [formDiscount, setFormDiscount] = useState(0);
  const [formPaidAmount, setFormPaidAmount] = useState(7000);
  const [formPaymentMethod, setFormPaymentMethod] = useState('Tunai');
  const [formNotes, setFormNotes] = useState('');

  // Load Database
  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAllFromStore<Order>(STORES.ORDERS),
      getAllFromStore<Customer>(STORES.CUSTOMERS),
      getAllFromStore<CustomerLocation>(STORES.CUSTOMER_LOCATIONS),
      getAllFromStore<Product>(STORES.PRODUCTS),
      getAllFromStore<Payment>(STORES.PAYMENTS)
    ]).then(([ords, custs, locs, prods, pays]) => {
      if (mounted) {
        setOrders(ords.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)));
        setCustomers(custs);
        setLocations(locs);
        setProducts(prods);
        setPayments(pays);

        // If product list exists and form product not set, default to first product
        if (prods.length > 0 && !formProductId) {
          setFormProductId(prods[0].id);
          setFormProductName(prods[0].name);
          setFormPrice(prods[0].price);
          setFormPaidAmount(prods[0].price);
        }

        // Check if selectedOrderIdForDetail was requested from dashboard/notification
        if (selectedOrderIdForDetail) {
          const found = ords.find((o) => o.id === selectedOrderIdForDetail);
          if (found) {
            setActiveOrder(found);
            setShowDetailModal(true);
            setSelectedOrderIdForDetail(null);
          }
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter, selectedOrderIdForDetail, setSelectedOrderIdForDetail]);

  // Customer change handler in form
  const handleCustomerSelect = (custId: string) => {
    setFormCustomerId(custId);
    const selected = customers.find((c) => c.id === custId);
    if (selected) {
      setFormCustomerName(selected.name);
      setFormCustomerPhone(selected.phone || '');
      setFormShippingAddress(selected.mainAddress || '');
      if (selected.customPrice && selected.customPrice > 0) {
        setFormPrice(selected.customPrice);
      }

      // Find locations for this customer
      const custLocs = locations.filter((l) => l.customerId === custId);
      if (custLocs.length > 0) {
        setFormLocationId(custLocs[0].id);
        setFormLocationName(custLocs[0].name);
        setFormShippingAddress(custLocs[0].address);
        setFormMapsUrl(custLocs[0].mapsUrl || '');
      } else {
        setFormLocationId('');
        setFormLocationName('Alamat Utama');
        setFormMapsUrl('');
      }
    }
  };

  // Location change handler
  const handleLocationSelect = (locId: string) => {
    setFormLocationId(locId);
    const loc = locations.find((l) => l.id === locId);
    if (loc) {
      setFormLocationName(loc.name);
      setFormShippingAddress(loc.address);
      setFormMapsUrl(loc.mapsUrl || '');
    }
  };

  // Product select handler
  const handleProductSelect = (prodId: string) => {
    setFormProductId(prodId);
    const p = products.find((pr) => pr.id === prodId);
    if (p) {
      setFormProductName(p.name);
      setFormPrice(p.price);
    }
  };

  // Calculate Subtotal and Total
  const subtotal = formQty * formPrice;
  const grandTotal = Math.max(0, subtotal + formShippingFee - formDiscount);

  // Filtered Orders in current global period
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!isDateInPeriod(o.date)) return false;

      if (statusFilter !== 'ALL' && o.orderStatus !== statusFilter) return false;
      if (paymentFilter !== 'ALL' && o.paymentStatus !== paymentFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = o.id.toLowerCase().includes(q);
        const matchesCust = o.customerName.toLowerCase().includes(q);
        const matchesPhone = (o.customerPhone || '').toLowerCase().includes(q);
        const matchesAddr = (o.shippingAddress || '').toLowerCase().includes(q);
        return matchesId || matchesCust || matchesPhone || matchesAddr;
      }

      return true;
    });
  }, [orders, isDateInPeriod, statusFilter, paymentFilter, searchQuery]);

  // Quick Recap items above table (Requirement #7)
  const recapData: RecapItem[] = useMemo(() => {
    const totalOrderCount = filteredOrders.length;
    const totalGalon = filteredOrders.reduce((sum, o) => sum + (o.totalGalon || 0), 0);
    const totalNilai = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalBayar = filteredOrders.reduce((sum, o) => sum + (o.totalPaid || 0), 0);
    const sisaPiutang = filteredOrders.reduce((sum, o) => sum + (o.balance || 0), 0);
    const orderSelesai = filteredOrders.filter((o) => o.orderStatus === 'SELESAI').length;
    const belumDikirim = filteredOrders.filter((o) => o.orderStatus === 'BARU' || o.orderStatus === 'DIPROSES' || o.orderStatus === 'SIAP DIKIRIM').length;

    return [
      { label: 'Jumlah Order', value: `${totalOrderCount} Pesanan`, color: 'sky' },
      { label: 'Total Galon', value: `${totalGalon} Galon`, color: 'sky' },
      { label: 'Total Nilai', value: formatRupiah(totalNilai), color: 'emerald' },
      { label: 'Sudah Dibayar', value: formatRupiah(totalBayar), color: 'emerald' },
      { label: 'Sisa Piutang', value: formatRupiah(sisaPiutang), color: 'amber' },
      { label: 'Order Selesai', value: `${orderSelesai}`, color: 'default' },
      { label: 'Belum Selesai', value: `${belumDikirim}`, color: 'rose' }
    ];
  }, [filteredOrders]);

  // Pagination slice
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Handle Save New Order
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCustomerName.trim()) {
      alert('Nama pelanggan wajib diisi!');
      return;
    }
    if (formQty <= 0) {
      alert('Jumlah galon harus lebih dari 0!');
      return;
    }

    // Generate Order ID: ORD-YYYYMMDD-XXXX
    const ymd = formDate.replace(/-/g, '');
    const todaysOrders = orders.filter((o) => o.date === formDate);
    const seq = String(todaysOrders.length + 1).padStart(4, '0');
    const orderId = `ORD-${ymd}-${seq}`;

    const paid = Math.min(grandTotal, Math.max(0, formPaidAmount));
    const balance = Math.max(0, grandTotal - paid);

    let paymentStatus: Order['paymentStatus'] = 'BELUM BAYAR';
    if (paid >= grandTotal) {
      paymentStatus = 'LUNAS';
    } else if (paid > 0) {
      paymentStatus = 'SEBAGIAN';
    }

    const newOrder: Order = {
      id: orderId,
      date: formDate,
      time: formTime,
      customerId: formCustomerId || undefined,
      customerName: formCustomerName,
      customerPhone: formCustomerPhone,
      locationId: formLocationId || undefined,
      locationName: formLocationName,
      shippingAddress: formShippingAddress,
      mapsUrl: formMapsUrl,
      transactionType: formTransactionType,
      items: [
        {
          productId: formProductId || 'PRD-DEFAULT',
          productName: formProductName,
          quantity: formQty,
          price: formPrice,
          subtotal: subtotal
        }
      ],
      totalGalon: formQty,
      subtotal: subtotal,
      discount: formDiscount,
      shippingFee: formShippingFee,
      total: grandTotal,
      totalPaid: paid,
      balance: balance,
      paymentMethod: formPaymentMethod,
      paymentStatus: paymentStatus,
      orderStatus: 'BARU',
      operatorName: currentUser?.name || 'Petugas',
      notes: formNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await putToStore(STORES.ORDERS, newOrder);

    // If initial payment was made, record to PAYMENTS store & CASH store
    if (paid > 0) {
      const paymentId = `PAY-${ymd}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const newPayment: Payment = {
        id: paymentId,
        date: formDate,
        orderId: orderId,
        customerId: formCustomerId || undefined,
        customerName: formCustomerName,
        amount: paid,
        method: formPaymentMethod,
        notes: `Pembayaran awal order ${orderId}`,
        operatorName: currentUser?.name || 'Petugas',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await putToStore(STORES.PAYMENTS, newPayment);

      const cashTx: CashTransaction = {
        id: `CSH-${Date.now()}`,
        date: formDate,
        type: 'IN',
        category: 'Penjualan Air RO',
        amount: paid,
        description: `Kas masuk dari order ${orderId} (${formCustomerName})`,
        referenceId: orderId,
        operatorName: currentUser?.name || 'Petugas',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await putToStore(STORES.CASH_TRANSACTIONS, cashTx);
    }

    // Automatically create Delivery record if transaction type is DELIVERY
    if (formTransactionType === 'DELIVERY') {
      const deliveryId = `DLV-${ymd}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const newDelivery: Delivery = {
        id: deliveryId,
        orderId: orderId,
        customerId: formCustomerId || undefined,
        customerName: formCustomerName,
        customerPhone: formCustomerPhone,
        locationName: formLocationName,
        address: formShippingAddress || 'Alamat Belum Diisi',
        mapsUrl: formMapsUrl,
        totalGalon: formQty,
        driverName: 'Menunggu Driver',
        assignedAt: new Date().toISOString(),
        status: 'MENUNGGU',
        notes: formNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await putToStore(STORES.DELIVERIES, newDelivery);
    }

    // Log Gallon Movement: galon keluar depot
    const movementType = formTransactionType === 'DELIVERY' ? 'KELUAR_PENGIRIMAN' : 'KELUAR_DEPOT';
    const gallonMove: GallonMovement = {
      id: `GAL-${Date.now()}`,
      date: formDate,
      type: movementType,
      customerId: formCustomerId || undefined,
      customerName: formCustomerName,
      orderId: orderId,
      qty: formQty,
      balanceBefore: 0,
      balanceAfter: 0,
      notes: `Keluar untuk order ${orderId} (${formCustomerName})`,
      operatorName: currentUser?.name || 'Petugas',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await putToStore(STORES.GALLON_MOVEMENTS, gallonMove);

    // CRITICAL REQUIREMENT #14, #15, #16, #19:
    // ORDER BARU HARUS MEMUNCULKAN NOTIFIKASI + SUARA CHIME + ANTI-SPAM KEY
    const notifKey = `ORDER_NEW_${orderId}`;
    await createNotification({
      notificationKey: notifKey,
      title: '🔔 ORDER BARU DITERIMA',
      message: `${formCustomerName}\n${formQty} Galon • ${formatRupiah(grandTotal)}\nLokasi: ${formLocationName || 'Depot'} (${formTime})`,
      type: 'ORDER_BARU',
      linkMenu: 'orders',
      targetId: orderId
    });

    await logAudit('TAMBAH', 'ORDER', `Order baru ${orderId} senilai ${formatRupiah(grandTotal)} dibuat`, orderId);

    // Reset and close
    setShowCreateModal(false);
    triggerRefresh();

    // Open detail modal to preview or print nota
    setActiveOrder(newOrder);
    setShowDetailModal(true);
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (newStatus: Order['orderStatus']) => {
    if (!activeOrder) return;
    const updated: Order = {
      ...activeOrder,
      orderStatus: newStatus,
      updatedAt: new Date().toISOString()
    };
    await putToStore(STORES.ORDERS, updated);

    // If order has associated delivery, sync delivery status
    if (activeOrder.transactionType === 'DELIVERY') {
      const allDelivs = await getAllFromStore<Delivery>(STORES.DELIVERIES);
      const matchedDeliv = allDelivs.find((d) => d.orderId === activeOrder.id);
      if (matchedDeliv) {
        let delivStatus = matchedDeliv.status;
        if (newStatus === 'DALAM PENGIRIMAN') delivStatus = 'DALAM PERJALANAN';
        if (newStatus === 'SELESAI') delivStatus = 'SELESAI';
        if (newStatus === 'BATAL') delivStatus = 'BATAL';
        await putToStore(STORES.DELIVERIES, {
          ...matchedDeliv,
          status: delivStatus,
          updatedAt: new Date().toISOString()
        });
      }
    }

    await logAudit('STATUS_CHANGE', 'ORDER', `Status order ${activeOrder.id} diubah menjadi ${newStatus}`, activeOrder.id);
    setActiveOrder(updated);
    triggerRefresh();
  };

  // Add Partial Payment (Cicilan) - Requirement #28: Tidak overwrite histori pembayaran sebelumnya!
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    const amount = parseRupiahInput(payAmountInput);
    if (amount <= 0) {
      alert('Masukkan jumlah pembayaran yang valid!');
      return;
    }

    const newTotalPaid = activeOrder.totalPaid + amount;
    const newBalance = Math.max(0, activeOrder.total - newTotalPaid);

    let newPayStatus: Order['paymentStatus'] = 'SEBAGIAN';
    if (newTotalPaid >= activeOrder.total) {
      newPayStatus = 'LUNAS';
    }

    const updatedOrder: Order = {
      ...activeOrder,
      totalPaid: newTotalPaid,
      balance: newBalance,
      paymentStatus: newPayStatus,
      updatedAt: new Date().toISOString()
    };

    await putToStore(STORES.ORDERS, updatedOrder);

    // Save payment record
    const payId = `PAY-${today.replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const newPay: Payment = {
      id: payId,
      date: today,
      orderId: activeOrder.id,
      customerId: activeOrder.customerId,
      customerName: activeOrder.customerName,
      amount: amount,
      method: payMethodInput,
      notes: payNotesInput || `Cicilan untuk order ${activeOrder.id}`,
      operatorName: currentUser?.name || 'Petugas',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await putToStore(STORES.PAYMENTS, newPay);

    // Record cash in
    const cashTx: CashTransaction = {
      id: `CSH-${Date.now()}`,
      date: today,
      type: 'IN',
      category: 'Pembayaran Piutang',
      amount: amount,
      description: `Cicilan piutang order ${activeOrder.id} (${activeOrder.customerName})`,
      referenceId: activeOrder.id,
      operatorName: currentUser?.name || 'Petugas',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await putToStore(STORES.CASH_TRANSACTIONS, cashTx);

    await logAudit(
      'TAMBAH',
      'PEMBAYARAN',
      `Pembayaran cicilan ${formatRupiah(amount)} diterima untuk order ${activeOrder.id}`,
      activeOrder.id
    );

    setActiveOrder(updatedOrder);
    setShowPayModal(false);
    setPayAmountInput('');
    setPayNotesInput('');
    triggerRefresh();
  };

  // Delete Order
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`Hapus order ${orderId}? Tindakan ini akan menghapus data order terkait.`)) return;
    await deleteFromStore(STORES.ORDERS, orderId);
    await logAudit('HAPUS', 'ORDER', `Order ${orderId} dihapus`, orderId);
    if (activeOrder?.id === orderId) {
      setShowDetailModal(false);
      setActiveOrder(null);
    }
    triggerRefresh();
  };

  // WhatsApp share
  const handleShareWhatsApp = (order: Order) => {
    const text = generateWhatsAppOrderReceipt({
      depotName: appConfig.depotName || '160 ONE SIXTY',
      orderId: order.id,
      date: order.date,
      customerName: order.customerName,
      items: order.items,
      total: order.total,
      paid: order.totalPaid,
      balance: order.balance,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      notes: order.notes
    });

    const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const url = phoneWithCountry
      ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Order & Pesanan</h2>
          <p className="text-xs text-slate-500">Kelola pesanan depot, status pengiriman & pembayaran</p>
        </div>

        <button
          onClick={() => {
            setFormDate(today);
            setFormPaidAmount(grandTotal);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-sky-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          + Buat Order Baru
        </button>
      </div>

      {/* Quick Recap Bar on Top of Table (Requirement #7) */}
      <QuickRecapBar items={recapData} />

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari order, pelanggan, hp, alamat..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {/* Status Order Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">Semua Status Order</option>
            <option value="BARU">BARU</option>
            <option value="DIPROSES">DIPROSES</option>
            <option value="SIAP DIKIRIM">SIAP DIKIRIM</option>
            <option value="DALAM PENGIRIMAN">DALAM PENGIRIMAN</option>
            <option value="SELESAI">SELESAI</option>
            <option value="BATAL">BATAL</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">Semua Status Bayar</option>
            <option value="LUNAS">LUNAS</option>
            <option value="SEBAGIAN">SEBAGIAN</option>
            <option value="BELUM BAYAR">BELUM BAYAR</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-slate-600">Belum Ada Order Ditemukan</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Tidak ada order yang cocok dengan filter atau database masih kosong.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20"
            >
              <Plus className="w-4 h-4" />
              + Buat Order Baru
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">No. Order</th>
                  <th className="py-3 px-3">Waktu</th>
                  <th className="py-3 px-3">Pelanggan & Lokasi</th>
                  <th className="py-3 px-2 text-center">Tipe</th>
                  <th className="py-3 px-2 text-center">Galon</th>
                  <th className="py-3 px-3 text-right">Total Tagihan</th>
                  <th className="py-3 px-3 text-right">Sudah Bayar</th>
                  <th className="py-3 px-3 text-right">Sisa Piutang</th>
                  <th className="py-3 px-2 text-center">Status Bayar</th>
                  <th className="py-3 px-2 text-center">Status Order</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">{ord.id}</td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {formatDateIndo(ord.date)}
                      <span className="block text-[10px] text-slate-400">{ord.time}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800 block">{ord.customerName}</span>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
                        {ord.locationName || ord.shippingAddress || 'Ambil di Depot'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.transactionType === 'DELIVERY'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ord.transactionType === 'DELIVERY' ? 'Kirim' : 'Depot'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-slate-700">{ord.totalGalon}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800">{formatRupiah(ord.total)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                      {formatRupiah(ord.totalPaid)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-amber-700">
                      {ord.balance > 0 ? formatRupiah(ord.balance) : '-'}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.paymentStatus === 'LUNAS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.paymentStatus === 'SEBAGIAN'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.orderStatus === 'BARU'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : ord.orderStatus === 'SELESAI'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.orderStatus === 'BATAL'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {ord.orderStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setActiveOrder(ord);
                            setShowDetailModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 transition"
                          title="Detail Order"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPrintData({ type: 'order', data: ord })}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Cetak Nota"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(ord)}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                          title="Kirim Nota WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* CREATE ORDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Buat Pesanan Baru</h3>
                  <p className="text-[11px] text-slate-500">Input order depot atau pengiriman</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Tanggal & Waktu */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jam</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                    required
                  />
                </div>
              </div>

              {/* Tipe Transaksi: DELIVERY vs DEPOT */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTransactionType('DELIVERY')}
                    className={`py-2 rounded-xl font-bold border transition flex items-center justify-center gap-2 ${
                      formTransactionType === 'DELIVERY'
                        ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-300'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    Pengiriman (Delivery)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTransactionType('DEPOT')}
                    className={`py-2 rounded-xl font-bold border transition flex items-center justify-center gap-2 ${
                      formTransactionType === 'DEPOT'
                        ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-300'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Ambil di Depot
                  </button>
                </div>
              </div>

              {/* Pilih Pelanggan Terdaftar atau Input Baru */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">Pilih / Nama Pelanggan</label>
                {customers.length > 0 && (
                  <select
                    value={formCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                  >
                    <option value="">-- Pilih dari Master Pelanggan --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customerType}) - {c.phone}
                      </option>
                    ))}
                  </select>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Pelanggan *"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                    required
                  />
                  <input
                    type="text"
                    placeholder="No. WhatsApp (opsional)"
                    value={formCustomerPhone}
                    onChange={(e) => setFormCustomerPhone(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Lokasi & Alamat (Khusus Delivery) */}
              {formTransactionType === 'DELIVERY' && (
                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="font-bold text-slate-700 block">Tujuan Pengiriman</span>

                  {/* Lokasi terdaftar jika customer dipilih */}
                  {formCustomerId && locations.filter((l) => l.customerId === formCustomerId).length > 0 && (
                    <select
                      value={formLocationId}
                      onChange={(e) => handleLocationSelect(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                    >
                      {locations
                        .filter((l) => l.customerId === formCustomerId)
                        .map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} - {loc.address}
                          </option>
                        ))}
                    </select>
                  )}

                  <input
                    type="text"
                    placeholder="Alamat Lengkap Pengiriman *"
                    value={formShippingAddress}
                    onChange={(e) => setFormShippingAddress(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Link Google Maps (contoh: https://maps.app.goo.gl/...)"
                    value={formMapsUrl}
                    onChange={(e) => setFormMapsUrl(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
              )}

              {/* Produk & Galon */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3 sm:col-span-1">
                  <label className="font-bold text-slate-700 block mb-1">Produk</label>
                  {products.length > 0 ? (
                    <select
                      value={formProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.size})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formProductName}
                      onChange={(e) => setFormProductName(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-xl"
                      placeholder="Air Minum RO 19L"
                    />
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Qty (Galon)</label>
                  <input
                    type="number"
                    min="1"
                    value={formQty}
                    onChange={(e) => setFormQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-center"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harga / Galon</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-right"
                    required
                  />
                </div>
              </div>

              {/* Diskon & Ongkir */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ongkos Kirim</label>
                  <input
                    type="number"
                    value={formShippingFee}
                    onChange={(e) => setFormShippingFee(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl text-right font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Potongan / Diskon</label>
                  <input
                    type="number"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl text-right font-medium"
                  />
                </div>
              </div>

              {/* Grand Total Display */}
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-sky-800 font-bold block">TOTAL TAGIHAN</span>
                  <span className="text-[10px] text-sky-600">
                    {formQty} galon × {formatRupiah(formPrice)}
                  </span>
                </div>
                <span className="text-xl font-black text-sky-900">{formatRupiah(grandTotal)}</span>
              </div>

              {/* Pembayaran Awal & Metode */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jumlah Dibayar (Rp)</label>
                  <input
                    type="number"
                    value={formPaidAmount}
                    onChange={(e) => setFormPaidAmount(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold text-right text-emerald-700"
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setFormPaidAmount(grandTotal)}
                      className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]"
                    >
                      Lunas
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormPaidAmount(0)}
                      className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]"
                    >
                      Belum Bayar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Metode Pembayaran</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                  >
                    <option value="Tunai">Tunai</option>
                    <option value="Transfer BCA">Transfer BCA</option>
                    <option value="Transfer Mandiri">Transfer Mandiri</option>
                    <option value="Transfer BRI">Transfer BRI</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan (opsional)</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Titip di pos security, bawa uang kembalian..."
                  className="w-full p-2 border border-slate-200 rounded-xl resize-none"
                  rows={2}
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-md shadow-sky-600/20"
                >
                  Simpan Pesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL ORDER MODAL */}
      {showDetailModal && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Detail Pesanan {activeOrder.id}</h3>
                  <p className="text-[11px] text-slate-500">
                    {formatDateIndo(activeOrder.date)} {activeOrder.time}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setActiveOrder(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Customer & Delivery Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Pelanggan</span>
                    <h4 className="font-extrabold text-sm text-slate-800">{activeOrder.customerName}</h4>
                    {activeOrder.customerPhone && (
                      <p className="text-slate-600 text-[11px]">WA / Telp: {activeOrder.customerPhone}</p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      activeOrder.orderStatus === 'BARU'
                        ? 'bg-amber-100 text-amber-800'
                        : activeOrder.orderStatus === 'SELESAI'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {activeOrder.orderStatus}
                  </span>
                </div>

                {activeOrder.shippingAddress && (
                  <div className="pt-1 border-t border-slate-200 text-[11px]">
                    <span className="text-slate-500 block">Alamat Pengiriman:</span>
                    <p className="text-slate-800 font-medium">{activeOrder.shippingAddress}</p>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Produk</th>
                      <th className="py-2 px-2 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Harga</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeOrder.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-800">{it.productName}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-700">{it.quantity}</td>
                        <td className="py-2 px-3 text-right">{formatRupiah(it.price)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800">{formatRupiah(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(activeOrder.subtotal)}</span>
                </div>
                {activeOrder.shippingFee > 0 && (
                  <div className="flex justify-between">
                    <span>Ongkos Kirim:</span>
                    <span>{formatRupiah(activeOrder.shippingFee)}</span>
                  </div>
                )}
                {activeOrder.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Potongan / Diskon:</span>
                    <span>-{formatRupiah(activeOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200 text-slate-800">
                  <span>TOTAL TAGIHAN:</span>
                  <span>{formatRupiah(activeOrder.total)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>Sudah Dibayar ({activeOrder.paymentMethod}):</span>
                  <span>{formatRupiah(activeOrder.totalPaid)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-amber-700 pt-1 border-t border-slate-200">
                  <span>SISA PIUTANG:</span>
                  <span>{formatRupiah(activeOrder.balance)}</span>
                </div>
              </div>

              {/* Status Update Quick Buttons */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 block">Ubah Status Order:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['BARU', 'DIPROSES', 'SIAP DIKIRIM', 'DALAM PENGIRIMAN', 'SELESAI', 'BATAL'] as const).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateOrderStatus(st)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                          activeOrder.orderStatus === st
                            ? 'bg-sky-600 text-white border-sky-600 shadow'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Payment Installment Button if balance > 0 */}
              {activeOrder.balance > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-900 block">Tagihan Belum Lunas</span>
                    <span className="text-[11px] text-amber-700">Sisa {formatRupiah(activeOrder.balance)}</span>
                  </div>
                  <button
                    onClick={() => {
                      setPayAmountInput(String(activeOrder.balance));
                      setShowPayModal(true);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1 shadow"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    + Bayar Cicilan
                  </button>
                </div>
              )}

              {/* Action Buttons: Print Nota, Share WA, Delete */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleDeleteOrder(activeOrder.id)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus Order
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleShareWhatsApp(activeOrder)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setPrintData({ type: 'order', data: activeOrder })}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow transition"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Nota
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PARTIAL PAYMENT (CICILAN) MODAL */}
      {showPayModal && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Input Pembayaran Cicilan</h4>
              <button
                onClick={() => setShowPayModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Sisa Tagihan Saat Ini:</span>
                <span className="text-base font-black text-amber-700">{formatRupiah(activeOrder.balance)}</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal Pembayaran (Rp)</label>
                <input
                  type="number"
                  value={payAmountInput}
                  onChange={(e) => setPayAmountInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl font-bold text-right"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Metode</label>
                <select
                  value={payMethodInput}
                  onChange={(e) => setPayMethodInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                >
                  <option value="Tunai">Tunai</option>
                  <option value="Transfer BCA">Transfer BCA</option>
                  <option value="Transfer Mandiri">Transfer Mandiri</option>
                  <option value="Transfer BRI">Transfer BRI</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan</label>
                <input
                  type="text"
                  placeholder="Keterangan cicilan..."
                  value={payNotesInput}
                  onChange={(e) => setPayNotesInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
