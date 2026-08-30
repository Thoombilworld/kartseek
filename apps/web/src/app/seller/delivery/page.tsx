'use client';
import React, { useState } from 'react';
import {
  Truck, MapPin, Clock, Phone, User, CheckCircle, XCircle,
  Navigation, Package, ChevronRight, Search, RefreshCw,
  Star, Eye, AlertTriangle,
} from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
// ── Mock delivery data ───────────────────────────────────────────────────────

type DeliveryStatus = 'searching_driver' | 'driver_assigned' | 'driver_arriving' | 'at_store' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';

interface DeliveryRequest {
  id: string;
  orderId: string;
  customerName: string;
  customerAddress: string;
  status: DeliveryStatus;
  driver?: {
    name: string;
    phone: string;
    photo?: string;
    vehicleType: string;
    vehicleNumber: string;
    rating: number;
    eta?: string;
    currentDistance?: string;
  };
  createdAt: string;
  estimatedDeliveryTime?: string;
  deliveredAt?: string;
}

const MOCK_DELIVERIES: DeliveryRequest[] = [
  {
    id: 'DEL-001',
    orderId: 'GRC-2847',
    customerName: 'Rahul Sharma',
    customerAddress: 'Hiranandani Gardens, Powai, Mumbai',
    status: 'in_transit',
    driver: {
      name: 'Deepak Kumar',
      phone: '+91 98765 43210',
      vehicleType: 'Motorcycle',
      vehicleNumber: 'MH 03 AK 1234',
      rating: 4.8,
      eta: '8 min',
      currentDistance: '2.3 km away',
    },
    createdAt: '2026-06-12 04:45',
    estimatedDeliveryTime: '2026-06-12 05:15',
  },
  {
    id: 'DEL-002',
    orderId: 'GRC-2846',
    customerName: 'Priya Mehta',
    customerAddress: 'Bandra West, Mumbai',
    status: 'driver_arriving',
    driver: {
      name: 'Amit Singh',
      phone: '+91 99887 76655',
      vehicleType: 'Motorcycle',
      vehicleNumber: 'MH 01 BN 5678',
      rating: 4.6,
      eta: '3 min',
      currentDistance: '0.8 km away',
    },
    createdAt: '2026-06-12 04:50',
    estimatedDeliveryTime: '2026-06-12 05:25',
  },
  {
    id: 'DEL-003',
    orderId: 'GRC-2845',
    customerName: 'Sneha Rajan',
    customerAddress: 'Andheri East, Mumbai',
    status: 'searching_driver',
    createdAt: '2026-06-12 04:55',
  },
  {
    id: 'DEL-004',
    orderId: 'GRC-2840',
    customerName: 'Vikram Desai',
    customerAddress: 'Juhu, Mumbai',
    status: 'delivered',
    driver: {
      name: 'Rohit Patil',
      phone: '+91 88776 65544',
      vehicleType: 'Motorcycle',
      vehicleNumber: 'MH 02 CD 9012',
      rating: 4.9,
    },
    createdAt: '2026-06-12 03:30',
    deliveredAt: '2026-06-12 04:15',
  },
  {
    id: 'DEL-005',
    orderId: 'GRC-2839',
    customerName: 'Aditya Kapoor',
    customerAddress: 'Worli, Mumbai',
    status: 'delivered',
    driver: {
      name: 'Sunil Yadav',
      phone: '+91 77665 54433',
      vehicleType: 'Motorcycle',
      vehicleNumber: 'MH 04 EF 3456',
      rating: 4.7,
    },
    createdAt: '2026-06-12 03:00',
    deliveredAt: '2026-06-12 03:50',
  },
];

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; icon: React.ElementType }> = {
  searching_driver: { label: 'Searching Driver', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: RefreshCw },
  driver_assigned: { label: 'Driver Assigned', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: User },
  driver_arriving: { label: 'Driver Arriving', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Navigation },
  at_store: { label: 'At Store', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: MapPin },
  picked_up: { label: 'Picked Up', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: Package },
  in_transit: { label: 'In Transit', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

type TabKey = 'active' | 'completed' | 'all';

export default function DeliveryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeDeliveries = MOCK_DELIVERIES.filter((d) => !['delivered', 'failed'].includes(d.status));
  const completedDeliveries = MOCK_DELIVERIES.filter((d) => ['delivered', 'failed'].includes(d.status));

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: activeDeliveries.length },
    { key: 'completed', label: 'Completed', count: completedDeliveries.length },
    { key: 'all', label: 'All', count: MOCK_DELIVERIES.length },
  ];

  const filtered = MOCK_DELIVERIES.filter((d) => {
    if (search && !d.orderId.toLowerCase().includes(search.toLowerCase()) && !d.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTab === 'active') return !['delivered', 'failed'].includes(d.status);
    if (activeTab === 'completed') return ['delivered', 'failed'].includes(d.status);
    return true;
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Delivery Tracking</h1>
          <p className="text-sm text-slate-500">Monitor all deliveries from your store in real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {activeDeliveries.length} Active Deliveries
          </span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><Truck className="w-4 h-4 text-teal-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">In Transit</span></div>
          <p className="text-2xl font-black text-slate-900">{MOCK_DELIVERIES.filter((d) => d.status === 'in_transit').length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><RefreshCw className="w-4 h-4 text-amber-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">Searching</span></div>
          <p className="text-2xl font-black text-amber-600">{MOCK_DELIVERIES.filter((d) => d.status === 'searching_driver').length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">Delivered Today</span></div>
          <p className="text-2xl font-black text-green-600">{completedDeliveries.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-blue-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">Avg Time</span></div>
          <p className="text-2xl font-black text-slate-900">28m</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.key ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
              {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Search by order ID or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
        </div>
      </div>

      {/* Delivery Cards */}
      <div className="space-y-4">
        {filtered.map((del) => {
          const config = STATUS_CONFIG[del.status];
          const StatusIcon = config.icon;
          const expanded = expandedId === del.id;

          return (
            <div key={del.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
              <div
                className="p-5 cursor-pointer"
                onClick={() => setExpandedId(expanded ? null : del.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setExpandedId(expanded ? null : del.id))}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${del.status === 'searching_driver' ? 'bg-amber-100' : del.status === 'delivered' ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <StatusIcon className={`w-5 h-5 ${del.status === 'searching_driver' ? 'text-amber-600 animate-spin' : del.status === 'delivered' ? 'text-green-600' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900">{del.orderId}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${config.color}`}>{config.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{del.customerName} • {del.customerAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {del.driver?.eta && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-100">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span className="text-xs font-bold text-blue-700">ETA: {del.driver.eta}</span>
                      </div>
                    )}
                    <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expanded && (
                <div className="border-t border-slate-100 p-5 space-y-4">
                  {del.driver ? (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Delivery Partner</p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{del.driver.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" /> {del.driver.rating}</span>
                            <span>{del.driver.vehicleType} • {del.driver.vehicleNumber}</span>
                          </div>
                          {del.driver.currentDistance && (
                            <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                              <Navigation className="w-3 h-3" /> {del.driver.currentDistance}
                            </p>
                          )}
                        </div>
                        <a href={`tel:${del.driver.phone}`} title={`Call ${del.driver.name}`} className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center hover:bg-emerald-200 transition-colors">
                          <Phone className="w-4 h-4 text-emerald-700" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 text-amber-600 animate-spin" />
                      <div>
                        <p className="font-bold text-amber-800 text-sm">Searching for nearby delivery partners...</p>
                        <p className="text-xs text-amber-600 mt-0.5">Expanding search radius. This usually ta1-3 minutes.</p>
                      </div>
                    </div>
                  )}

                  {/* Delivery map placeholder */}
                  <div className="bg-slate-100 border border-slate-200 rounded-xl h-48 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-500">Live Map Tracking</p>
                      <p className="text-xs text-slate-400">Google Maps integration</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Timeline</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3 h-3" /> Created: {del.createdAt}
                    </div>
                    {del.estimatedDeliveryTime && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                        <Clock className="w-3 h-3" /> Est. Delivery: {del.estimatedDeliveryTime}
                      </div>
                    )}
                    {del.deliveredAt && (
                      <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                        <CheckCircle className="w-3 h-3" /> Delivered: {del.deliveredAt}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-500 font-bold">No deliveries found.</h3>
            <p className="text-sm text-slate-400 mt-1">Deliveries will appear when orders are marked as Ready for Pickup.</p>
          </div>
        )}
      </div>
    </div>
  );
}
