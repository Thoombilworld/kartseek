'use client';
import { useRestaurantRegionFilter } from '@/hooks/useRestaurantRegionFilter';
import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Search, Star, CheckCircle, XCircle, Eye, Phone, MapPin, Clock, FileCheck, AlertCircle, ChevronDown, ChevronUp, Wifi, WifiOff } from 'lucide-react';
import { adminRestaurantApi } from '@/lib/api/admin-restaurant';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type Status = 'pending' | 'approved' | 'rejected';
type App = {
  id: string; name: string; owner: string; phone: string; city: string; cuisine: string;
  fssai: string; submitted: string; status: Status; kyc: 'complete' | 'partial' | 'missing';
  seatingCapacity: number; services: string[]; note: string;
};

const APPS: App[] = [
  { id: 'AP-001', name: 'Thai Orchid', owner: 'Somsak P.', phone: '+91 98765 43216', city: 'Bangalore', cuisine: 'Thai', fssai: 'FSS-2024-BLR-7821', submitted: '2 hrs ago', status: 'pending', kyc: 'complete', seatingCapacity: 60, services: ['Delivery', 'Takeaway', 'Dine-in', 'Table Booking'], note: 'All documents verified. FSSAI valid until Dec 2026.' },
  { id: 'AP-002', name: 'Spice Garden', owner: 'Priya M.', phone: '+91 87654 98765', city: 'Mumbai', cuisine: 'South Indian', fssai: 'FSS-2024-MUM-4412', submitted: '5 hrs ago', status: 'pending', kyc: 'partial', seatingCapacity: 40, services: ['Delivery', 'Takeaway'], note: 'GST certificate pending. Owner notified.' },
  { id: 'AP-003', name: 'Dragon Palace', owner: 'Chen W.', phone: '+91 76543 21098', city: 'Delhi', cuisine: 'Chinese', fssai: 'FSS-2024-DEL-9001', submitted: '1 day ago', status: 'pending', kyc: 'missing', seatingCapacity: 80, services: ['Delivery', 'Dine-in', 'Table Booking'], note: 'FSSAI certificate missing. Follow-up required.' },
  { id: 'AP-004', name: 'Kebab Corner', owner: 'Arfan K.', phone: '+91 98765 11234', city: 'Hyderabad', cuisine: 'Arabic / Mughlai', fssai: 'FSS-2024-HYD-3344', submitted: '2 days ago', status: 'approved', kyc: 'complete', seatingCapacity: 0, services: ['Delivery', 'Takeaway'], note: 'Approved on 29 May 2026.' },
  { id: 'AP-005', name: 'The Italian House', owner: 'Marco B.', phone: '+91 88765 55432', city: 'Goa', cuisine: 'Italian', fssai: 'FSS-2024-GOA-1120', submitted: '3 days ago', status: 'rejected', kyc: 'partial', seatingCapacity: 30, services: ['Delivery', 'Dine-in'], note: 'FSSAI expired. Rejected on 28 May 2026.' },
];

const STATUS_CFG: Record<Status, { bg: string; label: string; dot: string }> = {
  pending: { bg: 'bg-amber-100 text-amber-700', label: 'Pending', dot: 'bg-amber-500' },
  approved: { bg: 'bg-emerald-100 text-emerald-700', label: 'Approved', dot: 'bg-emerald-500' },
  rejected: { bg: 'bg-red-100 text-red-700', label: 'Rejected', dot: 'bg-red-500' },
};

const KYC_CFG: Record<string, string> = {
  complete: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  missing: 'bg-red-100 text-red-700',
};

export default function RestaurantApprovalsPage() {
  const { regionLabel, isFiltered, formatPrice } = useRestaurantRegionFilter([]);
  const [apps, setApps] = useState(APPS);
  const [source, setSource] = useState<'api' | 'demo'>('demo');
  const [search, setSearch] = useState('');
  const [sf, setSf] = useState<'all' | Status>('all');
  const [exp, setExp] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminRestaurantApi.getRestaurants({ status: 'pending', limit: 50 });
        if (res.success && Array.isArray((res.data as any)?.data) && (res.data as any).data.length > 0) {
          setApps((res.data as any).data);
          setSource('api');
        }
      } catch { /* keep demo */ }
    })();
  }, []);

  const filtered = apps.filter(a => {
    const ms = a.name.toLowerCase().includes(search.toLowerCase()) || a.owner.toLowerCase().includes(search.toLowerCase());
    const mst = sf === 'all' || a.status === sf;
    return ms && mst;
  });

  const approve = (id: string) => setApps(p => p.map(a => a.id === id ? { ...a, status: 'approved' } : a));
  const reject = (id: string) => setApps(p => p.map(a => a.id === id ? { ...a, status: 'rejected' } : a));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Restaurant Approvals</h1>
          <p className="text-slate-500 text-sm">Review KYC, FSSAI, and service settings before approving new restaurants.</p>
        </div>
        <div className="flex gap-2 text-xs font-bold">
          <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full">{apps.filter(a => a.status === 'pending').length} Pending</span>
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">{apps.filter(a => a.status === 'approved').length} Approved</span>
          <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full">{apps.filter(a => a.status === 'rejected').length} Rejected</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or owner..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
        </div>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setSf(s)}
            className={`px-4 py-2.5 rounded-lg text-sm font-bold border transition-colors ${sf === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Applications */}
      <div className="space-y-3">
        {filtered.map(app => (
          <div key={app.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex flex-wrap items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
              onClick={() => setExp(exp === app.id ? null : app.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setExp(exp === app.id ? null : app.id))}>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900">{app.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CFG[app.status].bg}`}>{STATUS_CFG[app.status].label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${KYC_CFG[app.kyc]}`}>KYC {app.kyc.charAt(0).toUpperCase() + app.kyc.slice(1)}</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{app.cuisine} • {app.city} • {app.owner} • {app.phone}</p>
              </div>
              {/* FSSAI */}
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <FileCheck className="w-3.5 h-3.5 text-blue-500" /> {app.fssai}
              </div>
              {/* Time */}
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {app.submitted}
              </div>
              {/* Chevron */}
              {exp === app.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {exp === app.id && (
              <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div><p className="text-slate-400 text-xs font-medium mb-1">Services Requested</p>
                    <div className="flex flex-wrap gap-1">{app.services.map(s => <span key={s} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">{s}</span>)}</div>
                  </div>
                  <div><p className="text-slate-400 text-xs font-medium mb-1">Seating Capacity</p><p className="font-bold text-slate-900">{app.seatingCapacity || 'N/A (delivery only)'}</p></div>
                  <div><p className="text-slate-400 text-xs font-medium mb-1">FSSAI</p><p className="font-bold text-slate-900 text-xs break-all">{app.fssai}</p></div>
                  <div><p className="text-slate-400 text-xs font-medium mb-1">Admin Note</p><p className="font-medium text-slate-600 text-xs">{app.note}</p></div>
                </div>
                {app.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button onClick={() => approve(app.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve & Onboard
                    </button>
                    <button onClick={() => reject(app.id)} className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                      <XCircle className="w-3.5 h-3.5" /> Reject Application
                    </button>
                    <button className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-50 transition-colors">
                      <Eye className="w-3.5 h-3.5" /> View Documents
                    </button>
                    <button className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-50 transition-colors">
                      <AlertCircle className="w-3.5 h-3.5" /> Request More Info
                    </button>
                  </div>
                )}
                {app.status !== 'pending' && (
                  <div className={`text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-2 ${app.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {app.status === 'approved' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    Application {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
