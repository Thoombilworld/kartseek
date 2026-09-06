'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRegion } from '@/lib/contexts/region-context';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  ArrowRight, CheckCircle, XCircle, Clock, DollarSign, Users,
  Bus, Calendar, MapPin, Phone, FileText,
} from 'lucide-react';
import { vendorTaxiApi } from '@/lib/api/vendor-taxi';

type ICStatus = 'assigned' | 'boarding' | 'departed' | 'completed' | 'cancelled';

interface VendorIntercity {
  id: string;
  routeFrom: string;
  routeTo: string;
  date: string;
  departureTime: string;
  passengers: { name: string; seats: number; phone: string }[];
  totalSeats: number;
  capacity: number;
  revenue: number;
  shuttle: string;
  driver: string | null;
  status: ICStatus;
}

const TRIPS: VendorIntercity[] = [
  { id: 'IC-DEP-01', routeFrom: 'Mumbai', routeTo: 'Delhi', date: '2026-07-09', departureTime: '06:00 AM', passengers: [{ name: 'Vikram Singh', seats: 2, phone: '+91 722 345 678' }, { name: 'Grace W.', seats: 1, phone: '+91 711 222 333' }, { name: 'John K.', seats: 3, phone: '+91 700 111 222' }], totalSeats: 6, capacity: 14, revenue: 10800, shuttle: 'KBZ 100A (HiAce)', driver: 'Mwangi K.', status: 'assigned' },
  { id: 'IC-DEP-02', routeFrom: 'Mumbai', routeTo: 'Pune', date: '2026-07-08', departureTime: '10:00 AM', passengers: [{ name: 'John Kamau', seats: 1, phone: '+91 711 222 333' }, { name: 'Mary N.', seats: 2, phone: '+91 733 444 555' }], totalSeats: 3, capacity: 14, revenue: 2100, shuttle: 'KCA 200B', driver: 'Samuel O.', status: 'boarding' },
  { id: 'IC-DEP-03', routeFrom: 'Mumbai', routeTo: 'Chennai', date: '2026-07-08', departureTime: '07:00 AM', passengers: [{ name: 'Anjali Gupta', seats: 1, phone: '+91 733 456 789' }, { name: 'Tom A.', seats: 2, phone: '+91 722 888 999' }, { name: 'Lisa M.', seats: 1, phone: '+91 711 333 444' }, { name: 'David O.', seats: 4, phone: '+91 700 555 666' }], totalSeats: 8, capacity: 14, revenue: 12000, shuttle: 'KBZ 300C', driver: 'James M.', status: 'departed' },
  { id: 'IC-DEP-04', routeFrom: 'Mumbai', routeTo: 'Pune', date: '2026-07-07', departureTime: '02:00 PM', passengers: [{ name: 'Peter O.', seats: 2, phone: '+91 722 111 222' }], totalSeats: 2, capacity: 14, revenue: 1400, shuttle: 'KCA 200B', driver: 'Samuel O.', status: 'completed' },
];

const STATUS_STYLES: Record<ICStatus, { bg: string; label: string }> = {
  assigned: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Assigned' },
  boarding: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Boarding' },
  departed: { bg: 'bg-violet-50 text-violet-700 border-violet-200', label: 'En Route' },
  completed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Completed' },
  cancelled: { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Cancelled' },
};

export default function VendorIntercityPage() {
  const { formatCurrencyValue } = useRegion();
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const upcomingCount = TRIPS.filter(t => ['assigned', 'boarding'].includes(t.status)).length;
  const totalPassengers = TRIPS.filter(t => t.status !== 'cancelled').reduce((s, t) => s + t.totalSeats, 0);
  const totalRevenue = TRIPS.filter(t => t.status !== 'cancelled').reduce((s, t) => s + t.revenue, 0);

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium"><CheckCircle className="w-4 h-4" />{toast}</div>}

      <div>
        <h1 className="text-2xl font-black text-slate-900">🛣️ Intercity Departures</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your assigned shuttle routes and passenger manifests</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Upcoming Departures', value: upcomingCount, color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Calendar },
          { label: 'Total Passengers', value: totalPassengers, color: 'bg-violet-50 text-violet-700 border-violet-200', icon: Users },
          { label: 'Route Revenue', value: formatCurrencyValue(totalRevenue), color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: DollarSign },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl p-4 border ${kpi.color}`}><kpi.icon className="w-5 h-5 mb-2" /><p className="text-xl font-black">{kpi.value}</p><p className="text-xs font-medium mt-0.5 opacity-70">{kpi.label}</p></div>
        ))}
      </div>

      <div className="space-y-3">
        {TRIPS.map(trip => {
          const isExpanded = expandedTrip === trip.id;
          const occupancy = Math.round((trip.totalSeats / trip.capacity) * 100);
          return (
            <div key={trip.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-violet-600 font-bold">{trip.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[trip.status].bg}`}>{STATUS_STYLES[trip.status].label}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1">{trip.routeFrom} <ArrowRight className="w-4 h-4 text-violet-400" /> {trip.routeTo}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(trip.date).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })} · {trip.departureTime}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-900">{formatCurrencyValue(trip.revenue)}</p>
                    <p className="text-xs text-slate-400">{trip.totalSeats}/{trip.capacity} seats ({occupancy}%)</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><Bus className="w-3.5 h-3.5" />{trip.shuttle}</span>
                  {trip.driver && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{trip.driver}</span>}
                  <span>{trip.passengers.length} bookings</span>
                </div>

                {/* Occupancy bar */}
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <ProgressBar value={occupancy} className={`h-full rounded-full transition-all ${occupancy >= 80 ? 'bg-emerald-500' : occupancy >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} />
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setExpandedTrip(isExpanded ? null : trip.id)} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />{isExpanded ? 'Hide' : 'View'} Manifest
                  </button>
                  {trip.status === 'assigned' && (
                    <button onClick={() => showToast(`${trip.id} — boarding started`)} className="text-xs font-bold text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors">Start Boarding</button>
                  )}
                  {trip.status === 'boarding' && (
                    <button onClick={() => showToast(`${trip.id} — departed!`)} className="text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition-colors">Mark Departed</button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50 p-5">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Passenger Manifest</h4>
                  <div className="space-y-2">
                    {trip.passengers.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-xs">{i + 1}</div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.phone}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded">{p.seats} seat{p.seats > 1 ? 's' : ''}</span>
                      </div>
                    ))}
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
