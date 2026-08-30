'use client';
import { useRestaurantRegionFilter } from '@/hooks/useRestaurantRegionFilter';

import { useState } from 'react';

const DINE_IN_ORDERS = [
  { id: 'DI-001', restaurant: 'The Grand Biryani House', customer: 'Arjun Sharma', table: 'T-02', area: 'Main Hall', items: 3, total: 847, status: 'restaurant_pending', payment: 'Online', city: 'Bengaluru', date: '2026-05-31 19:32' },
  { id: 'DI-002', restaurant: 'Mandarin Palace',         customer: 'Priya Mehta',  table: 'R-01', area: 'Rooftop',   items: 5, total: 1249, status: 'preparing',          payment: 'Cash',   city: 'Mumbai',    date: '2026-05-31 19:45' },
  { id: 'DI-003', restaurant: 'Kerala Spice Kitchen',    customer: 'Ravi Kumar',   table: 'F-01', area: 'Family',    items: 8, total: 2180, status: 'ready_to_serve',     payment: 'Wallet', city: 'Chennai',   date: '2026-05-31 20:01' },
  { id: 'DI-004', restaurant: 'Green Leaf Cafe',         customer: 'Anita Nair',   table: '—',    area: '—',          items: 2, total: 399,  status: 'completed',          payment: 'Online', city: 'Delhi',     date: '2026-05-31 18:22' },
  { id: 'DI-005', restaurant: 'The Grand Biryani House', customer: 'Vikram Singh', table: 'T-04', area: 'Main Hall', items: 6, total: 1680, status: 'cancelled',          payment: 'Online', city: 'Bengaluru', date: '2026-05-31 17:55' },
];

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  restaurant_pending:  { label: 'Pending',        color: '#D97706', bg: '#FEF3C7' },
  restaurant_accepted: { label: 'Accepted',        color: '#2563EB', bg: '#EFF6FF' },
  table_assigned:      { label: 'Table Assigned',  color: '#7C3AED', bg: '#F5F3FF' },
  preparing:           { label: 'Preparing',        color: '#EA580C', bg: '#FFF7ED' },
  ready_to_serve:      { label: 'Ready to Serve',  color: '#16A34A', bg: '#F0FDF4' },
  served:              { label: 'Served',           color: '#059669', bg: '#ECFDF5' },
  completed:           { label: 'Completed',        color: '#6B7280', bg: '#F9FAFB' },
  cancelled:           { label: 'Cancelled',        color: '#EF4444', bg: '#FEF2F2' },
};

export default function AdminDineInOrdersPage() {
  const { regionLabel, isFiltered, formatPrice } = useRestaurantRegionFilter([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = DINE_IN_ORDERS.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchSearch = search === '' || o.id.toLowerCase().includes(search.toLowerCase()) || o.customer.toLowerCase().includes(search.toLowerCase()) || o.restaurant.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalRevenue = filtered.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dine-in Orders</h1>
          <p className="text-gray-500 text-sm mt-1">All dine-in orders across all restaurants</p>
        </div>
        <button className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors">
          ⬇ Export CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Orders',   value: DINE_IN_ORDERS.length,                                             color: '#2563EB', icon: '📋' },
          { label: 'Active',         value: DINE_IN_ORDERS.filter(o => !['completed','cancelled'].includes(o.status)).length, color: '#EA580C', icon: '🔥' },
          { label: 'Completed',      value: DINE_IN_ORDERS.filter(o => o.status === 'completed').length,        color: '#16A34A', icon: '✅' },
          { label: 'Revenue',        value: `₹${DINE_IN_ORDERS.filter(o => o.status === 'completed').reduce((s,o)=>s+o.total,0).toLocaleString()}`, color: '#7C3AED', icon: '💰' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="text-2xl mb-1">{k.icon}</div>
            <div className="text-xl font-black" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-gray-500 font-semibold mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search order ID, customer, or restaurant…"
          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-orange-400"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_STYLE).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase">
              {['Order ID','Restaurant','Customer','Table','Items','Payment','Total','Status','Date','Action'].map(h => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(order => {
              const s = STATUS_STYLE[order.status] ?? { label: order.status, color: '#6B7280', bg: '#F9FAFB' };
              return (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-black text-orange-600">{order.id}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 max-w-[160px] truncate">{order.restaurant}</td>
                  <td className="px-4 py-3 text-gray-700">{order.customer}</td>
                  <td className="px-4 py-3">
                    <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-lg">
                      {order.table === '—' ? '—' : `${order.table} / ${order.area}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{order.items}</td>
                  <td className="px-4 py-3 text-gray-600">{order.payment}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">₹{order.total}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ color: s.color, background: s.bg }}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{order.date}</td>
                  <td className="px-4 py-3">
                    <button className="text-xs font-bold text-orange-600 hover:underline">View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <div className="text-4xl mb-3">🍽️</div>
            <div className="font-semibold">No dine-in orders found</div>
          </div>
        )}
      </div>
    </div>
  );
}
