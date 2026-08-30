'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import React, { useState, useMemo } from 'react';
import { Shield, ShieldAlert, Key, UserCheck, AlertTriangle, FileText, Search, Download, Filter, Settings, Activity, Globe, Clock, MapPin } from 'lucide-react';
import { useAudit, type AuditSeverity, type AuditEntry } from '@/lib/contexts/audit-context';

const severityConfig: Record<AuditSeverity, { label: string; rowBg: string; dot: string; icon: React.ElementType }> = {
  info:     { label: 'Info',     rowBg: 'hover:bg-slate-50',          dot: 'bg-blue-500',   icon: Shield },
  warning:  { label: 'Warning',  rowBg: 'bg-amber-50/30 hover:bg-amber-50', dot: 'bg-amber-500',  icon: Key },
  critical: { label: 'Critical', rowBg: 'bg-red-50/30 hover:bg-red-50',     dot: 'bg-red-500',    icon: AlertTriangle },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

export default function AdminAuditLogsPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const { getAuditLog, getAuditCount } = useAudit();
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const entries = useMemo(() => {
    let results = getAuditLog(
      severityFilter !== 'all' ? { severity: severityFilter } : undefined
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(e =>
        e.action.toLowerCase().includes(q) ||
        e.adminName.toLowerCase().includes(q) ||
        e.adminEmail.toLowerCase().includes(q) ||
        e.module.toLowerCase().includes(q) ||
        e.regionName.toLowerCase().includes(q) ||
        (e.details && e.details.toLowerCase().includes(q)) ||
        e.ipAddress.includes(q)
      );
    }
    return results;
  }, [getAuditLog, severityFilter, searchQuery]);

  const totalCount = getAuditCount();
  const criticalCount = getAuditLog({ severity: 'critical' }).length;
  const warningCount = getAuditLog({ severity: 'warning' }).length;

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Security Audit Logs</h1>
          <p className="text-slate-500 text-sm">Monitor admin actions, regional events, unauthorized access attempts, and configuration changes.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-slate-300 text-slate-700 font-medium px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export Report (CSV)
          </button>
        </div>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0"><Activity className="w-6 h-6" /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">{totalCount.toLocaleString()}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Total Events</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0"><ShieldAlert className="w-6 h-6" /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">{criticalCount}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Critical Alerts</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">{warningCount}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Warnings</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0"><Globe className="w-6 h-6" /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">{new Set(entries.map(e => e.regionCode)).size}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Regions Active</p>
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 bg-slate-50/50 justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setSeverityFilter('all')}
              className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg shadow-sm ${
                severityFilter === 'all' ? 'text-indigo-600 bg-indigo-50 border border-indigo-200' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
              } transition-colors`}
            >
              All Events
            </button>
            <button
              onClick={() => setSeverityFilter('critical')}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg ${
                severityFilter === 'critical' ? 'text-red-600 bg-red-50 border border-red-200 font-bold' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
              } transition-colors`}
            >
              Critical <span className="w-2 h-2 rounded-full bg-red-500 ml-1"></span>
            </button>
            <button
              onClick={() => setSeverityFilter('warning')}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg ${
                severityFilter === 'warning' ? 'text-amber-600 bg-amber-50 border border-amber-200 font-bold' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
              } transition-colors`}
            >
              Warnings <span className="w-2 h-2 rounded-full bg-amber-500 ml-1"></span>
            </button>
          </div>
          <div className="relative w-full sm:w-72">
            <input 
              type="text" 
              placeholder="Search admin, action, region, IP..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4 pl-6">Timestamp</th>
                <th className="p-4">Action / Event</th>
                <th className="p-4">Admin (Role)</th>
                <th className="p-4">Region</th>
                <th className="p-4">Module</th>
                <th className="p-4">IP Address</th>
                <th className="p-4 pr-6">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-bold">No audit entries found</p>
                    <p className="text-xs mt-1">Events will appear here as admin actions are performed.</p>
                  </td>
                </tr>
              ) : (
                entries.map(entry => {
                  const sev = severityConfig[entry.severity];
                  const SevIcon = sev.icon;
                  return (
                    <tr key={entry.id} className={`${sev.rowBg} transition-colors`}>
                      <td className="p-4 pl-6 text-slate-500 font-medium whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(entry.timestamp)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${sev.dot} shrink-0`} />
                          <SevIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-900 text-xs">{entry.action}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-900 text-xs">{entry.adminName}</p>
                        <p className="text-[10px] text-slate-500">{entry.adminRoleName || 'Unknown'}</p>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          <MapPin className="w-3 h-3" />
                          {entry.regionName}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {entry.module}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-slate-600">{entry.ipAddress}</td>
                      <td className="p-4 pr-6 text-xs text-slate-600 max-w-xs truncate" title={entry.details}>
                        {entry.details || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white text-sm">
          <p className="text-slate-500 font-medium">Showing <span className="font-bold text-slate-900">{entries.length}</span> of <span className="font-bold text-slate-900">{totalCount}</span> events</p>
        </div>

      </div>

    </div>
  );
}
