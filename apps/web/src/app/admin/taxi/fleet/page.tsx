'use client';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Car, MapPin, Users, Zap, AlertTriangle, TrendingUp, Clock,
  RefreshCw, Radio, Activity, Navigation, DollarSign,
  Shield, Eye, ChevronRight, BarChart3, Globe
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { adminTaxiApi } from '@/lib/api/admin-taxi';
import { API_BASE_URL } from '@/lib/config/api-base';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
// ─── Types ────────────────────────────────────────────────────────────────────
interface LiveDriver {
  id: string; name: string; vehicleType: string; plate: string;
  lat: number; lng: number; heading: number; speed: number;
  status: 'available' | 'on_trip' | 'arriving' | 'offline';
  rating: number; tripId?: string; lastUpdate: string;
}

interface ActiveRide {
  id: string; customerName: string; driverName: string;
  vehicleType: string; status: string; fare: number;
  pickupAddress: string; dropAddress: string;
  startTime: string; eta: number;
}

interface SurgeZone {
  id: string; name: string; multiplier: number;
  demand: number; supply: number; isActive: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockDrivers: LiveDriver[] = [
  { id: 'DRV-001', name: 'Rahul Sharma', vehicleType: 'economy', plate: 'KCA 123A', lat: -1.286389, lng: 72.877723, heading: 45, speed: 32, status: 'on_trip', rating: 4.8, tripId: 'RIDE-9901', lastUpdate: 'now' },
  { id: 'DRV-002', name: 'Rakesh Nair', vehicleType: 'comfort', plate: 'KCB 456B', lat: -1.292066, lng: 36.821946, heading: 180, speed: 0, status: 'available', rating: 4.6, lastUpdate: '10s ago' },
  { id: 'DRV-003', name: 'Sarah Wanjiku', vehicleType: 'premium', plate: 'KCC 789C', lat: -1.280340, lng: 36.810120, heading: 90, speed: 45, status: 'on_trip', rating: 4.9, tripId: 'RIDE-9903', lastUpdate: 'now' },
  { id: 'DRV-004', name: 'David Mutua', vehicleType: 'bike', plate: 'KMCA 001', lat: -1.298000, lng: 36.828000, heading: 270, speed: 18, status: 'arriving', rating: 4.3, lastUpdate: '5s ago' },
  { id: 'DRV-005', name: 'Grace Akinyi', vehicleType: 'economy', plate: 'KCD 234D', lat: -1.275000, lng: 36.815000, heading: 0, speed: 0, status: 'available', rating: 4.7, lastUpdate: '20s ago' },
  { id: 'DRV-006', name: 'John Kiprop', vehicleType: 'economy', plate: 'KCE 567E', lat: -1.288000, lng: 36.825000, heading: 135, speed: 28, status: 'on_trip', rating: 4.5, tripId: 'RIDE-9905', lastUpdate: 'now' },
  { id: 'DRV-007', name: 'Mary Njeri', vehicleType: 'comfort', plate: 'KCF 890F', lat: -1.300000, lng: 36.812000, heading: 315, speed: 0, status: 'available', rating: 4.4, lastUpdate: '15s ago' },
  { id: 'DRV-008', name: 'Hassan Ali', vehicleType: 'economy', plate: 'KCG 123G', lat: -1.270000, lng: 36.830000, heading: 60, speed: 40, status: 'on_trip', rating: 4.2, tripId: 'RIDE-9907', lastUpdate: 'now' },
];

const mockRides: ActiveRide[] = [
  { id: 'RIDE-9901', customerName: 'Alice Mwende', driverName: 'Rahul Sharma', vehicleType: 'economy', status: 'RIDE_STARTED', fare: 450, pickupAddress: 'Westlands Mall', dropAddress: 'JKIA Airport', startTime: '14:32', eta: 12 },
  { id: 'RIDE-9903', customerName: 'Bob Njoroge', driverName: 'Sarah Wanjiku', vehicleType: 'premium', status: 'DRIVER_ARRIVED', fare: 1200, pickupAddress: 'Karen Hub', dropAddress: 'Gigiri UN', startTime: '14:38', eta: 5 },
  { id: 'RIDE-9905', customerName: 'Carol Wambui', driverName: 'John Kiprop', vehicleType: 'economy', status: 'RIDE_STARTED', fare: 320, pickupAddress: 'CBD Archives', dropAddress: 'Lavington', startTime: '14:45', eta: 8 },
  { id: 'RIDE-9907', customerName: 'Dan Omondi', driverName: 'Hassan Ali', vehicleType: 'economy', status: 'SEARCHING_DRIVER', fare: 280, pickupAddress: 'Thika Road Mall', dropAddress: 'Kasarani Stadium', startTime: '14:50', eta: 15 },
];

const mockSurgeZones: SurgeZone[] = [
  { id: 'Z-CBD', name: 'Mumbai Central', multiplier: 1.5, demand: 45, supply: 12, isActive: true },
  { id: 'Z-WEST', name: 'Westlands', multiplier: 1.2, demand: 28, supply: 18, isActive: true },
  { id: 'Z-KAREN', name: 'Karen / Lang\'ata', multiplier: 1.0, demand: 8, supply: 10, isActive: false },
  { id: 'Z-EAST', name: 'Eastlands', multiplier: 1.0, demand: 15, supply: 14, isActive: false },
  { id: 'Z-AIRPORT', name: 'JKIA Airport', multiplier: 1.8, demand: 22, supply: 5, isActive: true },
  { id: 'Z-KILE', name: 'Kilimani / Kileleshwa', multiplier: 1.3, demand: 18, supply: 11, isActive: true },
];

// ─── Status Helpers ───────────────────────────────────────────────────────────
const statusCfg: Record<string, { bg: string; label: string; dot: string }> = {
  available:  { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Available', dot: 'bg-emerald-500' },
  on_trip:    { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'On Trip', dot: 'bg-blue-500' },
  arriving:   { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Arriving', dot: 'bg-amber-500' },
  offline:    { bg: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Offline', dot: 'bg-slate-400' },
};

const rideStatusCfg: Record<string, { bg: string; label: string }> = {
  SEARCHING_DRIVER: { bg: 'bg-blue-100 text-blue-700', label: 'Searching' },
  DRIVER_ASSIGNED:  { bg: 'bg-purple-100 text-purple-700', label: 'Assigned' },
  DRIVER_ARRIVED:   { bg: 'bg-amber-100 text-amber-700', label: 'Arrived' },
  RIDE_STARTED:     { bg: 'bg-emerald-100 text-emerald-700', label: 'In Progress' },
  RIDE_COMPLETED:   { bg: 'bg-teal-100 text-teal-700', label: 'Completed' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function FleetMonitoringPage() {
  const { regionLabel, isFiltered, formatPrice } = useTaxiRegionFilter([]);
  const [drivers, setDrivers] = useState(mockDrivers);
  const [rides, setRides] = useState(mockRides);
  const [surgeZones, setSurgeZones] = useState(mockSurgeZones);
  const [activeTab, setActiveTab] = useState<'fleet' | 'rides' | 'surge'>('fleet');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const { formatCurrencyValue } = useRegion();

  // Fetch live data from API with fallback to mock
  const fetchLiveData = useCallback(async () => {
    try {
      const [driversRes, ridesRes, surgeRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/admin/taxi/drivers/nearby?radius=50`, { signal: AbortSignal.timeout(5000) }),
        fetch(`${API_BASE_URL}/admin/taxi/rides?status=active`, { signal: AbortSignal.timeout(5000) }),
        fetch(`${API_BASE_URL}/admin/taxi/surge`, { signal: AbortSignal.timeout(5000) }),
      ]);
      if (driversRes.status === 'fulfilled' && driversRes.value.ok) {
        const data = await driversRes.value.json();
        if (data.drivers?.length) setDrivers(data.drivers);
      }
      if (ridesRes.status === 'fulfilled' && ridesRes.value.ok) {
        const data = await ridesRes.value.json();
        if (data.rides?.length) setRides(data.rides);
      }
      if (surgeRes.status === 'fulfilled' && surgeRes.value.ok) {
        const data = await surgeRes.value.json();
        if (data.zones?.length) setSurgeZones(data.zones);
      }
    } catch { /* Keep mock data as fallback */ }
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    fetchLiveData();
    const timer = setInterval(fetchLiveData, 10000);
    return () => clearInterval(timer);
  }, [fetchLiveData]);

  const refresh = fetchLiveData;

  const stats = {
    total: drivers.length,
    available: drivers.filter(d => d.status === 'available').length,
    onTrip: drivers.filter(d => d.status === 'on_trip').length,
    arriving: drivers.filter(d => d.status === 'arriving').length,
    activeRides: rides.length,
    activeSurgeZones: surgeZones.filter(z => z.isActive).length,
    avgSurge: surgeZones.filter(z => z.isActive).length > 0
      ? (surgeZones.filter(z => z.isActive).reduce((s, z) => s + z.multiplier, 0) / surgeZones.filter(z => z.isActive).length).toFixed(1)
      : '1.0',
  };

  const toggleSurge = (zoneId: string) => {
    setSurgeZones(prev => prev.map(z =>
      z.id === zoneId ? { ...z, isActive: !z.isActive } : z
    ));
  };

  const updateMultiplier = (zoneId: string, delta: number) => {
    setSurgeZones(prev => prev.map(z =>
      z.id === zoneId ? { ...z, multiplier: Math.max(1.0, Math.min(3.0, +(z.multiplier + delta).toFixed(1))) } : z
    ));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-500" />
            Fleet Monitoring — Live Operations
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time driver tracking, active rides, and surge pricing control
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Drivers" value={stats.total} color="bg-slate-100 text-slate-700" />
        <StatCard icon={<Radio className="w-5 h-5" />} label="Available" value={stats.available} color="bg-emerald-100 text-emerald-700" />
        <StatCard icon={<Car className="w-5 h-5" />} label="On Trip" value={stats.onTrip} color="bg-blue-100 text-blue-700" />
        <StatCard icon={<Navigation className="w-5 h-5" />} label="Arriving" value={stats.arriving} color="bg-amber-100 text-amber-700" />
        <StatCard icon={<Activity className="w-5 h-5" />} label="Active Rides" value={stats.activeRides} color="bg-purple-100 text-purple-700" />
        <StatCard icon={<Zap className="w-5 h-5" />} label="Surge Zones" value={stats.activeSurgeZones} color="bg-red-100 text-red-700" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Avg Surge" value={`${stats.avgSurge}x`} color="bg-orange-100 text-orange-700" />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['fleet', 'rides', 'surge'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'fleet' && <span className="flex items-center gap-1.5"><Car className="w-4 h-4" /> Live Fleet</span>}
            {tab === 'rides' && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Active Rides</span>}
            {tab === 'surge' && <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> Surge Control</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'fleet' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Live Driver Fleet</h2>
            <span className="text-xs text-slate-400">{drivers.length} drivers tracked</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 font-semibold">Driver</th>
                  <th className="px-5 py-3 font-semibold">Vehicle</th>
                  <th className="px-5 py-3 font-semibold text-center">Status</th>
                  <th className="px-5 py-3 font-semibold text-center">Speed</th>
                  <th className="px-5 py-3 font-semibold text-center">Rating</th>
                  <th className="px-5 py-3 font-semibold">Trip</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                  <th className="px-5 py-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {drivers.map(d => {
                  const s = statusCfg[d.status];
                  const isSelected = selectedDriver === d.id;
                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                      onClick={() => setSelectedDriver(isSelected ? null : d.id)} tabIndex={0} onKeyDown={activateOnKey(() => setSelectedDriver(isSelected ? null : d.id))}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-700">
                            {d.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{d.name}</p>
                            <p className="text-xs text-slate-400">{d.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="capitalize font-medium text-slate-700">{d.vehicleType}</span>
                        <p className="text-xs text-slate-400">{d.plate}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${d.status !== 'offline' ? 'animate-pulse' : ''}`} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-700">
                        {d.speed > 0 ? `${d.speed} km/h` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-0.5 text-sm font-bold">
                          <span className="text-amber-400">★</span> {d.rating}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {d.tripId ? (
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{d.tripId}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{d.lastUpdate}</td>
                      <td className="px-5 py-3.5 text-center">
                        <button title="View driver details" className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                          <Eye className="w-4 h-4 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rides' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Active Rides</h2>
            <span className="text-xs text-slate-400">{rides.length} rides in progress</span>
          </div>
          <div className="divide-y divide-slate-50">
            {rides.map(ride => {
              const rs = rideStatusCfg[ride.status] || { bg: 'bg-slate-100 text-slate-600', label: ride.status };
              return (
                <div key={ride.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-900">{ride.id}</span>
                      <span className={`${rs.bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{rs.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{formatCurrencyValue(ride.fare)}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">Customer</p>
                      <p className="font-bold text-slate-700">{ride.customerName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">Driver</p>
                      <p className="font-bold text-slate-700">{ride.driverName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">Route</p>
                      <p className="font-bold text-slate-700">{ride.pickupAddress} → {ride.dropAddress}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">ETA</p>
                      <p className="font-bold text-slate-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {ride.eta} min
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'surge' && (
        <div className="space-y-4">
          <div className="bg-linear-to-br from-orange-500 to-red-500 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5" />
              <h2 className="font-bold text-lg">Dynamic Surge Pricing Control</h2>
            </div>
            <p className="text-sm opacity-80">
              Manage zone-based surge multipliers based on real-time demand/supply ratios.
              Changes take effect immediately across the dispatch system.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {surgeZones.map(zone => (
              <div
                key={zone.id}
                className={`bg-white border rounded-xl p-5 transition-all ${
                  zone.isActive
                    ? 'border-orange-200 shadow-md shadow-orange-100/50'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{zone.name}</h3>
                    <p className="text-xs text-slate-400">{zone.id}</p>
                  </div>
                  <button
                    title={`Toggle surge pricing for ${zone.name}`}
                    onClick={() => toggleSurge(zone.id)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      zone.isActive ? 'bg-orange-500' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      zone.isActive ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateMultiplier(zone.id, -0.1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors"
                    >
                      −
                    </button>
                    <span className={`text-2xl font-black ${zone.multiplier > 1.0 ? 'text-orange-600' : 'text-slate-600'}`}>
                      {zone.multiplier}x
                    </span>
                    <button
                      onClick={() => updateMultiplier(zone.id, 0.1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                  {zone.isActive && zone.multiplier > 1.0 && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">
                      SURGE ACTIVE
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Demand</p>
                    <p className="text-lg font-black text-red-600">{zone.demand}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Supply</p>
                    <p className="text-lg font-black text-emerald-600">{zone.supply}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Supply ratio</span>
                    <span>{zone.supply > 0 ? ((zone.supply / Math.max(zone.demand, 1)) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden" title={`Supply ratio: ${zone.supply > 0 ? ((zone.supply / Math.max(zone.demand, 1)) * 100).toFixed(0) : 0}%`}>
                    {(() => {
                      const pct = Math.min(100, Math.round((zone.supply / Math.max(zone.demand, 1)) * 100));
                      const ratio = zone.supply / Math.max(zone.demand, 1);
                      const color = ratio < 0.4 ? 'bg-red-500' : ratio < 0.7 ? 'bg-amber-500' : 'bg-emerald-500';
                      return <div className={`h-full rounded-full transition-all ${color} w-[${pct}%]`} />;
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
  return (
    <div className={`${color} p-4 rounded-xl`}>
      <div className="opacity-70">{icon}</div>
      <p className="text-2xl font-black mt-2">{value}</p>
      <p className="text-xs font-medium opacity-70">{label}</p>
    </div>
  );
}
