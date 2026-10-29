import React from 'react';
import { X, Printer } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatDateIndo } from '../../services/exportService';

export const PrintModal: React.FC = () => {
  const { printData, setPrintData, appConfig } = useApp();

  if (!printData) return null;

  const handlePrint = () => {
    window.print();
  };

  const isOrder = printData.type === 'order';
  const isDelivery = printData.type === 'delivery';
  const isClosing = printData.type === 'closing';

  const orderData = isOrder ? (printData.data as any) : null;
  const deliveryData = isDelivery ? (printData.data as any) : null;
  const closingData = isClosing ? (printData.data as any) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Modal Controls (Not printed) */}
        <div className="p-4 bg-slate-800 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm">
              {isOrder && 'Cetak Nota Pesanan'}
              {isDelivery && 'Cetak Surat Jalan'}
              {isClosing && 'Cetak Slip Closing Harian'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Sekarang
            </button>
            <button
              onClick={() => setPrintData(null)}
              className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto printable-area bg-white text-slate-900 font-sans text-xs">
          {/* Header Kop Depot */}
          <div className="text-center pb-3 border-b-2 border-slate-900 border-dashed">
            <h2 className="text-base font-black tracking-wider text-slate-900 uppercase">
              {appConfig.depotName || '160 ONE SIXTY'}
            </h2>
            <p className="text-[11px] font-semibold text-slate-700">
              {appConfig.subtitle || 'Sistem Operasional Depot Air Minum RO'}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">{appConfig.address}</p>
            <p className="text-[10px] text-slate-600">Telp / WA: {appConfig.phone}</p>
          </div>

          {/* 1. NOTA ORDER */}
          {isOrder && orderData && (
            <div className="py-3 space-y-3">
              <div className="text-center font-bold text-xs uppercase tracking-wider py-1 bg-slate-100 rounded">
                NOTA PEMBELIAN / INVOICE
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div>
                  <span className="text-slate-500">No. Order:</span>{' '}
                  <strong className="font-mono">{orderData.id}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Tgl:</span> {formatDateIndo(orderData.date)} {orderData.time}
                </div>
                <div>
                  <span className="text-slate-500">Pelanggan:</span>{' '}
                  <strong className="text-slate-800">{orderData.customerName}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Petugas:</span> {orderData.operatorName}
                </div>
                {orderData.shippingAddress && (
                  <div className="col-span-2">
                    <span className="text-slate-500">Alamat:</span> {orderData.shippingAddress}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full text-[11px] border-collapse my-2">
                <thead>
                  <tr className="border-b border-t border-slate-800 font-bold">
                    <th className="py-1 text-left">Produk</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Harga</th>
                    <th className="py-1 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {orderData.items?.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-1.5">{it.productName}</td>
                      <td className="py-1.5 text-center">{it.quantity}</td>
                      <td className="py-1.5 text-right">{formatRupiah(it.price)}</td>
                      <td className="py-1.5 text-right font-medium">{formatRupiah(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-slate-800 border-dashed pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(orderData.subtotal)}</span>
                </div>
                {orderData.shippingFee > 0 && (
                  <div className="flex justify-between">
                    <span>Ongkir:</span>
                    <span>{formatRupiah(orderData.shippingFee)}</span>
                  </div>
                )}
                {orderData.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(orderData.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(orderData.total)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Dibayar ({orderData.paymentMethod}):</span>
                  <span>{formatRupiah(orderData.totalPaid)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Sisa Tagihan / Piutang:</span>
                  <span>{formatRupiah(orderData.balance)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Status Pembayaran:</span>
                  <span className="font-bold text-slate-800">{orderData.paymentStatus}</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. SURAT JALAN */}
          {isDelivery && deliveryData && (
            <div className="py-3 space-y-3">
              <div className="text-center font-bold text-xs uppercase tracking-wider py-1 bg-slate-100 rounded">
                SURAT JALAN PENGIRIMAN
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div>
                  <span className="text-slate-500">No. Surat Jalan:</span>{' '}
                  <strong className="font-mono">{deliveryData.id}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">No. Order:</span>{' '}
                  <strong className="font-mono">{deliveryData.orderId}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Penerima:</span>{' '}
                  <strong className="text-slate-800">{deliveryData.customerName}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Driver:</span>{' '}
                  <strong>{deliveryData.driverName || '-'}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Tujuan:</span> {deliveryData.locationName} - {deliveryData.address}
                </div>
                {deliveryData.customerPhone && (
                  <div className="col-span-2">
                    <span className="text-slate-500">No. Kontak:</span> {deliveryData.customerPhone}
                  </div>
                )}
              </div>

              <div className="my-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[11px] text-slate-500 block">Jumlah Galon yang Dikirim</span>
                <span className="text-2xl font-black text-slate-800">{deliveryData.totalGalon} Galon</span>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 pt-4 text-center text-[10px]">
                <div>
                  <p className="text-slate-500">Driver Pengantar,</p>
                  <div className="h-14"></div>
                  <p className="font-bold border-t border-slate-300 pt-1">
                    ( {deliveryData.driverName || 'Driver'} )
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Penerima Galon,</p>
                  <div className="h-14"></div>
                  <p className="font-bold border-t border-slate-300 pt-1">
                    ( {deliveryData.customerName || 'Pelanggan'} )
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. CLOSING HARIAN */}
          {isClosing && closingData && (
            <div className="py-3 space-y-3">
              <div className="text-center font-bold text-xs uppercase tracking-wider py-1 bg-slate-100 rounded">
                SLIP CLOSING HARIAN DEPOT
              </div>
              <div className="text-center text-[11px] text-slate-600">
                Tanggal: <strong>{formatDateIndo(closingData.date)}</strong>
              </div>

              <div className="border-t border-b border-slate-800 divide-y divide-slate-200 py-1 text-[11px]">
                <div className="flex justify-between py-1">
                  <span>Total Transaksi Order:</span>
                  <strong>{closingData.totalOrders} Pesanan</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Total Galon Terjual:</span>
                  <strong>{closingData.totalGalon} Galon</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Total Omzet Penjualan:</span>
                  <strong>{formatRupiah(closingData.totalSales)}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Total Pembayaran Masuk:</span>
                  <strong>{formatRupiah(closingData.totalPaid)}</strong>
                </div>
                <div className="flex justify-between py-1 text-amber-700">
                  <span>Piutang Baru:</span>
                  <strong>{formatRupiah(closingData.newDebt)}</strong>
                </div>
                <div className="flex justify-between py-1 text-emerald-700">
                  <span>Kas Masuk Depot:</span>
                  <strong>{formatRupiah(closingData.cashIn)}</strong>
                </div>
                <div className="flex justify-between py-1 text-rose-700">
                  <span>Beban / Pengeluaran:</span>
                  <strong>{formatRupiah(closingData.totalExpense)}</strong>
                </div>
                <div className="flex justify-between py-1 font-bold text-xs bg-slate-50 px-1">
                  <span>Saldo Kas Akhir:</span>
                  <span>{formatRupiah(closingData.cashBalance)}</span>
                </div>
              </div>

              <div className="pt-2 text-center text-[10px]">
                <p className="text-slate-500">Penanggung Jawab Closing,</p>
                <div className="h-12"></div>
                <p className="font-bold border-t border-slate-300 pt-1 inline-block px-8">
                  ( {closingData.closedBy || appConfig.signerName || 'Pengelola'} )
                </p>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="text-center pt-3 border-t border-slate-800 border-dashed text-[10px] text-slate-500 italic">
            {appConfig.footerNote}
          </div>
        </div>
      </div>
    </div>
  );
};
