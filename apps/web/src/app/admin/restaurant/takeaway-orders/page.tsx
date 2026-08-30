'use client';
import { useRestaurantRegionFilter } from '@/hooks/useRestaurantRegionFilter';
import React, { useState } from 'react';
import { ShoppingBag, Filter, Download, Eye, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

type AdminTakeawayOrder = {
  id: string; restaurant: string; customer: string; items: number;
  total: number; status: string; paymentStatus: 'paid' | 'unpaid' | 'refunded';
  city: string; date: string; pickupTime: string;
};

const ORDERS: AdminTakeawayOrder[] = [
  { id: 'TKW-9981', restaurant: 'The Grand Biryani House', customer: 'Ahmed Al-Rashidi', items: 4, total: 1180, status: 'preparing', paymentStatus: 'paid', city: 'Riyadh', date: 'May 31, 2026', pickupTime: 'ASAP' },
  { id: 'TKW-9975', restaurant: 'Mandarin Palace', customer: 'Fatima Zahra', items: 2, total: 548, status: 'ready_for_pickup', paymentStatus: 'paid', city: 'Riyadh', date: 'May 31, 2026', pickupTime: '7:30 PM' },
  { id: 'TKW-9963', restaurant: 'Kerala Spice Kitchen', customer: 'Omar Khalil', items: 3, total: 818, status: 'completed', paymentStatus: 'paid', city: 'Jeddah', date: 'May 31, 2026', pickupTime: '6:00 PM' },
  { id: 'TKW-9957', restaurant: 'Green Leaf Cafe', customer: 'Sara Al-Mutairi', items: 1, total: 299, status: 'restaurant_rejected', paymentStatus: 'refunded', city: 'Jeddah', date: 'May 30, 2026', pickupTime: '1:00 PM' },
  { id: 'TKW-9950', restaurant: 'The Grand Biryani House', customer: 'Ali Hassan', items: 6, total: 2100, status: 'cancelled', paymentStatus: 'refunded', city: 'Riyadh', date: 'May 30, 2026', pickupTime: '8:00 PM' },
];

const STATUS_STYLE: Record<string, string> = {
  restaurant_pending: 'bg-amber-100 text-amber-700',
  restaurant_accepted: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready_for_pickup: 'bg-green-100 text-green-700',
  customer_arrived: 'bg-teal-100 text-teal-700',
  collected: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  restaurant_rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default function AdminTakeawayOrdersPage() {
  const { regionLabel, isFiltered, formatPrice } = useRestaurantRegionFilter([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const filtered = ORDERS.filter(o =>
    (statusFilter === 'all' || o.status === statusFilter) &&
    (cityFilter === 'all' || o.city === cityFilter) &&
    (o.id.includes(search) || o.restaurant.toLowerCase().includes(search.toLowerCase()) || o.customer.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRevenue = ORDERS.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);
  const completed = ORDERS.filter(o => o.status === 'completed').length;
  const refunded = ORDERS.filter(o => o.paymentStatus === 'refunded').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-purple-600" /> Takeaway Orders
          </h1>
          <p className="text-slate-500 text-sm">Monitor all takeaway orders across restaurants</p>
        </div>
        <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: ORDERS.length, icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
          { label: 'Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
          { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Refunded', value: refunded, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 shadow-sm`}>
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-center shadow-sm">
        <Filter className="w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search order ID, restaurant, customer..."
          className="flex-1 min-w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none">
          <option value="all">All Statuses</option>
          {['restaurant_pending','preparing','ready_for_pickup','completed','restaurant_rejected','cancelled'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none">
          <option value="all">All Cities</option>
          <option value="Riyadh">Riyadh</option>
          <option value="Jeddah">Jeddah</option>
        </select>
        <button onClick={() => { setSearch(''); setStatusFilter('all'); setCityFilter('all'); }}
          className="flex items-center gap-1.5 border border-slate-200 text-slate-500 rounded-lg px-3 py-2 text-sm hover:bg-slate-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Order ID', 'Restaurant', 'Customer', 'Items', 'Pickup Time', 'Amount', 'Payment', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-bold text-slate-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-purple-700 text-sm">{order.id}</p>
                    <p className="text-xs text-slate-400">{order.date}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 text-sm">{order.restaurant}</p>
                    <p className="text-xs text-slate-400">{order.city}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{order.customer}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 text-center">{order.items}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{order.pickupTime}</td>
                  <td className="px-4 py-3 font-bold text-slate-900 text-sm">₹{order.total}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : order.paymentStatus === 'refunded' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${STATUS_STYLE[order.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-1 text-purple-600 hover:text-purple-800 text-xs font-bold border border-purple-200 rounded-lg px-2 py-1 hover:bg-purple-50 transition-colors">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-bold">No orders found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
