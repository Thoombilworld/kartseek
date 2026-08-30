'use client';
import React, { useState } from 'react';
import { ScrollText, Search, Download, Shield, CheckCircle, XCircle, AlertTriangle, Zap, Edit2, Eye, X, Calendar, ChevronLeft, ChevronRight, Clock, User, Globe } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', 'Saudi Arabia': 'SA' };

type AuditLog = {
  id: string; country: string; actionType: string; actor: string; actorRole: string;
  entityType: string; entityId: string; entity: string; module: string;
  ipAddress: string; createdAt: string; reason: string;
  oldValue?: string; newValue?: string; userAgent?: string; sessionId?: string;
};

const AUDIT_LOGS: AuditLog[] = [
  { id: 'AUD-20001', country: 'India', actionType: 'product.approved', actor: 'Priya (Admin)', actorRole: 'Product Approval Manager', entityType: 'Product', entityId: 'PRD-44009', entity: 'Sony WH-1000XM5', module: 'Product Approvals', ipAddress: '10.0.1.42', createdAt: '2026-06-06 09:42:18', reason: 'All fields verified. HSN correct.', userAgent: 'Chrome 126 / macOS', sessionId: 'sess-8a2f1' },
  { id: 'AUD-20002', country: 'India', actionType: 'seller.suspended', actor: 'Raj (Admin)', actorRole: 'Marketplace Admin', entityType: 'Seller', entityId: 'MV-006', entity: 'QuickMart Express', module: 'Sellers', ipAddress: '10.0.1.38', createdAt: '2026-06-06 08:58:02', reason: 'Refund rate 15.2%, 28 complaints in 30 days.', userAgent: 'Chrome 126 / Windows', sessionId: 'sess-7b3c2' },
  { id: 'AUD-20003', country: 'India', actionType: 'brand.rejected', actor: 'Priya (Admin)', actorRole: 'Brand Approval Manager', entityType: 'Brand', entityId: 'BRD-2204', entity: 'AppleCore Tech (Fake)', module: 'Brand Center', ipAddress: '10.0.1.42', createdAt: '2026-06-05 08:22:44', reason: 'Potential IP infringement of Apple trademark.', userAgent: 'Chrome 126 / macOS', sessionId: 'sess-8a2f1' },
  { id: 'AUD-20004', country: 'India', actionType: 'campaign.approved', actor: 'Raj (Admin)', actorRole: 'Campaign Manager', entityType: 'Campaign', entityId: 'CMP-1001', entity: 'Electronics Mega Sale', module: 'Campaigns', ipAddress: '10.0.1.38', createdAt: '2026-06-04 07:15:31', reason: 'Verified discount within limits. Placement approved.', userAgent: 'Chrome 126 / Windows', sessionId: 'sess-7b3c2' },
  { id: 'AUD-20005', country: 'UAE', actionType: 'hsn.updated', actor: 'System', actorRole: 'Super Admin', entityType: 'HSN Code', entityId: 'H003', entity: 'HSN 8517 UAE VAT 5%', module: 'HSN Tax Master', ipAddress: '10.0.0.1', createdAt: '2026-06-03 18:42:00', reason: 'Annual VAT rate review update.', oldValue: 'VAT 0%', newValue: 'VAT 5%', userAgent: 'System / Cron', sessionId: 'sys-cron' },
  { id: 'AUD-20006', country: 'India', actionType: 'seller.approved', actor: 'Meena (Admin)', actorRole: 'Seller Approval Manager', entityType: 'Seller', entityId: 'SLR-9180', entity: 'TechGiant Store', module: 'Seller Approvals', ipAddress: '10.0.1.55', createdAt: '2026-06-03 16:30:12', reason: 'KYC verified. GSTIN valid. Documents complete.', userAgent: 'Safari 17 / macOS', sessionId: 'sess-9d4e3' },
  { id: 'AUD-20007', country: 'India', actionType: 'product.unpublished', actor: 'Raj (Admin)', actorRole: 'Marketplace Admin', entityType: 'Product', entityId: 'PRD-43890', entity: 'Unknown Brand Smartwatch', module: 'Products', ipAddress: '10.0.1.38', createdAt: '2026-06-02 14:20:55', reason: 'Counterfeit risk. Pending seller verification.', userAgent: 'Chrome 126 / Windows', sessionId: 'sess-7b3c2' },
  { id: 'AUD-20008', country: 'India', actionType: 'commission.changed', actor: 'Finance (Admin)', actorRole: 'Finance Manager', entityType: 'Commission Rule', entityId: 'COM-04', entity: 'Electronics Category Commission', module: 'Commissions', ipAddress: '10.0.1.21', createdAt: '2026-06-01 11:00:00', reason: 'Q2 2026 commission rate revision.', oldValue: '8%', newValue: '7%', userAgent: 'Chrome 126 / Windows', sessionId: 'sess-5f1a4' },
  { id: 'AUD-20009', country: 'Saudi Arabia', actionType: 'seller.approved', actor: 'Khalid (Admin)', actorRole: 'Seller Approval Manager', entityType: 'Seller', entityId: 'SLR-SA01', entity: 'Riyadh Fashion Co', module: 'Seller Approvals', ipAddress: '10.0.2.12', createdAt: '2026-05-31 14:10:00', reason: 'KYC verified. CR valid. Documents complete.', userAgent: 'Chrome 126 / Windows', sessionId: 'sess-3g2h5' },
  { id: 'AUD-20010', country: 'India', actionType: 'payout.released', actor: 'Finance (Admin)', actorRole: 'Finance Manager', entityType: 'Payout', entityId: 'PAY-6001', entity: 'Apple India Store — ₹4.1L', module: 'Payouts', ipAddress: '10.0.1.21', createdAt: '2026-05-30 10:00:00', reason: 'Monthly payout cycle. All verifications passed.', userAgent: 'Chrome 126 / Windows', sessionId: 'sess-5f1a4' },
];

const ACTION_STYLES: Record<string, { color: string; icon: React.ElementType }> = {
  'product.approved': { color: 'bg-emerald-100 text-emerald-600', icon: CheckCircle },
  'seller.approved': { color: 'bg-emerald-100 text-emerald-600', icon: CheckCircle },
  'campaign.approved': { color: 'bg-emerald-100 text-emerald-600', icon: CheckCircle },
  'payout.released': { color: 'bg-emerald-100 text-emerald-600', icon: CheckCircle },
  'seller.suspended': { color: 'bg-amber-100 text-amber-600', icon: AlertTriangle },
  'product.unpublished': { color: 'bg-amber-100 text-amber-600', icon: AlertTriangle },
  'brand.rejected': { color: 'bg-red-100 text-red-600', icon: XCircle },
  'hsn.updated': { color: 'bg-blue-100 text-blue-600', icon: Edit2 },
  'commission.changed': { color: 'bg-purple-100 text-purple-600', icon: Zap },
};

// ── Detail Drawer ────────────────────────────────────────────────────────────
function AuditDrawer({ log: l, onClose }: { log: AuditLog; onClose: () => void }) {
  const style = ACTION_STYLES[l.actionType] || { color: 'bg-slate-100 text-slate-600', icon: Eye };
  const Icon = style.icon;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{l.id}</h2><p className="text-xs text-slate-500">{l.createdAt}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className={`flex items-center gap-3 p-4 rounded-xl ${style.color}`}>
            <Icon className="w-6 h-6" />
            <div><p className="text-sm font-black">{l.actionType}</p><p className="text-xs opacity-70">{l.module}</p></div>
          </div>

          <div className="bg-slate-900 rounded-xl p-5 text-white"><p className="text-sm font-bold">{l.entity}</p><p className="text-xs text-slate-300 mt-1">{l.reason}</p></div>

          {/* Value Change */}
          {(l.oldValue || l.newValue) && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 mb-2">Value Change</p>
              <div className="flex items-center gap-3"><span className="text-sm font-bold text-red-500 line-through bg-red-50 px-2 py-1 rounded">{l.oldValue}</span><span className="text-sm text-slate-400">→</span><span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{l.newValue}</span></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Actor</p><p className="text-sm font-bold text-slate-900 flex items-center gap-1"><User className="w-3.5 h-3.5 text-blue-500" />{l.actor}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Role</p><p className="text-sm font-bold text-slate-900">{l.actorRole}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Entity Type</p><p className="text-sm font-bold text-slate-900">{l.entityType}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Entity ID</p><p className="text-sm font-bold font-mono text-blue-700">{l.entityId}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">IP Address</p><p className="text-sm font-bold font-mono text-slate-900">{l.ipAddress}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Region</p><p className="text-sm font-bold text-slate-900 flex items-center gap-1"><CountryFlag code={COUNTRY_TO_CODE[l.country] || 'IN'} size="sm" />{l.country}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">User Agent</p><p className="text-sm font-bold text-slate-900">{l.userAgent || '—'}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Session ID</p><p className="text-sm font-bold font-mono text-slate-900">{l.sessionId || '—'}</p></div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4"><p className="text-[10px] text-slate-500 mb-1">Full Reason / Notes</p><p className="text-sm text-slate-800 bg-white border border-slate-200 rounded-xl p-3">{l.reason}</p></div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getAuditLogs(), []);
  const { execute } = useAdminAction(showToast);
  const { filtered: regionFiltered, regionLabel, isFiltered } = useMarketplaceRegionFilter(AUDIT_LOGS);

  const modules = ['All', ...Array.from(new Set(regionFiltered.map(l => l.module)))];
  const filtered = regionFiltered.filter(l => {
    if (moduleFilter !== 'All' && l.module !== moduleFilter) return false;
    if (search && !l.entity.toLowerCase().includes(search.toLowerCase()) && !l.actor.toLowerCase().includes(search.toLowerCase()) && !l.id.includes(search) && !l.actionType.includes(search.toLowerCase())) return false;
    if (dateFrom && l.createdAt < dateFrom) return false;
    if (dateTo && l.createdAt > dateTo + ' 23:59:59') return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    const csv = ['ID,Timestamp,Action,Actor,Role,Entity,Module,IP,Reason', ...filtered.map(l => `${l.id},${l.createdAt},${l.actionType},${l.actor},${l.actorRole},${l.entity},${l.module},${l.ipAddress},"${l.reason}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('Audit logs exported as CSV', 'success');
  };

  // Action type distribution
  const actionCounts: Record<string, number> = {};
  regionFiltered.forEach(l => { actionCounts[l.actionType] = (actionCounts[l.actionType] || 0) + 1; });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Marketplace Audit Logs</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Immutable log of all admin actions — who, what, when, why</p></div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      <div className="bg-slate-900 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0"><Shield className="w-6 h-6 text-white" /></div>
        <div><p className="text-white font-black">All admin actions are permanently logged and tamper-proof.</p><p className="text-slate-400 text-sm mt-0.5">Actor, role, entity, IP address, session, reason, and old/new values are captured.</p></div>
        <div className="ml-auto text-right"><p className="text-white font-black text-xl">{regionFiltered.length}</p><p className="text-slate-400 text-xs">total entries</p></div>
      </div>

      {/* Action Distribution */}
      <div className="flex gap-2 flex-wrap">{Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).map(([action, count]) => {
        const style = ACTION_STYLES[action] || { color: 'bg-slate-100 text-slate-600', icon: Eye };
        const Icon = style.icon;
        return (<div key={action} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${style.color}`}><Icon className="w-3.5 h-3.5" />{action}<span className="font-black">{count}</span></div>);
      })}</div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search entity, actor, action type, or ID..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <select value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1); }} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white outline-none">{modules.map(m => <option key={m}>{m}</option>)}</select>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
        </div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><p className="text-sm font-bold text-slate-700">{filtered.length} log entries</p>{(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-[10px] font-bold text-blue-600 hover:text-blue-700">Clear dates</button>}</div>
        <div className="divide-y divide-slate-100">
          {paged.length === 0 ? (
            <div className="p-10 text-center"><ScrollText className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">No matching log entries</p></div>
          ) : paged.map(log => {
            const style = ACTION_STYLES[log.actionType] || { color: 'bg-slate-100 text-slate-600', icon: Eye };
            const Icon = style.icon;
            return (
              <div key={log.id} onClick={() => setSelected(log)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setSelected(log))} className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.color}`}><Icon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{log.actionType}</span>
                    <span className="text-sm font-bold text-slate-900">{log.entity}</span>
                    {(log.oldValue && log.newValue) && <span className="text-[10px] text-slate-400"><span className="text-red-500 line-through">{log.oldValue}</span> → <span className="text-emerald-600 font-bold">{log.newValue}</span></span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">by <span className="font-bold text-slate-700">{log.actor}</span> ({log.actorRole}) · {log.module} · <CountryFlag code={COUNTRY_TO_CODE[log.country] || 'IN'} size="sm" /></p>
                </div>
                <div className="text-right shrink-0"><p className="text-xs text-slate-500">{log.createdAt}</p><p className="text-[10px] font-mono text-slate-400 mt-0.5">IP: {log.ipAddress}</p></div>
              </div>
            );
          })}
        </div>
      </div>

      {totalPages > 1 && (<div className="flex items-center justify-between px-2"><p className="text-xs text-slate-500">{filtered.length} entries</p><div className="flex items-center gap-2"><button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><span className="text-xs font-bold">{page}/{totalPages}</span><button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>)}

      {selected && <AuditDrawer log={selected} onClose={() => setSelected(null)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
