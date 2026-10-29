import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  MapPin,
  MessageSquare,
  Edit,
  Trash2,
  ExternalLink,
  Receipt,
  Package,
  X,
  Phone,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getAllFromStore,
  putToStore,
  deleteFromStore,
  STORES
} from '../db/indexedDb';
import {
  Customer,
  CustomerLocation,
  Order,
  MasterOptions
} from '../types';
import { Pagination } from '../components/common/Pagination';
import { formatRupiah, formatDateIndo } from '../services/exportService';

export const CustomersView: React.FC = () => {
  const { refreshCounter, triggerRefresh, logAudit, setActiveTab } = useApp();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<CustomerLocation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [masterOptions, setMasterOptions] = useState<MasterOptions | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Multi Location Modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [targetCustomerForLocation, setTargetCustomerForLocation] = useState<Customer | null>(null);

  // Customer History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  // Customer Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Rumah Tangga');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCustomPrice, setFormCustomPrice] = useState(0);
  const [formDebtLimit, setFormDebtLimit] = useState(500000);
  const [formDueDays, setFormDueDays] = useState(14);

  // Location Form state
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locMapsUrl, setLocMapsUrl] = useState('');
  const [locContact, setLocContact] = useState('');
  const [locNotes, setLocNotes] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAllFromStore<Customer>(STORES.CUSTOMERS),
      getAllFromStore<CustomerLocation>(STORES.CUSTOMER_LOCATIONS),
      getAllFromStore<Order>(STORES.ORDERS),
      getAllFromStore<{ id: string } & MasterOptions>(STORES.MASTER_OPTIONS)
    ]).then(([custs, locs, ords, options]) => {
      if (mounted) {
        setCustomers(custs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setLocations(locs);
        setOrders(ords);
        if (options && options.length > 0) {
          setMasterOptions(options[0]);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (typeFilter !== 'ALL' && c.customerType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.mainAddress.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customers, typeFilter, searchQuery]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Open Create Customer Modal
  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormType('Rumah Tangga');
    setFormPhone('');
    setFormAddress('');
    setFormNotes('');
    setFormCustomPrice(0);
    setFormDebtLimit(500000);
    setFormDueDays(14);
    setShowCustomerModal(true);
  };

  // Open Edit Customer Modal
  const handleOpenEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormName(cust.name);
    setFormType(cust.customerType);
    setFormPhone(cust.phone);
    setFormAddress(cust.mainAddress);
    setFormNotes(cust.notes || '');
    setFormCustomPrice(cust.customPrice || 0);
    setFormDebtLimit(cust.debtLimit || 500000);
    setFormDueDays(cust.defaultDueDays || 14);
    setShowCustomerModal(true);
  };

  // Save Customer (Create or Update)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Nama pelanggan wajib diisi!');
      return;
    }

    const now = new Date().toISOString();
    let custId = editingCustomer?.id;

    if (!custId) {
      const ymd = now.slice(0, 10).replace(/-/g, '');
      custId = `CUS-${ymd}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    const customerObj: Customer = {
      id: custId,
      name: formName,
      customerType: formType,
      phone: formPhone,
      mainAddress: formAddress,
      notes: formNotes,
      customPrice: formCustomPrice > 0 ? formCustomPrice : undefined,
      debtLimit: formDebtLimit,
      defaultDueDays: formDueDays,
      active: true,
      createdAt: editingCustomer?.createdAt || now,
      updatedAt: now
    };

    await putToStore(STORES.CUSTOMERS, customerObj);

    // If new customer and has address, also automatically save as primary location
    if (!editingCustomer && formAddress.trim()) {
      const locId = `LOC-${Date.now()}`;
      const primaryLoc: CustomerLocation = {
        id: locId,
        customerId: custId,
        name: 'Alamat Utama',
        address: formAddress,
        contactPerson: formName,
        status: 'AKTIF',
        createdAt: now,
        updatedAt: now
      };
      await putToStore(STORES.CUSTOMER_LOCATIONS, primaryLoc);
    }

    await logAudit(
      editingCustomer ? 'EDIT' : 'TAMBAH',
      'PELANGGAN',
      `${editingCustomer ? 'Mengubah' : 'Menambahkan'} pelanggan ${formName}`,
      custId
    );

    setShowCustomerModal(false);
    triggerRefresh();
  };

  // Save New Location for Customer (Multi-Location Requirement #9)
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCustomerForLocation) return;
    if (!locName.trim() || !locAddress.trim()) {
      alert('Nama lokasi dan alamat wajib diisi!');
      return;
    }

    const now = new Date().toISOString();
    const locId = `LOC-${Date.now()}`;
    const newLoc: CustomerLocation = {
      id: locId,
      customerId: targetCustomerForLocation.id,
      name: locName,
      address: locAddress,
      mapsUrl: locMapsUrl,
      contactPerson: locContact || targetCustomerForLocation.name,
      deliveryNotes: locNotes,
      status: 'AKTIF',
      createdAt: now,
      updatedAt: now
    };

    await putToStore(STORES.CUSTOMER_LOCATIONS, newLoc);
    await logAudit(
      'TAMBAH',
      'LOKASI_PELANGGAN',
      `Menambah lokasi ${locName} untuk pelanggan ${targetCustomerForLocation.name}`,
      locId
    );

    setLocName('');
    setLocAddress('');
    setLocMapsUrl('');
    setLocContact('');
    setLocNotes('');
    setShowLocationModal(false);
    triggerRefresh();
  };

  // Delete Customer
  const handleDeleteCustomer = async (cust: Customer) => {
    if (!confirm(`Hapus pelanggan "${cust.name}"? Data riwayat yang telah ada tidak akan terhapus otomatis.`)) return;
    await deleteFromStore(STORES.CUSTOMERS, cust.id);
    await logAudit('HAPUS', 'PELANGGAN', `Menghapus pelanggan ${cust.name}`, cust.id);
    triggerRefresh();
  };

  // Maps Opener
  const handleOpenMaps = (addr: string, url?: string) => {
    if (url && url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');
    }
  };

  // Direct WhatsApp click
  const handleOpenWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    const phoneFormatted = clean.startsWith('0') ? '62' + clean.slice(1) : clean;
    const msg = encodeURIComponent(`Halo Kak ${name}, salam dari Depot Air Minum RO 160 ONE SIXTY. Ada yang bisa kami bantu?`);
    window.open(`https://wa.me/${phoneFormatted}?text=${msg}`, '_blank');
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Data Pelanggan</h2>
          <p className="text-xs text-slate-500">Kelola master pelanggan, alamat multi-lokasi & limit piutang</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-sky-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          + Tambah Pelanggan
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama pelanggan, nomor HP, alamat..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none w-full sm:w-auto"
        >
          <option value="ALL">Semua Jenis Pelanggan</option>
          {(masterOptions?.customerTypes || ['Rumah Tangga', 'Warung / Toko', 'Kantor / Instansi', 'Reseller', 'Lainnya']).map(
            (t) => (
              <option key={t} value={t}>
                {t}
              </option>
            )
          )}
        </select>
      </div>

      {/* Customers List / Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-slate-600">Belum Ada Data Pelanggan</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Database awal bersih tanpa pelanggan contoh. Silakan tambahkan pelanggan baru.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20"
            >
              <Plus className="w-4 h-4" />
              + Tambah Pelanggan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Pelanggan</th>
                  <th className="py-3 px-3">Jenis</th>
                  <th className="py-3 px-3">WhatsApp / Telp</th>
                  <th className="py-3 px-3">Alamat Utama</th>
                  <th className="py-3 px-2 text-center">Lokasi Lain</th>
                  <th className="py-3 px-3 text-right">Harga Khusus</th>
                  <th className="py-3 px-3 text-right">Total Piutang</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedCustomers.map((cust) => {
                  const custLocs = locations.filter((l) => l.customerId === cust.id);
                  // Calculate customer outstanding debt from orders
                  const custDebt = orders
                    .filter((o) => o.customerId === cust.id && o.orderStatus !== 'BATAL')
                    .reduce((sum, o) => sum + (o.balance || 0), 0);

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 text-sm block">{cust.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{cust.id}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {cust.customerType}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {cust.phone ? (
                          <button
                            onClick={() => handleOpenWhatsApp(cust.phone, cust.name)}
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {cust.phone}
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 max-w-[240px]">
                          <span className="truncate text-slate-700">{cust.mainAddress || '-'}</span>
                          {cust.mainAddress && (
                            <button
                              onClick={() => handleOpenMaps(cust.mainAddress)}
                              className="text-sky-600 hover:text-sky-700 shrink-0"
                              title="Buka Google Maps"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => {
                            setTargetCustomerForLocation(cust);
                            setShowLocationModal(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[10px] transition"
                        >
                          +{custLocs.length} Lokasi
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-700">
                        {cust.customPrice ? formatRupiah(cust.customPrice) : <span className="text-slate-400 font-normal">Normal</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-black">
                        {custDebt > 0 ? (
                          <span className="text-rose-600">{formatRupiah(custDebt)}</span>
                        ) : (
                          <span className="text-emerald-600">Rp 0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View History */}
                          <button
                            onClick={() => {
                              setSelectedCustomerForHistory(cust);
                              setShowHistoryModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="Riwayat Pesanan Pelanggan"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(cust)}
                            className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700"
                            title="Edit Pelanggan"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteCustomer(cust)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700"
                            title="Hapus Pelanggan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-700 block mb-1">Nama Pelanggan *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Ibu Rina, Warung Bu Siti"
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-700 block mb-1">Jenis Pelanggan</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                  >
                    {(masterOptions?.customerTypes || ['Rumah Tangga', 'Warung / Toko', 'Kantor / Instansi', 'Reseller', 'Lainnya']).map(
                      (t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor WhatsApp / HP</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat Utama Pengiriman</label>
                <textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Jl. Melati No. 12, RT 02/05..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harga Khusus</label>
                  <input
                    type="number"
                    value={formCustomPrice}
                    onChange={(e) => setFormCustomPrice(parseInt(e.target.value) || 0)}
                    placeholder="0 (Normal)"
                    className="w-full p-2 border border-slate-200 rounded-xl text-right font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Limit Piutang (Rp)</label>
                  <input
                    type="number"
                    value={formDebtLimit}
                    onChange={(e) => setFormDebtLimit(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl text-right font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jatuh Tempo (Hari)</label>
                  <input
                    type="number"
                    value={formDueDays}
                    onChange={(e) => setFormDueDays(parseInt(e.target.value) || 14)}
                    className="w-full p-2 border border-slate-200 rounded-xl text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Titip di garasi sebelah kiri..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-md shadow-sky-600/20"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MULTI LOCATION MODAL */}
      {showLocationModal && targetCustomerForLocation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 space-y-4 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Lokasi Pengiriman</h4>
                <p className="text-[11px] text-slate-500">Pelanggan: {targetCustomerForLocation.name}</p>
              </div>
              <button
                onClick={() => setShowLocationModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List Existing Locations */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {locations.filter((l) => l.customerId === targetCustomerForLocation.id).length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Belum ada lokasi tersimpan.</p>
              ) : (
                locations
                  .filter((l) => l.customerId === targetCustomerForLocation.id)
                  .map((loc) => (
                    <div
                      key={loc.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="block text-slate-800 font-bold">{loc.name}</strong>
                        <p className="text-slate-600 text-[11px] line-clamp-1">{loc.address}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenMaps(loc.address, loc.mapsUrl)}
                          className="p-1.5 bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100"
                          title="Buka Google Maps"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Hapus lokasi ${loc.name}?`)) {
                              await deleteFromStore(STORES.CUSTOMER_LOCATIONS, loc.id);
                              triggerRefresh();
                            }
                          }}
                          className="p-1.5 bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100"
                          title="Hapus Lokasi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Form Add Location */}
            <form onSubmit={handleSaveLocation} className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
              <span className="font-bold text-slate-800 block">+ Tambah Lokasi Baru</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nama Lokasi (Gudang, Toko Cabang...)"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="p-2 border border-slate-200 rounded-xl"
                  required
                />
                <input
                  type="text"
                  placeholder="Kontak di Lokasi (opsional)"
                  value={locContact}
                  onChange={(e) => setLocContact(e.target.value)}
                  className="p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <input
                type="text"
                placeholder="Alamat Lengkap *"
                value={locAddress}
                onChange={(e) => setLocAddress(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl"
                required
              />

              <input
                type="text"
                placeholder="Link Google Maps (https://maps.app.goo.gl/...)"
                value={locMapsUrl}
                onChange={(e) => setLocMapsUrl(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl"
              />

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan Lokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER HISTORY MODAL */}
      {showHistoryModal && selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Riwayat Transaksi Pelanggan</h4>
                <p className="text-[11px] text-slate-500">{selectedCustomerForHistory.name}</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {orders.filter((o) => o.customerId === selectedCustomerForHistory.id).length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">Belum ada riwayat pesanan.</p>
              ) : (
                orders
                  .filter((o) => o.customerId === selectedCustomerForHistory.id)
                  .map((o) => (
                    <div
                      key={o.id}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-700">{o.id}</span>
                          <span className="text-[10px] text-slate-400">{formatDateIndo(o.date)}</span>
                        </div>
                        <span className="text-[11px] text-slate-600 block mt-0.5">
                          {o.totalGalon} Galon • Status: <strong>{o.orderStatus}</strong>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-800 block">{formatRupiah(o.total)}</span>
                        <span
                          className={`text-[10px] font-bold ${
                            o.paymentStatus === 'LUNAS'
                              ? 'text-emerald-600'
                              : o.paymentStatus === 'SEBAGIAN'
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {o.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
