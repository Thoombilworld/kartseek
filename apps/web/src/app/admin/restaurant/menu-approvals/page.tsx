'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Eye, Search,
  ChefHat, Utensils, Filter, AlertTriangle,
} from 'lucide-react';
import { adminRestaurantApi } from '@/lib/api/admin-restaurant';

type Status = 'pending' | 'approved' | 'rejected';

const MENU_CHANGES = [
  { id: 'MC-001', restaurant: 'Burger King (Andheri)', restaurantId: 'RES-001', itemName: 'BBQ Chicken Wings', type: 'NEW', oldPrice: null, newPrice: 229, category: 'Starters', isVeg: false, submittedAt: '30 Jun, 2:15 PM', status: 'pending' as Status },
  { id: 'MC-002', restaurant: 'Pizza Palace', restaurantId: 'RES-002', itemName: 'Truffle Mushroom Pizza', type: 'NEW', oldPrice: null, newPrice: 599, category: 'Specialty', isVeg: true, submittedAt: '30 Jun, 11:30 AM', status: 'pending' as Status },
  { id: 'MC-003', restaurant: 'Biryani House', restaurantId: 'RES-004', itemName: 'Chicken Dum Biryani', type: 'PRICE_CHANGE', oldPrice: 280, newPrice: 320, category: 'Biryani', isVeg: false, submittedAt: '29 Jun, 5:00 PM', status: 'pending' as Status },
  { id: 'MC-004', restaurant: 'Green Bowl', restaurantId: 'RES-005', itemName: 'Keto Caesar Salad', type: 'NEW', oldPrice: null, newPrice: 349, category: 'Salads', isVeg: true, submittedAt: '29 Jun, 3:20 PM', status: 'pending' as Status },
  { id: 'MC-005', restaurant: 'Sushi Kingdom', restaurantId: 'RES-003', itemName: 'Dragon Roll', type: 'PRICE_CHANGE', oldPrice: 450, newPrice: 520, category: 'Rolls', isVeg: false, submittedAt: '28 Jun, 1:00 PM', status: 'approved' as Status },
  { id: 'MC-006', restaurant: 'Street Bites', restaurantId: 'RES-006', itemName: 'Mystery Kebab', type: 'NEW', oldPrice: null, newPrice: 99, category: 'Kebabs', isVeg: false, submittedAt: '28 Jun, 10:00 AM', status: 'rejected' as Status },
];

export default function MenuApprovalsPage() {
  const [items, setItems] = useState(MENU_CHANGES);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');

  const approve = (id: string) => setItems(p => p.map(i => i.id === id ? { ...i, status: 'approved' as Status } : i));
  const reject = (id: string) => setItems(p => p.map(i => i.id === id ? { ...i, status: 'rejected' as Status } : i));

  const filtered = items.filter(i => {
    if (filter !== 'all' && i.status !== filter) return false;
    if (search && !i.itemName.toLowerCase().includes(search.toLowerCase()) && !i.restaurant.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingCount = items.filter(i => i.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/restaurant" className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft className="w-5 h-5 text-slate-600" /></Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Menu Approvals</h1>
            <p className="text-sm text-slate-500">Review and approve menu changes from restaurant partners</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
            <Clock className="w-4 h-4" /> {pendingCount} Pending
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search items or restaurants..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white" />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3 font-semibold">Item</th>
              <th className="px-5 py-3 font-semibold">Restaurant</th>
              <th className="px-5 py-3 font-semibold text-center">Change Type</th>
              <th className="px-5 py-3 font-semibold text-right">Price</th>
              <th className="px-5 py-3 font-semibold text-center">Submitted</th>
              <th className="px-5 py-3 font-semibold text-center">Status</th>
              <th className="px-5 py-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 border-2 rounded-sm ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                      <span className={`block w-2 h-2 rounded-full m-0.5 ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{item.itemName}</p>
                      <p className="text-xs text-slate-400">{item.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-700">{item.restaurant}</td>
                <td className="px-5 py-4 text-center">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    item.type === 'NEW' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}>{item.type === 'NEW' ? 'New Item' : 'Price Change'}</span>
                </td>
                <td className="px-5 py-4 text-right">
                  {item.oldPrice && <span className="text-slate-400 line-through text-xs mr-1">₹{item.oldPrice}</span>}
                  <span className="font-bold">₹{item.newPrice}</span>
                </td>
                <td className="px-5 py-4 text-center text-xs text-slate-500">{item.submittedAt}</td>
                <td className="px-5 py-4 text-center">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    item.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    item.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                </td>
                <td className="px-5 py-4 text-center">
                  {item.status === 'pending' ? (
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => approve(item.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
                      <button onClick={() => reject(item.id)} className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
