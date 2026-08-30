'use client';

import React, { useState, useCallback } from 'react';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import {
  MapPin, ArrowRight, Clock, Users, Plus, Edit, Trash2, Save,
  CheckCircle, ToggleRight, ToggleLeft, ChevronDown, Route, Calendar,
} from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

interface IntercityRoute {
  id: string;
  from: string;
  to: string;
  distance: string;
  duration: string;
  farePerSeat: number;
  vehicleType: string;
  capacity: number;
  departures: string[];
  active: boolean;
  region: string;
}

const ROUTES: IntercityRoute[] = [
  { id: 'RT-01', from: 'Mumbai', to: 'Delhi', distance: '480 km', duration: '8h', farePerSeat: 1800, vehicleType: 'Shuttle (14-seater)', capacity: 14, departures: ['06:00 AM', '08:00 AM', '10:00 PM'], active: true, region: 'IN' },
  { id: 'RT-02', from: 'Mumbai', to: 'Chennai', distance: '350 km', duration: '6h', farePerSeat: 1500, vehicleType: 'Shuttle (14-seater)', capacity: 14, departures: ['07:00 AM', '09:00 AM'], active: true, region: 'IN' },
  { id: 'RT-03', from: 'Mumbai', to: 'Pune', distance: '160 km', duration: '2.5h', farePerSeat: 700, vehicleType: 'Shuttle (14-seater)', capacity: 14, departures: ['07:30 AM', '10:00 AM', '02:00 PM', '05:00 PM'], active: true, region: 'IN' },
  { id: 'RT-04', from: 'Mumbai', to: 'Bangalore', distance: '310 km', duration: '4h', farePerSeat: 1200, vehicleType: 'Shuttle (14-seater)', capacity: 14, departures: ['06:00 AM', '08:00 AM', '01:00 PM'], active: true, region: 'IN' },
  { id: 'RT-05', from: 'Mumbai', to: 'Nyeri', distance: '150 km', duration: '2h', farePerSeat: 650, vehicleType: 'Shuttle (14-seater)', capacity: 14, departures: ['08:00 AM', '12:00 PM', '04:00 PM'], active: true, region: 'IN' },
  { id: 'RT-06', from: 'Mumbai', to: 'Pune', distance: '150 km', duration: '2.5h', farePerSeat: 450, vehicleType: 'Innova (7-seater)', capacity: 7, departures: ['06:00 AM', '08:00 AM', '12:00 PM', '04:00 PM', '08:00 PM'], active: true, region: 'IN' },
  { id: 'RT-07', from: 'Dubai', to: 'Abu Dhabi', distance: '130 km', duration: '1.5h', farePerSeat: 55, vehicleType: 'Luxury Coach (30)', capacity: 30, departures: ['07:00 AM', '09:00 AM', '12:00 PM', '03:00 PM', '06:00 PM', '09:00 PM'], active: true, region: 'AE' },
  { id: 'RT-08', from: 'London', to: 'Manchester', distance: '330 km', duration: '4h', farePerSeat: 35, vehicleType: 'Coach (50-seater)', capacity: 50, departures: ['07:30 AM', '10:00 AM', '01:00 PM', '04:00 PM', '07:00 PM'], active: true, region: 'GB' },
  { id: 'RT-09', from: 'Riyadh', to: 'Jeddah', distance: '950 km', duration: '9h', farePerSeat: 200, vehicleType: 'VIP Bus (24)', capacity: 24, departures: ['06:00 AM', '08:00 PM'], active: true, region: 'SA' },
  { id: 'RT-10', from: 'Singapore', to: 'Johor Bahru', distance: '30 km', duration: '1h', farePerSeat: 12, vehicleType: 'Express Bus (40)', capacity: 40, departures: ['06:00 AM', '08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'], active: true, region: 'SG' },
  { id: 'RT-11', from: 'New York', to: 'Washington DC', distance: '365 km', duration: '4h', farePerSeat: 45, vehicleType: 'Coach (50)', capacity: 50, departures: ['07:00 AM', '10:00 AM', '01:00 PM', '04:00 PM', '07:00 PM'], active: false, region: 'US' },
];

export default function AdminRoutesPage() {
  const { filtered: routes, formatPrice, regionLabel, isFiltered, countryFlag } = useTaxiRegionFilter(ROUTES);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const activeRoutes = routes.filter(r => r.active).length;
  const totalDepartures = routes.filter(r => r.active).reduce((s, r) => s + r.departures.length, 0);
  const totalCapacity = routes.filter(r => r.active).reduce((s, r) => s + r.capacity * r.departures.length, 0);

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium"><CheckCircle className="w-4 h-4" />{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">🗺️ Route Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure intercity routes, schedules, and pricing {isFiltered && <span className="text-amber-600 font-bold">· {countryFlag} {regionLabel}</span>}</p>
        </div>
        <button onClick={() => showToast('Route creation form coming soon')} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors"><Plus className="w-4 h-4" /> Add Route</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Routes', value: activeRoutes, color: 'bg-violet-50 text-violet-700 border-violet-200', icon: Route },
          { label: 'Daily Departures', value: totalDepartures, color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Calendar },
          { label: 'Daily Seat Capacity', value: totalCapacity.toLocaleString(), color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Users },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl p-4 border ${kpi.color}`}><kpi.icon className="w-5 h-5 mb-2" /><p className="text-xl font-black">{kpi.value}</p><p className="text-xs font-medium mt-0.5 opacity-70">{kpi.label}</p></div>
        ))}
      </div>

      {/* Route Cards */}
      <div className="space-y-3">
        {routes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">No routes configured for this region</div>
        ) : routes.map(route => {
          const isExpanded = expandedRoute === route.id;
          return (
            <div key={route.id} className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-md ${route.active ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-60'}`}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${route.active ? 'bg-violet-50' : 'bg-slate-100'}`}>
                      <Route className={`w-5 h-5 ${route.active ? 'text-violet-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 flex items-center gap-1">
                          {route.from} <ArrowRight className="w-4 h-4 text-violet-400" /> {route.to}
                        </h3>
                        <span className="font-mono text-[10px] text-slate-400">{route.id}</span>
                        {!route.active && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Disabled</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{route.distance}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{route.duration}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{route.capacity} seats</span>
                        <span>{route.vehicleType}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900">{formatPrice(route.farePerSeat)}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">per seat</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">{route.departures.length} departures/day:</span>
                    <div className="flex gap-1 flex-wrap">
                      {route.departures.slice(0, 4).map(d => (
                        <span key={d} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">{d}</span>
                      ))}
                      {route.departures.length > 4 && <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-400">+{route.departures.length - 4} more</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => showToast(`${route.id} ${route.active ? 'disabled' : 'enabled'}`)} className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${route.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {route.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      {route.active ? 'Active' : 'Disabled'}
                    </button>
                    <button onClick={() => setExpandedRoute(isExpanded ? null : route.id)} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                      <Edit className="w-3.5 h-3.5" />Edit
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1" htmlFor="fare-per-seat">Fare per Seat</label><input id="fare-per-seat" title="Fare per seat" type="number" defaultValue={route.farePerSeat} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm" /></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1" htmlFor="capacity">Capacity</label><input id="capacity" title="Capacity" type="number" defaultValue={route.capacity} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm" /></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1" htmlFor="vehicle-type">Vehicle Type</label><input id="vehicle-type" title="Vehicle type" defaultValue={route.vehicleType} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm" /></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1" htmlFor="duration">Duration</label><input id="duration" title="Duration" defaultValue={route.duration} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm" /></div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1" htmlFor="departure-times-comma-separated">Departure Times (comma-separated)</label>
                    <input id="departure-times-comma-separated" title="Departure times" defaultValue={route.departures.join(', ')} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { showToast(`${route.id} saved`); setExpandedRoute(null); }} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Save Changes</button>
                    <button onClick={() => showToast(`${route.id} deleted`)} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete Route</button>
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
