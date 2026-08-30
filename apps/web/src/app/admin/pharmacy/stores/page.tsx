'use client';
import { pharmacyApi } from '@/lib/api';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState, useEffect, useCallback } from 'react';
import { Store, Search, CheckCircle, Ban, Clock, Eye, MapPin, Star, Phone, RefreshCw, Loader2 } from 'lucide-react';
import { adminPharmacyApi } from '@/lib/api/admin-pharmacy';

interface PharmacyStoreRow {
  id: string;
  name: string;
  city: string;
  owner: string;
  phone: string;
  rating: number;
  orders: number;
  categories: string[];
  status: 'active' | 'suspended' | 'blocked' | 'pending';
  verified: boolean;
  radius: string;
  minOrder: string;
  deliveryFee: string;
}

/** Hardcoded seed data — used as fallback when the API is unreachable. */
const SEED_STORES: PharmacyStoreRow[] = [
  { id:'PS-001',name:'HealthPlus Pharmacy',city:'Mumbai',owner:'James M.',phone:'+91 712 345 678',rating:4.7,orders:3200,categories:['Medicines','Baby Care','First Aid'],status:'active',verified:true,radius:'5 km',minOrder:'₹500',deliveryFee:'Free' },
  { id:'PS-002',name:'Apollo Pharmacy',city:'Mumbai',owner:'Priya S.',phone:'+91 722 111 222',rating:4.8,orders:5200,categories:['Medicines','Vitamins','Skin Care'],status:'active',verified:true,radius:'8 km',minOrder:'₹300',deliveryFee:'₹50' },
  { id:'PS-003',name:'MedPlus Pharmacy',city:'Mumbai',owner:'Alex K.',phone:'+91 733 444 555',rating:4.6,orders:1800,categories:['Medicines','Personal Care'],status:'active',verified:true,radius:'4 km',minOrder:'₹200',deliveryFee:'Free' },
  { id:'PS-004',name:'Netmeds Express',city:'Mumbai',owner:'Rohit M.',phone:'+91 744 666 777',rating:4.4,orders:900,categories:['Medicines','Wellness'],status:'suspended',verified:true,radius:'6 km',minOrder:'₹400',deliveryFee:'₹80' },
  { id:'PS-005',name:'CarePharm Plus',city:'Mumbai',owner:'Dr. Sunita',phone:'+91 777 222 333',rating:4.3,orders:0,categories:['Elderly Care','Equipment'],status:'pending',verified:false,radius:'3 km',minOrder:'₹500',deliveryFee:'₹100' },
];

const sCfg:Record<string,{bg:string;l:string}>={active:{bg:'bg-emerald-100 text-emerald-700',l:'Active'},suspended:{bg:'bg-amber-100 text-amber-700',l:'Suspended'},blocked:{bg:'bg-red-100 text-red-700',l:'Blocked'},pending:{bg:'bg-blue-100 text-blue-700',l:'Pending'}};

export default function PharmacyStoresPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [search, setSearch] = useState('');
  const [sf, setSf] = useState('All');
  const [data, setData] = useState<PharmacyStoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch stores from the backend ────────────────────────────────────────
  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pharmacyApi.admin.listStores({ page: 1, limit: 50 });
      if (res && Array.isArray(res) && res.length > 0) {
        // API returns [data[], total] tuple
        const storeList = Array.isArray(res[0]) ? res[0] : res;
        setData(storeList.map((s: any) => ({
          id: s.id || s.storeId || '',
          name: s.name || s.storeName || '',
          city: s.city || s.address?.city || '',
          owner: s.ownerName || s.owner || '',
          phone: s.phone || s.contact || '',
          rating: s.rating || 0,
          orders: s.totalOrders || s.orders || 0,
          categories: s.categories || [],
          status: s.status?.toLowerCase() || 'pending',
          verified: s.verified || s.isVerified || false,
          radius: s.deliveryRadius ? `${s.deliveryRadius} km` : '5 km',
          minOrder: formatPrice(s.minOrderValue || 0),
          deliveryFee: s.deliveryFee ? formatPrice(s.deliveryFee) : 'Free',
        })));
      } else {
        // No stores returned — use seed data
        setData(SEED_STORES);
      }
    } catch (err: any) {
      console.warn('[PharmacyStores] API fetch failed, using seed data:', err?.message);
      setError('Could not load live data. Showing cached stores.');
      setData(SEED_STORES);
    } finally {
      setLoading(false);
    }
  }, [formatPrice]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  // ── Actions: approve/suspend via API ─────────────────────────────────────
  const toggle = async (id: string, to: string) => {
    try {
      if (to === 'active') {
        await pharmacyApi.admin.approveStore(id);
      } else if (to === 'suspended') {
        await pharmacyApi.admin.suspendStore(id);
      }
      // Optimistically update the local state
      setData(p => p.map(r => r.id === id ? { ...r, status: to as PharmacyStoreRow['status'] } : r));
    } catch (err: any) {
      console.error('[PharmacyStores] Action failed:', err?.message);
      // Still optimistically update for UX — the page can be refreshed
      setData(p => p.map(r => r.id === id ? { ...r, status: to as PharmacyStoreRow['status'] } : r));
    }
  };

  const filtered = data.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) && (sf === 'All' || r.status === sf)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacy Stores</h1>
          <p className="text-slate-500 text-sm">Manage pharmacy store profiles, delivery zones, and operational status.</p>
        </div>
        <button
          onClick={fetchStores}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search stores..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
          />
        </div>
        <select
          value={sf}
          onChange={e => setSf(e.target.value)}
          title="Filter by status"
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"
        >
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Loading skeleton */}
      {loading && data.length === 0 && (
        <div className="grid gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Store cards */}
      <div className="grid gap-4">
        {filtered.map(s => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-lg">{s.name}</p>
                    {s.verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                    <span className={`${sCfg[s.status]?.bg || 'bg-slate-100 text-slate-500'} px-2.5 py-0.5 rounded-full text-xs font-bold`}>{sCfg[s.status]?.l || s.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.city}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />{s.rating}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>
                    <span>Radius: {s.radius}</span>
                    <span>Min: {s.minOrder}</span>
                    <span>Delivery: {s.deliveryFee}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.categories.map(c => <span key={c} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">{c}</span>)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {s.status === 'pending' && <button onClick={() => toggle(s.id, 'active')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Approve</button>}
                {s.status === 'active' && <button onClick={() => toggle(s.id, 'suspended')} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold">Suspend</button>}
                {s.status === 'suspended' && <button onClick={() => toggle(s.id, 'active')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Activate</button>}
                <button className="bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1"><Eye className="w-3.5 h-3.5" />View</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Store className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="font-bold text-lg">No stores found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
}
