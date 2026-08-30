'use client';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Star, Eye, Ban, CheckCircle, Clock, XCircle,
  Phone, MapPin, FileText, AlertTriangle, Car, Building2,
  Shield, Download, Filter, ChevronDown, ChevronUp,
} from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';
import { API_BASE_URL } from '@/lib/config/api-base';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
// ─── Types ────────────────────────────────────────────────────────────────────

interface Driver {
  id: string;
  name: string;
  vendorName: string | null;
  countryCode: string;
  city: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleModel: string;
  status: 'pending' | 'onboarding' | 'active' | 'suspended' | 'blocked';
  rating: number;
  totalTrips: number;
  earnings: string;
  onboardingProgress: number;
  docsPending: number;
  lastActive: string;
}

const sCfg: Record<string, { bg: string; l: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', l: 'Active' },
  onboarding: { bg: 'bg-indigo-100 text-indigo-700', l: 'Onboarding' },
  suspended: { bg: 'bg-amber-100 text-amber-700', l: 'Suspended' },
  blocked: { bg: 'bg-red-100 text-red-700', l: 'Blocked' },
  pending: { bg: 'bg-blue-100 text-blue-700', l: 'Pending' },
};

const FLAGS: Record<string, string> = { IN: '🇮🇳', US: '🇺🇸', NG: '🇳🇬', GB: '🇬🇧', AE: '🇦🇪' };
const VEHICLE_ICONS: Record<string, string> = { economy: '🚗', comfort: '🚙', premium: '🏎️', bike: '🏍️', suv: '🚐' };

const mockDrivers: Driver[] = [
  { id: 'DRV-101', name: 'Ravi Kumar', vendorName: 'QuickRide Fleet', countryCode: 'IN', city: 'Bangalore', phone: '+91 98765 43220', email: 'ravi@email.com', vehicleType: 'comfort', vehiclePlate: 'KA01-1234', vehicleModel: 'Swift Dzire', status: 'active', rating: 4.8, totalTrips: 1240, earnings: '₹42K', onboardingProgress: 100, docsPending: 0, lastActive: 'Now' },
  { id: 'DRV-102', name: 'Amit Singh', vendorName: 'QuickRide Fleet', countryCode: 'IN', city: 'Mumbai', phone: '+91 98765 43221', email: 'amit@email.com', vehicleType: 'suv', vehiclePlate: 'MH01-5678', vehicleModel: 'Innova', status: 'active', rating: 4.5, totalTrips: 890, earnings: '₹28K', onboardingProgress: 100, docsPending: 0, lastActive: 'On Trip' },
  { id: 'DRV-103', name: 'James Mwangi', vendorName: null, countryCode: 'IN', city: 'Mumbai', phone: '+91 712 345678', email: 'james@email.com', vehicleType: 'economy', vehiclePlate: 'KCA 123A', vehicleModel: 'Toyota Vitz', status: 'active', rating: 4.6, totalTrips: 3200, earnings: '180K', onboardingProgress: 100, docsPending: 0, lastActive: '5 min ago' },
  { id: 'DRV-104', name: 'Fatima Okonkwo', vendorName: 'Lagos City Rides', countryCode: 'NG', city: 'Lagos', phone: '+234 812 345678', email: 'fatima@email.com', vehicleType: 'economy', vehiclePlate: 'LAG-1234', vehicleModel: 'Corolla', status: 'pending', rating: 0, totalTrips: 0, earnings: '₦0', onboardingProgress: 25, docsPending: 4, lastActive: 'New' },
  { id: 'DRV-105', name: 'Deepak R.', vendorName: null, countryCode: 'IN', city: 'Delhi', phone: '+91 98765 43222', email: 'deepak@email.com', vehicleType: 'bike', vehiclePlate: 'DL01-9999', vehicleModel: 'Honda Activa', status: 'suspended', rating: 3.1, totalTrips: 210, earnings: '₹8K', onboardingProgress: 100, docsPending: 0, lastActive: '1 week' },
  { id: 'DRV-106', name: 'Ahmed Hassan', vendorName: 'Desert Express', countryCode: 'AE', city: 'Dubai', phone: '+971 55 123 4567', email: 'ahmed@email.com', vehicleType: 'premium', vehiclePlate: 'DXB-5678', vehicleModel: 'Lexus ES', status: 'active', rating: 4.9, totalTrips: 4500, earnings: 'AED 85K', onboardingProgress: 100, docsPending: 0, lastActive: '2 min ago' },
  { id: 'DRV-107', name: 'Sarah Johnson', vendorName: 'PremiumRide UK', countryCode: 'GB', city: 'London', phone: '+44 7700 900456', email: 'sarah@email.com', vehicleType: 'premium', vehiclePlate: 'AB12 CDE', vehicleModel: 'Mercedes E-Class', status: 'active', rating: 4.7, totalTrips: 2800, earnings: '£32K', onboardingProgress: 100, docsPending: 0, lastActive: 'Now' },
  { id: 'DRV-108', name: 'Prakash B.', vendorName: null, countryCode: 'IN', city: 'Hyderabad', phone: '+91 98765 43223', email: 'prakash@email.com', vehicleType: 'economy', vehiclePlate: 'TS01-1234', vehicleModel: 'WagonR', status: 'blocked', rating: 2.0, totalTrips: 45, earnings: '₹2K', onboardingProgress: 100, docsPending: 0, lastActive: 'Blocked' },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TaxiDriversPage() {
  const { regionLabel, isFiltered, formatPrice } = useTaxiRegionFilter([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [vendorFilter, setVendorFilter] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [driverData, setDriverData] = useState(mockDrivers);

  // Fetch live driver data from API with fallback to mock
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/taxi/admin/drivers`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.drivers?.length) setDriverData(data.drivers);
        }
      } catch { /* Keep mock data */ }
    })();
  }, []);

  const filtered = driverData.filter(d => {
    const ms = d.name.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === 'All' || d.status === statusFilter;
    const mc = countryFilter === 'All' || d.countryCode === countryFilter;
    const mv = vendorFilter === 'All' || (vendorFilter === 'independent' ? !d.vendorName : d.vendorName === vendorFilter);
    return ms && mst && mc && mv;
  });

  const updateStatus = async (id: string, status: Driver['status']) => {
    // Call API for status change
    const action = status === 'active' ? 'approve' : status === 'suspended' ? 'suspend' : 'block';
    try {
      await fetch(`${API_BASE_URL}/admin/taxi/drivers/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
    } catch { /* Continue with optimistic update */ }
    setDriverData(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const stats = {
    total: driverData.length,
    active: driverData.filter(d => d.status === 'active').length,
    pending: driverData.filter(d => d.status === 'pending' || d.status === 'onboarding').length,
    independent: driverData.filter(d => !d.vendorName).length,
    vendorManaged: driverData.filter(d => d.vendorName).length,
  };

  const vendors = [...new Set(driverData.filter(d => d.vendorName).map(d => d.vendorName!))];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Driver Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">All drivers across vendors and independents. Review onboarding, documents, and performance.</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors" id="export-drivers-btn">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Users className="w-5 h-5 text-indigo-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.total}</p>
          <p className="text-xs text-slate-500 font-medium">Total Drivers</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.active}</p>
          <p className="text-xs text-slate-500 font-medium">Active</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Clock className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.pending}</p>
          <p className="text-xs text-slate-500 font-medium">Pending/Onboarding</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Shield className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.independent}</p>
          <p className="text-xs text-slate-500 font-medium">Independent</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Building2 className="w-5 h-5 text-purple-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.vendorManaged}</p>
          <p className="text-xs text-slate-500 font-medium">Vendor-Managed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Search drivers by name or ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" id="search-drivers" />
        </div>
        <select title="Filter by country" value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" id="filter-country-drivers">
          <option value="All">🌍 All Countries</option>
          {Object.entries(FLAGS).map(([code, flag]) => <option key={code} value={code}>{flag} {code}</option>)}
        </select>
        <select title="Filter by vendor" value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" id="filter-vendor-drivers">
          <option value="All">All (Vendor & Independent)</option>
          <option value="independent">🆓 Independent Only</option>
          {vendors.map(v => <option key={v} value={v}>🏢 {v}</option>)}
        </select>
        <select title="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" id="filter-status-drivers">
          <option value="All">All Status</option>
          {Object.entries(sCfg).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Driver</th>
                <th className="px-4 py-3.5 font-semibold">Vendor</th>
                <th className="px-4 py-3.5 font-semibold">Vehicle</th>
                <th className="px-4 py-3.5 font-semibold text-center">Rating</th>
                <th className="px-4 py-3.5 font-semibold text-right">Trips</th>
                <th className="px-4 py-3.5 font-semibold text-center">Onboarding</th>
                <th className="px-4 py-3.5 font-semibold text-center">Docs</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-4 py-3.5 font-semibold text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(d => (
                <React.Fragment key={d.id}>
                  <tr className={`hover:bg-slate-50/50 cursor-pointer ${d.status === 'blocked' ? 'opacity-50' : ''}`} onClick={() => setExpanded(expanded === d.id ? null : d.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpanded(expanded === d.id ? null : d.id))}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{FLAGS[d.countryCode]}</span>
                        <div>
                          <p className="font-bold text-slate-900">{d.name}</p>
                          <p className="text-[10px] text-slate-400">{d.id} • {d.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {d.vendorName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold">
                          <Building2 className="w-3 h-3" />{d.vendorName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Independent</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{VEHICLE_ICONS[d.vehicleType] || '🚗'}</span>
                      <span className="text-xs text-slate-600 font-medium ml-1">{d.vehicleModel}</span>
                      <p className="text-[10px] text-slate-400 font-mono">{d.vehiclePlate}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {d.rating > 0 ? <span className="inline-flex items-center gap-0.5"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="font-bold">{d.rating}</span></span> : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{d.totalTrips.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[50px] mx-auto">
                        <div className={`h-1.5 rounded-full ${d.onboardingProgress === 100 ? 'bg-emerald-500' : d.onboardingProgress >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} {...{ style: { width: `${d.onboardingProgress}%` } }} />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">{d.onboardingProgress}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {d.docsPending > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                          <FileText className="w-3 h-3" />{d.docsPending}
                        </span>
                      ) : <CheckCircle className="w-4 h-4 text-emerald-500 inline" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`${sCfg[d.status].bg} px-2.5 py-1 rounded-full text-[10px] font-bold`}>{sCfg[d.status].l}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {expanded === d.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </td>
                  </tr>
                  {expanded === d.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={9} className="px-5 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-0.5">Contact</p>
                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1"><Phone className="w-3 h-3" />{d.phone}</p>
                            <p className="text-xs text-slate-500">{d.email}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-0.5">Earnings</p>
                            <p className="font-bold text-slate-900">{d.earnings}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-0.5">Last Active</p>
                            <p className="font-bold text-slate-700">{d.lastActive}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                          {d.status === 'pending' && <button onClick={() => updateStatus(d.id, 'active')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>}
                          {d.status === 'active' && <button onClick={() => updateStatus(d.id, 'suspended')} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Suspend</button>}
                          {d.status === 'suspended' && <button onClick={() => updateStatus(d.id, 'active')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Reactivate</button>}
                          {d.status !== 'blocked' && <button onClick={() => updateStatus(d.id, 'blocked')} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><Ban className="w-3.5 h-3.5" /> Block</button>}
                          {d.status === 'blocked' && <button onClick={() => updateStatus(d.id, 'active')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Unblock</button>}
                          <button className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Documents</button>
                          <button className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Trip History</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No drivers match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
