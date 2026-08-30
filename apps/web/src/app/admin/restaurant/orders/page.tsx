'use client';
import React, { useState, useEffect } from 'react';
import { Search, Bike, ShoppingBag, Utensils, CalendarDays, Eye, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, Star, Phone } from 'lucide-react';
import { useRestaurantRegionFilter } from '@/hooks/useRestaurantRegionFilter';
import { adminRestaurantApi } from '@/lib/api/admin-restaurant';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type OrderType = 'delivery' | 'takeaway' | 'dine-in' | 'table-booking';
type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';

type Order = {
  id: string; restaurant: string; customer: string; phone: string; country: string;
  type: OrderType; status: OrderStatus; items: string[]; total: number;
  time: string; city: string;
};

const ORDERS: Order[] = [
  { id: 'RO-9981', restaurant: 'Burger King (Andheri)', customer: 'Amit Sharma', phone: '+91 98765 11111', country: 'India', type: 'delivery', status: 'preparing', items: ['2x Chicken Biryani', '1x Butter Naan'], total: 840, time: '12 mins ago', city: 'Mumbai' },
  { id: 'RO-9982', restaurant: 'Pizza Palace', customer: 'Priya M.', phone: '+91 87654 22222', country: 'India', type: 'takeaway', status: 'ready', items: ['1x Margherita Pizza', '2x Pepsi'], total: 520, time: '25 mins ago', city: 'Mumbai' },
  { id: 'RO-9983', restaurant: 'Sushi Kingdom', customer: 'Ravi K.', phone: '+91 76543 33333', country: 'India', type: 'dine-in', status: 'accepted', items: ['4x Dragon Roll', '2x Miso Soup'], total: 1240, time: '32 mins ago', city: 'Mumbai' },
  { id: 'RO-9984', restaurant: 'Biryani House', customer: 'Sana A.', phone: '+91 65432 44444', country: 'India', type: 'table-booking', status: 'new', items: ['Table for 4 @ 7:30 PM'], total: 2100, time: '5 mins ago', city: 'Hyderabad' },
  { id: 'RO-9985', restaurant: 'China Garden', customer: 'Wang L.', phone: '+91 54321 55555', country: 'India', type: 'delivery', status: 'completed', items: ['1x Fried Rice', '2x Spring Roll'], total: 380, time: '1 hr ago', city: 'Delhi' },
  { id: 'RO-9986', restaurant: 'Street Bites', customer: 'Rahul D.', phone: '+91 43210 66666', country: 'India', type: 'delivery', status: 'cancelled', items: ['3x Vada Pav'], total: 120, time: '2 hrs ago', city: 'Mumbai' },
  { id: 'RO-9987', restaurant: 'Al Mahara Seafood', customer: 'Fatima A.', phone: '+971 50 111 2222', country: 'UAE', type: 'delivery', status: 'preparing', items: ['1x Grilled Hammour', '1x Arabic Salad'], total: 185, time: '10 mins ago', city: 'Dubai' },
  { id: 'RO-9988', restaurant: 'Zuma Dubai', customer: 'Omar K.', phone: '+971 55 333 4444', country: 'UAE', type: 'dine-in', status: 'accepted', items: ['2x Wagyu Beef', '1x Sake Set'], total: 520, time: '20 mins ago', city: 'Abu Dhabi' },
  { id: 'RO-9989', restaurant: 'Al Baik', customer: 'Abdullah M.', phone: '+966 50 555 6666', country: 'Saudi Arabia', type: 'takeaway', status: 'ready', items: ['4x Broast Combo', '2x Garlic Sauce'], total: 120, time: '15 mins ago', city: 'Riyadh' },
  { id: 'RO-9990', restaurant: 'Mama Noura', customer: 'Khalid R.', phone: '+966 55 777 8888', country: 'Saudi Arabia', type: 'delivery', status: 'new', items: ['2x Shawarma Plate', '1x Fresh Juice'], total: 85, time: '3 mins ago', city: 'Jeddah' },
];

const TYPE_CFG: Record<OrderType, { icon: React.ElementType; bg: string; color: string; label: string }> = {
  'delivery': { icon: Bike, bg: 'bg-orange-50', color: 'text-orange-600', label: 'Delivery' },
  'takeaway': { icon: ShoppingBag, bg: 'bg-purple-50', color: 'text-purple-600', label: 'Takeaway' },
  'dine-in': { icon: Utensils, bg: 'bg-emerald-50', color: 'text-emerald-600', label: 'Dine-in' },
  'table-booking': { icon: CalendarDays, bg: 'bg-rose-50', color: 'text-rose-600', label: 'Table Booking' },
};
const STATUS_CFG: Record<OrderStatus, string> = {
  new: 'bg-blue-100 text-blue-700', accepted: 'bg-indigo-100 text-indigo-700',
  preparing: 'bg-amber-100 text-amber-700', ready: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-100 text-slate-600', cancelled: 'bg-red-100 text-red-600',
};

export default function AdminRestaurantOrdersPage() {
  const [orders, setOrders] = useState(ORDERS);
  const [search, setSearch] = useState('');
  const [typeF, setTypeF] = useState<'all' | OrderType>('all');
  const [statusF, setStatusF] = useState<'all' | OrderStatus>('all');
  const [exp, setExp] = useState<string | null>(null);
  const { filtered: regionFiltered, regionLabel, isFiltered, formatPrice } = useRestaurantRegionFilter(orders);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminRestaurantApi.getOrders({ limit: 50 });
        if (res.success && Array.isArray((res.data as any)?.data) && (res.data as any).data.length > 0) {
          setOrders((res.data as any).data);
        }
      } catch { /* keep demo */ }
    })();
  }, []);

  const filtered = regionFiltered.filter(o => {
    const ms = o.id.toLowerCase().includes(search.toLowerCase()) || o.restaurant.toLowerCase().includes(search.toLowerCase()) || o.customer.toLowerCase().includes(search.toLowerCase());
    const mt = typeF === 'all' || o.type === typeF;
    const mst = statusF === 'all' || o.status === statusF;
    return ms && mt && mst;
  });

  const counts = { delivery: regionFiltered.filter(o => o.type === 'delivery').length, takeaway: regionFiltered.filter(o => o.type === 'takeaway').length, 'dine-in': regionFiltered.filter(o => o.type === 'dine-in').length, 'table-booking': regionFiltered.filter(o => o.type === 'table-booking').length };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Restaurant Orders</h1>
        <p className="text-slate-500 text-sm">{isFiltered ? `${regionLabel} — ` : ''}All orders across delivery, takeaway, dine-in, and table bookings.</p>
      </div>

      {/* Order type stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.entries(TYPE_CFG) as [OrderType, typeof TYPE_CFG[OrderType]][]).map(([key, cfg]) => (
          <button key={key} onClick={() => setTypeF(typeF === key ? 'all' : key)}
            className={`${cfg.bg} border-2 ${typeF === key ? `border-current` : 'border-transparent'} rounded-xl p-4 text-left transition-all hover:shadow-sm`}>
            <cfg.icon className={`w-5 h-5 ${cfg.color} mb-2`} />
            <p className={`text-2xl font-black ${cfg.color}`}>{counts[key]}</p>
            <p className={`text-xs font-bold ${cfg.color} opacity-80 mt-0.5`}>{cfg.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders, restaurants, customers..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value as any)} title="Order status filter"
          className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
          <option value="all">All Statuses</option>
          {(['new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'] as const).map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Order</th>
                <th className="px-5 py-3.5 font-semibold">Restaurant</th>
                <th className="px-5 py-3.5 font-semibold text-center">Type</th>
                <th className="px-5 py-3.5 font-semibold text-right">Total</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Time</th>
                <th className="px-5 py-3.5 font-semibold text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(order => {
                const tc = TYPE_CFG[order.type];
                return (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setExp(exp === order.id ? null : order.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExp(exp === order.id ? null : order.id))}>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{order.id}</p>
                        <p className="text-xs text-slate-400">{order.customer}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-700">{order.restaurant}</p>
                        <p className="text-xs text-slate-400">{order.city}</p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 ${tc.bg} ${tc.color} px-2.5 py-1 rounded-full text-xs font-bold`}>
                          <tc.icon className="w-3 h-3" />{tc.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-900">{formatPrice(order.total)}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`${STATUS_CFG[order.status]} px-2.5 py-1 rounded-full text-xs font-bold`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center text-xs text-slate-400 font-medium">{order.time}</td>
                      <td className="px-5 py-4 text-center">{exp === order.id ? <ChevronUp className="w-4 h-4 text-slate-400 mx-auto" /> : <ChevronDown className="w-4 h-4 text-slate-400 mx-auto" />}</td>
                    </tr>
                    {exp === order.id && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="flex flex-wrap gap-4 items-start">
                            <div>
                              <p className="text-xs font-bold text-slate-400 mb-1">Items Ordered</p>
                              <div className="space-y-0.5">{order.items.map((item, i) => <p key={i} className="text-sm font-medium text-slate-700">• {item}</p>)}</div>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-400 mb-1">Customer Phone</p>
                              <p className="text-sm font-medium text-slate-700 flex items-center gap-1"><Phone className="w-3 h-3" />{order.phone}</p>
                            </div>
                            <div className="flex gap-2 ml-auto">
                              <button className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50"><Eye className="w-3.5 h-3.5 inline mr-1" />Full Details</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
