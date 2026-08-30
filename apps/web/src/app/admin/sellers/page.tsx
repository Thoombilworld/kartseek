'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { adminCoreApi } from '@/lib/api/admin-core';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Store, Search, Star, Eye, Ban, CheckCircle, Clock, XCircle, Truck, ShoppingBag,
  Phone, DollarSign, AlertTriangle, Download, X, Mail, MapPin,
  Calendar, Shield, Edit2, Package, TrendingUp, BarChart3, ExternalLink,
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type SellerStatus = 'active' | 'pending' | 'suspended' | 'blocked';
type Seller = {
  id: string; name: string; type: string; city: string; country: string; owner: string;
  email: string; phone: string; rating: number; orders: number; revenue: string;
  status: SellerStatus; complaints: number; lastActive: string; avatar: string;
  joinDate: string; products: number; cancellationRate: number; avgDeliveryTime: string;
  commission: number; kycStatus: string;
};

const MOCK_SELLERS: Seller[] = [
  { id: 'SEL-001', name: 'City Supermart', type: 'Grocery', city: 'Mumbai', country: 'India', owner: 'Arun Patel', email: 'arun@citysupermart.in', phone: '+91 98765 43210', rating: 4.8, orders: 8420, revenue: '₹42L', status: 'active', complaints: 5, lastActive: 'Now', avatar: 'CS', joinDate: 'Jan 2024', products: 2400, cancellationRate: 1.2, avgDeliveryTime: '25 min', commission: 12, kycStatus: 'Verified' },
  { id: 'SEL-002', name: 'Burger King India', type: 'Restaurant', city: 'Multi-city', country: 'India', owner: 'Corp HQ', email: 'ops@bkindia.com', phone: '+91 98765 43211', rating: 4.5, orders: 6100, revenue: '₹31L', status: 'active', complaints: 8, lastActive: '5 min ago', avatar: 'BK', joinDate: 'Mar 2024', products: 85, cancellationRate: 2.8, avgDeliveryTime: '35 min', commission: 18, kycStatus: 'Verified' },
  { id: 'SEL-003', name: 'MedPlus Pharmacy', type: 'Pharmacy', city: 'Hyderabad', country: 'India', owner: 'Dr. Ravi K.', email: 'ravi@medplus.in', phone: '+91 98765 43212', rating: 4.6, orders: 3800, revenue: '₹18L', status: 'active', complaints: 4, lastActive: '10 min ago', avatar: 'MP', joinDate: 'Jun 2024', products: 5200, cancellationRate: 0.8, avgDeliveryTime: '40 min', commission: 10, kycStatus: 'Verified' },
  { id: 'SEL-004', name: 'Apple India Store', type: 'Marketplace', city: 'Pan-India', country: 'India', owner: 'Apple Inc.', email: 'seller@apple.in', phone: '+91 98765 43213', rating: 4.9, orders: 4200, revenue: '₹8.2Cr', status: 'active', complaints: 2, lastActive: 'Now', avatar: 'AI', joinDate: 'Nov 2023', products: 420, cancellationRate: 0.3, avgDeliveryTime: '2 days', commission: 8, kycStatus: 'Verified' },
  { id: 'SEL-005', name: 'FreshMart Organics', type: 'Grocery', city: 'Pune', country: 'India', owner: 'Meera Deshpande', email: 'meera@freshmart.in', phone: '+91 98765 43214', rating: 0, orders: 0, revenue: '₹0', status: 'pending', complaints: 0, lastActive: 'New', avatar: 'FM', joinDate: 'Jun 2026', products: 890, cancellationRate: 0, avgDeliveryTime: 'N/A', commission: 12, kycStatus: 'Pending' },
  { id: 'SEL-006', name: 'QuickRide Cabs', type: 'Taxi', city: 'Bangalore', country: 'India', owner: 'Suresh R.', email: 'suresh@quickride.in', phone: '+91 98765 43215', rating: 4.1, orders: 5200, revenue: '₹8.2L', status: 'active', complaints: 12, lastActive: '15 min ago', avatar: 'QR', joinDate: 'Feb 2024', products: 0, cancellationRate: 4.5, avgDeliveryTime: '12 min', commission: 22, kycStatus: 'Verified' },
  { id: 'SEL-007', name: 'HealthFirst Pharma', type: 'Pharmacy', city: 'Delhi', country: 'India', owner: 'Amit Gupta', email: 'amit@healthfirst.in', phone: '+91 98765 43216', rating: 3.9, orders: 950, revenue: '₹4.2L', status: 'suspended', complaints: 18, lastActive: '5 days ago', avatar: 'HF', joinDate: 'Aug 2024', products: 1200, cancellationRate: 8.2, avgDeliveryTime: '1 hr', commission: 10, kycStatus: 'Expired' },
  { id: 'SEL-008', name: 'FakeGoods Store', type: 'Marketplace', city: 'Delhi', country: 'India', owner: 'Unknown', email: 'unknown@fake.com', phone: '+91 98765 43217', rating: 1.8, orders: 45, revenue: '₹42K', status: 'blocked', complaints: 38, lastActive: 'Blocked', avatar: 'FG', joinDate: 'May 2025', products: 12, cancellationRate: 45.0, avgDeliveryTime: 'N/A', commission: 15, kycStatus: 'Rejected' },
  { id: 'SEL-009', name: 'Gulf Electronics', type: 'Marketplace', city: 'Dubai', country: 'UAE', owner: 'Khalid M.', email: 'khalid@gulfelectro.ae', phone: '+971 50 987 6543', rating: 4.7, orders: 2100, revenue: 'AED 4.8M', status: 'active', complaints: 1, lastActive: '20 min ago', avatar: 'GE', joinDate: 'Apr 2024', products: 680, cancellationRate: 0.9, avgDeliveryTime: '1 day', commission: 10, kycStatus: 'Verified' },
  { id: 'SEL-010', name: 'London Fashion Hub', type: 'Marketplace', city: 'London', country: 'UK', owner: 'Emma W.', email: 'emma@lfhub.co.uk', phone: '+44 7700 900456', rating: 4.4, orders: 1800, revenue: '£2.1M', status: 'active', complaints: 3, lastActive: '1 hr ago', avatar: 'LF', joinDate: 'Jul 2024', products: 1450, cancellationRate: 2.1, avgDeliveryTime: '3 days', commission: 12, kycStatus: 'Verified' },
];

const typeC: Record<string, string> = { Marketplace: 'bg-blue-100 text-blue-700', Grocery: 'bg-green-100 text-green-700', Restaurant: 'bg-orange-100 text-orange-700', Pharmacy: 'bg-cyan-100 text-cyan-700', Taxi: 'bg-amber-100 text-amber-700' };
const statusC: Record<string, string> = { active: 'bg-emerald-100 text-emerald-700', pending: 'bg-blue-100 text-blue-700', suspended: 'bg-amber-100 text-amber-700', blocked: 'bg-red-100 text-red-700' };
const kycC: Record<string, string> = { Verified: 'text-emerald-600', Pending: 'text-blue-600', Expired: 'text-amber-600', Rejected: 'text-red-600' };

// ── Seller Detail Drawer ─────────────────────────────────────────────────

function SellerDrawer({ seller, onClose, onApprove, onToggle }: {
  seller: Seller; onClose: () => void; onApprove: () => void; onToggle: (status: SellerStatus) => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Seller Profile</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">{seller.avatar}</div>
            <h4 className="text-lg font-bold text-slate-900">{seller.name}</h4>
            <p className="text-sm text-slate-500">{seller.id} · {seller.city}, {seller.country}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`${typeC[seller.type] || 'bg-slate-100 text-slate-600'} px-2.5 py-1 rounded-md text-xs font-bold`}>{seller.type}</span>
              <span className={`${statusC[seller.status]} px-2.5 py-1 rounded-full text-xs font-bold capitalize`}>{seller.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Revenue', value: seller.revenue, icon: DollarSign },
              { label: 'Orders', value: seller.orders.toLocaleString(), icon: Package },
              { label: 'Products', value: seller.products.toLocaleString(), icon: ShoppingBag },
              { label: 'Commission', value: `${seller.commission}%`, icon: BarChart3 },
            ].map(stat => (
              <div key={stat.label} className="bg-slate-50 rounded-xl p-3">
                <stat.icon className="w-4 h-4 text-slate-400 mb-1" />
                <p className="text-lg font-black text-slate-900">{stat.value}</p>
                <p className="text-[10px] text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-slate-400" /><span className="text-slate-700">{seller.email}</span></div>
            <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-slate-400" /><span className="text-slate-700">{seller.phone}</span></div>
            <div className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4 text-slate-400" /><span className="text-slate-700">{seller.city}, {seller.country}</span></div>
            <div className="flex items-center gap-3 text-sm"><Calendar className="w-4 h-4 text-slate-400" /><span className="text-slate-700">Joined {seller.joinDate}</span></div>
            <div className="flex items-center gap-3 text-sm"><Shield className="w-4 h-4 text-slate-400" /><span className={`font-bold text-xs ${kycC[seller.kycStatus] || ''}`}>KYC: {seller.kycStatus}</span></div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase">Performance</p>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Rating</span><span className="font-bold">{seller.rating > 0 ? <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{seller.rating}</span> : 'N/A'}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Cancellation Rate</span><span className={`font-bold ${seller.cancellationRate > 5 ? 'text-red-600' : seller.cancellationRate > 3 ? 'text-amber-600' : 'text-emerald-600'}`}>{seller.cancellationRate}%</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Avg Delivery</span><span className="font-bold text-slate-900">{seller.avgDeliveryTime}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Complaints</span><span className={`font-bold ${seller.complaints > 10 ? 'text-red-600' : 'text-slate-900'}`}>{seller.complaints}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Owner</span><span className="font-bold text-slate-900">{seller.owner}</span></div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase">Quick Actions</p>
            <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors text-slate-700 flex items-center gap-2"><ExternalLink className="w-4 h-4 text-slate-400" /> View Seller Portal</button>
            <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors text-slate-700 flex items-center gap-2"><Package className="w-4 h-4 text-slate-400" /> View Orders</button>
            <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors text-slate-700 flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> Send Notice</button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2">
          {seller.status === 'pending' && (
            <button onClick={onApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
          )}
          {seller.status !== 'blocked' && seller.status !== 'pending' && (
            <button onClick={() => onToggle('suspended')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 ${seller.status === 'suspended' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
              {seller.status === 'suspended' ? <><CheckCircle className="w-3.5 h-3.5" /> Unsuspend</> : <><Clock className="w-3.5 h-3.5" /> Suspend</>}
            </button>
          )}
          <button onClick={() => onToggle('blocked')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 ${seller.status === 'blocked' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
            {seller.status === 'blocked' ? <><CheckCircle className="w-3.5 h-3.5" /> Unblock</> : <><Ban className="w-3.5 h-3.5" /> Block</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function SellersPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [search, setSearch] = useState('');
  const [sf, setSf] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [data, setData] = useState<Seller[]>(MOCK_SELLERS);
  const [viewSeller, setViewSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);

  const adminId = typeof window !== 'undefined' ? localStorage.getItem('adminUserId') || 'admin' : 'admin';

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    const res = await adminCoreApi.getSellers({ status: sf !== 'All' ? sf : undefined });
    if (res.success && Array.isArray((res.data as any)?.data ?? res.data)) {
      const sellers = ((res.data as any)?.data ?? res.data) as Seller[];
      if (sellers.length > 0) setData(sellers);
    }
    setLoading(false);
  }, [sf]);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  const f = data.filter(s => {
    const ms = s.name.toLowerCase().includes(search.toLowerCase()) || s.type.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    const mst = sf === 'All' || s.status === sf;
    const mm = moduleFilter === 'All' || s.type === moduleFilter;
    return ms && mst && mm;
  });

  const toggle = async (id: string, to: SellerStatus) => {
    const seller = data.find(s => s.id === id);
    if (!seller) return;
    const newStatus = seller.status === to ? 'active' : to;

    // Optimistic UI update
    setData(p => p.map(s => s.id === id ? { ...s, status: newStatus as SellerStatus } : s));

    // Call backend
    if (to === 'blocked') {
      if (newStatus === 'blocked') {
        await adminCoreApi.blockSeller(id, 'Blocked by admin', adminId);
      } else {
        await adminCoreApi.unblockSeller(id, adminId);
      }
    } else if (to === 'suspended') {
      if (newStatus === 'suspended') {
        await adminCoreApi.suspendSeller(id, 'Suspended by admin', adminId);
      } else {
        await adminCoreApi.reactivateSeller(id, adminId);
      }
    }

    await adminCoreApi.addAuditLog({ action: `seller.${newStatus}`, adminId, entityType: 'seller', entityId: id });
  };

  const approve = async (id: string) => {
    setData(p => p.map(s => s.id === id ? { ...s, status: 'active' as const, kycStatus: 'Verified' } : s));
    await adminCoreApi.approveSeller(id, adminId);
    await adminCoreApi.addAuditLog({ action: 'seller.approved', adminId, entityType: 'seller', entityId: id });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sellers & Partners</h1>
          <p className="text-slate-500 text-sm">Unified view of all vendors across modules. Approve, suspend, block any partner.</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><Store className="w-5 h-5 text-blue-500" /><p className="text-2xl font-black text-slate-900 mt-2">3,240</p><p className="text-xs text-slate-500 font-medium">Total Sellers</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><Truck className="w-5 h-5 text-purple-500" /><p className="text-2xl font-black text-slate-900 mt-2">1,850</p><p className="text-xs text-slate-500 font-medium">Delivery Partners</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><ShoppingBag className="w-5 h-5 text-emerald-500" /><p className="text-2xl font-black text-slate-900 mt-2">₹18.2M</p><p className="text-xs text-slate-500 font-medium">GMV (MTD)</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><AlertTriangle className="w-5 h-5 text-red-500" /><p className="text-2xl font-black text-slate-900 mt-2">{data.filter(s => s.complaints > 10).length}</p><p className="text-xs text-slate-500 font-medium">Flagged</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Search sellers by name, type, or ID..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" /></div>
        <select value={sf} onChange={e => setSf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" aria-label="Filter by status"><option value="All">All Status</option><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option></select>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" aria-label="Filter by module"><option value="All">All Modules</option><option value="Marketplace">Marketplace</option><option value="Grocery">Grocery</option><option value="Restaurant">Restaurant</option><option value="Pharmacy">Pharmacy</option><option value="Taxi">Taxi</option></select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Seller</th>
                <th className="px-4 py-3.5 font-semibold">Module</th>
                <th className="px-4 py-3.5 font-semibold text-center">Rating</th>
                <th className="px-4 py-3.5 font-semibold text-right">Orders</th>
                <th className="px-4 py-3.5 font-semibold text-right">Revenue</th>
                <th className="px-4 py-3.5 font-semibold text-center">KYC</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-4 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {f.map(s => (
                <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${s.status === 'blocked' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">{s.avatar}</div>
                      <div><p className="font-bold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.id} · {s.city}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><span className={`${typeC[s.type] || 'bg-slate-100 text-slate-600'} px-2.5 py-1 rounded-md text-xs font-bold`}>{s.type}</span></td>
                  <td className="px-4 py-3.5 text-center">{s.rating > 0 ? <span className="inline-flex items-center gap-0.5"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="font-bold">{s.rating}</span></span> : <span className="text-slate-400 text-xs">N/A</span>}</td>
                  <td className="px-4 py-3.5 text-right font-bold">{s.orders.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right font-bold">{s.revenue}</td>
                  <td className="px-4 py-3.5 text-center"><span className={`text-xs font-bold ${kycC[s.kycStatus] || ''}`}>{s.kycStatus}</span></td>
                  <td className="px-4 py-3.5 text-center"><span className={`${statusC[s.status]} px-2.5 py-1 rounded-full text-xs font-bold capitalize`}>{s.status}</span></td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setViewSeller(s)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="View Details"><Eye className="w-4 h-4 text-slate-400" /></button>
                      {s.status === 'pending' && <button onClick={() => approve(s.id)} className="p-1.5 hover:bg-emerald-50 rounded-lg" title="Approve"><CheckCircle className="w-4 h-4 text-emerald-500" /></button>}
                      {s.status !== 'pending' && <button onClick={() => toggle(s.id, 'blocked')} className="p-1.5 hover:bg-slate-100 rounded-lg" title={s.status === 'blocked' ? 'Unblock' : 'Block'}>{s.status === 'blocked' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Ban className="w-4 h-4 text-red-400" />}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">Showing {f.length} of {data.length} sellers</div>
      </div>

      {viewSeller && (
        <SellerDrawer
          seller={viewSeller}
          onClose={() => setViewSeller(null)}
          onApprove={() => { approve(viewSeller.id); setViewSeller(null); }}
          onToggle={(status) => { toggle(viewSeller.id, status); setViewSeller(null); }}
        />
      )}
    </div>
  );
}
