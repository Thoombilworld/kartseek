'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import React, { useState } from 'react';
import { MapPin, Users, DollarSign, Store, Star, Eye, Ban, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, Phone, TrendingUp, AlertTriangle, Search, Truck, Shield, LayoutDashboard, Crown, Edit, ExternalLink, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  FRANCHISE_LIST, ALL_MODULES, PACKAGE_TIERS, PACKAGE_INFO,
  type FranchiseEntry,
} from '@/lib/data/franchise-data';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const sCfg: Record<string, { bg: string; l: string }> = {
  active:    { bg: 'bg-emerald-100 text-emerald-700', l: 'Active' },
  suspended: { bg: 'bg-amber-100 text-amber-700',    l: 'Suspended' },
  blocked:   { bg: 'bg-red-100 text-red-700',         l: 'Blocked' },
  pending:   { bg: 'bg-blue-100 text-blue-700',       l: 'Pending' },
};

export default function FranchisePage() {
  const { regionLabel } = useMarketplaceRegionFilter([]);
  const { login } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sf, setSf] = useState('All');
  const [exp, setExp] = useState<string | null>(null);
  const [data, setData] = useState<FranchiseEntry[]>(FRANCHISE_LIST);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const f = data.filter(r => {
    const ms = r.name.toLowerCase().includes(search.toLowerCase()) || r.region.toLowerCase().includes(search.toLowerCase());
    const mst = sf === 'All' || r.status === sf;
    return ms && mst;
  });

  const toggle = (id: string, to: 'blocked' | 'suspended') => {
    setData(p => p.map(r => r.id === id ? { ...r, status: r.status === to ? 'active' as const : to } : r));
    const franchise = data.find(r => r.id === id);
    if (franchise) {
      const newStatus = franchise.status === to ? 'Active' : to === 'blocked' ? 'Blocked' : 'Suspended';
      showToast(`${franchise.name} is now ${newStatus}`, newStatus === 'Active' ? 'success' : 'error');
    }
  };

  const approve = (id: string) => {
    setData(p => p.map(r => r.id === id ? { ...r, status: 'active' as const } : r));
    const franchise = data.find(r => r.id === id);
    showToast(`${franchise?.name || 'Franchise'} application approved!`, 'success');
  };

  const changePackage = (id: string, newPkg: string) => {
    setData(p => p.map(r => r.id === id ? { ...r, package: newPkg } : r));
    showToast(`Package updated to ${newPkg.toUpperCase()}`, 'info');
  };

  const toggleModule = (id: string, mod: string) => {
    setData(p => p.map(r => r.id === id ? {
      ...r, modules: r.modules.includes(mod) ? r.modules.filter(m => m !== mod) : [...r.modules, mod],
    } : r));
  };

  const handleImpersonate = (franchise: FranchiseEntry) => {
    login(
      {
        id: franchise.id,
        name: franchise.owner,
        email: franchise.email,
        role: 'FRANCHISE',
        isVerified: true,
        regionCode: 'IN',
        city: franchise.region,
      },
      'admin_impersonate_token_' + Date.now()
    );
    window.open('/franchise', '_blank');
    showToast(`Impersonating ${franchise.owner} — opened in new tab`, 'info');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
          toast.type === 'error'   ? 'bg-red-50 border-red-200 text-red-700' :
                                     'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4" />}
          {toast.type === 'info' && <Eye className="w-4 h-4" />}
          <span className="text-sm font-bold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Franchise & Package Management</h1>
          <p className="text-slate-500 text-sm">Full control over franchise partners, module allocations, territory access, and package upgrades.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-xs">
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold">{data.filter(r => r.status === 'active').length} Active</span>
            <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-bold">{data.filter(r => r.status === 'pending').length} Pending</span>
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Add Franchise
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-linear-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl shadow-md text-white"><LayoutDashboard className="w-5 h-5 opacity-80" /><p className="text-2xl font-black mt-2">{data.filter(r => r.package === 'master').length}</p><p className="text-xs font-medium opacity-80">Master Franchises</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><MapPin className="w-5 h-5 text-teal-500" /><p className="text-2xl font-black text-slate-900 mt-2">{data.length}</p><p className="text-xs text-slate-500 font-medium">Total Franchises</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><Store className="w-5 h-5 text-indigo-500" /><p className="text-2xl font-black text-slate-900 mt-2">{data.reduce((a, f) => a + f.vendors, 0)}</p><p className="text-xs text-slate-500 font-medium">Total Vendors</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><DollarSign className="w-5 h-5 text-emerald-500" /><p className="text-2xl font-black text-slate-900 mt-2">₹9.8L</p><p className="text-xs text-slate-500 font-medium">Commission MTD</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><Truck className="w-5 h-5 text-violet-500" /><p className="text-2xl font-black text-slate-900 mt-2">{data.reduce((a, f) => a + f.deliveryBoys, 0)}</p><p className="text-xs text-slate-500 font-medium">Delivery Boys</p></div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Search franchises or regions..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" /></div>
        <select value={sf} onChange={e => setSf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option><option value="pending">Pending</option></select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Franchise & Territory</th><th className="px-5 py-3.5 font-semibold">Package & Modules</th><th className="px-5 py-3.5 font-semibold text-right">Revenue</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center"></th></tr></thead>
        <tbody className="divide-y divide-slate-100">{f.map(r => (<React.Fragment key={r.id}>
          <tr className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${r.status === 'blocked' ? 'opacity-60' : ''}`} onClick={() => setExp(exp === r.id ? null : r.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExp(exp === r.id ? null : r.id))}>
            <td className="px-5 py-4"><p className="font-bold text-slate-900">{r.name}</p><p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 text-slate-400" /> {r.region} • <span className="text-slate-400">{r.id}</span></p></td>
            <td className="px-5 py-4">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                r.package === 'master' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : r.package === 'premium' ? 'bg-purple-100 text-purple-700' : r.package === 'growth' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {r.package === 'master' && <Crown className="w-3 h-3" />}{r.package}
              </span>
              <div className="flex flex-wrap gap-1 mt-1">{r.modules.slice(0, 3).map(m => <span key={m} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">{m}</span>)}{r.modules.length > 3 && <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded">+{r.modules.length - 3} more</span>}</div>
            </td>
            <td className="px-5 py-4 text-right"><p className="font-bold text-emerald-600">{r.revenue}</p><p className="text-[10px] text-slate-400 mt-0.5">Comm: {r.commission}</p></td>
            <td className="px-5 py-4 text-center"><span className={`${sCfg[r.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{sCfg[r.status].l}</span></td>
            <td className="px-5 py-4 text-center">{exp === r.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</td>
          </tr>

          {exp === r.id && (<tr className="bg-slate-50/80"><td colSpan={5} className="px-5 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-slate-400" /> Package & Module Settings</h4>
                <div className="mb-3">
                  <label className="text-xs font-semibold text-slate-500 block mb-1" htmlFor="franchise-package-tier">Franchise Package Tier</label>
                  <select id="franchise-package-tier" value={r.package} onChange={e => changePackage(r.id, e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 uppercase">
                    {PACKAGE_TIERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-2">Approved Operating Modules</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_MODULES.map(m => {
                      const isMod = r.modules.includes(m);
                      return <button key={m} onClick={() => toggleModule(r.id, m)} className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${isMod ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>{m}</button>;
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> Contact & Territory</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Owner Name</span><span className="font-bold text-slate-900">{r.owner}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Phone Contact</span><span className="font-bold text-slate-900">{r.phone}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-bold text-slate-900 text-xs">{r.email}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Region/City</span><span className="font-bold text-slate-900">{r.region}, {r.city}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Delivery Zones</span><span className="font-bold text-slate-900">{r.zones} Active Zones</span></div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-slate-400" /> Operational KPIs</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Total Vendors</span><span className="font-bold text-slate-900">{r.vendors}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Delivery Fleet</span><span className="font-bold text-slate-900">{r.deliveryBoys} Drivers</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Orders Processed</span><span className="font-bold text-slate-900">{r.orders.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Franchise Rating</span><span className="font-bold text-slate-900 flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {r.rating || 'N/A'}</span></div>
                </div>
              </div>

            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
              {r.status === 'pending' && <>
                <button onClick={() => approve(r.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"><CheckCircle className="w-3.5 h-3.5" /> Approve Application</button>
                <button className="bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold border border-red-200 flex items-center gap-1 transition-colors"><XCircle className="w-3.5 h-3.5" /> Reject Application</button>
              </>}
              {r.status !== 'pending' && r.status !== 'blocked' && (
                <button onClick={() => toggle(r.id, 'suspended')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${r.status === 'suspended' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-100 hover:bg-amber-200 text-amber-700'}`}>
                  {r.status === 'suspended' ? <><CheckCircle className="w-3.5 h-3.5" /> Unsuspend</> : <><Clock className="w-3.5 h-3.5" /> Suspend</>}
                </button>
              )}
              <button onClick={() => toggle(r.id, 'blocked')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${r.status === 'blocked' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                {r.status === 'blocked' ? <><CheckCircle className="w-3.5 h-3.5" /> Unblock</> : <><Ban className="w-3.5 h-3.5" /> Block</>}
              </button>
              <div className="border-l border-slate-200 mx-1" />
              <button onClick={() => handleImpersonate(r)} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                <Eye className="w-3.5 h-3.5" /> Impersonate Portal
              </button>
              <Link href="/franchise" target="_blank" className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> View Dashboard
              </Link>
            </div>
          </td></tr>)}
        </React.Fragment>))}</tbody></table></div></div>
    </div>
  );
}
