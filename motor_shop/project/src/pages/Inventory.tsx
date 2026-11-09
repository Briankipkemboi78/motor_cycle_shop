import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, Package, Bike, Upload, AlertTriangle } from 'lucide-react';
import { supabase, type Product } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';

type FormState = {
  name: string;
  category: 'motorcycle' | 'spare_part';
  part_number: string;
  brand: string;
  quantity: string;
  cost_price: string;
  selling_price: string;
  image_url: string;
  min_stock_level: string;
};

const emptyForm: FormState = {
  name: '',
  category: 'spare_part',
  part_number: '',
  brand: '',
  quantity: '0',
  cost_price: '0',
  selling_price: '0',
  image_url: '',
  min_stock_level: '0',
};

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'motorcycle' | 'spare_part'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setProducts(data as Product[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.part_number.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      category: p.category,
      part_number: p.part_number || '',
      brand: p.brand || '',
      quantity: String(p.quantity),
      cost_price: String(p.cost_price),
      selling_price: String(p.selling_price),
      image_url: p.image_url || '',
      min_stock_level: String(p.min_stock_level),
    });
    setEditingId(p.id);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('Product name is required');
      return;
    }
    setSaving(true);
    const qty = parseInt(form.quantity) || 0;
    const payload = {
      name: form.name.trim(),
      category: form.category,
      part_number: form.part_number.trim(),
      brand: form.brand.trim(),
      quantity: qty,
      cost_price: parseFloat(form.cost_price) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      image_url: form.image_url.trim(),
      status: qty === 0 ? 'out_of_stock' : 'in_stock',
      min_stock_level: parseInt(form.min_stock_level) || 0,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (editingId) {
      result = await supabase.from('products').update(payload).eq('id', editingId);
    } else {
      result = await supabase.from('products').insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setShowModal(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    fetchProducts();
  };

  const toggleStockStatus = async (p: Product) => {
    const newStatus = p.status === 'in_stock' ? 'out_of_stock' : 'in_stock';
    const { error } = await supabase
      .from('products')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', p.id);
    if (error) {
      setError(error.message);
      return;
    }
    fetchProducts();
  };

  const handleImageUpload = async (file: File) => {
    setError('');
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB');
      return;
    }

    // Read as base64 data URL for storage in the image_url field
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, image_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="animate-fadeIn space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Inventory</h1>
          <p className="text-slate-400 mt-1">Manage your motorcycles and spare parts</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, brand, or part number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'motorcycle', 'spare_part'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat === 'spare_part' ? 'Parts' : cat === 'motorcycle' ? 'Bikes' : 'All'}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'in_stock' | 'out_of_stock')}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
        >
          <option value="all">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* Products grid */}
      {loading ? (
        <p className="text-slate-500 text-center py-12">Loading inventory...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-16 text-center">
          <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 mb-1">No products found</p>
          <p className="text-sm text-slate-500">Add your first product to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all group"
            >
              <div className="h-40 bg-slate-800 relative overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {p.category === 'motorcycle' ? (
                      <Bike className="w-12 h-12 text-slate-600" />
                    ) : (
                      <Package className="w-12 h-12 text-slate-600" />
                    )}
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    p.category === 'motorcycle'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {p.category === 'motorcycle' ? 'Bike' : 'Part'}
                  </span>
                  {p.status === 'out_of_stock' && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-300">
                      Out of Stock
                    </span>
                  )}
                  {p.status === 'in_stock' && p.quantity <= p.min_stock_level && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-300">
                      Low
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-white truncate">{p.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {p.brand && `${p.brand} · `}
                  {p.part_number || 'No SKU'}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-lg font-bold text-white">{formatCurrency(Number(p.selling_price))}</p>
                    <p className="text-xs text-slate-500">{p.quantity} in stock</p>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(p)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleStockStatus(p)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        p.status === 'in_stock'
                          ? 'bg-amber-950/50 hover:bg-amber-900/50 text-amber-400'
                          : 'bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-400'
                      }`}
                      title={p.status === 'in_stock' ? 'Mark out of stock' : 'Mark in stock'}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-900/50 flex items-center justify-center text-slate-300 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin animate-scaleIn">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {error && (
                <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Product Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  placeholder="e.g. Honda CB125 Front Brake Pad"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as 'motorcycle' | 'spare_part' })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="spare_part">Spare Part</option>
                    <option value="motorcycle">Motorcycle</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Brand</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                    placeholder="e.g. Honda"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Part Number / SKU</label>
                  <input
                    type="text"
                    value={form.part_number}
                    onChange={(e) => setForm({ ...form, part_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                    placeholder="e.g. HON-BP-001"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Cost Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Selling Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.selling_price}
                    onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Low Stock Alert Level</label>
                <input
                  type="number"
                  min="0"
                  value={form.min_stock_level}
                  onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  placeholder="Alert when stock drops to this level"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Product Image</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer">
                    <div className="border-2 border-dashed border-slate-700 hover:border-orange-500/50 rounded-lg px-4 py-3 text-center transition-colors">
                      <Upload className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                      <span className="text-xs text-slate-400">Click to upload image (max 2MB)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                  </label>
                  {form.image_url && (
                    <img src={form.image_url} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-slate-700" />
                  )}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-800 flex gap-3 sticky bottom-0 bg-slate-900">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
