'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Star, MapPin, Phone, Mail, Clock, Utensils,
  CheckCircle, XCircle, Ban, Edit3, Save, ShoppingBag,
  Bike, CalendarDays, DollarSign, TrendingUp, AlertTriangle,
  Globe, Shield, FileText,
} from 'lucide-react';

const RESTAURANT = {
  id: 'RES-001', name: 'Burger King (Andheri)', slug: 'burger-king-andheri',
  cuisine: 'Fast Food, Burgers, American',
  owner: 'Sunil Patel', phone: '+91 98765 43210', email: 'sunil@bkandheri.com',
  address: '12 Link Road, Andheri West, Mumbai 400053, India',
  city: 'Mumbai', country: 'India',
  rating: 4.5, ratingCount: 3412, orders: 6100, revenue: 3100000,
  avgTime: '28 min', refundRate: '2.1%', complaints: 5,
  status: 'active' as const,
  fssai: 'Verified', fssaiNumber: 'FSSAI-10020021003214',
  gst: 'GSTIN-27AABCU9603R1ZM',
  openHours: '10:00 AM – 11:00 PM',
  minOrder: 199, costForTwo: 400, deliveryRadius: 8,
  services: ['delivery', 'takeaway', 'dine-in'],
  commission: 22,
  joinedAt: '15 Jan, 2025',
  lastActive: 'Now',
  bankName: 'HDFC Bank', bankAccount: 'XXXX-XXXX-4521',
  menuItems: 48, activeOffers: 3, activeTables: 12,
};

type TabKey = 'overview' | 'menu' | 'orders' | 'settings';

export default function AdminRestaurantDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState<TabKey>('overview');
  const [editing, setEditing] = useState(false);
  const r = RESTAURANT;

  const statusCfg: Record<string, { bg: string; label: string }> = {
    active:    { bg: 'bg-emerald-100 text-emerald-700', label: 'Active' },
    suspended: { bg: 'bg-amber-100 text-amber-700', label: 'Suspended' },
    blocked:   { bg: 'bg-red-100 text-red-700', label: 'Blocked' },
    pending:   { bg: 'bg-blue-100 text-blue-700', label: 'Pending' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/restaurant" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900">{r.name}</h1>
              <span className={`${statusCfg[r.status].bg} px-3 py-1 rounded-full text-xs font-bold`}>{statusCfg[r.status].label}</span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{r.id} • {r.cuisine} • {r.city}, {r.country}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors">
            <Clock className="w-4 h-4" /> Suspend
          </button>
          <button className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors">
            <Ban className="w-4 h-4" /> Block
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <Star className="w-4 h-4 text-amber-400 mb-2" />
          <p className="text-2xl font-black text-slate-900">{r.rating}</p>
          <p className="text-xs text-slate-500">{r.ratingCount.toLocaleString()} reviews</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <ShoppingBag className="w-4 h-4 text-blue-500 mb-2" />
          <p className="text-2xl font-black text-slate-900">{r.orders.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Total Orders</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <DollarSign className="w-4 h-4 text-emerald-500 mb-2" />
          <p className="text-2xl font-black text-slate-900">₹{(r.revenue / 100000).toFixed(1)}L</p>
          <p className="text-xs text-slate-500">Revenue</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <Clock className="w-4 h-4 text-orange-500 mb-2" />
          <p className="text-2xl font-black text-slate-900">{r.avgTime}</p>
          <p className="text-xs text-slate-500">Avg Delivery</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-red-500 mb-2" />
          <p className="text-2xl font-black text-slate-900">{r.complaints}</p>
          <p className="text-xs text-slate-500">Complaints</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {([
            { key: 'overview' as TabKey, label: 'Overview' },
            { key: 'menu' as TabKey, label: `Menu (${r.menuItems})` },
            { key: 'orders' as TabKey, label: 'Recent Orders' },
            { key: 'settings' as TabKey, label: 'Settings' },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                tab === t.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Globe className="w-4 h-4 text-orange-500" /> Restaurant Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Owner</span><span className="font-bold text-slate-900">{r.owner}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-bold text-slate-900">{r.phone}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-bold text-slate-900">{r.email}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-bold text-slate-900 text-right max-w-[200px]">{r.address}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Open Hours</span><span className="font-bold text-slate-900">{r.openHours}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Joined</span><span className="font-bold text-slate-900">{r.joinedAt}</span></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500" /> Compliance</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">FSSAI Status</span><span className="font-bold text-emerald-600">✓ {r.fssai}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">FSSAI Number</span><span className="font-bold text-slate-900">{r.fssaiNumber}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">GST</span><span className="font-bold text-slate-900">{r.gst}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Commission</span><span className="font-bold text-slate-900">{r.commission}%</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Bank</span><span className="font-bold text-slate-900">{r.bankName} • {r.bankAccount}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Refund Rate</span><span className={`font-bold ${parseFloat(r.refundRate) > 5 ? 'text-red-600' : 'text-emerald-600'}`}>{r.refundRate}</span></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Utensils className="w-4 h-4 text-blue-500" /> Service Modes</h3>
            <div className="flex flex-wrap gap-2">
              {r.services.includes('delivery') && <span className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-orange-200">🚴 Delivery</span>}
              {r.services.includes('takeaway') && <span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-purple-200">🛍️ Takeaway</span>}
              {r.services.includes('dine-in') && <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-emerald-200">🍽️ Dine-in</span>}
            </div>
            <div className="space-y-2 text-sm pt-2">
              <div className="flex justify-between"><span className="text-slate-500">Min Order</span><span className="font-bold">₹{r.minOrder}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cost for Two</span><span className="font-bold">₹{r.costForTwo}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Delivery Radius</span><span className="font-bold">{r.deliveryRadius} km</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tables</span><span className="font-bold">{r.activeTables}</span></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-500" /> Performance</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Active Offers</span><span className="font-bold">{r.activeOffers}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Menu Items</span><span className="font-bold">{r.menuItems}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Last Active</span><span className="font-bold text-emerald-600">{r.lastActive}</span></div>
            </div>
            <div className="pt-3 border-t border-slate-200">
              <Link href="/admin/restaurant/analytics" className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> View Full Analytics →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Menu */}
      {tab === 'menu' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Item</th>
                <th className="px-5 py-3 font-semibold text-center">Type</th>
                <th className="px-5 py-3 font-semibold text-right">Price</th>
                <th className="px-5 py-3 font-semibold text-center">Status</th>
                <th className="px-5 py-3 font-semibold text-center">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { name: 'Whopper', cat: 'Burgers', veg: false, price: 199, available: true, approved: true },
                { name: 'Chicken Royale', cat: 'Burgers', veg: false, price: 249, available: true, approved: true },
                { name: 'Veg Whopper', cat: 'Burgers', veg: true, price: 179, available: true, approved: true },
                { name: 'Peri Peri Fries', cat: 'Sides', veg: true, price: 129, available: false, approved: true },
                { name: 'BBQ Chicken Wings', cat: 'New', veg: false, price: 229, available: true, approved: false },
              ].map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.cat}</p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`w-4 h-4 inline-block border-2 rounded-sm ${item.veg ? 'border-green-600' : 'border-red-600'}`}>
                      <span className={`block w-2 h-2 rounded-full m-0.5 ${item.veg ? 'bg-green-600' : 'bg-red-600'}`} />
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-bold">₹{item.price}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {item.approved ? (
                      <span className="text-emerald-600 text-xs font-bold flex items-center justify-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Approved
                      </span>
                    ) : (
                      <div className="flex gap-1 justify-center">
                        <button className="bg-emerald-600 text-white px-2.5 py-1 rounded text-xs font-bold hover:bg-emerald-700">Approve</button>
                        <button className="bg-red-100 text-red-600 px-2.5 py-1 rounded text-xs font-bold hover:bg-red-200">Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Recent Orders */}
      {tab === 'orders' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Order ID</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold text-center">Type</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3 font-semibold text-center">Status</th>
                <th className="px-5 py-3 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { id: 'ORD-6121', customer: 'Priya S.', type: 'Delivery', amount: 548, status: 'DELIVERED', time: '2:25 PM' },
                { id: 'ORD-6120', customer: 'Ahmed K.', type: 'Takeaway', amount: 399, status: 'READY', time: '2:10 PM' },
                { id: 'ORD-6119', customer: 'Table 5', type: 'Dine-in', amount: 1240, status: 'PREPARING', time: '1:55 PM' },
                { id: 'ORD-6118', customer: 'Sarah M.', type: 'Delivery', amount: 678, status: 'DELIVERED', time: '1:30 PM' },
                { id: 'ORD-6117', customer: 'Raj P.', type: 'Delivery', amount: 299, status: 'CANCELLED', time: '1:15 PM' },
              ].map(o => (
                <tr key={o.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-bold text-slate-900">{o.id}</td>
                  <td className="px-5 py-3 text-slate-700">{o.customer}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      o.type === 'Delivery' ? 'bg-orange-50 text-orange-700' :
                      o.type === 'Takeaway' ? 'bg-purple-50 text-purple-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>{o.type}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-bold">₹{o.amount}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      o.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                      o.status === 'READY' ? 'bg-blue-100 text-blue-700' :
                      o.status === 'PREPARING' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{o.status}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{o.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Settings */}
      {tab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Commission Settings</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Current Rate</span><span className="font-bold text-lg">{r.commission}%</span></div>
              <input type="range" min={5} max={40} defaultValue={r.commission} className="w-full accent-orange-500" />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/admin/restaurant/analytics" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"><TrendingUp className="w-4 h-4" /> View Analytics</Link>
              <Link href="/admin/restaurant/complaints" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"><AlertTriangle className="w-4 h-4" /> View Complaints</Link>
              <Link href="/admin/restaurant/menu-approvals" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"><FileText className="w-4 h-4" /> Menu Approvals</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
