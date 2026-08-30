'use client';
import React, { useState } from 'react';
import { AlertTriangle, Search, CheckCircle, XCircle, X, ChevronLeft, ChevronRight, Download, Eye, Clock, User, ArrowUpRight, MessageSquare, Shield } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', 'Saudi Arabia': 'SA' };

type Complaint = {
  id: string; customer: string; country: string; type: string; subject: string; description: string;
  orderId: string; seller: string; status: 'Open' | 'In Progress' | 'Escalated' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical'; date: string; assignee: string;
  timeline: { date: string; action: string; by: string }[];
};

const COMPLAINTS: Complaint[] = [
  { id: 'CMP-001', customer: 'Rohit Sharma', country: 'India', type: 'Product Quality', subject: 'Received damaged iPhone screen', description: 'The phone screen was cracked when I opened the box. Inner packaging was intact but the screen has a visible crack from top-right corner.', orderId: 'ORD-8890', seller: 'Apple India Store', status: 'In Progress', priority: 'High', date: '2026-06-06', assignee: 'Priya Agent', timeline: [{ date: '2026-06-06', action: 'Complaint filed', by: 'Customer' }, { date: '2026-06-06', action: 'Assigned to Priya Agent', by: 'System' }, { date: '2026-06-06', action: 'Seller notified', by: 'Priya Agent' }] },
  { id: 'CMP-002', customer: 'Priya Menon', country: 'India', type: 'Non-Delivery', subject: 'Order not delivered after 7 days', description: 'Tracking shows delivered but I never received the package. Called delivery partner, they have no record.', orderId: 'ORD-8885', seller: 'Samsung Official', status: 'Escalated', priority: 'Critical', date: '2026-06-05', assignee: 'Vikram Lead', timeline: [{ date: '2026-06-05', action: 'Complaint filed', by: 'Customer' }, { date: '2026-06-05', action: 'Escalated — delivery verification initiated', by: 'Vikram Lead' }] },
  { id: 'CMP-003', customer: 'Amit Patel', country: 'India', type: 'Wrong Product', subject: 'Received blue instead of black Nike shoes', description: 'I ordered black Nike Air Max but received navy blue. Product code matches but color is wrong.', orderId: 'ORD-8882', seller: 'Nike India', status: 'Open', priority: 'Medium', date: '2026-06-04', assignee: '', timeline: [{ date: '2026-06-04', action: 'Complaint filed', by: 'Customer' }] },
  { id: 'CMP-004', customer: 'Ahmed Al-Farsi', country: 'UAE', type: 'Seller Fraud', subject: 'Fake product advertised as genuine', description: 'Purchased what was listed as genuine Dyson V15 but received a cheap knockoff. Serial number does not match Dyson database.', orderId: 'ORD-8878', seller: 'Gulf Electronics FZE', status: 'Escalated', priority: 'Critical', date: '2026-06-03', assignee: 'Senior Team', timeline: [{ date: '2026-06-03', action: 'Complaint filed', by: 'Customer' }, { date: '2026-06-03', action: 'Seller suspended pending investigation', by: 'Senior Team' }] },
  { id: 'CMP-005', customer: 'Sneha Nair', country: 'India', type: 'Refund Delay', subject: 'Refund not received after 15 days', description: 'Return was approved and product picked up 15 days ago. Refund still shows as "Processing" in my account.', orderId: 'ORD-8870', seller: 'Heritage Silk House', status: 'In Progress', priority: 'High', date: '2026-06-02', assignee: 'Finance Team', timeline: [{ date: '2026-06-02', action: 'Complaint filed', by: 'Customer' }, { date: '2026-06-02', action: 'Forwarded to Finance', by: 'System' }] },
  { id: 'CMP-006', customer: 'Abdullah Al-Otaibi', country: 'Saudi Arabia', type: 'Service', subject: 'Warranty claim rejected unfairly', description: 'My laptop is still under warranty but the seller rejected my claim saying physical damage when there is none.', orderId: 'ORD-8865', seller: 'Riyadh Fashion Co', status: 'Open', priority: 'Medium', date: '2026-06-01', assignee: '', timeline: [{ date: '2026-06-01', action: 'Complaint filed', by: 'Customer' }] },
  { id: 'CMP-007', customer: 'Vikram Kumar', country: 'India', type: 'Product Quality', subject: 'TV has dead pixels', description: 'Brand new TV has 3 dead pixels visible on dark backgrounds. Samsung says this is within acceptable range but it is clearly visible.', orderId: 'ORD-8860', seller: 'Samsung Official', status: 'Resolved', priority: 'Low', date: '2026-05-30', assignee: 'Priya Agent', timeline: [{ date: '2026-05-30', action: 'Complaint filed', by: 'Customer' }, { date: '2026-05-31', action: 'Replacement authorized', by: 'Priya Agent' }, { date: '2026-06-02', action: 'Resolved — replacement delivered', by: 'System' }] },
];

const STATUS_STYLES: Record<string, string> = { Open: 'bg-blue-50 text-blue-700', 'In Progress': 'bg-amber-50 text-amber-700', Escalated: 'bg-red-50 text-red-700', Resolved: 'bg-emerald-50 text-emerald-700', Closed: 'bg-slate-100 text-slate-500' };
const PRIORITY_STYLES: Record<string, string> = { Low: 'bg-slate-100 text-slate-600', Medium: 'bg-blue-50 text-blue-600', High: 'bg-amber-50 text-amber-700', Critical: 'bg-red-100 text-red-700' };
const PAGE_SIZE = 5;

// ── Complaint Drawer ─────────────────────────────────────────────────────────
function ComplaintDrawer({ complaint: c, onClose, onResolve, onEscalate, onAssign }: { complaint: Complaint; onClose: () => void; onResolve: () => void; onEscalate: () => void; onAssign: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{c.id}</h2><p className="text-xs text-slate-500">{c.date}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[c.status]}`}>{c.status}</span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${PRIORITY_STYLES[c.priority]}`}>{c.priority}</span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{c.type}</span>
          </div>

          <div><h3 className="text-base font-bold text-slate-900 mb-1">{c.subject}</h3><p className="text-sm text-slate-700 leading-relaxed">{c.description}</p></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Customer</p><p className="text-sm font-bold text-slate-900">{c.customer}</p><p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><CountryFlag code={COUNTRY_TO_CODE[c.country] || 'IN'} size="sm" />{c.country}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Order</p><p className="text-sm font-bold text-blue-600">{c.orderId}</p><p className="text-[10px] text-slate-400 mt-0.5">Seller: {c.seller}</p></div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4"><p className="text-[10px] text-slate-500 mb-1">Assigned To</p><p className="text-sm font-bold text-slate-900">{c.assignee || <span className="text-amber-600">Unassigned</span>}</p></div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Timeline</h3>
            <div className="space-y-0 relative">
              <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-200" />
              {c.timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-3 py-2 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${i === 0 ? 'bg-blue-600' : 'bg-slate-200'}`}><Clock className={`w-3 h-3 ${i === 0 ? 'text-white' : 'text-slate-500'}`} /></div>
                  <div><p className="text-xs font-bold text-slate-900">{t.action}</p><p className="text-[10px] text-slate-400">{t.by} · {t.date}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {c.status !== 'Resolved' && c.status !== 'Closed' && (
            <div className="flex gap-3">
              {!c.assignee && <button onClick={onAssign} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><User className="w-4 h-4" /> Assign</button>}
              <button onClick={onResolve} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Resolve</button>
              {c.status !== 'Escalated' && <button onClick={onEscalate} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><ArrowUpRight className="w-4 h-4" /> Escalate</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Action Modal ─────────────────────────────────────────────────────────────
function ActionModal({ complaint, action, onConfirm, onClose }: { complaint: Complaint; action: 'resolve' | 'escalate' | 'assign'; onConfirm: (note: string) => void; onClose: () => void }) {
  const [note, setNote] = useState('');
  const titles = { resolve: 'Resolve Complaint', escalate: 'Escalate Complaint', assign: 'Assign Agent' };
  const icons = { resolve: <CheckCircle className="w-6 h-6 text-emerald-500" />, escalate: <ArrowUpRight className="w-6 h-6 text-red-500" />, assign: <User className="w-6 h-6 text-blue-500" /> };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">{icons[action]}<h3 className="text-lg font-black text-slate-900">{titles[action]}</h3></div>
        <p className="text-sm text-slate-600 mb-4">{complaint.id} — {complaint.subject}</p>
        {action === 'assign' ? (
          <select value={note} onChange={e => setNote(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm mb-4 outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">Select agent...</option>
            <option value="Priya Agent">Priya Agent</option>
            <option value="Vikram Lead">Vikram Lead</option>
            <option value="Finance Team">Finance Team</option>
            <option value="Senior Team">Senior Team</option>
          </select>
        ) : (
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={action === 'resolve' ? 'Resolution notes...' : 'Escalation reason...'} className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-24 outline-none focus:ring-2 focus:ring-blue-200 mb-4" />
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Cancel</button>
          <button onClick={() => onConfirm(note)} disabled={!note.trim()} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${action === 'resolve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : action === 'escalate' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>{action === 'resolve' ? 'Resolve' : action === 'escalate' ? 'Escalate' : 'Assign'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ComplaintsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [actionData, setActionData] = useState<{ complaint: Complaint; action: 'resolve' | 'escalate' | 'assign' } | null>(null);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getComplaints({ status: filter !== 'all' ? filter : undefined }),
    [filter]
  );
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered } = useMarketplaceRegionFilter(COMPLAINTS);
  const filtered = regionFiltered.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (priorityFilter && c.priority !== priorityFilter) return false;
    if (search && !c.subject.toLowerCase().includes(search.toLowerCase()) && !c.customer.toLowerCase().includes(search.toLowerCase()) && !c.id.includes(search)) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAction = (note: string) => {
    if (!actionData) return;
    const { complaint, action } = actionData;
    execute(
      () => adminMarketplaceApi.updateComplaint(complaint.id, { action, note }),
      `${complaint.id} ${action === 'resolve' ? 'resolved' : action === 'escalate' ? 'escalated' : `assigned to ${note}`}`,
      () => refetch()
    );
    setActionData(null);
    setSelected(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Customer Complaints</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Track, assign, and resolve customer issues</p></div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[{ l: 'Open', v: regionFiltered.filter(c => c.status === 'Open').length, c: 'text-blue-600' }, { l: 'In Progress', v: regionFiltered.filter(c => c.status === 'In Progress').length, c: 'text-amber-600' }, { l: 'Escalated', v: regionFiltered.filter(c => c.status === 'Escalated').length, c: 'text-red-600' }, { l: 'Resolved', v: regionFiltered.filter(c => c.status === 'Resolved').length, c: 'text-emerald-600' }, { l: 'Total', v: regionFiltered.length, c: 'text-slate-900' }].map(k => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className={`text-2xl font-black ${k.c}`}>{k.v}</p><p className="text-xs text-slate-500 mt-1">{k.l}</p></div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search complaint, customer, or ID..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'Open', 'In Progress', 'Escalated', 'Resolved'].map(s => (<button key={s} onClick={() => { setFilter(s); setPage(1); }} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}
        </div>
        <div className="flex gap-1">
          {['', 'Critical', 'High', 'Medium', 'Low'].map(p => (<button key={p} onClick={() => { setPriorityFilter(priorityFilter === p ? '' : p); setPage(1); }} className={`px-2.5 py-2 text-xs font-bold rounded-xl border transition-colors ${priorityFilter === p ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{p || '⚡'}</button>))}
        </div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Complaint</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Priority</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Customer</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Type</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Assigned</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.length === 0 ? (
              <tr><td colSpan={7}><MarketplaceEmptyState title="No complaints found" icon={AlertTriangle} /></td></tr>
            ) : paged.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setSelected(c)} tabIndex={0} onKeyDown={activateOnKey(() => setSelected(c))}>
                <td className="px-4 py-3.5"><p className="font-bold text-slate-900 text-xs">{c.subject}</p><p className="text-[10px] text-slate-400">{c.id} · {c.date}</p></td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${PRIORITY_STYLES[c.priority]}`}>{c.priority}</span></td>
                <td className="px-4 py-3.5"><p className="text-xs font-bold text-slate-900">{c.customer}</p><p className="text-[10px] text-slate-400"><CountryFlag code={COUNTRY_TO_CODE[c.country] || 'IN'} size="sm" /></p></td>
                <td className="px-4 py-3.5 text-xs text-slate-600">{c.type}</td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[c.status]}`}>{c.status}</span></td>
                <td className="px-4 py-3.5 text-xs text-slate-600">{c.assignee || <span className="text-amber-600 font-bold">Unassigned</span>}</td>
                <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setSelected(c)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button>
                    {c.status !== 'Resolved' && c.status !== 'Closed' && <>
                      {!c.assignee && <button onClick={() => setActionData({ complaint: c, action: 'assign' })} className="p-1.5 hover:bg-blue-50 rounded-lg"><User className="w-4 h-4 text-blue-500" /></button>}
                      <button onClick={() => setActionData({ complaint: c, action: 'resolve' })} className="p-1.5 hover:bg-emerald-50 rounded-lg"><CheckCircle className="w-4 h-4 text-emerald-500" /></button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (<div className="flex items-center justify-between px-2"><p className="text-xs text-slate-500">{filtered.length} complaints</p><div className="flex items-center gap-2"><button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><span className="text-xs font-bold">{page}/{totalPages}</span><button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>)}

      {selected && <ComplaintDrawer complaint={selected} onClose={() => setSelected(null)} onResolve={() => setActionData({ complaint: selected, action: 'resolve' })} onEscalate={() => setActionData({ complaint: selected, action: 'escalate' })} onAssign={() => setActionData({ complaint: selected, action: 'assign' })} />}
      {actionData && <ActionModal complaint={actionData.complaint} action={actionData.action} onConfirm={handleAction} onClose={() => setActionData(null)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
