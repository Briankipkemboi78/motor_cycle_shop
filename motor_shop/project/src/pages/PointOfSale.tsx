import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, X, Check, Receipt as ReceiptIcon, Bike, Package } from 'lucide-react';
import { supabase, type Product, type Sale, type SaleItem } from '@/lib/supabase';
import { formatCurrency, generateReceiptNumber } from '@/lib/format';

type CartItem = {
  product: Product;
  quantity: number;
};

type Props = {
  onNavigate: (page: 'dashboard' | 'inventory' | 'pos' | 'sales') => void;
};

export default function PointOfSale({ onNavigate }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'motorcycle' | 'spare_part'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [completedSale, setCompletedSale] = useState<{ sale: Sale; items: SaleItem[] } | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'in_stock')
      .gt('quantity', 0)
      .order('name', { ascending: true });
    if (data) setProducts(data as Product[]);
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
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.product.id !== productId) return c;
          const newQty = c.quantity + delta;
          if (newQty > c.product.quantity) return c;
          return { ...c, quantity: newQty };
        })
        .filter((c) => c.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + Number(c.product.selling_price) * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handleCheckout = async () => {
    setError('');
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }
    setProcessing(true);

    const receiptNumber = generateReceiptNumber();
    const totalAmount = cartTotal;

    // Create sale
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        receipt_number: receiptNumber,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        total_amount: totalAmount,
        payment_method: paymentMethod,
      })
      .select()
      .single();

    if (saleError || !saleData) {
      setError(saleError?.message || 'Failed to create sale');
      setProcessing(false);
      return;
    }

    const sale = saleData as Sale;

    // Create sale items
    const saleItemsPayload = cart.map((c) => ({
      sale_id: sale.id,
      product_id: c.product.id,
      product_name: c.product.name,
      quantity: c.quantity,
      unit_price: Number(c.product.selling_price),
      subtotal: Number(c.product.selling_price) * c.quantity,
    }));

    const { data: itemsData, error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItemsPayload)
      .select();

    if (itemsError) {
      setError('Sale created but failed to save line items: ' + itemsError.message);
      setProcessing(false);
      return;
    }

    // Decrement product quantities
    await Promise.all(
      cart.map((c) => {
        const newQty = c.product.quantity - c.quantity;
        return supabase
          .from('products')
          .update({
            quantity: newQty,
            status: newQty === 0 ? 'out_of_stock' : 'in_stock',
            updated_at: new Date().toISOString(),
          })
          .eq('id', c.product.id);
      })
    );

    setCompletedSale({ sale, items: itemsData as SaleItem[] });
    setProcessing(false);
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
  };

  const handleCloseReceipt = () => {
    setCompletedSale(null);
    fetchProducts();
  };

  if (completedSale) {
    return <Receipt sale={completedSale.sale} items={completedSale.items} onClose={handleCloseReceipt} onViewHistory={() => { handleCloseReceipt(); onNavigate('sales'); }} />;
  }

  return (
    <div className="animate-fadeIn space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">New Sale</h1>
        <p className="text-slate-400 mt-1">Select products and generate a receipt</p>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Product selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
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
          </div>

          {loading ? (
            <p className="text-slate-500 text-center py-12">Loading products...</p>
          ) : filtered.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl py-16 text-center">
              <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 mb-1">No products available</p>
              <p className="text-sm text-slate-500">All out-of-stock items are hidden</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((p) => {
                const inCart = cart.find((c) => c.product.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-orange-500/40 transition-all text-left group"
                  >
                    <div className="h-24 bg-slate-800 relative">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {p.category === 'motorcycle' ? (
                            <Bike className="w-8 h-8 text-slate-600" />
                          ) : (
                            <Package className="w-8 h-8 text-slate-600" />
                          )}
                        </div>
                      )}
                      {inCart && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                          {inCart.quantity}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium text-white truncate">{p.name}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-sm font-bold text-orange-400">{formatCurrency(Number(p.selling_price))}</span>
                        <span className="text-xs text-slate-500">{p.quantity} left</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-400" />
                <h3 className="text-sm font-semibold text-white">Cart</h3>
                {cartCount > 0 && (
                  <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">{cartCount}</span>
                )}
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-slate-500 hover:text-red-400">
                  Clear
                </button>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              {cart.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">Cart is empty</p>
              ) : (
                <div className="divide-y divide-slate-800">
                  {cart.map((c) => (
                    <div key={c.product.id} className="flex items-center gap-2 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{c.product.name}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(Number(c.product.selling_price))} each</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => updateQty(c.product.id, -1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm text-white w-5 text-center">{c.quantity}</span>
                        <button
                          onClick={() => updateQty(c.product.id, 1)}
                          disabled={c.quantity >= c.product.quantity}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(c.product.id)}
                          className="w-6 h-6 rounded hover:bg-red-900/40 flex items-center justify-center text-slate-500 hover:text-red-400 ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-800 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-slate-400">Total</span>
                  <span className="text-xl font-bold text-white">{formatCurrency(cartTotal)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={processing}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    'Processing...'
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Complete Sale
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Receipt({
  sale,
  items,
  onClose,
  onViewHistory,
}: {
  sale: Sale;
  items: SaleItem[];
  onClose: () => void;
  onViewHistory: () => void;
}) {
  return (
    <div className="animate-fadeIn max-w-md mx-auto">
      <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl">
        {/* Receipt header */}
        <div className="bg-slate-900 text-white px-6 py-5 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-2">
            <Bike className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-bold">MotoStock</h2>
          <p className="text-xs text-slate-400">Motorcycle Parts & Bikes</p>
        </div>

        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Check className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-600">Sale Completed</span>
          </div>
          <div className="text-center space-y-1">
            <p className="text-xs text-slate-500">Receipt #{sale.receipt_number}</p>
            <p className="text-xs text-slate-500">{new Date(sale.created_at).toLocaleString()}</p>
          </div>
        </div>

        {sale.customer_name && (
          <div className="px-6 py-3 border-b border-slate-200">
            <p className="text-xs text-slate-500">Customer</p>
            <p className="text-sm font-medium">{sale.customer_name}</p>
            {sale.customer_phone && <p className="text-xs text-slate-500">{sale.customer_phone}</p>}
          </div>
        )}

        {/* Line items */}
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left font-medium text-slate-500 pb-2">Item</th>
                <th className="text-center font-medium text-slate-500 pb-2">Qty</th>
                <th className="text-right font-medium text-slate-500 pb-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-2">
                    <p className="font-medium text-slate-800">{item.product_name}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(Number(item.unit_price))} each</p>
                  </td>
                  <td className="text-center py-2 text-slate-700">{item.quantity}</td>
                  <td className="text-right py-2 font-medium text-slate-800">{formatCurrency(Number(item.subtotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 py-4 border-t-2 border-slate-900">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-500">Payment Method</span>
            <span className="text-sm capitalize text-slate-700">{sale.payment_method.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-slate-900">Total</span>
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(Number(sale.total_amount))}</span>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 text-center">
          <p className="text-xs text-slate-400">Thank you for your business!</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Sale
        </button>
        <button
          onClick={onViewHistory}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          <ReceiptIcon className="w-4 h-4" />
          View History
        </button>
        <button
          onClick={() => window.print()}
          className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
          title="Print receipt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
