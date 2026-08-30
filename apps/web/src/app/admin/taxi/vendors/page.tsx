'use client';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import React, { useState, useEffect } from 'react';
import {
  Building2, Search, Star, Eye, Ban, CheckCircle, Clock, XCircle,
  ChevronDown, ChevronUp, Phone, MapPin, Users, Truck, FileText,
  Shield, AlertTriangle, Plus, Globe, Filter, Download,
} from 'lucide-react';
import Link from 'next/link';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
// ─── Types ────────────────────────────────────────────────────────────────────

interface Vendor {
  id: string;
  name: string;
  countryCode: string;
  city: string;
  ownerName: string;
  email: string;
  phone: string;
  status: 'pending' | 'active' | 'suspended' | 'blocked' | 'rejected';
  driverCount: number;
  vehicleCount: number;
  totalTrips: number;
  revenue: string;
  rating: number;
  complaints: number;
  pendingDocs: number;
  lastActive: string;
  createdAt: string;
}

const sCfg: Record<string, { bg: string; l: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', l: 'Active' },
  suspended: { bg: 'bg-amber-100 text-amber-700', l: 'Suspended' },
  blocked: { bg: 'bg-red-100 text-red-700', l: 'Blocked' },
  pending: { bg: 'bg-blue-100 text-blue-700', l: 'Pending' },
  rejected: { bg: 'bg-slate-100 text-slate-500', l: 'Rejected' },
};

const FLAGS: Record<string, string> = { IN: '🇮🇳', US: '🇺🇸', NG: '🇳🇬', GB: '🇬🇧', AE: '🇦🇪' };

const mockVendors: Vendor[] = [
  { id: 'VND-001', name: 'QuickRide Fleet', countryCode: 'IN', city: 'Bangalore', ownerName: 'Suresh Rajan', email: 'suresh@quickride.in', phone: '+91 98765 43210', status: 'active', driverCount: 120, vehicleCount: 45, totalTrips: 12400, revenue: '₹8.2L', rating: 4.6, complaints: 8, pendingDocs: 0, lastActive: 'Now', createdAt: '2025-03-15' },
  { id: 'VND-002', name: 'Metro Cabs', countryCode: 'IN', city: 'Mumbai', ownerName: 'Anil Kumar', email: 'anil@metrocabs.in', phone: '+91 98765 43211', status: 'active', driverCount: 85, vehicleCount: 32, totalTrips: 8900, revenue: '₹5.8L', rating: 4.4, complaints: 12, pendingDocs: 2, lastActive: '10 min ago', createdAt: '2025-05-20' },
  { id: 'VND-003', name: 'SafeRide India', countryCode: 'IN', city: 'Mumbai', ownerName: 'Rajesh Kumar', email: 'james@saferide.in', phone: '+91 712 345678', status: 'active', driverCount: 60, vehicleCount: 25, totalTrips: 5200, revenue: '2.4M', rating: 4.5, complaints: 5, pendingDocs: 0, lastActive: '5 min ago', createdAt: '2025-01-10' },
  { id: 'VND-004', name: 'Lagos City Rides', countryCode: 'NG', city: 'Lagos', ownerName: 'Chukwuma Eze', email: 'chukwuma@lcr.ng', phone: '+234 812 345678', status: 'pending', driverCount: 0, vehicleCount: 15, totalTrips: 0, revenue: '₦0', rating: 0, complaints: 0, pendingDocs: 3, lastActive: 'New', createdAt: '2026-06-10' },
  { id: 'VND-005', name: 'Desert Express', countryCode: 'AE', city: 'Dubai', ownerName: 'Ahmed Al-Rashid', email: 'ahmed@desertexpress.ae', phone: '+971 55 123 4567', status: 'suspended', driverCount: 42, vehicleCount: 18, totalTrips: 3100, revenue: 'AED 180K', rating: 3.2, complaints: 28, pendingDocs: 1, lastActive: '3 days ago', createdAt: '2025-08-01' },
  { id: 'VND-006', name: 'PremiumRide UK', countryCode: 'GB', city: 'London', ownerName: 'James Smith', email: 'james@premiumride.co.uk', phone: '+44 7700 900123', status: 'active', driverCount: 35, vehicleCount: 20, totalTrips: 6800, revenue: '£45K', rating: 4.7, complaints: 3, pendingDocs: 0, lastActive: '2 min ago', createdAt: '2025-02-28' },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TaxiVendorsPage() {
  const { regionLabel, isFiltered, formatPrice } = useTaxiRegionFilter([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>(mockVendors);

  const filtered = vendors.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.ownerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchCountry = countryFilter === 'All' || v.countryCode === countryFilter;
    return matchSearch && matchStatus && matchCountry;
  });

  const updateStatus = (id: string, status: Vendor['status']) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, status } : v));
  };

  const stats = {
    total: vendors.length,
    active: vendors.filter(v => v.status === 'active').length,
    pending: vendors.filter(v => v.status === 'pending').length,
    suspended: vendors.filter(v => v.status === 'suspended').length,
    totalDrivers: vendors.reduce((sum, v) => sum + v.driverCount, 0),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-600" />
            Vendor Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage taxi fleet vendors across all regions. Approve registrations, review documents, and monitor performance.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors" id="export-vendors-btn">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-bold text-white transition-colors shadow-md" id="add-vendor-btn">
            <Plus className="w-3.5 h-3.5" /> Add Vendor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Building2 className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.total}</p>
          <p className="text-xs text-slate-500 font-medium">Total Vendors</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.active}</p>
          <p className="text-xs text-slate-500 font-medium">Active</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Clock className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.pending}</p>
          <p className="text-xs text-slate-500 font-medium">Pending Approval</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.suspended}</p>
          <p className="text-xs text-slate-500 font-medium">Suspended</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Users className="w-5 h-5 text-indigo-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.totalDrivers}</p>
          <p className="text-xs text-slate-500 font-medium">Total Drivers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Search vendors by name or owner..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" id="search-vendors"
          />
        </div>
        <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" id="filter-country"
        >
          <option value="All">🌍 All Countries</option>
          {Object.entries(FLAGS).map(([code, flag]) => <option key={code} value={code}>{flag} {code}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" id="filter-status"
        >
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Vendor</th>
                <th className="px-4 py-3.5 font-semibold">Country</th>
                <th className="px-4 py-3.5 font-semibold text-center">Drivers</th>
                <th className="px-4 py-3.5 font-semibold text-center">Rating</th>
                <th className="px-4 py-3.5 font-semibold text-right">Rides</th>
                <th className="px-4 py-3.5 font-semibold text-right">Revenue</th>
                <th className="px-4 py-3.5 font-semibold text-center">Docs</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-4 py-3.5 font-semibold text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(v => (
                <React.Fragment key={v.id}>
                  <tr className={`hover:bg-slate-50/50 cursor-pointer ${v.status === 'blocked' ? 'opacity-50' : ''}`} onClick={() => setExpanded(expanded === v.id ? null : v.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpanded(expanded === v.id ? null : v.id))}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-linear-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm">
                          {v.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{v.name}</p>
                          <p className="text-[10px] text-slate-400">{v.id} • {v.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-lg">{FLAGS[v.countryCode]}</span>
                      <span className="text-xs font-bold text-slate-500 ml-1">{v.countryCode}</span>
                    </td>
                    <td className="px-4 py-4 text-center font-bold">{v.driverCount}</td>
                    <td className="px-4 py-4 text-center">
                      {v.rating > 0 ? (
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="font-bold text-sm">{v.rating}</span>
                        </span>
                      ) : <span className="text-slate-400 text-xs">N/A</span>}
                    </td>
                    <td className="px-4 py-4 text-right font-bold">{v.totalTrips.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right font-bold">{v.revenue}</td>
                    <td className="px-4 py-4 text-center">
                      {v.pendingDocs > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                          <FileText className="w-3 h-3" />{v.pendingDocs}
                        </span>
                      ) : (
                        <span className="text-emerald-500"><CheckCircle className="w-4 h-4 inline" /></span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`${sCfg[v.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{sCfg[v.status].l}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {expanded === v.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </td>
                  </tr>
                  {expanded === v.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={9} className="px-5 py-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Owner</p>
                            <p className="font-bold text-slate-700">{v.ownerName}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{v.phone}</p>
                            <p className="text-xs text-slate-500">{v.email}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Fleet</p>
                            <p className="font-bold text-slate-900">{v.vehicleCount} vehicles, {v.driverCount} drivers</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Registered</p>
                            <p className="font-bold text-slate-700">{v.createdAt}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Complaints</p>
                            <p className={`font-bold ${v.complaints > 15 ? 'text-red-600' : v.complaints > 5 ? 'text-amber-600' : 'text-slate-700'}`}>{v.complaints} total</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
                          {v.status === 'pending' && (
                            <>
                              <button onClick={() => updateStatus(v.id, 'active')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1" id={`approve-${v.id}`}>
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button onClick={() => updateStatus(v.id, 'rejected')} className="bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold border border-red-200 flex items-center gap-1" id={`reject-${v.id}`}>
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}
                          {v.status === 'active' && (
                            <button onClick={() => updateStatus(v.id, 'suspended')} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1" id={`suspend-${v.id}`}>
                              <Clock className="w-3.5 h-3.5" /> Suspend
                            </button>
                          )}
                          {v.status === 'suspended' && (
                            <button onClick={() => updateStatus(v.id, 'active')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1" id={`reactivate-${v.id}`}>
                              <CheckCircle className="w-3.5 h-3.5" /> Reactivate
                            </button>
                          )}
                          {v.status !== 'blocked' && (
                            <button onClick={() => updateStatus(v.id, 'blocked')} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1" id={`block-${v.id}`}>
                              <Ban className="w-3.5 h-3.5" /> Block
                            </button>
                          )}
                          {v.status === 'blocked' && (
                            <button onClick={() => updateStatus(v.id, 'active')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1" id={`unblock-${v.id}`}>
                              <CheckCircle className="w-3.5 h-3.5" /> Unblock
                            </button>
                          )}
                          <Link href={`/admin/taxi/vendors/${v.id}`} className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1" id={`view-${v.id}`}>
                            <Eye className="w-3.5 h-3.5" /> View Details
                          </Link>
                          <button className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1" id={`docs-${v.id}`}>
                            <FileText className="w-3.5 h-3.5" /> Documents ({v.pendingDocs} pending)
                          </button>
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
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No vendors match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
