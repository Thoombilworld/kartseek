'use client';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Search, Filter, Eye, ArrowUpRight, Clock,
  CheckCircle, XCircle, Shield, Building2, User, MapPin,
  TrendingUp, AlertOctagon, ChevronDown, ChevronUp, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low';
type Status = 'open' | 'investigating' | 'escalated' | 'resolved' | 'dismissed';
type Accountability = 'vendor' | 'platform';

interface Complaint {
  id: string;
  tripId: string;
  countryCode: string;
  filedBy: string;
  filerName: string;
  category: string;
  severity: Severity;
  description: string;
  driverName: string | null;
  vendorName: string | null;
  accountability: Accountability;
  status: Status;
  slaDeadline: string;
  slaBreached: boolean;
  createdAt: string;
  actionTaken: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const complaints: Complaint[] = [
  { id: 'CMP-001', tripId: 'RIDE-4823', countryCode: 'IN', filedBy: 'customer', filerName: 'Sarah Wanjiku', category: 'safety_incident', severity: 'critical', description: 'Driver was on the phone while driving at high speed on Thika Road', driverName: 'Rajesh Kumar', vendorName: 'SafeRide India', accountability: 'vendor', status: 'escalated', slaDeadline: '2026-06-17T15:00:00Z', slaBreached: false, createdAt: '2026-06-17T11:00:00Z', actionTaken: 'none' },
  { id: 'CMP-002', tripId: 'RIDE-4815', countryCode: 'IN', filedBy: 'customer', filerName: 'David Ochieng', category: 'overcharging', severity: 'high', description: 'Fare was 1,800 for a route that normally costs 900. No surge was indicated.', driverName: 'Peter Kamau', vendorName: null, accountability: 'platform', status: 'investigating', slaDeadline: '2026-06-18T11:00:00Z', slaBreached: false, createdAt: '2026-06-17T10:30:00Z', actionTaken: 'none' },
  { id: 'CMP-003', tripId: 'RIDE-4790', countryCode: 'IN', filedBy: 'customer', filerName: 'Anita Sharma', category: 'driver_behavior', severity: 'medium', description: 'Driver refused to turn on AC despite premium booking', driverName: 'Ravi Kumar', vendorName: 'QuickRide Fleet', accountability: 'vendor', status: 'open', slaDeadline: '2026-06-20T10:00:00Z', slaBreached: false, createdAt: '2026-06-17T10:00:00Z', actionTaken: 'none' },
  { id: 'CMP-004', tripId: 'RIDE-4780', countryCode: 'IN', filedBy: 'customer', filerName: 'Grace Njeri', category: 'route_deviation', severity: 'medium', description: 'Driver took a longer route via Delhi Road instead of Southern Bypass', driverName: 'Samuel Mishra', vendorName: 'SafeRide India', accountability: 'vendor', status: 'resolved', slaDeadline: '2026-06-19T08:00:00Z', slaBreached: false, createdAt: '2026-06-16T08:00:00Z', actionTaken: 'warning' },
  { id: 'CMP-005', tripId: 'RIDE-4770', countryCode: 'IN', filedBy: 'driver', filerName: 'Amit Singh', category: 'fare_dispute', severity: 'low', description: 'Customer refused to pay surge amount, only paid base fare', driverName: null, vendorName: null, accountability: 'platform', status: 'dismissed', slaDeadline: '2026-06-23T06:00:00Z', slaBreached: false, createdAt: '2026-06-16T06:00:00Z', actionTaken: 'none' },
  { id: 'CMP-006', tripId: 'RIDE-4760', countryCode: 'IN', filedBy: 'customer', filerName: 'Martin Kipruto', category: 'harassment', severity: 'critical', description: 'Driver made inappropriate comments during the ride', driverName: 'John Wafula', vendorName: null, accountability: 'platform', status: 'resolved', slaDeadline: '2026-06-16T18:00:00Z', slaBreached: true, createdAt: '2026-06-16T14:00:00Z', actionTaken: 'suspension' },
  { id: 'CMP-007', tripId: 'RIDE-4750', countryCode: 'IN', filedBy: 'customer', filerName: 'Priya Patel', category: 'vehicle_condition', severity: 'high', description: 'Vehicle had no working seatbelts in the rear seats', driverName: 'Karthik M.', vendorName: 'QuickRide Fleet', accountability: 'vendor', status: 'investigating', slaDeadline: '2026-06-18T04:00:00Z', slaBreached: false, createdAt: '2026-06-17T04:00:00Z', actionTaken: 'none' },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const sevCfg: Record<Severity, { bg: string; dot: string; l: string }> = {
  critical: { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500', l: 'Critical' },
  high: { bg: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', l: 'High' },
  medium: { bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', l: 'Medium' },
  low: { bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', l: 'Low' },
};

const stCfg: Record<Status, { bg: string; icon: typeof CheckCircle; l: string }> = {
  open: { bg: 'bg-blue-100 text-blue-700', icon: Clock, l: 'Open' },
  investigating: { bg: 'bg-indigo-100 text-indigo-700', icon: Search, l: 'Investigating' },
  escalated: { bg: 'bg-red-100 text-red-700', icon: AlertOctagon, l: 'Escalated' },
  resolved: { bg: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, l: 'Resolved' },
  dismissed: { bg: 'bg-slate-100 text-slate-500', icon: XCircle, l: 'Dismissed' },
};

const catLabels: Record<string, string> = {
  safety_incident: '🛑 Safety Incident',
  fare_dispute: '💰 Fare Dispute',
  driver_behavior: '👤 Driver Behavior',
  vehicle_condition: '🚗 Vehicle Condition',
  route_deviation: '🗺️ Route Deviation',
  overcharging: '💸 Overcharging',
  harassment: '⚠️ Harassment',
  payment_issue: '💳 Payment Issue',
  discrimination: '🚫 Discrimination',
  damage_to_property: '🏚️ Property Damage',
  lost_item: '📦 Lost Item',
  cancellation_abuse: '❌ Cancellation Abuse',
  no_show: '🚷 No Show',
  other: '📝 Other',
};

const countries = [
  { code: 'ALL', label: '🌍 All Countries' },
  { code: 'IN', label: '🇮🇳 India' },
  { code: 'IN', label: '🇮🇳 India' },
];

// ─── Stats Component ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, subtext }: { label: string; value: string | number; icon: typeof AlertTriangle; color: string; subtext?: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <Icon className={`w-5 h-5 ${color}`} />
      <p className="text-2xl font-black text-slate-900 mt-2">{value}</p>
      <p className="text-[10px] text-slate-500 font-medium">{label}</p>
      {subtext && <p className="text-[10px] text-slate-400 mt-0.5">{subtext}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComplaintDashboard() {
  const { regionLabel, isFiltered, formatPrice } = useTaxiRegionFilter([]);
  const [search, setSearch] = useState('');
  const [cc, setCc] = useState('ALL');
  const [sf, setSf] = useState('All');
  const [sev, setSev] = useState('All');
  const [acc, setAcc] = useState('All');

  const filtered = complaints.filter(c => {
    if (cc !== 'ALL' && c.countryCode !== cc) return false;
    if (sf !== 'All' && c.status !== sf) return false;
    if (sev !== 'All' && c.severity !== sev) return false;
    if (acc !== 'All' && c.accountability !== acc) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        c.id.toLowerCase().includes(s) ||
        c.tripId.toLowerCase().includes(s) ||
        c.filerName.toLowerCase().includes(s) ||
        c.driverName?.toLowerCase().includes(s) ||
        c.vendorName?.toLowerCase().includes(s) ||
        c.description.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const openCount = complaints.filter(c => ['open', 'investigating', 'escalated'].includes(c.status)).length;
  const criticalCount = complaints.filter(c => c.severity === 'critical' && c.status !== 'resolved' && c.status !== 'dismissed').length;
  const slaBreachedCount = complaints.filter(c => c.slaBreached).length;
  const vendorCount = complaints.filter(c => c.accountability === 'vendor').length;
  const platformCount = complaints.filter(c => c.accountability === 'platform').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          Complaint & Compliance
        </h1>
        <p className="text-slate-500 text-sm mt-2">
          Track, investigate, and resolve complaints. Trace accountability to vendors or the platform. Enforce disciplinary actions.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Complaints" value={complaints.length} icon={AlertTriangle} color="text-slate-500" />
        <StatCard label="Active / Open" value={openCount} icon={Clock} color="text-blue-500" subtext="Awaiting resolution" />
        <StatCard label="Critical" value={criticalCount} icon={AlertOctagon} color="text-red-500" subtext="Requires immediate action" />
        <StatCard label="SLA Breached" value={slaBreachedCount} icon={Zap} color="text-amber-500" subtext="Past deadline" />
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          <div className="flex items-center gap-3 mt-2">
            <div>
              <p className="text-lg font-black text-purple-600">{vendorCount}</p>
              <p className="text-[10px] text-slate-500 font-medium">Vendor</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <p className="text-lg font-black text-indigo-600">{platformCount}</p>
              <p className="text-[10px] text-slate-500 font-medium">Platform</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Accountability Split</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Search by ID, trip, driver, vendor, or description..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" id="complaint-search" />
        </div>
        <select value={cc} onChange={e => setCc(e.target.value)} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" id="complaint-country">
          {countries.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        <select value={sf} onChange={e => setSf(e.target.value)} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" id="complaint-status">
          <option value="All">All Status</option>
          {Object.entries(stCfg).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
        <select value={sev} onChange={e => setSev(e.target.value)} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" id="complaint-severity">
          <option value="All">All Severity</option>
          {Object.entries(sevCfg).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
        <select value={acc} onChange={e => setAcc(e.target.value)} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" id="complaint-accountability">
          <option value="All">All Accountability</option>
          <option value="vendor">Vendor</option>
          <option value="platform">Platform</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Complaint</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold text-center">Severity</th>
                <th className="px-4 py-3 font-semibold">Accountability</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold">SLA</th>
                <th className="px-3 py-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => {
                const sv = sevCfg[c.severity];
                const st = stCfg[c.status];
                const StIcon = st.icon;
                const now = new Date();
                const sla = new Date(c.slaDeadline);
                const slaHoursLeft = Math.max(0, Math.round((sla.getTime() - now.getTime()) / (1000 * 60 * 60)));

                return (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <p className="font-bold text-slate-900 text-xs">{c.id}</p>
                      <p className="text-[10px] text-slate-400">Trip: {c.tripId} • {c.countryCode}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Filed by: {c.filerName}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{catLabels[c.category] || c.category}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`${sv.bg} px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sv.dot}`} />{sv.l}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.accountability === 'vendor' ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-purple-500" />
                          <div>
                            <p className="text-xs font-bold text-purple-700">{c.vendorName}</p>
                            <p className="text-[10px] text-slate-400">{c.driverName}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-indigo-500" />
                          <div>
                            <p className="text-xs font-bold text-indigo-700">Platform</p>
                            <p className="text-[10px] text-slate-400">{c.driverName || 'N/A'}</p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`${st.bg} px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1`}>
                        <StIcon className="w-3 h-3" />{st.l}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.slaBreached ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">BREACHED</span>
                      ) : c.status === 'resolved' || c.status === 'dismissed' ? (
                        <span className="text-[10px] text-slate-400">—</span>
                      ) : (
                        <span className={`text-[10px] font-bold ${slaHoursLeft <= 4 ? 'text-red-600' : slaHoursLeft <= 24 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {slaHoursLeft}h left
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Link href={`/admin/taxi/complaints/${c.id}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-colors" id={`view-complaint-${c.id}`}>
                        <Eye className="w-3 h-3" /> View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">No complaints match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
