'use client';

import React, { useState, useMemo } from 'react';
import {
  MapPin, Search, Download, AlertTriangle, CheckCircle, TrendingUp,
  Globe, BarChart3, ArrowUpRight, Clock, XCircle, Activity, Filter, Bell, Mail, Phone,
} from 'lucide-react';
import { usePincodeSearchLog, type PincodeSearchEntry } from '@/lib/contexts/pincode-search-log';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function PincodeSearchInsightsPage() {
  const { getSearchLog, getStats, getSearchCount, getNotifyMeSignups } = usePincodeSearchLog();
  const [filter, setFilter] = useState<'all' | 'unserviceable' | 'serviceable'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'log' | 'waitlist'>('log');

  const stats = useMemo(() => getStats(), [getStats]);
  const allEntries = useMemo(() => getSearchLog(), [getSearchLog]);

  const filteredEntries = useMemo(() => {
    let entries = allEntries;
    if (filter === 'unserviceable') entries = entries.filter(e => !e.serviceable);
    if (filter === 'serviceable') entries = entries.filter(e => e.serviceable);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(e =>
        e.pincode.includes(q) ||
        (e.city && e.city.toLowerCase().includes(q)) ||
        (e.state && e.state.toLowerCase().includes(q)) ||
        e.source.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [allEntries, filter, searchQuery]);

  const unserviceableRate = stats.totalSearches > 0
    ? Math.round((stats.unserviceableCount / stats.totalSearches) * 100)
    : 0;

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pincode Search Insights</h1>
          <p className="text-slate-500 text-sm">Track pincode searches across all customer touchpoints to identify unserviceable areas for delivery zone expansion.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-slate-300 text-slate-700 font-medium px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><Search className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.totalSearches.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Searches</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"><CheckCircle className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.serviceableCount}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serviceable</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm bg-red-50/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><XCircle className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-black text-red-700">{stats.unserviceableCount}</p>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Unserviceable</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-black text-slate-900">{unserviceableRate}%</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unserviceable Rate</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center"><MapPin className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.uniquePincodes}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unique Pincodes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('log')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'log' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Search Log
        </button>
        <button
          onClick={() => setActiveTab('waitlist')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${activeTab === 'waitlist' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Bell className="w-3.5 h-3.5" /> Demand Waitlist
          {(() => { const signups = getNotifyMeSignups(); return signups.length > 0 ? <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-black ${activeTab === 'waitlist' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>{signups.length}</span> : null; })()}
        </button>
      </div>

      {activeTab === 'log' ? (
      /* ── Search Log Tab ── */
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Top Unserviceable Pincodes (demand signal) */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-red-50/30">
              <h2 className="text-sm font-black text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Top Unserviceable Areas
              </h2>
              <p className="text-[10px] text-red-600 mt-0.5">High-demand areas where delivery is not available — candidates for new zones</p>
            </div>
            <div className="divide-y divide-slate-100">
              {stats.topUnserviceable.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <MapPin className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No unserviceable searches yet</p>
                </div>
              ) : (
                stats.topUnserviceable.slice(0, 10).map((item, i) => (
                  <div key={item.pincode} className="flex items-center gap-3 px-4 py-3 hover:bg-red-50/30 transition-colors">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      i < 3 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold font-mono text-slate-900">{item.pincode}</p>
                      <p className="text-[10px] text-slate-500">Last searched {timeAgo(item.lastSearched)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> {item.count}×
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Full Search Log Table */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 bg-slate-50/50 justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`text-sm font-bold px-3 py-1.5 rounded-lg ${
                    filter === 'all' ? 'text-indigo-600 bg-indigo-50 border border-indigo-200' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                  } transition-colors`}
                >All ({stats.totalSearches})</button>
                <button
                  onClick={() => setFilter('unserviceable')}
                  className={`text-sm font-bold px-3 py-1.5 rounded-lg ${
                    filter === 'unserviceable' ? 'text-red-600 bg-red-50 border border-red-200' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                  } transition-colors`}
                >Unserviceable ({stats.unserviceableCount})</button>
                <button
                  onClick={() => setFilter('serviceable')}
                  className={`text-sm font-bold px-3 py-1.5 rounded-lg ${
                    filter === 'serviceable' ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                  } transition-colors`}
                >Serviceable ({stats.serviceableCount})</button>
              </div>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search pincode, city, state..." aria-label="Search pincode, city, state..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-3 pl-5">Pincode</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Module</th>
                    <th className="p-3 pr-5">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-bold">No pincode searches found</p>
                        <p className="text-xs mt-1">Searches will appear here as customers check delivery availability.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.slice(0, 50).map(entry => (
                      <tr key={entry.id} className={`${!entry.serviceable ? 'bg-red-50/20 hover:bg-red-50/40' : 'hover:bg-slate-50'} transition-colors`}>
                        <td className="p-3 pl-5">
                          <span className="font-mono font-bold text-slate-900">{entry.pincode}</span>
                        </td>
                        <td className="p-3">
                          {entry.serviceable ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              <CheckCircle className="w-3 h-3" /> Serviceable
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              <XCircle className="w-3 h-3" /> Not Available
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {entry.city || entry.state ? (
                            <span className="text-xs text-slate-700">
                              {entry.city}{entry.city && entry.state ? ', ' : ''}{entry.state}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Unknown</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            {entry.source.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            {entry.module || 'unknown'}
                          </span>
                        </td>
                        <td className="p-3 pr-5 text-[10px] text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(entry.timestamp)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white text-sm">
              <p className="text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-900">{Math.min(filteredEntries.length, 50)}</span> of <span className="font-bold text-slate-900">{filteredEntries.length}</span> entries
              </p>
            </div>
          </div>
        </div>
      </div>
      ) : (
      /* ── Demand Waitlist Tab ── */
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-amber-50/30">
          <h2 className="text-sm font-black text-amber-800 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notify Me Signups
          </h2>
          <p className="text-[10px] text-amber-600 mt-0.5">Customers who requested delivery notifications for unserviceable areas — prioritize zones with highest signup counts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-3 pl-5">Pincode</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3 pr-5">Signed Up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {(() => {
                const signups = getNotifyMeSignups();
                if (signups.length === 0) return (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-bold">No signups yet</p>
                      <p className="text-xs mt-1">When customers sign up for delivery notifications, they&apos;ll appear here.</p>
                    </td>
                  </tr>
                );
                return signups.map(s => (
                  <tr key={s.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-3 pl-5"><span className="font-mono font-bold text-slate-900">{s.pincode}</span></td>
                    <td className="p-3">
                      <span className="flex items-center gap-1.5 text-xs text-slate-700"><Mail className="w-3 h-3 text-slate-400" />{s.email}</span>
                    </td>
                    <td className="p-3">
                      {s.phone ? <span className="flex items-center gap-1.5 text-xs text-slate-700"><Phone className="w-3 h-3 text-slate-400" />{s.phone}</span> : <span className="text-xs text-slate-400 italic">—</span>}
                    </td>
                    <td className="p-3 pr-5 text-[10px] text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTimestamp(s.timestamp)}</div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 bg-white text-sm">
          <p className="text-slate-500 font-medium">{getNotifyMeSignups().length} total signups</p>
        </div>
      </div>
      )}
    </div>
  );
}
