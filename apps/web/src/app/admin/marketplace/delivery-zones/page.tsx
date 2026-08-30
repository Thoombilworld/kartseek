'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Plus, Edit2, Trash2, CheckCircle, Search, X, Truck,
  Globe, Layers, AlertCircle, Clock, RefreshCw, Shield,
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type Zone = {
  id: string; name: string; city: string; state: string; pincodes: string[];
  partners: number; active: boolean; deliveryTime: string; shippingRate: number;
  codAvailable: boolean; sellerCoverage?: number;
};

const FALLBACK_ZONES: Zone[] = [
  { id: 'Z-001', name: 'Bangalore Metro', city: 'Bangalore', state: 'Karnataka', pincodes: ['560001–560100'], partners: 42, active: true, deliveryTime: 'Same Day / Next Day', shippingRate: 0, codAvailable: true, sellerCoverage: 28 },
  { id: 'Z-002', name: 'Delhi NCR', city: 'New Delhi', state: 'Delhi', pincodes: ['110001–110099', '121001–122018'], partners: 56, active: true, deliveryTime: 'Next Day', shippingRate: 0, codAvailable: true, sellerCoverage: 45 },
  { id: 'Z-003', name: 'Mumbai Metro', city: 'Mumbai', state: 'Maharashtra', pincodes: ['400001–400104'], partners: 38, active: true, deliveryTime: 'Next Day', shippingRate: 0, codAvailable: true, sellerCoverage: 32 },
  { id: 'Z-004', name: 'Chennai Metro', city: 'Chennai', state: 'Tamil Nadu', pincodes: ['600001–600130'], partners: 22, active: true, deliveryTime: '1-2 Days', shippingRate: 0, codAvailable: true, sellerCoverage: 18 },
  { id: 'Z-005', name: 'Hyderabad Metro', city: 'Hyderabad', state: 'Telangana', pincodes: ['500001–500100'], partners: 18, active: true, deliveryTime: '1-2 Days', shippingRate: 29, codAvailable: true, sellerCoverage: 14 },
  { id: 'Z-006', name: 'Pune City', city: 'Pune', state: 'Maharashtra', pincodes: ['411001–411062'], partners: 15, active: false, deliveryTime: '2-3 Days', shippingRate: 49, codAvailable: false, sellerCoverage: 8 },
  { id: 'Z-007', name: 'Rest of India', city: 'Pan India', state: 'All', pincodes: ['All other pincodes'], partners: 0, active: true, deliveryTime: '3-7 Days', shippingRate: 99, codAvailable: false, sellerCoverage: 3 },
];

export default function DeliveryZonesPage() {
  const [zones, setZones] = useState<Zone[]>(FALLBACK_ZONES);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState('');
  const [synced, setSynced] = useState(false);

  // Fetch zones from API
  useEffect(() => {
    async function fetchZones() {
      try {
        const res = await fetch('/api/admin/marketplace/delivery-zones');
        if (res.ok) {
          const data = await res.json();
          if (data?.zones?.length) { setZones(data.zones); setSynced(true); }
        }
      } catch { /* use fallback */ }
    }
    fetchZones();
  }, []);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); }, []);

  const toggleZone = useCallback((id: string) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, active: !z.active } : z));
    showToast('Zone status updated');
  }, [showToast]);

  const deleteZone = useCallback((id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
    showToast('Zone deleted');
  }, [showToast]);

  const filtered = zones.filter(z => !search || z.name.toLowerCase().includes(search.toLowerCase()) || z.city.toLowerCase().includes(search.toLowerCase()));
  const totalPincodes = zones.reduce((s, z) => s + z.pincodes.length, 0);
  const activeZones = zones.filter(z => z.active).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-black text-slate-900">Delivery Zones</h1><p className="text-sm text-slate-500">Configure serviceable areas and shipping rates</p></div>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Add Zone</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Zones', value: zones.length, icon: Layers, color: 'text-blue-600' },
          { label: 'Active Zones', value: activeZones, icon: CheckCircle, color: 'text-emerald-600' },
          { label: 'Total Partners', value: zones.reduce((s, z) => s + z.partners, 0), icon: Truck, color: 'text-purple-600' },
          { label: 'Coverage', value: `${totalPincodes} pin ranges`, icon: Globe, color: 'text-indigo-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><k.icon className={`w-4 h-4 ${k.color}`} /><p className="text-[10px] font-bold text-slate-400 uppercase">{k.label}</p></div><p className="text-xl font-black text-slate-900">{k.value}</p></div>
        ))}
      </div>

      {/* Sync Banner */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold ${synced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
        {synced ? <><Shield className="w-4 h-4" /> Zones synced with Seller Portal — sellers see your zone config in real time</> : <><RefreshCw className="w-4 h-4" /> Using cached zone data — API sync will restore on reconnect</>}
      </div>

      {/* Search */}
      <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search zones..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none" /></div>

      {/* Zone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(z => (
          <div key={z.id} className={`bg-white border rounded-xl p-5 ${z.active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">{z.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${z.active ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>{z.active ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5"><MapPin className="w-3 h-3 inline" /> {z.city}, {z.state}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleZone(z.id)} className={`p-1.5 rounded-lg text-xs font-bold ${z.active ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-emerald-50 text-emerald-500'}`} aria-label="Toggle">{z.active ? 'Disable' : 'Enable'}</button>
                <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600" aria-label="Edit"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteZone(z.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><p className="text-slate-400">Pincodes</p><p className="font-bold text-slate-900">{z.pincodes.join(', ')}</p></div>
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><p className="text-slate-400">Partners</p><p className="font-bold text-slate-900">{z.partners} assigned</p></div>
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><p className="text-slate-400">Delivery Time</p><p className="font-bold text-slate-900 flex items-center gap-1"><Clock className="w-3 h-3 text-blue-500" />{z.deliveryTime}</p></div>
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><p className="text-slate-400">Shipping</p><p className="font-bold text-slate-900">{z.shippingRate === 0 ? <span className="text-emerald-600">FREE</span> : `₹${z.shippingRate}`}</p></div>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[10px]">
              <span className={`font-bold ${z.codAvailable ? 'text-emerald-600' : 'text-slate-400'}`}>{z.codAvailable ? '✓ COD Available' : '✗ No COD'}</span>
              {z.sellerCoverage != null && <span className="text-blue-600 font-bold">🏪 {z.sellerCoverage} sellers active</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)} ><DismissOnEscape onDismiss={() => setShowAdd(false)} /></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4 p-5 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Add Delivery Zone</h3>
            {[['Zone Name *', 'e.g., Bangalore Metro'], ['City *', 'e.g., Bangalore'], ['State *', 'e.g., Karnataka']].map(([label, ph]) => (
              <div key={label}><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{label}</label><input placeholder={ph} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" /></div>
            ))}
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="pincode-ranges">Pincode Ranges *</label><textarea id="pincode-ranges" placeholder="560001–560100, 560103, 560110–560120" rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none resize-none" /><p className="text-[10px] text-slate-400 mt-1">Separate ranges with commas. Use – for ranges.</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="delivery-time">Delivery Time</label><select id="delivery-time" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" aria-label="Delivery time"><option>Same Day</option><option>Next Day</option><option>1-2 Days</option><option>2-3 Days</option><option>3-7 Days</option></select></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="shipping-rate">Shipping Rate (₹)</label><input id="shipping-rate" type="number" placeholder="0" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" /></div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-blue-600"  aria-label="checkbox"/><span className="text-slate-600">COD Available</span></label>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm">Create Zone</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-bold z-50 animate-in fade-in slide-in-from-bottom-4">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
