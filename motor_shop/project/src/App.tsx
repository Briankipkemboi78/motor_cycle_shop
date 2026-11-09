import { useState } from 'react';
import { LayoutDashboard, Package, ShoppingCart, Receipt, Bike } from 'lucide-react';
import Dashboard from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import PointOfSale from '@/pages/PointOfSale';
import SalesHistory from '@/pages/SalesHistory';

type Page = 'dashboard' | 'inventory' | 'pos' | 'sales';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');

  const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'pos', label: 'New Sale', icon: ShoppingCart },
    { id: 'sales', label: 'Sales History', icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex md:flex-col flex-row overflow-x-auto md:overflow-x-visible shrink-0">
        <div className="px-5 py-5 border-b border-slate-800 hidden md:block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Bike className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">MotoStock</h1>
              <p className="text-xs text-slate-400">Parts & Bikes</p>
            </div>
          </div>
        </div>

        <div className="flex md:flex-col flex-row md:w-full px-2 md:px-3 md:py-4 gap-1 md:gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  active
                    ? 'bg-orange-500/10 text-orange-400 md:border-l-2 md:border-orange-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
          {page === 'inventory' && <Inventory />}
          {page === 'pos' && <PointOfSale onNavigate={setPage} />}
          {page === 'sales' && <SalesHistory />}
        </div>
      </main>
    </div>
  );
}
