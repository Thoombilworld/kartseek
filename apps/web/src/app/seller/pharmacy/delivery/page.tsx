'use client';
import React, { useState, useEffect } from 'react';
import {
  Truck, Clock, Phone, MapPin, Star, Package, CheckCircle,
  Search, User, Navigation, ArrowRight,
} from 'lucide-react';
import { vendorPharmacyApi } from '@/lib/api/vendor-pharmacy';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type DeliveryStatus = 'pending' | 'driver_assigned' | 'pickup' | 'in_transit' | 'delivered';

interface Delivery {
  id: string; orderId: string; customer: string; address: string; status: DeliveryStatus;
  driver?: { name: string; phone: string; vehicle: string; rating: number; distance: string; eta: string };
  timeline: { step: string; time: string; done: boolean }[];
}

const DELIVERIES: Delivery[] = [
  {
    id: 'DL-801', orderId: 'PO-4207', customer: 'Priya S.', address: 'Sector 14, Block B, Gurugram', status: 'in_transit',
    driver: { name: 'Rahul Sharma', phone: '+91 98765 11111', vehicle: 'Bike • DL4S-AZ-1234', rating: 4.8, distance: '2.1 km', eta: '8 min' },
    timeline: [
      { step: 'Order Ready', time: '1:42 PM', done: true },
      { step: 'Driver Assigned', time: '1:45 PM', done: true },
      { step: 'Picked Up', time: '1:50 PM', done: true },
      { step: 'In Transit', time: '1:52 PM', done: true },
      { step: 'Delivered', time: '-', done: false },
    ],
  },
  {
    id: 'DL-800', orderId: 'PO-4206', customer: 'Mike R.', address: 'DLF Phase 3, Tower C, Gurugram', status: 'delivered',
    driver: { name: 'Amit Kumar', phone: '+91 87654 22222', vehicle: 'Bike • HR26-BR-5678', rating: 4.6, distance: '3.8 km', eta: '-' },
    timeline: [
      { step: 'Order Ready', time: '11:20 AM', done: true },
      { step: 'Driver Assigned', time: '11:25 AM', done: true },
      { step: 'Picked Up', time: '11:30 AM', done: true },
      { step: 'In Transit', time: '11:32 AM', done: true },
      { step: 'Delivered', time: '11:48 AM', done: true },
    ],
  },
  {
    id: 'DL-799', orderId: 'PO-4210', customer: 'John Doe', address: 'Sector 22, Near Metro, Gurugram', status: 'pending',
    timeline: [
      { step: 'Order Ready', time: '-', done: false },
      { step: 'Driver Assigned', time: '-', done: false },
      { step: 'Picked Up', time: '-', done: false },
      { step: 'In Transit', time: '-', done: false },
      { step: 'Delivered', time: '-', done: false },
    ],
  },
];

const STATUS_CFG: Record<DeliveryStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pending Driver', bg: 'bg-amber-100', color: 'text-amber-700' },
  driver_assigned: { label: 'Driver Assigned', bg: 'bg-blue-100', color: 'text-blue-700' },
  pickup: { label: 'Picking Up', bg: 'bg-purple-100', color: 'text-purple-700' },
  in_transit: { label: 'In Transit', bg: 'bg-teal-100', color: 'text-teal-700' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-100', color: 'text-emerald-700' },
};

export default function PharmacyDeliveryPage() {
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState<string | null>('DL-801');

  const filtered = DELIVERIES.filter((d) => filter === 'All' || d.status === filter);

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Delivery Tracking</h1>
          <p className="text-sm text-slate-500">Track active deliveries and driver assignments in real-time.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Deliveries', value: DELIVERIES.filter((d) => d.status !== 'delivered').length, color: 'text-blue-600' },
          { label: 'In Transit', value: DELIVERIES.filter((d) => d.status === 'in_transit').length, color: 'text-teal-600' },
          { label: 'Avg. Delivery Time', value: '22 min', color: 'text-purple-600' },
          { label: 'Success Rate', value: '98.2%', color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto">
        {['All', 'pending', 'driver_assigned', 'in_transit', 'delivered'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              filter === s ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {s === 'All' ? 'All' : STATUS_CFG[s as DeliveryStatus]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Deliveries */}
      <div className="space-y-3">
        {filtered.map((del) => {
          const cfg = STATUS_CFG[del.status];
          const isExpanded = expanded === del.id;
          return (
            <div key={del.id} className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
              <div className="p-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : del.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setExpanded(isExpanded ? null : del.id))}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{del.id}</span>
                      <span className="text-xs text-slate-400">• {del.orderId}</span>
                      <span className={`${cfg.bg} ${cfg.color} px-2 py-0.5 rounded text-[10px] font-black`}>{cfg.label}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{del.customer}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {del.address}</p>
                  </div>
                  {del.driver && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-teal-700">{del.driver.eta}</p>
                      <p className="text-[10px] text-slate-400">{del.driver.distance} away</p>
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-4">
                  {/* Driver Details */}
                  {del.driver && (
                    <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
                      <p className="text-[10px] font-black text-teal-800 uppercase mb-2">Driver Details</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                            {del.driver.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{del.driver.name}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" /> {del.driver.rating}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600">
                          <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {del.driver.phone}</p>
                          <p className="flex items-center gap-1"><Navigation className="w-3 h-3" /> {del.driver.vehicle}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-3">Delivery Timeline</p>
                    <div className="space-y-0">
                      {del.timeline.map((step, i) => (
                        <div key={step.step} className="flex items-start gap-3 relative pb-4 last:pb-0">
                          {i < del.timeline.length - 1 && (
                            <div className={`absolute left-[9px] top-5 bottom-0 w-0.5 ${step.done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                          )}
                          <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 ${
                            step.done ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}>
                            {step.done && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 flex justify-between items-center">
                            <span className={`text-xs font-bold ${step.done ? 'text-slate-800' : 'text-slate-400'}`}>{step.step}</span>
                            <span className="text-[10px] text-slate-400">{step.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
