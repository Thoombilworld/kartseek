'use client';
import React, { useState } from 'react';
import { Truck, Search, X, ChevronLeft, ChevronRight, Download, Eye, Clock, MapPin, Package, AlertTriangle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { useAdminData, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', 'Saudi Arabia': 'SA' };

type Shipment = {
  id: string; orderId: string; product: string; customer: string; seller: string; country: string;
  carrier: string; trackingNumber: string; status: 'Processing' | 'Shipped' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Failed' | 'RTO';
  estimatedDelivery: string; actualDelivery: string; origin: string; destination: string;
  slaBreached: boolean; weight: string; date: string;
  timeline: { date: string; event: string; location: string }[];
};

const SHIPMENTS: Shipment[] = [
  { id: 'SHP-001', orderId: 'ORD-8890', product: 'iPhone 15 Pro', customer: 'Rohit Sharma', seller: 'Apple India Store', country: 'India', carrier: 'Delhivery', trackingNumber: 'DEL1234567890', status: 'In Transit', estimatedDelivery: '2026-06-08', actualDelivery: '', origin: 'Mumbai', destination: 'Bangalore', slaBreached: false, weight: '0.5 kg', date: '2026-06-06', timeline: [{ date: '2026-06-06 10:00', event: 'Picked up from seller', location: 'Mumbai Hub' }, { date: '2026-06-06 14:00', event: 'Reached sort facility', location: 'Mumbai Airport' }, { date: '2026-06-06 22:00', event: 'In transit', location: 'En route to Bangalore' }] },
  { id: 'SHP-002', orderId: 'ORD-8885', product: 'Samsung Galaxy S24', customer: 'Priya Menon', seller: 'Samsung Official', country: 'India', carrier: 'BlueDart', trackingNumber: 'BD9876543210', status: 'Failed', estimatedDelivery: '2026-06-05', actualDelivery: '', origin: 'Delhi', destination: 'Chennai', slaBreached: true, weight: '0.4 kg', date: '2026-06-03', timeline: [{ date: '2026-06-03', event: 'Picked up', location: 'Delhi Hub' }, { date: '2026-06-04', event: 'In transit', location: 'Hyderabad' }, { date: '2026-06-05', event: 'Delivery attempted — Customer not available', location: 'Chennai' }, { date: '2026-06-05', event: 'Delivery failed — 3 attempts exhausted', location: 'Chennai' }] },
  { id: 'SHP-003', orderId: 'ORD-8882', product: 'Nike Air Jordan 1', customer: 'Amit Patel', seller: 'Nike India', country: 'India', carrier: 'Delhivery', trackingNumber: 'DEL5678901234', status: 'Out for Delivery', estimatedDelivery: '2026-06-06', actualDelivery: '', origin: 'Bangalore', destination: 'Pune', slaBreached: false, weight: '1.2 kg', date: '2026-06-04', timeline: [{ date: '2026-06-04', event: 'Shipped', location: 'Bangalore' }, { date: '2026-06-05', event: 'In transit', location: 'Pune Hub' }, { date: '2026-06-06 08:00', event: 'Out for delivery', location: 'Pune' }] },
  { id: 'SHP-004', orderId: 'ORD-8878', product: 'Dyson V15 Detect', customer: 'Ahmed Al-Farsi', seller: 'Gulf Electronics FZE', country: 'UAE', carrier: 'Aramex', trackingNumber: 'ARX1122334455', status: 'Delivered', estimatedDelivery: '2026-06-05', actualDelivery: '2026-06-04', origin: 'Dubai', destination: 'Abu Dhabi', slaBreached: false, weight: '3.5 kg', date: '2026-06-02', timeline: [{ date: '2026-06-02', event: 'Shipped', location: 'Dubai Hub' }, { date: '2026-06-03', event: 'In transit', location: 'Al Ain' }, { date: '2026-06-04', event: 'Delivered', location: 'Abu Dhabi' }] },
  { id: 'SHP-005', orderId: 'ORD-8875', product: 'MacBook Air M3', customer: 'Vikram Kumar', seller: 'Apple India Store', country: 'India', carrier: 'FedEx', trackingNumber: 'FX7788990011', status: 'Shipped', estimatedDelivery: '2026-06-09', actualDelivery: '', origin: 'Mumbai', destination: 'Hyderabad', slaBreached: false, weight: '2.0 kg', date: '2026-06-06', timeline: [{ date: '2026-06-06', event: 'Shipped — label created', location: 'Mumbai Hub' }] },
  { id: 'SHP-006', orderId: 'ORD-8870', product: 'Silk Saree Collection', customer: 'Sneha Nair', seller: 'Heritage Silk House', country: 'India', carrier: 'DTDC', trackingNumber: 'DTDC112233', status: 'RTO', estimatedDelivery: '2026-06-03', actualDelivery: '', origin: 'Varanasi', destination: 'Kochi', slaBreached: true, weight: '0.8 kg', date: '2026-05-30', timeline: [{ date: '2026-05-30', event: 'Shipped', location: 'Varanasi' }, { date: '2026-06-01', event: 'Customer refused delivery', location: 'Kochi' }, { date: '2026-06-02', event: 'RTO initiated', location: 'Kochi' }] },
  { id: 'SHP-007', orderId: 'ORD-8865', product: 'Sony WH-1000XM5', customer: 'Abdullah Al-Otaibi', seller: 'Sony Store', country: 'Saudi Arabia', carrier: 'SMSA', trackingNumber: 'SMSA445566', status: 'Processing', estimatedDelivery: '2026-06-10', actualDelivery: '', origin: 'Riyadh', destination: 'Jeddah', slaBreached: false, weight: '0.6 kg', date: '2026-06-06', timeline: [{ date: '2026-06-06', event: 'Order received — awaiting pickup', location: 'Riyadh' }] },
];

const STATUS_STYLES: Record<string, string> = { Processing: 'bg-slate-100 text-slate-600', Shipped: 'bg-blue-50 text-blue-700', 'In Transit': 'bg-indigo-50 text-indigo-700', 'Out for Delivery': 'bg-amber-50 text-amber-700', Delivered: 'bg-emerald-50 text-emerald-700', Failed: 'bg-red-50 text-red-700', RTO: 'bg-red-100 text-red-700' };
const CARRIER_COLORS: Record<string, string> = { Delhivery: 'bg-red-50 text-red-700', BlueDart: 'bg-blue-50 text-blue-700', Aramex: 'bg-orange-50 text-orange-700', FedEx: 'bg-purple-50 text-purple-700', DTDC: 'bg-yellow-50 text-yellow-700', SMSA: 'bg-emerald-50 text-emerald-700' };

// ── Shipment Drawer ──────────────────────────────────────────────────────────
function ShipmentDrawer({ item: s, onClose }: { item: Shipment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{s.id}</h2><p className="text-xs text-slate-500">{s.orderId}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[s.status]}`}>{s.status}</span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${CARRIER_COLORS[s.carrier] || 'bg-slate-100 text-slate-600'}`}>{s.carrier}</span>
            {s.slaBreached && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-md flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />SLA Breached</span>}
          </div>

          <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">Product</p><p className="text-sm font-bold text-slate-900">{s.product}</p><p className="text-xs text-slate-400 mt-1">Tracking: <span className="font-mono text-blue-600">{s.trackingNumber}</span></p></div>

          {/* Route */}
          <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-4 flex items-center gap-4">
            <div className="text-center"><MapPin className="w-4 h-4 text-blue-600 mx-auto" /><p className="text-xs font-bold mt-1">{s.origin}</p><p className="text-[10px] text-slate-400">Origin</p></div>
            <div className="flex-1 h-1 bg-gradient-to-r from-blue-300 to-emerald-300 rounded-full relative">
              <div className="absolute top-1/2 -translate-y-1/2" style={{ left: s.status === 'Delivered' ? '95%' : s.status === 'Out for Delivery' ? '80%' : s.status === 'In Transit' ? '50%' : s.status === 'Shipped' ? '20%' : '5%' }}><Truck className="w-4 h-4 text-blue-600" /></div>
            </div>
            <div className="text-center"><MapPin className="w-4 h-4 text-emerald-600 mx-auto" /><p className="text-xs font-bold mt-1">{s.destination}</p><p className="text-[10px] text-slate-400">Destination</p></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Customer</p><p className="text-sm font-bold text-slate-900">{s.customer}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Seller</p><p className="text-sm font-bold text-slate-900">{s.seller}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Est. Delivery</p><p className="text-sm font-bold text-slate-900">{s.estimatedDelivery}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Weight</p><p className="text-sm font-bold text-slate-900">{s.weight}</p></div>
          </div>

          {/* Tracking Timeline */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Tracking Timeline</h3>
            <div className="space-y-0 relative">
              <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-200" />
              {s.timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-3 py-2 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${i === s.timeline.length - 1 ? s.status === 'Delivered' ? 'bg-emerald-600' : s.status === 'Failed' || s.status === 'RTO' ? 'bg-red-600' : 'bg-blue-600' : 'bg-slate-200'}`}>
                    {i === s.timeline.length - 1 ? (s.status === 'Delivered' ? <CheckCircle className="w-3 h-3 text-white" /> : s.status === 'Failed' || s.status === 'RTO' ? <XCircle className="w-3 h-3 text-white" /> : <Truck className="w-3 h-3 text-white" />) : <Clock className="w-3 h-3 text-slate-500" />}
                  </div>
                  <div><p className="text-xs font-bold text-slate-900">{t.event}</p><p className="text-[10px] text-slate-400">{t.location} · {t.date}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function LogisticsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const PAGE_SIZE = 5;

  const { data: apiData, loading, error, refetch, toast } = useAdminData(() => adminMarketplaceApi.getOrders(), []);

  const { filtered: regionFiltered, regionLabel, isFiltered } = useMarketplaceRegionFilter(SHIPMENTS);
  const filtered = regionFiltered.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search && !s.product.toLowerCase().includes(search.toLowerCase()) && !s.trackingNumber.toLowerCase().includes(search.toLowerCase()) && !s.customer.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const slaBreachedCount = regionFiltered.filter(s => s.slaBreached).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Shipping & Logistics</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Track shipments, monitor carriers, and resolve delivery issues</p></div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[{ l: 'In Transit', v: regionFiltered.filter(s => s.status === 'In Transit').length, c: 'text-indigo-600' }, { l: 'Out for Delivery', v: regionFiltered.filter(s => s.status === 'Out for Delivery').length, c: 'text-amber-600' }, { l: 'Delivered', v: regionFiltered.filter(s => s.status === 'Delivered').length, c: 'text-emerald-600' }, { l: 'Failed', v: regionFiltered.filter(s => s.status === 'Failed').length, c: 'text-red-600' }, { l: 'RTO', v: regionFiltered.filter(s => s.status === 'RTO').length, c: 'text-red-700' }, { l: 'SLA Breached', v: slaBreachedCount, c: slaBreachedCount > 0 ? 'text-red-600' : 'text-emerald-600' }].map(k => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className={`text-xl font-black ${k.c}`}>{k.v}</p><p className="text-[10px] text-slate-500 mt-1">{k.l}</p></div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search product, tracking number, or customer..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2 flex-wrap">{['all', 'Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed', 'RTO'].map(s => (<button key={s} onClick={() => { setFilter(s); setPage(1); }} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Shipment</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Carrier</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Route</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">ETA</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">SLA</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.length === 0 ? (
              <tr><td colSpan={7}><MarketplaceEmptyState title="No shipments found" icon={Truck} /></td></tr>
            ) : paged.map(s => (
              <tr key={s.id} className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${s.slaBreached ? 'bg-red-50/30' : ''}`} onClick={() => setSelected(s)} tabIndex={0} onKeyDown={activateOnKey(() => setSelected(s))}>
                <td className="px-4 py-3.5"><p className="font-bold text-slate-900 text-xs">{s.product}</p><p className="text-[10px] text-slate-400">{s.id} · {s.orderId} · <CountryFlag code={COUNTRY_TO_CODE[s.country] || 'IN'} size="sm" /></p></td>
                <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${CARRIER_COLORS[s.carrier] || 'bg-slate-100 text-slate-600'}`}>{s.carrier}</span><p className="text-[10px] text-slate-400 font-mono mt-0.5">{s.trackingNumber}</p></td>
                <td className="px-4 py-3.5 text-xs text-slate-600">{s.origin} → {s.destination}</td>
                <td className="px-4 py-3.5 text-center text-xs font-bold text-slate-700">{s.estimatedDelivery}</td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[s.status]}`}>{s.status}</span></td>
                <td className="px-4 py-3.5 text-center">{s.slaBreached ? <AlertTriangle className="w-4 h-4 text-red-500 mx-auto" /> : <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />}</td>
                <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}><button onClick={() => setSelected(s)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (<div className="flex items-center justify-between px-2"><p className="text-xs text-slate-500">{filtered.length} shipments</p><div className="flex items-center gap-2"><button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><span className="text-xs font-bold">{page}/{totalPages}</span><button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>)}

      {selected && <ShipmentDrawer item={selected} onClose={() => setSelected(null)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
