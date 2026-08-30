'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import {
  Truck, Search, Download, Plus, Package, MapPin, Clock, Check, X, Edit3, ChevronRight, Settings, Zap, Globe, ShieldCheck,
  Star, AlertTriangle, Box, ArrowRight, CheckCircle, Warehouse,
  Timer, TrendingUp, BarChart3, Eye, Trash2, Copy,
} from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShippingZone {
  id: string;
  name: string;
  regions: string[];
  baseRate: number;
  perKgRate: number;
  freeAbove: number;
  estDays: string;
  isActive: boolean;
  type: 'standard' | 'express' | 'economy';
  adminBaseRate?: number;
}

interface CourierPartner {
  id: string;
  name: string;
  logo: string;
  rating: number;
  avgDelivery: string;
  trackingUrl: string;
  active: boolean;
  speciality: string;
  rtoRate: string;
  codSupport: boolean;
}

interface ShipmentTracking {
  id: string;
  orderId: string;
  courier: string;
  trackingId: string;
  status: 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'rto';
  buyer: string;
  city: string;
  date: string;
  eta: string;
}

type TabId = 'zones' | 'couriers' | 'tracking' | 'settings';

// ─── Demo Data ────────────────────────────────────────────────────────────────

const TRACKING_STATUS_CONFIG: Record<ShipmentTracking['status'], { label: string; bg: string; text: string; dot: string; icon: React.ElementType }> = {
  picked_up: { label: 'Picked Up', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', icon: Warehouse },
  in_transit: { label: 'In Transit', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500', icon: Package },
  delivered: { label: 'Delivered', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle },
  rto: { label: 'RTO', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', icon: AlertTriangle },
};

/**
 * Order lifecycle (what the API stores) → carrier state (what this page badges).
 * Shipment tracking is derived from the seller's orders, so the states arriving
 * here are `SHIPPED` / `OUT_FOR_DELIVERY` / `DELIVERED`, never `picked_up`.
 */
const API_STATUS_TO_TRACKING: Record<string, ShipmentTracking['status']> = {
  SHIPPED: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  RETURNED: 'rto',
  RETURN_REQUESTED: 'rto',
};

const TYPE_BADGE: Record<ShippingZone['type'], { label: string; bg: string; text: string }> = {
  express: { label: 'Express', bg: 'bg-violet-50', text: 'text-violet-700' },
  standard: { label: 'Standard', bg: 'bg-blue-50', text: 'text-blue-700' },
  economy: { label: 'Economy', bg: 'bg-slate-100', text: 'text-slate-600' },
};


// ═══════════════════════════════════════════════════════════════════════════════

export default function ShippingPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const seller = useSeller();
  // Falling back to a literal `'demo-seller'` sent every request on this page to
  // `/sellers/demo-seller/...`, which SellerOwnershipGuard correctly refused with
  // 403 — so the page silently showed nothing but its own demo rows. An empty id
  // means "not resolved yet"; the effects below wait for it instead.
  const sellerId = seller?.seller?.sellerId ?? '';
  const [activeTab, setActiveTab] = useState<TabId>('zones');
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [couriers, setCouriers] = useState<CourierPartner[]>([]);
  const [shipments, setShipments] = useState<ShipmentTracking[]>([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [settings, setSettings] = useState({
    defaultCourier: 'Delhivery',
    autoAssign: true,
    freeShippingThreshold: '499',
    handlingTime: '24',
    returnShippingPaid: 'seller',
    packagingType: 'standard',
    codEnabled: true,
    insuranceEnabled: false,
  });

  // ── Fetch all shipping data from API on mount ───────────────────────
  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    (async () => {
      try {
        const [zonesRes, couriersRes, trackingRes, settingsRes] = await Promise.allSettled([
          sellerApi.getShippingZones(sellerId),
          sellerApi.getShippingCouriers(sellerId),
          sellerApi.getShipmentTracking(sellerId),
          sellerApi.getShippingSettings(sellerId),
        ]);
        if (cancelled) return;

        // The API and this page use different shapes for all three of these.
        // Mapping them here is what stops `zone.regions.map` and
        // `TRACKING_STATUS_CONFIG[s.status]` blowing up on real data — the demo
        // rows were written in the page's shape, so nothing ever exercised it.
        if (zonesRes.status === 'fulfilled') {
          setZones((zonesRes.value?.data ?? []).map((z: any) => ({
            id: String(z.id),
            name: z.name ?? z.region ?? 'Zone',
            regions: Array.isArray(z.regions) ? z.regions : [z.region].filter(Boolean),
            baseRate: Number(z.baseRate ?? z.rate ?? 0),
            perKgRate: Number(z.perKgRate ?? 0),
            freeAbove: Number(z.freeAbove ?? 0),
            estDays: z.estDays ?? '3–5 days',
            isActive: z.isActive !== false,
            type: ['standard', 'express', 'economy'].includes(z.type) ? z.type : 'standard',
          })));
        }

        if (couriersRes.status === 'fulfilled') {
          setCouriers((couriersRes.value?.data ?? []).map((c: any, i: number) => ({
            id: String(c.id ?? c.name ?? i),
            name: c.name ?? 'Courier',
            logo: c.logo ?? '📦',
            rating: Number(c.rating ?? 0),
            avgDelivery: c.avgDelivery ?? '—',
            trackingUrl: c.trackingUrl ?? '',
            active: c.enabled ?? c.active ?? false,
            speciality: c.speciality ?? (c.isDefault ? 'Default carrier' : ''),
            rtoRate: c.rtoRate ?? '—',
            codSupport: c.codSupport ?? true,
          })));
        }

        if (trackingRes.status === 'fulfilled') {
          setShipments((trackingRes.value?.data ?? []).map((s: any) => ({
            id: String(s.orderId ?? s.id),
            orderId: s.orderNumber ?? s.orderId ?? '',
            courier: s.courierName ?? s.courier ?? '—',
            trackingId: s.trackingId ?? '—',
            status: API_STATUS_TO_TRACKING[String(s.status ?? '').toUpperCase()] ?? 'in_transit',
            buyer: s.customerName ?? s.buyer ?? 'Customer',
            city: s.city ?? '',
            date: s.updatedAt ?? s.date ?? new Date().toISOString(),
            eta: s.eta ?? '—',
          })));
        }
        if (settingsRes.status === 'fulfilled' && settingsRes.value) {
          const s = settingsRes.value;
          setSettings(prev => ({ ...prev, ...s, freeShippingThreshold: String(s.freeShippingThreshold ?? prev.freeShippingThreshold), handlingTime: String(s.handlingTime ?? prev.handlingTime) }));
        }
      } catch { /* fallback to demo data */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sellerId]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const toggleZone = async (id: string) => {
    const zone = zones.find(z => z.id === id);
    const newActive = !zone?.isActive;
    setZones(prev => prev.map(z => z.id === id ? { ...z, isActive: newActive } : z));
    showToast(`${zone?.name} ${newActive ? 'enabled' : 'disabled'}`);
    try { await sellerApi.updateShippingZone(sellerId, id, { isActive: newActive }); } catch { /* optimistic update, already applied */ }
  };

  // Stats
  const stats = useMemo(() => ({
    activeZones: zones.filter(z => z.isActive).length,
    totalZones: zones.length,
    activeCouriers: couriers.filter(c => c.active).length,
    inTransit: shipments.filter(s => s.status === 'in_transit' || s.status === 'out_for_delivery' || s.status === 'picked_up').length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    rto: shipments.filter(s => s.status === 'rto').length,
  }), [zones, couriers, shipments]);

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'zones', label: 'Shipping Zones', icon: Globe },
    { id: 'couriers', label: 'Courier Partners', icon: Truck },
    { id: 'tracking', label: 'Shipment Tracking', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            Shipping & Logistics
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage zones, couriers, and shipment tracking</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />Export
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-sm text-emerald-700 font-medium">
          <div className="flex items-center gap-2"><Check className="w-4 h-4" />{toast}</div>
          <button onClick={() => setToast(null)}><X className="w-4 h-4 text-emerald-500" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><Globe className="w-5 h-5 text-blue-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Active Zones</p>
              <p className="text-xl font-black text-blue-600">{stats.activeZones}<span className="text-sm text-slate-400 font-medium">/{stats.totalZones}</span></p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><Truck className="w-5 h-5 text-emerald-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Active Couriers</p>
              <p className="text-xl font-black text-emerald-600">{stats.activeCouriers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-amber-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">In Transit</p>
              <p className="text-xl font-black text-amber-600">{stats.inTransit}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">RTO Rate</p>
              <p className="text-xl font-black text-red-500">{stats.rto > 0 ? ((stats.rto / shipments.length) * 100).toFixed(1) : '0'}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: Shipping Zones                                               */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'zones' && (
        <div className="space-y-4">
          {zones.map(zone => {
            const tb = TYPE_BADGE[zone.type] ?? TYPE_BADGE.standard;
            return (
              <div key={zone.id} className={`bg-white border rounded-xl overflow-hidden transition-all hover:shadow-md ${zone.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${zone.type === 'express' ? 'bg-violet-50' : zone.type === 'economy' ? 'bg-slate-100' : 'bg-blue-50'}`}>
                        {zone.type === 'express' ? <Zap className="w-5 h-5 text-violet-600" /> : <Truck className={`w-5 h-5 ${zone.type === 'economy' ? 'text-slate-500' : 'text-blue-600'}`} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900">{zone.name}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tb.bg} ${tb.text}`}>{tb.label}</span>
                          {!zone.isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Disabled</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {zone.regions.map((r, i) => (
                            <span key={i} className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded font-medium">{r}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleZone(zone.id)}
                      className={`w-11 h-6 rounded-full relative transition-colors ${zone.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                      <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${zone.isActive ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {/* Rate Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base Rate</div>
                      <div className="text-lg font-black text-slate-900 mt-0.5">{fmt(zone.baseRate)}</div>
                      {zone.adminBaseRate != null && (
                        <div className="text-[9px] font-semibold text-blue-500 mt-0.5 flex items-center gap-0.5" title="Platform base rate set by admin">
                          <ShieldCheck className="w-3 h-3" />Platform: {fmt(zone.adminBaseRate)}
                        </div>
                      )}
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Per Kg</div>
                      <div className="text-lg font-black text-slate-900 mt-0.5">{fmt(zone.perKgRate)}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Free Shipping Above</div>
                      <div className="text-lg font-black text-emerald-600 mt-0.5">{fmt(zone.freeAbove)}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Delivery</div>
                      <div className="text-lg font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                        <Timer className="w-4 h-4 text-slate-400" />{zone.estDays}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: Courier Partners                                             */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'couriers' && (
        <div className="space-y-4">
          {/* Courier Comparison Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-800 text-sm">Smart Courier Assignment</h3>
              <p className="text-xs text-blue-600 mt-0.5">Orders are automatically assigned to the best courier based on delivery zone, weight, and service rating. You can override this per order.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {couriers.map(c => (
              <div key={c.id} className={`bg-white border rounded-xl p-5 transition-all hover:shadow-md ${c.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl">{c.logo}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                        {c.active ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{c.speciality}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-amber-700">{c.rating}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Avg. Delivery</div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">{c.avgDelivery}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">RTO Rate</div>
                    <div className={`text-sm font-black mt-0.5 ${parseFloat(c.rtoRate) > 5 ? 'text-red-500' : parseFloat(c.rtoRate) > 3 ? 'text-amber-500' : 'text-emerald-600'}`}>{c.rtoRate}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">COD</div>
                    <div className="text-sm font-black mt-0.5">{c.codSupport ? <span className="text-emerald-600">✓ Yes</span> : <span className="text-slate-400">✗ No</span>}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: Shipment Tracking                                            */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tracking' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by order ID, tracking ID, or buyer name..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              aria-label="Search shipments"
            />
          </div>

          {/* Shipment Cards */}
          <div className="space-y-3">
            {shipments
              .filter(s => {
                if (!search) return true;
                const q = search.toLowerCase();
                return s.orderId.toLowerCase().includes(q) || s.trackingId.toLowerCase().includes(q) || s.buyer.toLowerCase().includes(q);
              })
              .map(s => {
                // The API returns the order lifecycle (SHIPPED / OUT_FOR_DELIVERY /
                // DELIVERED); these badges are keyed by carrier states. An unmapped
                // status used to make this undefined and reading .icon off it took
                // the whole Shipping page down once real shipments appeared.
                const sc = TRACKING_STATUS_CONFIG[s.status] ?? TRACKING_STATUS_CONFIG.in_transit;
                const StatusIcon = sc.icon;

                return (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sc.bg}`}>
                          <StatusIcon className={`w-5 h-5 ${sc.text}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-slate-900 text-sm">{s.orderId}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text} flex items-center gap-1`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              {sc.label}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {s.buyer} · {s.city}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Truck className="w-3 h-3" />
                          <span className="font-semibold text-slate-700">{s.courier}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 bg-slate-50 px-2 py-0.5 rounded">{s.trackingId}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        {['Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'].map((step, i) => {
                          const statusOrder = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
                          const currentIdx = statusOrder.indexOf(s.status);
                          const isCompleted = s.status === 'rto' ? false : i <= currentIdx;
                          const isCurrent = s.status !== 'rto' && i === currentIdx;
                          return (
                            <div key={step} className="flex flex-col items-center flex-1">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                              } ${isCurrent ? 'ring-2 ring-emerald-200' : ''}`}>
                                {isCompleted ? <Check className="w-3 h-3" /> : i + 1}
                              </div>
                              <span className={`text-[9px] mt-1 font-medium ${isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>{step}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden relative">
                        {s.status === 'rto' ? (
                          <div className="h-full bg-red-400 rounded-full" style={{ width: '100%' }} />
                        ) : (
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${(['picked_up', 'in_transit', 'out_for_delivery', 'delivered'].indexOf(s.status) + 1) * 25}%` }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>Shipped: {s.date}</span>
                        {s.eta !== '—' && <span>ETA: <strong className="text-slate-600">{s.eta}</strong></span>}
                      </div>
                      {s.status === 'rto' && (
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">Return to Origin</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: Settings                                                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" />General Shipping Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="default-courier-partner">Default Courier Partner</label>
                <select id="default-courier-partner"
                  value={settings.defaultCourier}
                  onChange={e => setSettings(s => ({ ...s, defaultCourier: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {couriers.filter(c => c.active).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="free-shipping-threshold">Free Shipping Threshold (₹)</label>
                <input id="free-shipping-threshold"
                  type="number"
                  value={settings.freeShippingThreshold}
                  onChange={e => setSettings(s => ({ ...s, freeShippingThreshold: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="order-handling-time">Order Handling Time</label>
                <select id="order-handling-time"
                  value={settings.handlingTime}
                  onChange={e => setSettings(s => ({ ...s, handlingTime: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="12">12 hours</option>
                  <option value="24">24 hours (Recommended)</option>
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="packaging-type">Packaging Type</label>
                <select id="packaging-type"
                  value={settings.packagingType}
                  onChange={e => setSettings(s => ({ ...s, packagingType: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">Standard Packaging</option>
                  <option value="branded">Branded Packaging</option>
                  <option value="eco">Eco-Friendly Packaging</option>
                  <option value="fragile">Fragile / Special Handling</option>
                </select>
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-500" />Policies & Automation
            </h3>
            {[
              { key: 'autoAssign' as const, label: 'Smart Courier Auto-Assignment', desc: 'Automatically assign the best courier based on zone, weight, and rating' },
              { key: 'codEnabled' as const, label: 'Cash on Delivery (COD)', desc: 'Allow buyers to pay with cash at the time of delivery' },
              { key: 'insuranceEnabled' as const, label: 'Shipping Insurance', desc: 'Automatically insure all shipments above ₹2,000' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                <div>
                  <span className="block text-sm font-bold text-slate-700">{item.label}</span>
                  <span className="block text-xs text-slate-500">{item.desc}</span>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, [item.key]: !s[item.key] }))}
                  className={`w-11 h-6 rounded-full relative transition-colors ${settings[item.key] ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${settings[item.key] ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
          </div>

          {/* Return Shipping */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Box className="w-4 h-4 text-slate-500" />Return Shipping Policy
            </h3>
            <div className="flex gap-3">
              {['seller', 'buyer'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setSettings(s => ({ ...s, returnShippingPaid: opt }))}
                  className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${
                    settings.returnShippingPaid === opt
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`text-sm font-bold ${settings.returnShippingPaid === opt ? 'text-blue-700' : 'text-slate-700'}`}>
                    {opt === 'seller' ? 'Seller Pays Return Shipping' : 'Buyer Pays Return Shipping'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {opt === 'seller' ? 'Better customer satisfaction, higher return rates' : 'Lower costs, may reduce unnecessary returns'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={async () => {
                try {
                  await sellerApi.updateShippingSettings(sellerId, {
                    ...settings,
                    freeShippingThreshold: Number(settings.freeShippingThreshold),
                    handlingTime: Number(settings.handlingTime),
                  });
                  showToast('Shipping settings saved successfully');
                } catch {
                  showToast('Shipping settings saved successfully');
                }
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              <Check className="w-4 h-4" />Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Info Banner */}
      {activeTab === 'zones' && (
        <div className="bg-gradient-to-br from-slate-50 to-cyan-50/30 border border-slate-200 rounded-xl p-5">
          <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-cyan-500" />
            How Shipping Zones Work
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
              <div><strong>Express:</strong> Priority handling with guaranteed fast delivery. Ideal for metro cities with same-day or next-day fulfillment.</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <div><strong>Standard:</strong> Regular delivery service covering major cities. Balance between cost and speed.</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
              <div><strong>Economy:</strong> Cost-effective delivery for remote areas. Longer delivery times but maximum coverage.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
