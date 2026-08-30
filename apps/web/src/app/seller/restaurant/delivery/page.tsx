'use client';
import React, { useState, useEffect } from 'react';
import {
  Bike, Phone, Clock, MapPin, Star, CheckCircle, Package, AlertTriangle,
  ChevronDown, ChevronUp, Navigation, TrendingUp,
} from 'lucide-react';
import { vendorRestaurantApi } from '@/lib/api/vendor-restaurant';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
// ── Types & Data ─────────────────────────────────────────────────────────────

type DeliveryStatus = 'awaiting_driver' | 'driver_assigned' | 'pickup' | 'in_transit' | 'delivered';

interface Delivery {
  id: string; orderId: string; customer: string; address: string;
  items: string[]; total: number; status: DeliveryStatus;
  driver?: { name: string; phone: string; vehicle: string; rating: number; eta: string; distance: string };
  createdAt: string; deliveredAt?: string;
}

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  awaiting_driver: { label: 'Awaiting Driver', color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
  driver_assigned: { label: 'Driver Assigned', color: 'text-blue-700', bg: 'bg-blue-50', icon: Bike },
  pickup: { label: 'Pickup', color: 'text-purple-700', bg: 'bg-purple-50', icon: Package },
  in_transit: { label: 'In Transit', color: 'text-orange-700', bg: 'bg-orange-50', icon: Navigation },
  delivered: { label: 'Delivered', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle },
};

const MOCK_DELIVERIES: Delivery[] = [
  {
    id: 'DEL-401', orderId: 'ORD-9982', customer: 'Rajesh Kumar', address: '23, MG Road, Andheri West, Mumbai 400053',
    items: ['2x Chicken Biryani', '1x Paneer Tikka'], total: 840, status: 'awaiting_driver', createdAt: '3 min ago',
  },
  {
    id: 'DEL-400', orderId: 'ORD-9980', customer: 'Priya Mehta', address: '45, Linking Road, Bandra West, Mumbai 400050',
    items: ['1x Mutton Rogan Josh', '2x Garlic Naan'], total: 520, status: 'driver_assigned', createdAt: '12 min ago',
    driver: { name: 'Daniel Mwangi', phone: '+91 98765 43210', vehicle: 'Honda Activa (MH 02 AB 1234)', rating: 4.8, eta: '5 min', distance: '1.2 km' },
  },
  {
    id: 'DEL-399', orderId: 'ORD-9978', customer: 'Ahmed Al-Rashidi', address: '12, Hill Road, Bandra East, Mumbai 400051',
    items: ['3x Butter Chicken', '4x Naan'], total: 920, status: 'pickup', createdAt: '18 min ago',
    driver: { name: 'Ravi Singh', phone: '+91 87654 32109', vehicle: 'Bajaj Pulsar (MH 04 CD 5678)', rating: 4.6, eta: 'At restaurant', distance: '0 km' },
  },
  {
    id: 'DEL-398', orderId: 'ORD-9976', customer: 'Sara Williams', address: '8, SV Road, Goregaon West, Mumbai 400062',
    items: ['1x Family Biryani Pack'], total: 699, status: 'in_transit', createdAt: '28 min ago',
    driver: { name: 'Omar Khalil', phone: '+91 76543 21098', vehicle: 'TVS Jupiter (MH 01 EF 9012)', rating: 4.9, eta: '12 min', distance: '4.3 km' },
  },
  {
    id: 'DEL-397', orderId: 'ORD-9974', customer: 'Anita Nair', address: '56, Carter Road, Bandra West, Mumbai 400050',
    items: ['2x Tandoori Chicken', '2x Roomali Roti'], total: 560, status: 'delivered', createdAt: '45 min ago', deliveredAt: '32 min',
    driver: { name: 'Vikram Patel', phone: '+91 65432 10987', vehicle: 'Honda Activa (MH 03 GH 3456)', rating: 4.7, eta: 'Completed', distance: '3.1 km' },
  },
];

const TIMELINE_STEPS: { status: DeliveryStatus; label: string }[] = [
  { status: 'awaiting_driver', label: 'Finding Driver' },
  { status: 'driver_assigned', label: 'Driver Assigned' },
  { status: 'pickup', label: 'At Restaurant' },
  { status: 'in_transit', label: 'In Transit' },
  { status: 'delivered', label: 'Delivered' },
];

export default function RestaurantDeliveryPage() {
  const [deliveries] = useState(MOCK_DELIVERIES);
  const [expandedId, setExpandedId] = useState<string | null>(MOCK_DELIVERIES[1]?.id || null);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');

  const filtered = statusFilter === 'all' ? deliveries : deliveries.filter((d) => d.status === statusFilter);

  const stats = {
    awaitingDriver: deliveries.filter((d) => d.status === 'awaiting_driver').length,
    inTransit: deliveries.filter((d) => d.status === 'in_transit').length,
    deliveredToday: deliveries.filter((d) => d.status === 'delivered').length,
    avgTime: '32 min',
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Bike className="w-6 h-6 text-orange-600" /> Delivery Tracking
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Monitor active deliveries and driver assignments in real-time.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Awaiting Driver', value: stats.awaitingDriver, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'In Transit', value: stats.inTransit, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
          { label: 'Delivered Today', value: stats.deliveredToday, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Avg Delivery Time', value: stats.avgTime, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center shadow-sm`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 overflow-x-auto">
        {[{ val: 'all', label: 'All' }, ...Object.entries(STATUS_CONFIG).map(([val, cfg]) => ({ val, label: cfg.label }))].map((f) => (
          <button key={f.val} onClick={() => setStatusFilter(f.val as DeliveryStatus | 'all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === f.val ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Delivery Cards */}
      <div className="space-y-4">
        {filtered.map((delivery) => {
          const cfg = STATUS_CONFIG[delivery.status];
          const expanded = expandedId === delivery.id;
          const statusIdx = TIMELINE_STEPS.findIndex((s) => s.status === delivery.status);
          const Icon = cfg.icon;

          return (
            <div key={delivery.id} className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
              delivery.status === 'awaiting_driver' ? 'border-amber-200' : 'border-slate-100'
            } ${expanded ? 'shadow-md' : ''}`}>
              {/* Main Row */}
              <div className="p-4 flex items-start gap-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : delivery.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setExpandedId(expanded ? null : delivery.id))}>
                <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-900 text-sm">{delivery.orderId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    {delivery.status === 'awaiting_driver' && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">Finding driver...</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{delivery.customer}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{delivery.address}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-slate-900">₹{delivery.total}</p>
                  <p className="text-[10px] text-slate-400">{delivery.createdAt}</p>
                  {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 mt-1 ml-auto" /> : <ChevronDown className="w-4 h-4 text-slate-400 mt-1 ml-auto" />}
                </div>
              </div>

              {/* Expanded Content */}
              {expanded && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-4">
                  {/* Timeline */}
                  <div className="flex items-center justify-between">
                    {TIMELINE_STEPS.map((step, i) => {
                      const done = i <= statusIdx;
                      const current = i === statusIdx;
                      return (
                        <React.Fragment key={step.status}>
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                              done ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-400'
                            } ${current ? 'ring-2 ring-orange-300' : ''}`}>
                              {done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                            </div>
                            <span className={`text-[9px] font-bold text-center ${done ? 'text-orange-700' : 'text-slate-400'}`}>{step.label}</span>
                          </div>
                          {i < TIMELINE_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 ${i < statusIdx ? 'bg-orange-500' : 'bg-slate-200'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Driver Details */}
                  {delivery.driver && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-2">Delivery Partner</p>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{delivery.driver.name}</p>
                          <p className="text-xs text-slate-600">{delivery.driver.vehicle}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {delivery.driver.rating}
                            </span>
                            <a href={`tel:${delivery.driver.phone}`} title={`Call ${delivery.driver.name}`} className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5">
                              <Phone className="w-3 h-3" /> {delivery.driver.phone}
                            </a>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-blue-800">ETA: {delivery.driver.eta}</p>
                          <p className="text-[10px] text-blue-600">{delivery.driver.distance} away</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Order Items</p>
                    <div className="flex flex-wrap gap-1.5">
                      {delivery.items.map((item) => (
                        <span key={item} className="bg-white border border-slate-200 text-slate-700 text-xs px-2 py-1 rounded-lg font-medium">{item}</span>
                      ))}
                    </div>
                  </div>

                  {delivery.deliveredAt && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <p className="text-xs font-bold text-emerald-700">✓ Delivered in {delivery.deliveredAt}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Bike className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-500 font-bold">No deliveries found</h3>
        </div>
      )}
    </div>
  );
}
