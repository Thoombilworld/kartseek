'use client';
import React, { useState } from 'react';
import { Plug, Search, Eye, X, CheckCircle, AlertTriangle, XCircle, Settings, Zap, Globe, CreditCard, Truck, MessageSquare, BarChart3, Shield } from 'lucide-react';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type Integration = {
  id: string; name: string; category: string; provider: string; description: string;
  status: 'Connected' | 'Disconnected' | 'Error' | 'Beta';
  icon: string; lastSync: string; apiCalls24h: number;
  config: { key: string; value: string; masked?: boolean }[];
};

const INTEGRATIONS: Integration[] = [
  { id: 'INT-001', name: 'Razorpay', category: 'Payments', provider: 'Razorpay Software Pvt Ltd', description: 'Primary payment gateway — UPI, cards, net banking, wallets', status: 'Connected', icon: '💳', lastSync: '2 min ago', apiCalls24h: 48200, config: [{ key: 'API Key', value: 'rzp_live_****M2kp', masked: true }, { key: 'Webhook Secret', value: '****5f2a', masked: true }, { key: 'Auto Capture', value: 'Enabled' }] },
  { id: 'INT-002', name: 'Shiprocket', category: 'Logistics', provider: 'BigFoot Retail Solutions', description: 'Multi-carrier shipping aggregator — Delhivery, BlueDart, DTDC', status: 'Connected', icon: '🚚', lastSync: '5 min ago', apiCalls24h: 12400, config: [{ key: 'Email', value: 'ops@kartseek.com' }, { key: 'API Token', value: '****a8b2', masked: true }, { key: 'Default Pickup', value: 'Mumbai Hub' }] },
  { id: 'INT-003', name: 'Google Analytics 4', category: 'Analytics', provider: 'Google LLC', description: 'Web and app analytics — user behavior, conversion tracking', status: 'Connected', icon: '📊', lastSync: 'Real-time', apiCalls24h: 0, config: [{ key: 'Measurement ID', value: 'G-XXXX1234' }, { key: 'Enhanced Ecommerce', value: 'Enabled' }] },
  { id: 'INT-004', name: 'Twilio', category: 'Communication', provider: 'Twilio Inc.', description: 'SMS & WhatsApp notifications — OTP, order updates', status: 'Connected', icon: '📱', lastSync: '1 min ago', apiCalls24h: 8900, config: [{ key: 'Account SID', value: 'AC****f3e1', masked: true }, { key: 'Sender ID', value: 'KRTSEEK' }] },
  { id: 'INT-005', name: 'Clevertap', category: 'Marketing', provider: 'CleverTap Private Ltd', description: 'Customer engagement — push notifications, in-app messaging', status: 'Connected', icon: '🎯', lastSync: '10 min ago', apiCalls24h: 24000, config: [{ key: 'Account ID', value: '****-R96K' }, { key: 'Passcode', value: '****3d2e', masked: true }] },
  { id: 'INT-006', name: 'GST Suvidha', category: 'Compliance', provider: 'GSTN', description: 'E-invoicing & e-way bill generation via GSP', status: 'Connected', icon: '🏛️', lastSync: '30 min ago', apiCalls24h: 3200, config: [{ key: 'ASP ID', value: 'KART****01' }, { key: 'IRN Generation', value: 'Auto' }] },
  { id: 'INT-007', name: 'Freshdesk', category: 'Support', provider: 'Freshworks Inc.', description: 'Customer support ticketing and agent management', status: 'Connected', icon: '🎧', lastSync: '3 min ago', apiCalls24h: 5600, config: [{ key: 'Domain', value: 'kartseek.freshdesk.com' }, { key: 'API Key', value: '****7h4j', masked: true }] },
  { id: 'INT-008', name: 'Amazon Pay', category: 'Payments', provider: 'Amazon Pay (India)', description: 'Additional payment option for Amazon wallet users', status: 'Disconnected', icon: '🛒', lastSync: 'Never', apiCalls24h: 0, config: [] },
  { id: 'INT-009', name: 'Algolia', category: 'Search', provider: 'Algolia Inc.', description: 'AI-powered product search with typo tolerance and facets', status: 'Beta', icon: '🔍', lastSync: '15 min ago', apiCalls24h: 35000, config: [{ key: 'App ID', value: 'KART****5X' }, { key: 'Index', value: 'products_v2' }] },
  { id: 'INT-010', name: 'SendGrid', category: 'Communication', provider: 'Twilio SendGrid', description: 'Transactional and marketing email delivery', status: 'Error', icon: '📧', lastSync: '2 hours ago', apiCalls24h: 120, config: [{ key: 'API Key', value: 'SG.****2kLm', masked: true }, { key: 'Error', value: 'Rate limit exceeded — bounce rate high' }] },
];

const STATUS_STYLES: Record<string, string> = { Connected: 'bg-emerald-50 text-emerald-700', Disconnected: 'bg-slate-100 text-slate-500', Error: 'bg-red-50 text-red-700', Beta: 'bg-purple-50 text-purple-700' };
const STATUS_ICON: Record<string, React.ElementType> = { Connected: CheckCircle, Disconnected: XCircle, Error: AlertTriangle, Beta: Zap };
const CAT_ICONS: Record<string, React.ElementType> = { Payments: CreditCard, Logistics: Truck, Analytics: BarChart3, Communication: MessageSquare, Marketing: Zap, Compliance: Shield, Support: MessageSquare, Search: Globe };

function IntegrationDrawer({ item: i, onClose }: { item: Integration; onClose: () => void }) {
  const StatusIcon = STATUS_ICON[i.status];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3"><span className="text-3xl">{i.icon}</span><div><h2 className="text-lg font-black text-slate-900">{i.name}</h2><p className="text-xs text-slate-500">{i.provider}</p></div></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1 ${STATUS_STYLES[i.status]}`}><StatusIcon className="w-3 h-3" />{i.status}</span><span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{i.category}</span></div>

          <div className="bg-slate-900 rounded-xl p-5 text-white"><p className="text-sm">{i.description}</p></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Last Sync</p><p className="text-sm font-bold text-slate-900">{i.lastSync}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">API Calls (24h)</p><p className="text-sm font-bold text-blue-700">{i.apiCalls24h.toLocaleString()}</p></div>
          </div>

          {i.config.length > 0 && (
            <div><h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-slate-500" /> Configuration</h3>
              <div className="space-y-2">{i.config.map((c, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2">
                  <span className="text-xs font-bold text-slate-600">{c.key}</span>
                  <span className={`text-xs font-mono ${c.masked ? 'text-slate-400' : c.key === 'Error' ? 'text-red-600 font-bold' : 'text-slate-900 font-bold'}`}>{c.value}</span>
                </div>
              ))}</div>
            </div>
          )}

          <div className="flex gap-3">
            {i.status === 'Connected' && <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-sm font-bold transition-colors">Test Connection</button>}
            {i.status === 'Disconnected' && <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Plug className="w-4 h-4" /> Connect</button>}
            {i.status === 'Error' && <button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" /> Reconnect</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Integration | null>(null);

  const { data: apiData, loading, error, refetch, toast } = useAdminData(() => adminMarketplaceApi.getOrders(), []);

  const categories = ['all', ...Array.from(new Set(INTEGRATIONS.map(i => i.category)))];
  const filtered = INTEGRATIONS.filter(i => {
    if (filter !== 'all' && i.category !== filter && i.status !== filter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.provider.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Integrations</h1><p className="text-sm text-slate-500 mt-0.5">Third-party service connections — payments, logistics, analytics, communication</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-emerald-600 font-bold">Connected</p><p className="text-2xl font-black text-emerald-600">{INTEGRATIONS.filter(i => i.status === 'Connected').length}</p></div>
        <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-red-600 font-bold">Errors</p><p className="text-2xl font-black text-red-600">{INTEGRATIONS.filter(i => i.status === 'Error').length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Disconnected</p><p className="text-2xl font-black text-slate-600">{INTEGRATIONS.filter(i => i.status === 'Disconnected').length}</p></div>
        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-blue-600 font-bold">Total API Calls (24h)</p><p className="text-2xl font-black text-blue-600">{INTEGRATIONS.reduce((a, i) => a + i.apiCalls24h, 0).toLocaleString()}</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search integration or provider..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2 flex-wrap">{categories.map(c => (<button key={c} onClick={() => setFilter(c)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors capitalize ${filter === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{c === 'all' ? 'All' : c}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? <MarketplaceEmpty /> : filtered.map(i => {
          const StatusIcon = STATUS_ICON[i.status];
          const CatIcon = CAT_ICONS[i.category] || Globe;
          return (
            <div key={i.id} onClick={() => setSelected(i)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setSelected(i))} className={`bg-white border rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow ${i.status === 'Error' ? 'border-red-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3"><span className="text-2xl">{i.icon}</span><div><p className="font-bold text-slate-900 text-sm">{i.name}</p><p className="text-[10px] text-slate-400">{i.provider}</p></div></div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${STATUS_STYLES[i.status]}`}><StatusIcon className="w-3 h-3" />{i.status}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{i.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-slate-400"><CatIcon className="w-3 h-3" />{i.category}</div>
                <div className="flex items-center gap-2"><span className="text-[10px] text-slate-400">Last: {i.lastSync}</span>{i.apiCalls24h > 0 && <span className="text-[10px] font-bold text-blue-600">{i.apiCalls24h.toLocaleString()} calls</span>}</div>
              </div>
            </div>
          );
        })}
      </div>

      {selected && <IntegrationDrawer item={selected} onClose={() => setSelected(null)} />}
      <AdminToast toast={toast} />
    </div>
  );
}

function MarketplaceEmpty() { return <div className="col-span-full p-10 text-center"><Plug className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">No integrations found</p></div>; }
