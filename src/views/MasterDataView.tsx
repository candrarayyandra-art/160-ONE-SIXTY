import React, { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  Edit,
  Trash2,
  Package,
  Layers,
  CreditCard,
  Coins,
  Truck,
  Check,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getAllFromStore,
  putToStore,
  deleteFromStore,
  STORES
} from '../db/indexedDb';
import { Product, MasterOptions } from '../types';
import { formatRupiah } from '../services/exportService';

export const MasterDataView: React.FC = () => {
  const { refreshCounter, triggerRefresh, logAudit } = useApp();

  const [activeTab, setActiveTab] = useState<'products' | 'types' | 'payments' | 'categories' | 'vehicles'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [masterOptions, setMasterOptions] = useState<MasterOptions>({
    customerTypes: ['Rumah Tangga', 'Warung / Toko', 'Kantor / Instansi', 'Reseller', 'Lainnya'],
    paymentMethods: ['Tunai', 'Transfer BCA', 'Transfer Mandiri', 'Transfer BRI', 'QRIS'],
    expenseCategories: ['Listrik & Air PLN', 'Tutup & Segel Galon', 'Maintenance & Filter', 'BBM Driver', 'Gaji & Operasional', 'Lain-lain'],
    vehicleList: ['Motor Kurir 1', 'Motor Kurir 2', 'Motor Roda Tiga', 'Mobil Pickup']
  });

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodSize, setProdSize] = useState('19 Liter');
  const [prodPrice, setProdPrice] = useState(7000);
  const [prodResellerPrice, setProdResellerPrice] = useState(6000);

  // Simple item input for arrays
  const [newItemInput, setNewItemInput] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAllFromStore<Product>(STORES.PRODUCTS),
      getAllFromStore<{ id: string } & MasterOptions>(STORES.MASTER_OPTIONS)
    ]).then(([prods, options]) => {
      if (mounted) {
        setProducts(prods);
        if (options && options.length > 0) {
          setMasterOptions(options[0]);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [refreshCounter]);

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const prodId = editingProduct?.id || `PRD-${Date.now()}`;

    const newProd: Product = {
      id: prodId,
      name: prodName,
      size: prodSize,
      price: prodPrice,
      resellerPrice: prodResellerPrice,
      active: true,
      createdAt: editingProduct?.createdAt || now,
      updatedAt: now
    };

    await putToStore(STORES.PRODUCTS, newProd);
    await logAudit(
      editingProduct ? 'EDIT' : 'TAMBAH',
      'MASTER_PRODUK',
      `${editingProduct ? 'Mengubah' : 'Menambah'} produk ${prodName} (${formatRupiah(prodPrice)})`,
      prodId
    );

    setShowProductModal(false);
    setEditingProduct(null);
    setProdName('');
    triggerRefresh();
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (!confirm(`Hapus produk ${prod.name}?`)) return;
    await deleteFromStore(STORES.PRODUCTS, prod.id);
    await logAudit('HAPUS', 'MASTER_PRODUK', `Menghapus produk ${prod.name}`, prod.id);
    triggerRefresh();
  };

  // Save Master Option List (Types, Payment, Expense Categories, Vehicles)
  const saveOptions = async (updated: MasterOptions) => {
    setMasterOptions(updated);
    await putToStore(STORES.MASTER_OPTIONS, { id: 'options', ...updated });
    triggerRefresh();
  };

  const handleAddOptionItem = (key: keyof MasterOptions) => {
    if (!newItemInput.trim()) return;
    const currentList = masterOptions[key] || [];
    if (!currentList.includes(newItemInput.trim())) {
      saveOptions({
        ...masterOptions,
        [key]: [...currentList, newItemInput.trim()]
      });
    }
    setNewItemInput('');
  };

  const handleDeleteOptionItem = (key: keyof MasterOptions, itemToDelete: string) => {
    const currentList = masterOptions[key] || [];
    saveOptions({
      ...masterOptions,
      [key]: currentList.filter((it) => it !== itemToDelete)
    });
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Master Data Depot</h2>
          <p className="text-xs text-slate-500">
            Daftar harga produk, jenis pelanggan, metode pembayaran & kategori biaya
          </p>
        </div>

        {activeTab === 'products' && (
          <button
            onClick={() => {
              setEditingProduct(null);
              setProdName('');
              setProdPrice(7000);
              setProdResellerPrice(6000);
              setShowProductModal(true);
            }}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            + Tambah Produk
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 overflow-x-auto text-xs font-bold text-slate-600 shadow-2xs">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'products' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Produk & Harga ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'types' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Jenis Pelanggan
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'payments' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Metode Pembayaran
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'categories' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Kategori Pengeluaran
        </button>
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`px-3 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'vehicles' ? 'bg-sky-600 text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          Armada / Kendaraan
        </button>
      </div>

      {/* 1. PRODUK & HARGA */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {products.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-600">Belum Ada Master Produk</p>
              <p className="mt-1">Super Admin dapat menambahkan produk air isi ulang / galon sesuai harga depot.</p>
              <button
                onClick={() => setShowProductModal(true)}
                className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold"
              >
                + Tambah Produk Pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Nama Produk</th>
                    <th className="py-2.5 px-3">Ukuran / Kemasan</th>
                    <th className="py-2.5 px-3 text-right">Harga Jual Normal</th>
                    <th className="py-2.5 px-3 text-right">Harga Reseller / Khusus</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-800">{p.name}</td>
                      <td className="py-3 px-3 text-slate-600">{p.size}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">{formatRupiah(p.price)}</td>
                      <td className="py-3 px-3 text-right font-bold text-sky-700">
                        {p.resellerPrice ? formatRupiah(p.resellerPrice) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Aktif
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setProdName(p.name);
                              setProdSize(p.size);
                              setProdPrice(p.price);
                              setProdResellerPrice(p.resellerPrice || 0);
                              setShowProductModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. JENIS PELANGGAN, METODE BAYAR, KATEGORI BIAYA, ARMADA */}
      {activeTab !== 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4 max-w-lg">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ketik item baru..."
              value={newItemInput}
              onChange={(e) => setNewItemInput(e.target.value)}
              className="flex-1 p-2.5 border border-slate-200 rounded-xl text-xs"
            />
            <button
              onClick={() => {
                if (activeTab === 'types') handleAddOptionItem('customerTypes');
                if (activeTab === 'payments') handleAddOptionItem('paymentMethods');
                if (activeTab === 'categories') handleAddOptionItem('expenseCategories');
                if (activeTab === 'vehicles') handleAddOptionItem('vehicleList');
              }}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow"
            >
              + Tambah
            </button>
          </div>

          <div className="space-y-2">
            {activeTab === 'types' &&
              masterOptions.customerTypes.map((item) => (
                <div key={item} className="p-2.5 bg-slate-50 border rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{item}</span>
                  <button
                    onClick={() => handleDeleteOptionItem('customerTypes', item)}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

            {activeTab === 'payments' &&
              masterOptions.paymentMethods.map((item) => (
                <div key={item} className="p-2.5 bg-slate-50 border rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{item}</span>
                  <button
                    onClick={() => handleDeleteOptionItem('paymentMethods', item)}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

            {activeTab === 'categories' &&
              masterOptions.expenseCategories.map((item) => (
                <div key={item} className="p-2.5 bg-slate-50 border rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{item}</span>
                  <button
                    onClick={() => handleDeleteOptionItem('expenseCategories', item)}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

            {activeTab === 'vehicles' &&
              masterOptions.vehicleList.map((item) => (
                <div key={item} className="p-2.5 bg-slate-50 border rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{item}</span>
                  <button
                    onClick={() => handleDeleteOptionItem('vehicleList', item)}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* MODAL PRODUK */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">
                {editingProduct ? 'Edit Master Produk' : 'Tambah Produk Baru'}
              </h4>
              <button
                onClick={() => setShowProductModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Produk</label>
                <input
                  type="text"
                  placeholder="Air Minum RO Isi Ulang 19L..."
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ukuran / Satuan</label>
                <input
                  type="text"
                  placeholder="19 Liter, 330ml, 600ml..."
                  value={prodSize}
                  onChange={(e) => setProdSize(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Harga Jual Normal (Rp)</label>
                <input
                  type="number"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-right"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Harga Reseller (Rp) (Opsional)</label>
                <input
                  type="number"
                  value={prodResellerPrice}
                  onChange={(e) => setProdResellerPrice(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-right text-sky-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
