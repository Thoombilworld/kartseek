'use client';
import React, { useState } from 'react';
import { Send, Search, Plus, X, Download, Eye, Mail, Users, CheckCircle, Clock, MessageSquare, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', Global: 'UN' };

type SellerMessage = {
  id: string; subject: string; body: string; type: 'Broadcast' | 'Direct' | 'Policy Update' | 'Performance Alert';
  audience: string; country: string; sentAt: string;
  status: 'Sent' | 'Scheduled' | 'Draft';
  deliveredCount: number; readCount: number; acknowledgedCount: number;
  requiresAck: boolean;
};

const MESSAGES: SellerMessage[] = [
  { id: 'MSG-001', subject: '📢 New Commission Structure — Effective July 1', body: 'We are updating our commission structure across all categories. Electronics will move from 8% to 7%, while Fashion will increase from 12% to 14%. Please review the updated terms in your seller dashboard.', type: 'Policy Update', audience: 'All Sellers', country: 'India', sentAt: '2026-06-06 10:00', status: 'Sent', deliveredCount: 450, readCount: 320, acknowledgedCount: 180, requiresAck: true },
  { id: 'MSG-002', subject: '⚠️ Performance Warning — Low Dispatch Rate', body: 'Your dispatch rate has fallen below 85% in the last 7 days. Please ensure all orders are dispatched within the SLA. Continued low performance may result in account suspension.', type: 'Performance Alert', audience: 'Underperforming Sellers', country: 'India', sentAt: '2026-06-05 14:00', status: 'Sent', deliveredCount: 12, readCount: 10, acknowledgedCount: 8, requiresAck: true },
  { id: 'MSG-003', subject: '🎉 Summer Sale — Seller Participation Invite', body: 'Join our Summer Sale 2026! Register your products before June 15 to be featured on the homepage. Early registrations get premium placement.', type: 'Broadcast', audience: 'All Sellers', country: 'India', sentAt: '2026-06-04 09:00', status: 'Sent', deliveredCount: 450, readCount: 380, acknowledgedCount: 0, requiresAck: false },
  { id: 'MSG-004', subject: '📦 Updated Packaging Guidelines', body: 'New packaging requirements for fragile items are now mandatory. All electronics must include bubble wrap and foam inserts. Non-compliance will result in delivery failure penalties.', type: 'Policy Update', audience: 'Electronics Sellers', country: 'Global', sentAt: '2026-06-08 09:00', status: 'Scheduled', deliveredCount: 0, readCount: 0, acknowledgedCount: 0, requiresAck: true },
  { id: 'MSG-005', subject: 'Congratulations on your Top Seller Badge! 🏆', body: 'Dear Apple India Store, you have been awarded the Top Seller badge for June 2026! This badge will be displayed on all your product listings.', type: 'Direct', audience: 'Apple India Store', country: 'India', sentAt: '2026-06-06 16:00', status: 'Sent', deliveredCount: 1, readCount: 1, acknowledgedCount: 1, requiresAck: false },
  { id: 'MSG-006', subject: '🇦🇪 UAE Market Guidelines Update', body: 'Updated product listing requirements for UAE marketplace including Arabic description mandate and VAT compliance documentation.', type: 'Policy Update', audience: 'UAE Sellers', country: 'UAE', sentAt: '', status: 'Draft', deliveredCount: 0, readCount: 0, acknowledgedCount: 0, requiresAck: true },
];

const STATUS_STYLES: Record<string, string> = { Sent: 'bg-emerald-50 text-emerald-700', Scheduled: 'bg-blue-50 text-blue-700', Draft: 'bg-slate-100 text-slate-600' };
const TYPE_STYLES: Record<string, string> = { Broadcast: 'bg-purple-50 text-purple-700', Direct: 'bg-blue-50 text-blue-700', 'Policy Update': 'bg-amber-50 text-amber-700', 'Performance Alert': 'bg-red-50 text-red-700' };

// ── Message Drawer ───────────────────────────────────────────────────────────
function MessageDrawer({ msg: m, onClose }: { msg: SellerMessage; onClose: () => void }) {
  const readRate = m.deliveredCount ? ((m.readCount / m.deliveredCount) * 100).toFixed(0) : '0';
  const ackRate = m.deliveredCount ? ((m.acknowledgedCount / m.deliveredCount) * 100).toFixed(0) : '0';
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-base font-black text-slate-900">{m.id}</h2><p className="text-xs text-slate-500">{m.sentAt || 'Not sent'}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[m.status]}`}>{m.status}</span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${TYPE_STYLES[m.type]}`}>{m.type}</span>
            {m.requiresAck && <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md">Requires Ack</span>}
          </div>

          <div className="bg-slate-900 rounded-xl p-5 text-white"><p className="text-sm font-bold mb-2">{m.subject}</p><p className="text-xs text-slate-300 leading-relaxed">{m.body}</p></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Audience</p><p className="text-sm font-bold text-slate-900 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-blue-500" />{m.audience}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Region</p><p className="text-sm font-bold text-slate-900 flex items-center gap-1"><CountryFlag code={COUNTRY_TO_CODE[m.country] || 'UN'} size="sm" />{m.country}</p></div>
          </div>

          {m.status === 'Sent' && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3">Delivery Analytics</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-blue-700">{m.deliveredCount}</p><p className="text-[10px] text-blue-600">Delivered</p></div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-emerald-700">{readRate}%</p><p className="text-[10px] text-emerald-600">Read</p></div>
                <div className="bg-purple-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-purple-700">{ackRate}%</p><p className="text-[10px] text-purple-600">Acknowledged</p></div>
              </div>
              <div className="space-y-1">
                {[{ l: 'Delivered', v: m.deliveredCount, c: 'bg-blue-500' }, { l: 'Read', v: m.readCount, c: 'bg-emerald-500' }, { l: 'Acked', v: m.acknowledgedCount, c: 'bg-purple-500' }].map(f => (
                  <div key={f.l} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-16">{f.l}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${f.c}`} style={{ width: `${m.deliveredCount ? (f.v / m.deliveredCount) * 100 : 0}%` }} /></div>
                    <span className="text-[10px] font-bold text-slate-700 w-8 text-right">{f.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({ onSend, onClose }: { onSend: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ subject: '', body: '', type: 'Broadcast', audience: 'All Sellers', requiresAck: false, schedule: '' });
  const u = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-black text-slate-900 mb-4">Compose Message</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="type">Type</label><select id="type" value={form.type} onChange={e => u('type', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option>Broadcast</option><option>Direct</option><option>Policy Update</option><option>Performance Alert</option></select></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="audience">Audience</label><select id="audience" value={form.audience} onChange={e => u('audience', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option>All Sellers</option><option>Active Sellers</option><option>Underperforming Sellers</option><option>Electronics Sellers</option><option>Fashion Sellers</option><option>UAE Sellers</option><option>New Sellers</option></select></div>
          </div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="subject">Subject</label><input id="subject" value={form.subject} onChange={e => u('subject', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" placeholder="Message subject..." /></div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="body">Body</label><textarea id="body" value={form.body} onChange={e => u('body', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-32 outline-none focus:ring-2 focus:ring-blue-200" placeholder="Message content..." /></div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={form.requiresAck} onChange={e => u('requiresAck', e.target.checked)} className="w-4 h-4 rounded" />Require Acknowledgment</label>
          </div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="schedule-optional">Schedule (optional)</label><input id="schedule-optional" type="datetime-local" value={form.schedule} onChange={e => u('schedule', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
          {form.subject && (
            <div className="bg-slate-900 rounded-xl p-4 text-white"><div className="flex items-center gap-2 mb-2"><Megaphone className="w-3 h-3 text-slate-400" /><span className="text-[10px] text-slate-400">Preview</span></div><p className="text-xs font-bold">{form.subject}</p><p className="text-[10px] text-slate-300 mt-1">{form.body.substring(0, 100)}{form.body.length > 100 ? '...' : ''}</p></div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Cancel</button>
          <button onClick={() => onSend(form)} disabled={!form.subject || !form.body} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">{form.schedule ? <><Clock className="w-4 h-4" /> Schedule</> : <><Send className="w-4 h-4" /> Send</>}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function MessagingPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<SellerMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getNotifications(), []);
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered } = useMarketplaceRegionFilter(MESSAGES);
  const filtered = regionFiltered.filter(m => {
    if (filter !== 'all' && m.type !== filter) return false;
    if (search && !m.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalRead = regionFiltered.reduce((a, m) => a + m.readCount, 0);
  const totalDelivered = regionFiltered.reduce((a, m) => a + m.deliveredCount, 0);

  const handleSend = (data: any) => { execute(() => adminMarketplaceApi.sendNotification(data), data.schedule ? 'Message scheduled' : 'Message sent to sellers', () => refetch()); setShowCompose(false); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Seller Messaging</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Communicate with sellers — broadcasts, policies & alerts</p></div>
        <button onClick={() => setShowCompose(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"><Plus className="w-4 h-4" /> Compose</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: 'Messages Sent', v: regionFiltered.filter(m => m.status === 'Sent').length, c: 'text-emerald-600' }, { l: 'Scheduled', v: regionFiltered.filter(m => m.status === 'Scheduled').length, c: 'text-blue-600' }, { l: 'Total Delivered', v: totalDelivered, c: 'text-slate-900' }, { l: 'Avg Read Rate', v: totalDelivered ? ((totalRead / totalDelivered) * 100).toFixed(0) + '%' : '0%', c: 'text-purple-600' }].map(k => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className={`text-2xl font-black ${k.c}`}>{k.v}</p><p className="text-xs text-slate-500 mt-1">{k.l}</p></div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2">{['all', 'Broadcast', 'Policy Update', 'Performance Alert', 'Direct'].map(s => (<button key={s} onClick={() => setFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <MarketplaceEmptyState title="No messages found" icon={Send} />
        ) : filtered.map(m => (
          <div key={m.id} onClick={() => setSelected(m)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setSelected(m))} className="bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TYPE_STYLES[m.type]}`}>{m.type === 'Broadcast' ? <Megaphone className="w-5 h-5" /> : m.type === 'Direct' ? <MessageSquare className="w-5 h-5" /> : m.type === 'Policy Update' ? <Mail className="w-5 h-5" /> : <Send className="w-5 h-5" />}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-bold text-slate-900 text-sm">{m.subject}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[m.status]}`}>{m.status}</span>
                  {m.requiresAck && <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">Ack Required</span>}
                </div>
                <p className="text-xs text-slate-600 line-clamp-1 mb-1">{m.body}</p>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span>{m.audience}</span>
                  <span><CountryFlag code={COUNTRY_TO_CODE[m.country] || 'UN'} size="sm" /></span>
                  <span>{m.sentAt || 'Not sent'}</span>
                  {m.status === 'Sent' && <span className="text-emerald-600 font-bold">{m.readCount}/{m.deliveredCount} read · {m.acknowledgedCount} acked</span>}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); setSelected(m); }} className="p-1.5 hover:bg-slate-100 rounded-lg shrink-0"><Eye className="w-4 h-4 text-slate-400" /></button>
            </div>
          </div>
        ))}
      </div>

      {selected && <MessageDrawer msg={selected} onClose={() => setSelected(null)} />}
      {showCompose && <ComposeModal onSend={handleSend} onClose={() => setShowCompose(false)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
