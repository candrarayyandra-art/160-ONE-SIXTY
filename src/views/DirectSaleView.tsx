import React, { useState, useEffect } from 'react';
import {
  Store,
  Printer,
  CheckCircle,
  Plus,
  Minus,
  Coins,
  CreditCard,
  User,
  ShoppingBag
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getAllFromStore,
  putToStore,
  STORES
} from '../db/indexedDb';
import {
  Order,
  Customer,
  Product,
  Payment,
  GallonMovement,
  CashTransaction
} from '../types';
import { formatRupiah } from '../services/exportService';

export const DirectSaleView: React.FC = () => {
  const {
    refreshCounter,
    triggerRefresh,
    currentUser,
    logAudit,
    setPrintData
  } = useApp();

  const today = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Pelanggan Umum (Datang Langsung)');
  const [customerPhone, setCustomerPhone] = useState('');
  const [qty, setQty] = useState(1);
  const [pricePerUnit, setPricePerUnit] = useState(6000);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [cashTendered, setCashTendered] = useState(6000);
  const [notes, setNotes] = useState('');
  const [recentDirectOrders, setRecentDirectOrders] = useState<Order[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAllFromStore<Customer>(STORES.CUSTOMERS),
      getAllFromStore<Product>(STORES.PRODUCTS),
      getAllFromStore<Order>(STORES.ORDERS)
    ]).then(([custs, prods, ords]) => {
      if (mounted) {
        setCustomers(custs);
        setProducts(prods);

        // Filter recent direct depot sales
        const depotSales = ords
          .filter((o) => o.transactionType === 'DEPOT')
          .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
        setRecentDirectOrders(depotSales.slice(0, 8));

        if (prods.length > 0) {
          setPricePerUnit(prods[0].price);
          setCashTendered(prods[0].price * qty);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    if (!custId) {
      setCustomerName('Pelanggan Umum (Datang Langsung)');
      setCustomerPhone('');
      return;
    }
    const c = customers.find((cust) => cust.id === custId);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone || '');
      if (c.customPrice && c.customPrice > 0) {
        setPricePerUnit(c.customPrice);
      }
    }
  };

  const totalTagihan = qty * pricePerUnit;
  const kembalian = Math.max(0, cashTendered - totalTagihan);

  const handleQuickAddQty = (amount: number) => {
    const nextQty = Math.max(1, qty + amount);
    setQty(nextQty);
    setCashTendered(nextQty * pricePerUnit);
  };

  const handleSaveDirectSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (qty <= 0) {
      alert('Jumlah galon minimal 1!');
      return;
    }

    const ymd = today.replace(/-/g, '');
    const orderId = `ORD-${ymd}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const paid = Math.min(totalTagihan, cashTendered);
    const balance = Math.max(0, totalTagihan - paid);

    const newOrder: Order = {
      id: orderId,
      date: today,
      time: currentTime,
      customerId: selectedCustomerId || undefined,
      customerName: customerName,
      customerPhone: customerPhone,
      locationName: 'Ambil di Depot',
      transactionType: 'DEPOT',
      items: [
        {
          productId: 'PRD-RO-19L',
          productName: 'Air Minum RO Isi Ulang (Depot)',
          quantity: qty,
          price: pricePerUnit,
          subtotal: totalTagihan
        }
      ],
      totalGalon: qty,
      subtotal: totalTagihan,
      discount: 0,
      shippingFee: 0,
      total: totalTagihan,
      totalPaid: paid,
      balance: balance,
      paymentMethod: paymentMethod,
      paymentStatus: balance === 0 ? 'LUNAS' : 'SEBAGIAN',
      orderStatus: 'SELESAI', // Penjualan langsung selesai saat itu juga
      operatorName: currentUser?.name || 'Kasir',
      notes: notes || 'Pembelian langsung di counter depot',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await putToStore(STORES.ORDERS, newOrder);

    // Save payment
    if (paid > 0) {
      const payId = `PAY-${Date.now()}`;
      const newPay: Payment = {
        id: payId,
        date: today,
        orderId: orderId,
        customerId: selectedCustomerId || undefined,
        customerName: customerName,
        amount: paid,
        method: paymentMethod,
        notes: `Bayar langsung di kasir depot (${orderId})`,
        operatorName: currentUser?.name || 'Kasir',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await putToStore(STORES.PAYMENTS, newPay);

      // Record cash in
      const cashTx: CashTransaction = {
        id: `CSH-${Date.now()}`,
        date: today,
        type: 'IN',
        category: 'Penjualan Counter Depot',
        amount: paid,
        description: `Penjualan langsung ${qty} galon (${orderId})`,
        referenceId: orderId,
        operatorName: currentUser?.name || 'Kasir',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await putToStore(STORES.CASH_TRANSACTIONS, cashTx);
    }

    // Log Gallon Movement: galon keluar depot
    const gallonMove: GallonMovement = {
      id: `GAL-${Date.now()}`,
      date: today,
      type: 'KELUAR_DEPOT',
      customerId: selectedCustomerId || undefined,
      customerName: customerName,
      orderId: orderId,
      qty: qty,
      balanceBefore: 0,
      balanceAfter: 0,
      notes: `Penjualan langsung di depot (${orderId})`,
      operatorName: currentUser?.name || 'Kasir',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await putToStore(STORES.GALLON_MOVEMENTS, gallonMove);

    await logAudit(
      'TAMBAH',
      'PENJUALAN_DEPOT',
      `Penjualan langsung ${qty} galon senilai ${formatRupiah(totalTagihan)} selesai`,
      orderId
    );

    // Open print prompt
    setPrintData({ type: 'order', data: newOrder });

    // Reset form
    setQty(1);
    setCashTendered(pricePerUnit);
    setSelectedCustomerId('');
    setCustomerName('Pelanggan Umum (Datang Langsung)');
    setNotes('');
    triggerRefresh();
  };

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
          Penjualan Langsung / Ambil di Depot
        </h2>
        <p className="text-xs text-slate-500">
          Kasir cepat (POS) untuk pelanggan yang datang isi ulang langsung di depot
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Form (8 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <form onSubmit={handleSaveDirectSale} className="space-y-4 text-xs">
            {/* Pelanggan */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pilih Pelanggan (Opsional)</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium"
              >
                <option value="">-- Pelanggan Umum / Langsung --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerType})
                  </option>
                ))}
              </select>
            </div>

            {/* Qty Selector with Quick Buttons */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Jumlah Galon</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickAddQty(-1)}
                  className="w-11 h-11 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center font-bold text-lg active:scale-95"
                >
                  <Minus className="w-5 h-5 text-slate-700" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => {
                    const q = Math.max(1, parseInt(e.target.value) || 1);
                    setQty(q);
                    setCashTendered(q * pricePerUnit);
                  }}
                  className="flex-1 py-2 text-center text-2xl font-black border border-slate-200 rounded-2xl text-slate-800 bg-slate-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleQuickAddQty(1)}
                  className="w-11 h-11 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center font-bold text-lg active:scale-95"
                >
                  <Plus className="w-5 h-5 text-slate-700" />
                </button>
              </div>

              {/* Quick Qty Badges */}
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[1, 2, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setQty(n);
                      setCashTendered(n * pricePerUnit);
                    }}
                    className={`py-2 rounded-xl font-bold border transition ${
                      qty === n
                        ? 'bg-sky-600 text-white border-sky-600 shadow'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {n} Galon
                  </button>
                ))}
              </div>
            </div>

            {/* Harga & Total Tagihan */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Harga per Galon</label>
                <input
                  type="number"
                  value={pricePerUnit}
                  onChange={(e) => {
                    const p = parseInt(e.target.value) || 0;
                    setPricePerUnit(p);
                    setCashTendered(qty * p);
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-right"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Metode Bayar</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                >
                  <option value="Tunai">Tunai</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Transfer BCA">Transfer BCA</option>
                  <option value="Transfer BRI">Transfer BRI</option>
                </select>
              </div>
            </div>

            {/* Big Total Box */}
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-sky-800 uppercase block">TOTAL HARUS DIBAYAR</span>
                <span className="text-[10px] text-sky-600">
                  {qty} galon × {formatRupiah(pricePerUnit)}
                </span>
              </div>
              <span className="text-2xl font-black text-sky-900">{formatRupiah(totalTagihan)}</span>
            </div>

            {/* Uang Diterima & Kembalian */}
            {paymentMethod === 'Tunai' && (
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Uang Diterima (Rp)</label>
                  <button
                    type="button"
                    onClick={() => setCashTendered(totalTagihan)}
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-700"
                  >
                    Uang Pas
                  </button>
                </div>
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-black text-right text-emerald-800 text-lg bg-white"
                />

                {/* Quick Cash Buttons */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[10000, 20000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashTendered(amt)}
                      className="py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-[10px] hover:bg-slate-100 text-slate-700"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>

                {/* Kembalian */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-600">Kembalian:</span>
                  <span className="text-base font-black text-emerald-700">{formatRupiah(kembalian)}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-sky-600/20 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Selesaikan Transaksi & Cetak Struk
            </button>
          </form>
        </div>

        {/* Right Panel: Recent Counter Sales (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800">Transaksi Counter Terakhir</h3>
            <span className="text-[11px] text-slate-400 font-medium">Hari ini</span>
          </div>

          {recentDirectOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Belum ada transaksi ambil di depot hari ini.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {recentDirectOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">{ord.customerName}</span>
                      <span className="text-[10px] text-slate-400">{ord.time}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {ord.totalGalon} Galon RO • {ord.paymentMethod}
                    </span>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    <span className="font-black text-xs text-slate-800">{formatRupiah(ord.total)}</span>
                    <button
                      onClick={() => setPrintData({ type: 'order', data: ord })}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-sky-600"
                      title="Cetak Struk"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
