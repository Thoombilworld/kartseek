'use client';
import React, { useState } from 'react';
import { Bell, Search, Plus, X, ChevronLeft, ChevronRight, Download, Eye, Send, Users, Mail, Smartphone, CheckCircle, Clock } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', 'Saudi Arabia': 'SA', Global: 'UN' };

type Notification = {
  id: string; title: string; body: string; channel: 'Push' | 'Email' | 'SMS' | 'In-App';
  audience: string; country: string; status: 'Sent' | 'Scheduled' | 'Draft' | 'Failed';
  sentAt: string; deliveredCount: number; openedCount: number; clickedCount: number;
  template: string;
};

const NOTIFICATIONS: Notification[] = [
  { id: 'NOT-001', title: '🎉 Summer Sale is LIVE!', body: 'Get up to 50% off on electronics, fashion & more. Use code SUMMER26 for extra 20% off.', channel: 'Push', audience: 'All Customers', country: 'India', status: 'Sent', sentAt: '2026-06-06 10:00', deliveredCount: 125000, openedCount: 45000, clickedCount: 12000, template: 'Promotional' },
  { id: 'NOT-002', title: 'Your order has been shipped!', body: 'Order ORD-8890 is on its way. Track your delivery in the app.', channel: 'Push', audience: 'Transactional', country: 'India', status: 'Sent', sentAt: '2026-06-06 14:30', deliveredCount: 1, openedCount: 1, clickedCount: 1, template: 'Transactional' },
  { id: 'NOT-003', title: 'Flash Deal Alert ⚡', body: 'iPhone 15 Pro at lowest ever price! Only for next 2 hours.', channel: 'Push', audience: 'App Users', country: 'India', status: 'Scheduled', sentAt: '2026-06-08 12:00', deliveredCount: 0, openedCount: 0, clickedCount: 0, template: 'Flash Deal' },
  { id: 'NOT-004', title: 'Welcome to KARTSEEK! 🛍️', body: 'Thanks for joining! Here\'s ₹500 off on your first order. Use code FIRST500.', channel: 'Email', audience: 'New Users', country: 'India', status: 'Sent', sentAt: '2026-06-05 09:00', deliveredCount: 2400, openedCount: 1200, clickedCount: 380, template: 'Welcome' },
  { id: 'NOT-005', title: 'UAE National Day Offers 🇦🇪', body: 'Exclusive discounts for our UAE customers. Shop now!', channel: 'Push', audience: 'UAE Customers', country: 'UAE', status: 'Draft', sentAt: '', deliveredCount: 0, openedCount: 0, clickedCount: 0, template: 'Promotional' },
  { id: 'NOT-006', title: 'Cart Reminder: Items waiting!', body: 'You left 3 items in your cart. Complete your purchase before they sell out!', channel: 'Push', audience: 'Cart Abandoners', country: 'India', status: 'Sent', sentAt: '2026-06-06 18:00', deliveredCount: 8900, openedCount: 3200, clickedCount: 890, template: 'Recovery' },
  { id: 'NOT-007', title: 'Seller Update: New policies', body: 'Important policy updates effective July 1. Please review the updated terms.', channel: 'Email', audience: 'All Sellers', country: 'Global', status: 'Sent', sentAt: '2026-06-04 11:00', deliveredCount: 450, openedCount: 320, clickedCount: 180, template: 'Seller' },
  { id: 'NOT-008', title: 'Weekend SMS Campaign', body: 'Weekend special! Flat 30% off on fashion.', channel: 'SMS', audience: 'Active Shoppers', country: 'India', status: 'Failed', sentAt: '2026-06-03 08:00', deliveredCount: 0, openedCount: 0, clickedCount: 0, template: 'Promotional' },
];

const STATUS_STYLES: Record<string, string> = { Sent: 'bg-emerald-50 text-emerald-700', Scheduled: 'bg-blue-50 text-blue-700', Draft: 'bg-slate-100 text-slate-600', Failed: 'bg-red-50 text-red-700' };
const CHANNEL_STYLES: Record<string, { icon: any; bg: string }> = { Push: { icon: Smartphone, bg: 'bg-purple-50 text-purple-700' }, Email: { icon: Mail, bg: 'bg-blue-50 text-blue-700' }, SMS: { icon: Send, bg: 'bg-amber-50 text-amber-700' }, 'In-App': { icon: Bell, bg: 'bg-emerald-50 text-emerald-700' } };

// ── Notification Detail Drawer ───────────────────────────────────────────────
function NotificationDrawer({ item: n, onClose, onResend }: { item: Notification; onClose: () => void; onResend: () => void }) {
  const openRate = n.deliveredCount ? ((n.openedCount / n.deliveredCount) * 100).toFixed(1) : '0';
  const clickRate = n.openedCount ? ((n.clickedCount / n.openedCount) * 100).toFixed(1) : '0';
  const ChIcon = CHANNEL_STYLES[n.channel]?.icon || Bell;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{n.id}</h2><p className="text-xs text-slate-500">{n.sentAt || 'Not sent'}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[n.status]}`}>{n.status}</span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${CHANNEL_STYLES[n.channel]?.bg}`}><ChIcon className="w-3 h-3 inline mr-0.5" />{n.channel}</span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{n.template}</span>
          </div>

          {/* Preview */}
          <div className="bg-slate-900 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3"><Bell className="w-4 h-4 text-slate-400" /><span className="text-xs text-slate-400">KARTSEEK</span></div>
            <p className="text-sm font-bold mb-1">{n.title}</p>
            <p className="text-xs text-slate-300">{n.body}</p>
          </div>

          {/* Targeting */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Audience</p><p className="text-sm font-bold text-slate-900 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-blue-500" />{n.audience}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Region</p><p className="text-sm font-bold text-slate-900 flex items-center gap-1"><CountryFlag code={COUNTRY_TO_CODE[n.country] || 'UN'} size="sm" />{n.country}</p></div>
          </div>

          {/* Analytics */}
          {n.status === 'Sent' && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3">Delivery Analytics</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-blue-700">{n.deliveredCount.toLocaleString()}</p><p className="text-[10px] text-blue-600">Delivered</p></div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-emerald-700">{openRate}%</p><p className="text-[10px] text-emerald-600">Open Rate</p></div>
                <div className="bg-purple-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-purple-700">{clickRate}%</p><p className="text-[10px] text-purple-600">Click Rate</p></div>
              </div>
              {/* Funnel */}
              <div className="mt-3 space-y-1">
                {[{ l: 'Delivered', v: n.deliveredCount, c: 'bg-blue-500' }, { l: 'Opened', v: n.openedCount, c: 'bg-emerald-500' }, { l: 'Clicked', v: n.clickedCount, c: 'bg-purple-500' }].map(f => (
                  <div key={f.l} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-16">{f.l}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${f.c}`} style={{ width: `${n.deliveredCount ? (f.v / n.deliveredCount) * 100 : 0}%` }} /></div>
                    <span className="text-[10px] font-bold text-slate-700 w-12 text-right">{f.v.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {n.status === 'Sent' && (
            <button onClick={onResend} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Resend</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Send Notification Modal ──────────────────────────────────────────────────
function SendModal({ onSend, onClose }: { onSend: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: '', body: '', channel: 'Push', audience: 'All Customers', template: 'Promotional', schedule: '' });
  const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-black text-slate-900 mb-4">Send Notification</h3>
        <div className="space-y-4">
          <div><label className="text-xs font-bold text-slate-600 mb-1 block">Channel</label>
            <div className="flex gap-2">{['Push', 'Email', 'SMS', 'In-App'].map(c => { const C = CHANNEL_STYLES[c]?.icon || Bell; return (<button key={c} onClick={() => u('channel', c)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${form.channel === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}><C className="w-3.5 h-3.5" />{c}</button>); })}</div>
          </div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="template">Template</label>
            <select id="template" value={form.template} onChange={e => u('template', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option>Promotional</option><option>Transactional</option><option>Flash Deal</option><option>Welcome</option><option>Recovery</option><option>Seller</option></select>
          </div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="title">Title</label><input id="title" value={form.title} onChange={e => u('title', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" placeholder="Notification title..." /></div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="body">Body</label><textarea id="body" value={form.body} onChange={e => u('body', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-24 outline-none focus:ring-2 focus:ring-blue-200" placeholder="Notification body..." /></div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="audience">Audience</label>
            <select id="audience" value={form.audience} onChange={e => u('audience', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option>All Customers</option><option>App Users</option><option>New Users</option><option>Active Shoppers</option><option>Cart Abandoners</option><option>All Sellers</option><option>UAE Customers</option></select>
          </div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="schedule-optional">Schedule (optional)</label><input id="schedule-optional" type="datetime-local" value={form.schedule} onChange={e => u('schedule', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" /></div>

          {/* Preview */}
          {form.title && (
            <div className="bg-slate-900 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2"><Bell className="w-3 h-3 text-slate-400" /><span className="text-[10px] text-slate-400">KARTSEEK • Preview</span></div>
              <p className="text-xs font-bold">{form.title}</p>
              <p className="text-[10px] text-slate-300 mt-0.5">{form.body}</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Cancel</button>
          <button onClick={() => onSend(form)} disabled={!form.title || !form.body} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">{form.schedule ? <><Clock className="w-4 h-4" /> Schedule</> : <><Send className="w-4 h-4" /> Send Now</>}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [showSend, setShowSend] = useState(false);
  const PAGE_SIZE = 5;

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getNotifications(), []);
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered } = useMarketplaceRegionFilter(NOTIFICATIONS);
  const filtered = regionFiltered.filter(n => {
    if (filter !== 'all' && n.status !== filter) return false;
    if (channelFilter && n.channel !== channelFilter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalDelivered = regionFiltered.reduce((a, n) => a + n.deliveredCount, 0);
  const totalOpened = regionFiltered.reduce((a, n) => a + n.openedCount, 0);

  const handleSend = (data: any) => { execute(() => adminMarketplaceApi.sendNotification(data), data.schedule ? `Notification scheduled for ${data.schedule}` : 'Notification sent!', () => refetch()); setShowSend(false); };
  const handleResend = (n: Notification) => { execute(() => adminMarketplaceApi.sendNotification({ title: n.title, body: n.body, channel: n.channel, audience: n.audience }), `${n.id} resent`, () => refetch()); setSelected(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Notifications</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Send and manage push, email, SMS & in-app notifications</p></div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setShowSend(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"><Plus className="w-4 h-4" /> Send Notification</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: 'Total Sent', v: regionFiltered.filter(n => n.status === 'Sent').length, c: 'text-emerald-600' }, { l: 'Scheduled', v: regionFiltered.filter(n => n.status === 'Scheduled').length, c: 'text-blue-600' }, { l: 'Delivered', v: totalDelivered.toLocaleString(), c: 'text-slate-900' }, { l: 'Avg Open Rate', v: totalDelivered ? ((totalOpened / totalDelivered) * 100).toFixed(1) + '%' : '0%', c: 'text-purple-600' }].map(k => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className={`text-2xl font-black ${k.c}`}>{k.v}</p><p className="text-xs text-slate-500 mt-1">{k.l}</p></div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search notification title..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2">{['all', 'Sent', 'Scheduled', 'Draft', 'Failed'].map(s => (<button key={s} onClick={() => { setFilter(s); setPage(1); }} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}</div>
        <div className="flex gap-1">{['', 'Push', 'Email', 'SMS'].map(c => (<button key={c} onClick={() => { setChannelFilter(channelFilter === c ? '' : c); setPage(1); }} className={`px-2.5 py-2 text-xs font-bold rounded-xl border transition-colors ${channelFilter === c ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{c || '📱'}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="space-y-3">
        {paged.length === 0 ? (
          <MarketplaceEmptyState title="No notifications found" icon={Bell} />
        ) : paged.map(n => {
          const ChIcon = CHANNEL_STYLES[n.channel]?.icon || Bell;
          return (
            <div key={n.id} onClick={() => setSelected(n)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setSelected(n))} className="bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${CHANNEL_STYLES[n.channel]?.bg}`}><ChIcon className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-bold text-slate-900 text-sm">{n.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[n.status]}`}>{n.status}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1 mb-1">{n.body}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span>{n.audience}</span>
                    <span><CountryFlag code={COUNTRY_TO_CODE[n.country] || 'UN'} size="sm" /></span>
                    <span>{n.sentAt || 'Not sent'}</span>
                    {n.status === 'Sent' && <span className="text-emerald-600 font-bold">{n.deliveredCount.toLocaleString()} delivered · {n.openedCount ? ((n.openedCount / n.deliveredCount) * 100).toFixed(0) : 0}% opened</span>}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); setSelected(n); }} className="p-1.5 hover:bg-slate-100 rounded-lg shrink-0"><Eye className="w-4 h-4 text-slate-400" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (<div className="flex items-center justify-between px-2"><p className="text-xs text-slate-500">{filtered.length} notifications</p><div className="flex items-center gap-2"><button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><span className="text-xs font-bold">{page}/{totalPages}</span><button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>)}

      {selected && <NotificationDrawer item={selected} onClose={() => setSelected(null)} onResend={() => handleResend(selected)} />}
      {showSend && <SendModal onSend={handleSend} onClose={() => setShowSend(false)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
