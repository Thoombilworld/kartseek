'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState } from 'react';
import {
  Users, Search, MapPin, Star, ShoppingBag, Eye, Ban, CheckCircle, TrendingUp,
  ChevronDown, ChevronUp, Phone, Mail, Clock, Download, X, Edit2,
  CreditCard, MessageSquare, Shield, Calendar, Package, Heart,
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type Customer = {
  id: string; name: string; email: string; phone: string; city: string; country: string;
  joinDate: string; orders: number; spent: string; spentNum: number; status: 'active' | 'inactive' | 'blocked';
  tier: string; lastOrder: string; complaints: number; avatar: string;
  addresses: number; wishlistItems: number; savedCards: number; avgRating: number;
};

const init: Customer[] = [
  { id: 'CUS-001', name: 'Rahul Kapoor', email: 'rahul.k@gmail.com', phone: '+91 98765 43210', city: 'Mumbai', country: 'India', joinDate: 'Jan 2025', orders: 48, spent: '₹24,500', spentNum: 24500, status: 'active', tier: 'Gold', lastOrder: '2 hr ago', complaints: 0, avatar: 'RK', addresses: 3, wishlistItems: 12, savedCards: 2, avgRating: 4.8 },
  { id: 'CUS-002', name: 'Priya Sharma', email: 'priya.s@gmail.com', phone: '+91 98765 43211', city: 'Delhi', country: 'India', joinDate: 'Feb 2025', orders: 120, spent: '₹68,200', spentNum: 68200, status: 'active', tier: 'Platinum', lastOrder: '30 min ago', complaints: 1, avatar: 'PS', addresses: 5, wishlistItems: 28, savedCards: 3, avgRating: 4.5 },
  { id: 'CUS-003', name: 'Anil Mehta', email: 'anil.m@yahoo.com', phone: '+91 98765 43212', city: 'Bangalore', country: 'India', joinDate: 'Mar 2025', orders: 15, spent: '₹7,800', spentNum: 7800, status: 'active', tier: 'Silver', lastOrder: '1 day ago', complaints: 0, avatar: 'AM', addresses: 2, wishlistItems: 5, savedCards: 1, avgRating: 4.9 },
  { id: 'CUS-004', name: 'Sneha Reddy', email: 'sneha.r@outlook.com', phone: '+91 98765 43213', city: 'Hyderabad', country: 'India', joinDate: 'Dec 2024', orders: 92, spent: '₹45,100', spentNum: 45100, status: 'active', tier: 'Gold', lastOrder: '5 hr ago', complaints: 2, avatar: 'SR', addresses: 4, wishlistItems: 18, savedCards: 2, avgRating: 4.3 },
  { id: 'CUS-005', name: 'Vikram Tiwari', email: 'vikram.t@gmail.com', phone: '+91 98765 43214', city: 'Pune', country: 'India', joinDate: 'Apr 2025', orders: 5, spent: '₹2,100', spentNum: 2100, status: 'inactive', tier: 'Bronze', lastOrder: '30 days ago', complaints: 0, avatar: 'VT', addresses: 1, wishlistItems: 2, savedCards: 0, avgRating: 0 },
  { id: 'CUS-006', name: 'Deepa Nair', email: 'deepa.n@gmail.com', phone: '+91 98765 43215', city: 'Chennai', country: 'India', joinDate: 'Jan 2025', orders: 67, spent: '₹35,600', spentNum: 35600, status: 'active', tier: 'Gold', lastOrder: '1 hr ago', complaints: 1, avatar: 'DN', addresses: 3, wishlistItems: 15, savedCards: 2, avgRating: 4.6 },
  { id: 'CUS-007', name: 'Rajesh Kumar', email: 'rajesh.k@gmail.com', phone: '+91 98765 43216', city: 'Mumbai', country: 'India', joinDate: 'May 2025', orders: 2, spent: '₹890', spentNum: 890, status: 'blocked', tier: 'Bronze', lastOrder: 'Blocked', complaints: 15, avatar: 'RK', addresses: 1, wishlistItems: 0, savedCards: 0, avgRating: 1.2 },
  { id: 'CUS-008', name: 'Meera Patel', email: 'meera.p@gmail.com', phone: '+91 98765 43217', city: 'Ahmedabad', country: 'India', joinDate: 'Nov 2024', orders: 156, spent: '₹92,400', spentNum: 92400, status: 'active', tier: 'Platinum', lastOrder: '10 min ago', complaints: 0, avatar: 'MP', addresses: 6, wishlistItems: 42, savedCards: 4, avgRating: 4.9 },
  { id: 'CUS-009', name: 'Ahmed Al-Rashid', email: 'ahmed.r@gmail.com', phone: '+971 50 123 4567', city: 'Dubai', country: 'UAE', joinDate: 'Jun 2025', orders: 34, spent: 'AED 12,400', spentNum: 12400, status: 'active', tier: 'Silver', lastOrder: '3 hr ago', complaints: 0, avatar: 'AR', addresses: 2, wishlistItems: 8, savedCards: 2, avgRating: 4.7 },
  { id: 'CUS-010', name: 'Sarah Thompson', email: 'sarah.t@gmail.com', phone: '+44 7911 123456', city: 'London', country: 'UK', joinDate: 'Mar 2025', orders: 22, spent: '£4,890', spentNum: 4890, status: 'active', tier: 'Silver', lastOrder: '6 hr ago', complaints: 0, avatar: 'ST', addresses: 2, wishlistItems: 11, savedCards: 1, avgRating: 4.4 },
];

const tierC: Record<string, string> = { Bronze: 'bg-orange-100 text-orange-700', Silver: 'bg-slate-100 text-slate-700', Gold: 'bg-amber-100 text-amber-700', Platinum: 'bg-purple-100 text-purple-700' };
const statusC: Record<string, string> = { active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-slate-100 text-slate-600', blocked: 'bg-red-100 text-red-700' };

// ── Customer Detail Drawer ──────────────────────────────────────────────────

const sampleOrders = [
  { id: 'KS-MK-001', module: 'Marketplace', item: 'Samsung Galaxy S24', amount: '₹72,999', date: 'Jul 9, 2026', status: 'delivered' },
  { id: 'KS-GR-042', module: 'Grocery', item: '12 items from Fresh Mart', amount: '₹1,890', date: 'Jul 8, 2026', status: 'delivered' },
  { id: 'KS-RS-018', module: 'Restaurant', item: 'Tandoori Platter × 2', amount: '₹1,240', date: 'Jul 7, 2026', status: 'delivered' },
  { id: 'KS-PH-005', module: 'Pharmacy', item: 'Prescription #RX-2026', amount: '₹450', date: 'Jul 6, 2026', status: 'processing' },
  { id: 'KS-TX-112', module: 'Taxi', item: 'Airport → Home', amount: '₹850', date: 'Jul 5, 2026', status: 'completed' },
  { id: 'KS-HT-003', module: 'Hotel', item: 'Taj Palace — 2 nights', amount: '₹18,500', date: 'Jul 3, 2026', status: 'checked_out' },
];

const moduleColors: Record<string, string> = {
  Marketplace: 'bg-blue-100 text-blue-700', Grocery: 'bg-green-100 text-green-700',
  Restaurant: 'bg-orange-100 text-orange-700', Pharmacy: 'bg-purple-100 text-purple-700',
  Taxi: 'bg-yellow-100 text-yellow-700', Hotel: 'bg-indigo-100 text-indigo-700',
};
const orderStatusColors: Record<string, string> = {
  delivered: 'text-emerald-600', processing: 'text-amber-600', completed: 'text-emerald-600',
  checked_out: 'text-blue-600', cancelled: 'text-red-600', refunded: 'text-violet-600',
};

function CustomerDrawer({ customer, onClose, onToggleBlock }: {
  customer: Customer; onClose: () => void; onToggleBlock: () => void;
}) {
  const [tab, setTab] = React.useState<'profile' | 'orders' | 'wallet' | 'disputes'>('profile');
  const sc = statusC[customer.status];
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Customer Profile</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {/* Customer Header */}
        <div className="px-5 pt-4 pb-2 text-center border-b border-slate-100">
          <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto mb-2">{customer.avatar}</div>
          <h4 className="text-lg font-bold text-slate-900">{customer.name}</h4>
          <p className="text-xs text-slate-500">{customer.id} · {customer.city}, {customer.country}</p>
          <div className="flex items-center justify-center gap-2 mt-2 mb-3">
            <span className={`${tierC[customer.tier]} px-2.5 py-1 rounded-md text-xs font-bold`}>{customer.tier}</span>
            <span className={`${sc} px-2.5 py-1 rounded-full text-xs font-bold capitalize`}>{customer.status}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {(['profile', 'orders', 'wallet', 'disputes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-bold capitalize transition-colors ${tab === t ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'orders' ? 'Orders (All)' : t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'profile' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Orders', value: customer.orders.toString(), icon: Package },
                  { label: 'Total Spent', value: customer.spent, icon: CreditCard },
                  { label: 'Avg Rating Given', value: customer.avgRating > 0 ? customer.avgRating.toString() : 'N/A', icon: Star },
                  { label: 'Complaints', value: customer.complaints.toString(), icon: MessageSquare },
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-50 rounded-xl p-3">
                    <stat.icon className="w-4 h-4 text-slate-400 mb-1" />
                    <p className="text-lg font-black text-slate-900">{stat.value}</p>
                    <p className="text-[10px] text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-slate-400" /><span className="text-slate-700">{customer.email}</span></div>
                <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-slate-400" /><span className="text-slate-700">{customer.phone}</span></div>
                <div className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4 text-slate-400" /><span className="text-slate-700">{customer.city}, {customer.country}</span></div>
                <div className="flex items-center gap-3 text-sm"><Calendar className="w-4 h-4 text-slate-400" /><span className="text-slate-700">Joined {customer.joinDate}</span></div>
                <div className="flex items-center gap-3 text-sm"><Clock className="w-4 h-4 text-slate-400" /><span className="text-slate-700">Last order {customer.lastOrder}</span></div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Account Details</p>
                <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Saved Addresses</span><span className="font-bold text-slate-900">{customer.addresses}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Wishlist Items</span><span className="font-bold text-slate-900">{customer.wishlistItems}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Saved Payment Methods</span><span className="font-bold text-slate-900">{customer.savedCards}</span></div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Quick Actions</p>
                <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors text-slate-700 flex items-center gap-2"><Package className="w-4 h-4 text-slate-400" /> View Order History</button>
                <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors text-slate-700 flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> Send Notification</button>
                <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors text-slate-700 flex items-center gap-2"><Shield className="w-4 h-4 text-slate-400" /> Reset Password</button>
              </div>
            </>
          )}

          {tab === 'orders' && (
            <>
              <p className="text-xs font-semibold text-slate-500">Cross-module order history — all orders across Marketplace, Grocery, Restaurant, Pharmacy, Taxi, and Hotel.</p>
              <div className="space-y-2">
                {sampleOrders.map(o => (
                  <div key={o.id} className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${moduleColors[o.module]}`}>{o.module}</span>
                        <span className="text-[10px] text-slate-400">{o.id}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 truncate">{o.item}</p>
                      <p className="text-xs text-slate-400">{o.date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{o.amount}</p>
                      <p className={`text-[10px] font-bold capitalize ${orderStatusColors[o.status] || 'text-slate-500'}`}>{o.status.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center">Showing 6 most recent · <span className="text-blue-500 cursor-pointer hover:underline">View all {customer.orders} orders</span></p>
            </>
          )}

          {tab === 'wallet' && (
            <>
              <div className="bg-linear-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
                <p className="text-xs opacity-80 font-medium">Wallet Balance</p>
                <p className="text-3xl font-black mt-1">₹2,450.00</p>
                <div className="flex items-center gap-4 mt-4 text-xs opacity-80">
                  <span>Last top-up: ₹500 on Jul 5</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-4 h-4 text-amber-500" />
                  <p className="text-sm font-bold text-amber-800">Loyalty Points</p>
                </div>
                <p className="text-2xl font-black text-amber-900">{(customer.orders * 12).toLocaleString()} pts</p>
                <p className="text-xs text-amber-600 mt-1">Worth ₹{(customer.orders * 12 * 0.1).toFixed(0)} in wallet credit</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Recent Transactions</p>
                {[
                  { type: 'credit', desc: 'Order Refund #KS-MK-042', amount: '+₹1,200', date: 'Jul 8' },
                  { type: 'debit', desc: 'Grocery Order Payment', amount: '-₹890', date: 'Jul 7' },
                  { type: 'credit', desc: 'Wallet Top-Up', amount: '+₹500', date: 'Jul 5' },
                  { type: 'credit', desc: 'Cashback — Restaurant', amount: '+₹120', date: 'Jul 4' },
                  { type: 'debit', desc: 'Taxi Ride Payment', amount: '-₹340', date: 'Jul 3' },
                ].map((tx, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm text-slate-700">{tx.desc}</p>
                      <p className="text-xs text-slate-400">{tx.date}</p>
                    </div>
                    <span className={`text-sm font-bold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>{tx.amount}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700">Add Credit</button>
                <button className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-200">Freeze Wallet</button>
              </div>
            </>
          )}

          {tab === 'disputes' && (
            <>
              {customer.complaints === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">No disputes</p>
                  <p className="text-xs text-slate-400">This customer has a clean record</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { id: 'DSP-001', type: 'Product Quality', order: 'KS-MK-019', status: 'resolved', date: 'Jun 28', resolution: 'Full refund issued' },
                    { id: 'DSP-002', type: 'Late Delivery', order: 'KS-GR-031', status: 'open', date: 'Jul 2', resolution: 'Under investigation' },
                  ].slice(0, customer.complaints).map(d => (
                    <div key={d.id} className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-600">{d.id}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${d.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{d.type}</p>
                      <p className="text-xs text-slate-500">Order: {d.order} · {d.date}</p>
                      <p className="text-xs text-slate-400 mt-1">Resolution: {d.resolution}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2">
          <button onClick={onToggleBlock} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 ${customer.status === 'blocked' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`} aria-label="Action">{customer.status === 'blocked' ? <><CheckCircle className="w-3.5 h-3.5" /> Unblock</> : <><Ban className="w-3.5 h-3.5" /> Block Account</>}</button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [search, setSearch] = useState('');
  const [sf, setSf] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [data, setData] = useState(init);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  const f = data.filter(c => {
    const ms = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const mst = sf === 'All' || c.status === sf;
    const mt = tierFilter === 'All' || c.tier === tierFilter;
    return ms && mst && mt;
  });

  const toggleBlock = (id: string) => setData(p => p.map(c => c.id === id ? { ...c, status: c.status === 'blocked' ? 'active' as const : 'blocked' as const } : c));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm">View activity, manage tiers, block/unblock customer accounts across all regions.</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><Users className="w-5 h-5 text-blue-500" /><p className="text-2xl font-black text-slate-900 mt-2">124,500</p><p className="text-xs text-slate-500 font-medium">Total Customers</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><TrendingUp className="w-5 h-5 text-emerald-500" /><p className="text-2xl font-black text-slate-900 mt-2">18,200</p><p className="text-xs text-slate-500 font-medium">Active Today</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><ShoppingBag className="w-5 h-5 text-indigo-500" /><p className="text-2xl font-black text-slate-900 mt-2">₹4.2M</p><p className="text-xs text-slate-500 font-medium">Revenue (MTD)</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><Star className="w-5 h-5 text-amber-500" /><p className="text-2xl font-black text-slate-900 mt-2">4.6</p><p className="text-xs text-slate-500 font-medium">Avg Satisfaction</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Search by name, email, or ID..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" /></div>
        <select value={sf} onChange={e => setSf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" aria-label="Filter by status"><option value="All">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="blocked">Blocked</option></select>
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" aria-label="Filter by tier"><option value="All">All Tiers</option><option value="Platinum">Platinum</option><option value="Gold">Gold</option><option value="Silver">Silver</option><option value="Bronze">Bronze</option></select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Customer</th>
                <th className="px-4 py-3.5 font-semibold">Location</th>
                <th className="px-4 py-3.5 font-semibold text-center">Tier</th>
                <th className="px-4 py-3.5 font-semibold text-right">Orders</th>
                <th className="px-4 py-3.5 font-semibold text-right">Spent</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-4 py-3.5 font-semibold">Last Order</th>
                <th className="px-4 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {f.map(c => (
                <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${c.status === 'blocked' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">{c.avatar}</div>
                      <div><p className="font-bold text-slate-900">{c.name}</p><p className="text-xs text-slate-400">{c.email} · {c.id}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs"><span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}, {c.country}</span></td>
                  <td className="px-4 py-3.5 text-center"><span className={`${tierC[c.tier]} px-2.5 py-1 rounded-md text-xs font-bold`}>{c.tier}</span></td>
                  <td className="px-4 py-3.5 text-right font-bold">{c.orders}</td>
                  <td className="px-4 py-3.5 text-right font-bold">{c.spent}</td>
                  <td className="px-4 py-3.5 text-center"><span className={`${statusC[c.status]} px-2.5 py-1 rounded-full text-xs font-bold capitalize`}>{c.status}</span></td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{c.lastOrder}</td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setViewCustomer(c)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="View Details"><Eye className="w-4 h-4 text-slate-400" /></button>
                      <button onClick={() => toggleBlock(c.id)} className="p-1.5 hover:bg-slate-100 rounded-lg" title={c.status === 'blocked' ? 'Unblock' : 'Block'}>
                        {c.status === 'blocked' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Ban className="w-4 h-4 text-red-400" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">Showing {f.length} of {data.length} customers</div>
      </div>

      {viewCustomer && (
        <CustomerDrawer
          customer={viewCustomer}
          onClose={() => setViewCustomer(null)}
          onToggleBlock={() => { toggleBlock(viewCustomer.id); setViewCustomer(null); }}
        />
      )}
    </div>
  );
}
