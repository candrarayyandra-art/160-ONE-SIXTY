// Export, WhatsApp Formatting and Print Utilities for 160 ONE SIXTY

export function formatRupiah(amount: number = 0): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

export function parseRupiahInput(value: string): number {
  if (!value) return 0;
  // Remove non-digit characters
  const clean = value.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTimeIndo(dateTimeStr: string): string {
  if (!dateTimeStr) return '-';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateTimeStr;
  }
}

// Export array of objects to CSV/Excel format with UTF-8 BOM
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const processCell = (cell: string | number) => {
    let str = cell === null || cell === undefined ? '' : String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(processCell).join(';'),
    ...rows.map((row) => row.map(processCell).join(';'))
  ].join('\r\n');

  // Add UTF-8 BOM so Excel opens accents and symbols cleanly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate WhatsApp text for daily operational recap
export function generateWhatsAppDailyReport(data: {
  date: string;
  depotName: string;
  totalOrders: number;
  totalGalon: number;
  omzet: number;
  totalPaid: number;
  newDebt: number;
  cashIn: number;
  cashOut: number;
  expenses: number;
  cashBalance: number;
  galonDipinjam: number;
  galonKosong: number;
  uncompletedDeliveries: number;
}): string {
  return `*LAPORAN OPERASIONAL DEPOT AIR MINUM RO*
*${data.depotName}*
📅 Tanggal: ${formatDateIndo(data.date)}
---------------------------------------------
📦 *TRANSAKSI & GALON*
• Total Order: ${data.totalOrders} Pesanan
• Total Galon: ${data.totalGalon} Galon
• Pengiriman Tertunda: ${data.uncompletedDeliveries} Pesanan
• Galon Kosong di Depot: ${data.galonKosong} Galon
• Galon Dipinjam/Beredar: ${data.galonDipinjam} Galon

💰 *KEUANGAN & KAS*
• Total Omzet Penjualan: ${formatRupiah(data.omzet)}
• Pembayaran Diterima: ${formatRupiah(data.totalPaid)}
• Piutang Baru: ${formatRupiah(data.newDebt)}
• Total Kas Masuk: ${formatRupiah(data.cashIn)}
• Pengeluaran Beban: ${formatRupiah(data.expenses)}
• Saldo Kas Hari Ini: ${formatRupiah(data.cashBalance)}
---------------------------------------------
_Laporan otomatis dari Sistem Operasional 160 ONE SIXTY._`;
}

// Generate WhatsApp text for customer invoice / order receipt
export function generateWhatsAppOrderReceipt(data: {
  depotName: string;
  orderId: string;
  date: string;
  customerName: string;
  items: Array<{ productName: string; quantity: number; price: number; subtotal: number }>;
  total: number;
  paid: number;
  balance: number;
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
}): string {
  const itemLines = data.items
    .map((it, idx) => `${idx + 1}. ${it.productName} (${it.quantity}x) = ${formatRupiah(it.subtotal)}`)
    .join('\n');

  return `*NOTA PEMESANAN AIR MINUM RO*
*${data.depotName}*
---------------------------------------------
No. Nota: *${data.orderId}*
Tanggal: ${formatDateIndo(data.date)}
Kepada Yth: *${data.customerName}*
---------------------------------------------
*Rincian Pesanan:*
${itemLines}

*Total Tagihan: ${formatRupiah(data.total)}*
Jumlah Dibayar: ${formatRupiah(data.paid)}
*Sisa Tagihan: ${formatRupiah(data.balance)}*
Status: *${data.paymentStatus}* (${data.paymentMethod})
${data.notes ? `Catatan: ${data.notes}\n` : ''}---------------------------------------------
Terima kasih telah berlangganan di *${data.depotName}*. Sehat selalu! 💧`;
}

// Generate WhatsApp text for delivery notification
export function generateWhatsAppDeliveryInfo(data: {
  depotName: string;
  orderId: string;
  customerName: string;
  totalGalon: number;
  driverName: string;
  address: string;
}): string {
  return `*INFO PENGIRIMAN AIR MINUM RO*
*${data.depotName}*
---------------------------------------------
Halo Kak *${data.customerName}*,
Pesanan air minum RO Anda sedang dalam proses pengiriman:

• No. Pesanan: ${data.orderId}
• Jumlah: ${data.totalGalon} Galon
• Driver: ${data.driverName}
• Alamat: ${data.address}

Driver kami sedang menuju ke lokasi Anda. Mohon siapkan galon kosongnya ya kak. Terima kasih! 🙏`;
}
