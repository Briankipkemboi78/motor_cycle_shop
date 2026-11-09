import { useEffect, useState, useCallback } from 'react';
import { Search, Receipt as ReceiptIcon, X, Bike, Package, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { supabase, type SaleWithItems } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';

export default function SalesHistory() {
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);
  const [stats, setStats] = useState({ total: 0, count: 0, avg: 0 });

  const fetchSales = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const salesData = data as SaleWithItems[];
    setSales(salesData);
    const total = salesData.reduce((sum, s) => sum + Number(s.total_amount), 0);
    setStats({
      total,
      count: salesData.length,
      avg: salesData.length > 0 ? total / salesData.length : 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const filtered = sales.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.receipt_number.toLowerCase().includes(q) ||
      s.customer_name.toLowerCase().includes(q) ||
      s.customer_phone.toLowerCase().includes(q) ||
      s.sale_items?.some((item) => item.product_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="animate-fadeIn space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Sales History</h1>
        <p className="text-slate-400 mt-1">All completed transactions and receipts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Total Revenue</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(stats.total)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">Total Sales</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white">{stats.count}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-slate-400">Avg Sale</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(stats.avg)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by receipt number, customer, or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
        />
      </div>

      {/* Sales list */}
      {loading ? (
        <p className="text-slate-500 text-center py-12">Loading sales...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-16 text-center">
          <ReceiptIcon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 mb-1">No sales found</p>
          <p className="text-sm text-slate-500">Sales will appear here after you make your first transaction</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sale) => (
            <button
              key={sale.id}
              onClick={() => setSelectedSale(sale)}
              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-colors text-left group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    <ReceiptIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{sale.receipt_number}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500">{formatDate(sale.created_at)}</span>
                      {sale.customer_name && (
                        <span className="text-xs text-slate-500">· {sale.customer_name}</span>
                      )}
                      <span className="text-xs text-slate-600 capitalize">· {sale.payment_method.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(Number(sale.total_amount))}</p>
                  <p className="text-xs text-slate-500">{sale.sale_items?.length || 0} items</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Receipt detail modal */}
      {selectedSale && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-thin animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <h2 className="text-lg font-bold text-white">Receipt Details</h2>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-2">
                  <Bike className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">MotoStock</h3>
                <p className="text-xs text-slate-500">Motorcycle Parts & Bikes</p>
              </div>

              <div className="space-y-1 text-sm border-y border-slate-800 py-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt #</span>
                  <span className="text-white font-medium">{selectedSale.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="text-white">{formatDate(selectedSale.created_at)}</span>
                </div>
                {selectedSale.customer_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer</span>
                    <span className="text-white">{selectedSale.customer_name}</span>
                  </div>
                )}
                {selectedSale.customer_phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone</span>
                    <span className="text-white">{selectedSale.customer_phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment</span>
                  <span className="text-white capitalize">{selectedSale.payment_method.replace('_', ' ')}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Items</h4>
                <div className="space-y-2">
                  {selectedSale.sale_items?.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-3">
                      <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-slate-500">
                          {item.quantity} × {formatCurrency(Number(item.unit_price))}
                        </p>
                      </div>
                      <span className="text-sm text-white font-semibold shrink-0">
                        {formatCurrency(Number(item.subtotal))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                <span className="text-lg font-bold text-white">Total</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(Number(selectedSale.total_amount))}
                </span>
              </div>

              <button
                onClick={() => window.print()}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
