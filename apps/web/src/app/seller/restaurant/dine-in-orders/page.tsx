'use client';

import { useState } from 'react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const TABLES = [
  { id: 't1', num: 'T-01', area: 'Main Hall', cap: 2, status: 'available' },
  { id: 't2', num: 'T-02', area: 'Main Hall', cap: 4, status: 'occupied' },
  { id: 't3', num: 'T-03', area: 'Main Hall', cap: 6, status: 'available' },
  { id: 't4', num: 'R-01', area: 'Rooftop',   cap: 2, status: 'reserved' },
  { id: 't5', num: 'R-02', area: 'Rooftop',   cap: 4, status: 'available' },
  { id: 't6', num: 'F-01', area: 'Family',    cap: 8, status: 'available' },
];

const ORDERS = [
  { id: 'DI-001', customer: 'Arjun Sharma', mobile: '+91 98765 43210', table: 'T-02', area: 'Main Hall', items: 3, total: 847, status: 'restaurant_pending', payment: 'Online', time: '7:32 PM' },
  { id: 'DI-002', customer: 'Priya Mehta',  mobile: '+91 87654 32109', table: 'R-01', area: 'Rooftop',   items: 5, total: 1249, status: 'preparing',          payment: 'Pay at Restaurant', time: '7:45 PM' },
  { id: 'DI-003', customer: 'Ravi Kumar',   mobile: '+91 76543 21098', table: 'F-01', area: 'Family',    items: 8, total: 2180, status: 'ready_to_serve',     payment: 'Wallet', time: '8:01 PM' },
  { id: 'DI-004', customer: 'Anita Nair',   mobile: '+91 65432 10987', table: '—',    area: '—',          items: 2, total: 399,  status: 'restaurant_accepted', payment: 'Online', time: '8:15 PM' },
];

const STATUS_MAP: Record<string, { label: string; colorClass: string; bgClass: string }> = {
  restaurant_pending:  { label: 'New Order',       colorClass: 'text-amber-600', bgClass: 'bg-amber-100' },
  restaurant_accepted: { label: 'Accepted',         colorClass: 'text-blue-600', bgClass: 'bg-blue-50' },
  table_assigned:      { label: 'Table Assigned',   colorClass: 'text-violet-600', bgClass: 'bg-violet-50' },
  preparing:           { label: 'Preparing',         colorClass: 'text-orange-600', bgClass: 'bg-orange-50' },
  ready_to_serve:      { label: 'Ready to Serve',   colorClass: 'text-green-600', bgClass: 'bg-green-50' },
  served:              { label: 'Served',            colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50' },
  completed:           { label: 'Completed',         colorClass: 'text-gray-500', bgClass: 'bg-gray-50' },
};

export default function DineInOrdersPage() {
  const [orders, setOrders] = useState(ORDERS);
  const [activeTab, setActiveTab] = useState<'orders' | 'tables'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<typeof ORDERS[0] | null>(null);
  const [dineInEnabled, setDineInEnabled] = useState(true);

  const updateStatus = (id: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    setSelectedOrder(null);
  };

  const nextAction = (status: string): { label: string; next: string } | null => {
    const map: Record<string, { label: string; next: string }> = {
      restaurant_pending:  { label: 'Accept Order',     next: 'restaurant_accepted' },
      restaurant_accepted: { label: 'Assign Table',     next: 'table_assigned' },
      table_assigned:      { label: 'Start Preparing',  next: 'preparing' },
      preparing:           { label: 'Mark Ready',       next: 'ready_to_serve' },
      ready_to_serve:      { label: 'Mark Served',      next: 'served' },
      served:              { label: 'Complete Order',   next: 'completed' },
    };
    return map[status] ?? null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dine-in Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage in-restaurant orders, tables, and service</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-600">Dine-in Service</span>
          <button
            title="Toggle dine-in service"
            onClick={() => setDineInEnabled(!dineInEnabled)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${dineInEnabled ? 'bg-green-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${dineInEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
          <span className={`text-sm font-bold ${dineInEnabled ? 'text-green-700' : 'text-gray-400'}`}>
            {dineInEnabled ? 'LIVE' : 'PAUSED'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'New Orders',    value: orders.filter(o => o.status === 'restaurant_pending').length,  colorClass: 'text-amber-600', icon: '🔔' },
          { label: 'Preparing',     value: orders.filter(o => o.status === 'preparing').length,            colorClass: 'text-orange-600', icon: '👨‍🍳' },
          { label: 'Ready to Serve',value: orders.filter(o => o.status === 'ready_to_serve').length,       colorClass: 'text-green-600', icon: '🍽️' },
          { label: 'Tables Free',   value: TABLES.filter(t => t.status === 'available').length,            colorClass: 'text-blue-600', icon: '🪑' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className={`text-2xl font-black ${stat.colorClass}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 font-semibold mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {(['orders', 'tables'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'orders' ? '📋 Orders' : '🪑 Tables'}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders list */}
          <div className="lg:col-span-2 space-y-3">
            {orders.map(order => {
              const s = STATUS_MAP[order.status] ?? { label: order.status, colorClass: 'text-gray-500', bgClass: 'bg-gray-50' };
              const action = nextAction(order.status);
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setSelectedOrder(order))}
                  className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${selectedOrder?.id === order.id ? 'border-orange-400' : 'border-gray-100'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-gray-900 text-sm">{order.id}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.colorClass} ${s.bgClass}`}>{s.label}</span>
                        {order.status === 'restaurant_pending' && (
                          <span className="animate-pulse text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">NEW</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-700">{order.customer}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{order.mobile}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-gray-900">₹{order.total}</div>
                      <div className="text-xs text-gray-400">{order.time}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-lg">🪑 {order.table} — {order.area}</span>
                    <span className="text-xs bg-gray-50 text-gray-600 font-semibold px-2 py-0.5 rounded-lg">{order.items} items</span>
                    <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-lg">{order.payment}</span>
                  </div>
                  {action && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); updateStatus(order.id, action.next); }}
                        className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                      >
                        {action.label}
                      </button>
                      {order.status === 'restaurant_pending' && (
                        <button
                          onClick={e => { e.stopPropagation(); updateStatus(order.id, 'cancelled'); }}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Order detail panel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 h-fit">
            {selectedOrder ? (
              <>
                <h3 className="font-black text-gray-900 mb-4">Order Details</h3>
                <div className="space-y-3 text-sm">
                  {[
                    ['Order ID', selectedOrder.id],
                    ['Customer', selectedOrder.customer],
                    ['Mobile', selectedOrder.mobile],
                    ['Table', `${selectedOrder.table} — ${selectedOrder.area}`],
                    ['Items', `${selectedOrder.items} items`],
                    ['Payment', selectedOrder.payment],
                    ['Total', `₹${selectedOrder.total}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-bold text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 mt-4 pt-4">
                  <div className="text-xs font-bold text-gray-500 mb-2">STATUS FLOW</div>
                  {['restaurant_pending','restaurant_accepted','table_assigned','preparing','ready_to_serve','served','completed'].map((s, i) => {
                    const steps = ['restaurant_pending','restaurant_accepted','table_assigned','preparing','ready_to_serve','served','completed'];
                    const curIdx = steps.indexOf(selectedOrder.status);
                    const isDone = i <= curIdx;
                    const labels = ['Pending','Accepted','Table Set','Preparing','Ready','Served','Done'];
                    return (
                      <div key={s} className="flex items-center gap-2 mb-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{isDone ? '✓' : i+1}</div>
                        <span className={`text-xs ${isDone ? 'font-bold text-gray-900' : 'text-gray-400'}`}>{labels[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <div className="font-semibold">Select an order to view details</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tables' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {TABLES.map(table => {
            const colors = { available: { borderClass: 'border-green-600', bgClass: 'bg-green-50', textClass: 'text-green-700', badgeClass: 'bg-green-100' }, occupied: { borderClass: 'border-red-500', bgClass: 'bg-red-50', textClass: 'text-red-700', badgeClass: 'bg-red-100' }, reserved: { borderClass: 'border-amber-600', bgClass: 'bg-amber-50', textClass: 'text-amber-700', badgeClass: 'bg-amber-100' } };
            const c = colors[table.status as keyof typeof colors] ?? colors.available;
            return (
              <div key={table.id} className={`rounded-2xl border-2 p-4 text-center transition-all ${c.borderClass} ${c.bgClass}`}>
                <div className="text-3xl mb-2">🪑</div>
                <div className="font-black text-gray-900 text-lg">{table.num}</div>
                <div className="text-xs text-gray-500 mb-2">{table.area} • {table.cap} seats</div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${c.textClass} ${c.badgeClass}`}>
                  {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
