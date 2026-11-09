import { useEffect, useState, useCallback } from 'react';
import { Package, Bike, AlertTriangle, TrendingUp, DollarSign, ShoppingCart, ArrowUpRight } from 'lucide-react';
import { supabase, type Product, type Sale } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';

type Props = {
  onNavigate: (page: 'dashboard' | 'inventory' | 'pos' | 'sales') => void;
};

export default function Dashboard({ onNavigate }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [prodRes, saleRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(5),
    ]);
    if (prodRes.data) setProducts(prodRes.data as Product[]);
    if (saleRes.data) setSales(saleRes.data as Sale[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalProducts = products.length;
  const motorcycles = products.filter((p) => p.category === 'motorcycle');
  const spareParts = products.filter((p) => p.category === 'spare_part');
  const outOfStock = products.filter((p) => p.status === 'out_of_stock' || p.quantity === 0);
  const lowStock = products.filter(
    (p) => p.status === 'in_stock' && p.quantity > 0 && p.quantity <= p.min_stock_level
  );
  const inventoryValue = products.reduce((sum, p) => sum + p.cost_price * p.quantity, 0);
  const totalSalesRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);

  const stats = [
    {
      label: 'Total Products',
      value: totalProducts.toString(),
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      sub: `${motorcycles.length} bikes · ${spareParts.length} parts`,
    },
    {
      label: 'Inventory Value',
      value: formatCurrency(inventoryValue),
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
      sub: 'At cost price',
    },
    {
      label: 'Out of Stock',
      value: outOfStock.length.toString(),
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      sub: outOfStock.length === 0 ? 'All stocked' : 'Needs attention',
    },
    {
      label: 'Recent Revenue',
      value: formatCurrency(totalSalesRevenue),
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      sub: `${sales.length} recent sales`,
    },
  ];

  return (
    <div className="animate-fadeIn space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of your motorcycle and spare parts stock</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 hover:border-slate-700 transition-colors"
            >
              <div className={`w-10 h-10 md:w-11 md:h-11 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-lg`}>
                <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <p className="text-xs md:text-sm text-slate-400">{stat.label}</p>
              <p className="text-xl md:text-2xl font-bold text-white mt-1">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-300">Low Stock Alerts</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-amber-950/20 rounded-lg px-3 py-2">
                <span className="text-sm text-amber-200 truncate">{p.name}</span>
                <span className="text-xs text-amber-400 font-medium shrink-0 ml-2">{p.quantity} left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Out of stock list */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Out of Stock Items</h3>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500 py-8 text-center">Loading...</p>
          ) : outOfStock.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">Everything is in stock</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {outOfStock.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center gap-3 bg-slate-800/40 rounded-lg px-3 py-2.5">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                      {p.category === 'motorcycle' ? (
                        <Bike className="w-5 h-5 text-slate-400" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.brand || 'No brand'}</p>
                  </div>
                  <span className="text-xs text-red-400 font-medium">0 in stock</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent sales */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Sales</h3>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500 py-8 text-center">Loading...</p>
          ) : sales.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingCart className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No sales yet</p>
              <button
                onClick={() => onNavigate('pos')}
                className="text-xs text-orange-400 hover:text-orange-300 mt-2"
              >
                Make your first sale
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {sales.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium">{s.receipt_number}</p>
                    <p className="text-xs text-slate-500">{formatDate(s.created_at)}</p>
                  </div>
                  <span className="text-sm text-emerald-400 font-semibold shrink-0 ml-2">
                    {formatCurrency(Number(s.total_amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick action */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onNavigate('pos')}
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          New Sale
        </button>
        <button
          onClick={() => onNavigate('inventory')}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
        >
          <Package className="w-5 h-5" />
          Manage Inventory
        </button>
      </div>
    </div>
  );
}
