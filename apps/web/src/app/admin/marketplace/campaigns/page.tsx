'use client';
import React, { useState } from 'react';
import { Megaphone, CheckCircle, XCircle, Pause, Play, Eye, Plus, Calendar, TrendingUp, DollarSign, Clock, X, Search, ChevronLeft, ChevronRight, Download, BarChart3, Target, Users } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', 'Saudi Arabia': 'SA' };

type Campaign = {
  id: string; name: string; type: string; seller: string; products: number;
  budget: number; spent: number; discount: string;
  start: string; end: string; status: string;
  impressions: number; clicks: number; orders: number; revenue: number;
  placement: string[]; country: string; conversionRate: number;
};

const CAMPAIGNS: Campaign[] = [
  { id: 'CMP-1001', name: 'Electronics Mega Sale', type: 'Flash Sale', seller: 'Multiple Sellers', products: 148, budget: 250000, spent: 148000, discount: 'Up to 70%', start: '2026-06-01', end: '2026-06-03', status: 'Active', impressions: 340000, clicks: 28000, orders: 4200, revenue: 1850000, placement: ['Homepage', 'Category'], country: 'India', conversionRate: 15.0 },
  { id: 'CMP-1002', name: 'Nike Eid Collection', type: 'Festival Sale', seller: 'Nike Official', products: 48, budget: 80000, spent: 0, discount: 'Up to 40%', start: '2026-06-05', end: '2026-06-10', status: 'Pending Approval', impressions: 0, clicks: 0, orders: 0, revenue: 0, placement: ['Brand Page', 'Search'], country: 'India', conversionRate: 0 },
  { id: 'CMP-1003', name: 'Summer Fashion Week', type: 'Category Promotion', seller: 'Multiple Sellers', products: 380, budget: 400000, spent: 0, discount: 'Up to 60%', start: '2026-06-15', end: '2026-06-25', status: 'Pending Approval', impressions: 0, clicks: 0, orders: 0, revenue: 0, placement: ['Homepage', 'Category', 'Push'], country: 'India', conversionRate: 0 },
  { id: 'CMP-1004', name: 'Sponsored: Apple MacBook', type: 'Sponsored Product', seller: 'Apple India Store', products: 3, budget: 50000, spent: 38000, discount: '5%', start: '2026-05-28', end: '2026-06-27', status: 'Active', impressions: 124000, clicks: 8900, orders: 320, revenue: 3680000, placement: ['Search Results', 'Category'], country: 'India', conversionRate: 3.6 },
  { id: 'CMP-1005', name: 'Free Delivery Weekend', type: 'Free Delivery Campaign', seller: 'Platform Campaign', products: 0, budget: 100000, spent: 92000, discount: 'Free Delivery', start: '2026-05-31', end: '2026-06-01', status: 'Expired', impressions: 89000, clicks: 12000, orders: 1240, revenue: 890000, placement: ['Homepage', 'Cart'], country: 'India', conversionRate: 10.3 },
  { id: 'CMP-1006', name: 'Clearance: Old Stock Fashion', type: 'Clearance Sale', seller: "Levi's India", products: 64, budget: 20000, spent: 20000, discount: 'Up to 80%', start: '2026-05-10', end: '2026-05-31', status: 'Expired', impressions: 284000, clicks: 32000, orders: 2100, revenue: 1240000, placement: ['Category'], country: 'India', conversionRate: 6.6 },
  { id: 'CMP-1007', name: 'UAE Summer Electronics', type: 'Flash Sale', seller: 'Gulf Electronics FZE', products: 25, budget: 30000, spent: 0, discount: 'Up to 50%', start: '2026-06-20', end: '2026-06-22', status: 'Scheduled', impressions: 0, clicks: 0, orders: 0, revenue: 0, placement: ['Homepage'], country: 'UAE', conversionRate: 0 },
  { id: 'CMP-1008', name: 'Back to School 2026', type: 'Category Promotion', seller: 'Multiple Sellers', products: 210, budget: 150000, spent: 42000, discount: 'Up to 35%', start: '2026-06-01', end: '2026-06-30', status: 'Active', impressions: 156000, clicks: 9800, orders: 890, revenue: 620000, placement: ['Homepage', 'Search'], country: 'India', conversionRate: 9.1 },
];

const STATUS_STYLES: Record<string, string> = { Active: 'bg-emerald-50 text-emerald-700', 'Pending Approval': 'bg-amber-50 text-amber-700', Approved: 'bg-blue-50 text-blue-700', Scheduled: 'bg-purple-50 text-purple-700', Paused: 'bg-slate-100 text-slate-600', Expired: 'bg-red-50 text-red-600', Rejected: 'bg-red-100 text-red-700' };
const TYPE_COLORS: Record<string, string> = { 'Flash Sale': 'bg-red-50 text-red-700', 'Festival Sale': 'bg-yellow-50 text-yellow-700', 'Category Promotion': 'bg-indigo-50 text-indigo-700', 'Sponsored Product': 'bg-blue-50 text-blue-700', 'Free Delivery Campaign': 'bg-emerald-50 text-emerald-700', 'Clearance Sale': 'bg-orange-50 text-orange-700', 'Brand Promotion': 'bg-purple-50 text-purple-700' };

// ── Campaign Detail Drawer ───────────────────────────────────────────────────
function CampaignDrawer({ item: c, onClose, onApprove, onReject, onPause, onResume }: { item: Campaign; onClose: () => void; onApprove: () => void; onReject: () => void; onPause: () => void; onResume: () => void }) {
  const budgetPct = c.budget ? Math.round((c.spent / c.budget) * 100) : 0;
  const ctr = c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0';
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{c.name}</h2><p className="text-xs text-slate-500">{c.id} · {c.seller}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[c.status]}`}>{c.status}</span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${TYPE_COLORS[c.type] || 'bg-slate-100'}`}>{c.type}</span>
            {c.placement.map(p => <span key={p} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{p}</span>)}
          </div>

          {/* Budget */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
            <div className="flex justify-between mb-2"><span className="text-sm font-bold opacity-80">Budget</span><span className="text-sm font-bold">₹{c.budget.toLocaleString()}</span></div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${budgetPct >= 90 ? 'bg-red-400' : budgetPct >= 60 ? 'bg-amber-300' : 'bg-emerald-300'}`} style={{ width: `${budgetPct}%` }} /></div>
            <div className="flex justify-between mt-2"><span className="text-xs opacity-70">Spent: ₹{c.spent.toLocaleString()}</span><span className="text-xs opacity-70">{budgetPct}% used</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Products</p><p className="text-sm font-bold text-slate-900">{c.products || 'All'}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Discount</p><p className="text-sm font-bold text-emerald-600">{c.discount}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Duration</p><p className="text-sm font-bold text-slate-900">{c.start} → {c.end}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Region</p><p className="text-sm font-bold text-slate-900 flex items-center gap-1"><CountryFlag code={COUNTRY_TO_CODE[c.country] || 'IN'} size="sm" />{c.country}</p></div>
          </div>

          {/* Performance Analytics */}
          {(c.status === 'Active' || c.status === 'Expired') && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-600" />Performance</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-blue-700">{c.impressions.toLocaleString()}</p><p className="text-[10px] text-blue-600">Impressions</p></div>
                <div className="bg-purple-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-purple-700">{c.clicks.toLocaleString()}</p><p className="text-[10px] text-purple-600">Clicks</p></div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-emerald-700">{c.orders.toLocaleString()}</p><p className="text-[10px] text-emerald-600">Orders</p></div>
                <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-amber-700">₹{(c.revenue / 100000).toFixed(1)}L</p><p className="text-[10px] text-amber-600">Revenue</p></div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-sm font-black text-slate-700">{ctr}%</p><p className="text-[10px] text-slate-500">CTR</p></div>
                <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-sm font-black text-slate-700">{c.conversionRate}%</p><p className="text-[10px] text-slate-500">Conv. Rate</p></div>
                <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-sm font-black text-slate-700">₹{c.orders ? Math.round(c.spent / c.orders) : 0}</p><p className="text-[10px] text-slate-500">CPA</p></div>
              </div>
              {/* Funnel */}
              <div className="mt-3 space-y-1">
                {[{ l: 'Impressions', v: c.impressions, c: 'bg-blue-500' }, { l: 'Clicks', v: c.clicks, c: 'bg-purple-500' }, { l: 'Orders', v: c.orders, c: 'bg-emerald-500' }].map(f => (
                  <div key={f.l} className="flex items-center gap-2"><span className="text-[10px] text-slate-500 w-20">{f.l}</span><div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${f.c}`} style={{ width: `${c.impressions ? (f.v / c.impressions) * 100 : 0}%` }} /></div><span className="text-[10px] font-bold text-slate-700 w-16 text-right">{f.v.toLocaleString()}</span></div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {c.status === 'Pending Approval' && (
              <div className="flex gap-3">
                <button onClick={onApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Approve</button>
                <button onClick={onReject} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Reject</button>
              </div>
            )}
            {c.status === 'Active' && <button onClick={onPause} className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Pause className="w-4 h-4" /> Pause Campaign</button>}
            {c.status === 'Paused' && <button onClick={onResume} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Play className="w-4 h-4" /> Resume Campaign</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create/Edit Campaign Modal ───────────────────────────────────────────────
function CampaignModal({ campaign, onSave, onClose }: { campaign?: Campaign; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: campaign?.name || '', type: campaign?.type || 'Flash Sale', seller: campaign?.seller || '',
    products: campaign?.products || 0, budget: campaign?.budget || 0, discount: campaign?.discount || '',
    start: campaign?.start || '', end: campaign?.end || '',
    placement: campaign?.placement || ['Homepage'],
  });
  const u = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const togglePlacement = (p: string) => setForm(f => ({ ...f, placement: f.placement.includes(p) ? f.placement.filter(x => x !== p) : [...f.placement, p] }));
  const PLACEMENTS = ['Homepage', 'Category', 'Search Results', 'Brand Page', 'Cart', 'Push', 'Email'];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-black text-slate-900 mb-4">{campaign ? 'Edit Campaign' : 'Create Campaign'}</h3>
        <div className="space-y-4">
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="campaign-name">Campaign Name</label><input id="campaign-name" value={form.name} onChange={e => u('name', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. Summer Electronics Sale" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="type">Type</label><select id="type" value={form.type} onChange={e => u('type', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option>Flash Sale</option><option>Festival Sale</option><option>Category Promotion</option><option>Sponsored Product</option><option>Free Delivery Campaign</option><option>Clearance Sale</option><option>Brand Promotion</option></select></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="seller">Seller</label><input id="seller" value={form.seller} onChange={e => u('seller', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" placeholder="Seller or 'Multiple'" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="products">Products</label><input id="products" type="number" value={form.products || ''} onChange={e => u('products', +e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" placeholder="0=All" /></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="budget">Budget (₹)</label><input id="budget" type="number" value={form.budget || ''} onChange={e => u('budget', +e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="discount">Discount</label><input id="discount" value={form.discount} onChange={e => u('discount', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" placeholder="e.g. Up to 50%" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="start-date">Start Date</label><input id="start-date" type="date" value={form.start} onChange={e => u('start', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="end-date">End Date</label><input id="end-date" type="date" value={form.end} onChange={e => u('end', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
          </div>
          <div><label className="text-xs font-bold text-slate-600 mb-2 block">Placement Channels</label>
            <div className="flex flex-wrap gap-2">{PLACEMENTS.map(p => (<button key={p} onClick={() => togglePlacement(p)} className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors ${form.placement.includes(p) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'}`}>{p}</button>))}</div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.name || !form.start || !form.end} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors">{campaign ? 'Save Changes' : 'Create Campaign'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ onReject, onClose }: { onReject: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('Discount exceeds maximum allowed');
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-black text-slate-900 mb-4">Reject Campaign</h3>
        <select value={reason} onChange={e => setReason(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm mb-3 outline-none">
          <option>Discount exceeds maximum allowed</option><option>Invalid campaign dates</option><option>Misleading campaign name</option><option>Prohibited product category</option><option>Budget insufficient for placement</option><option>Seller compliance issue</option><option>Other</option>
        </select>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none outline-none mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
          <button onClick={() => onReject(`${reason}${notes ? ` — ${notes}` : ''}`)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Reject Campaign</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showReject, setShowReject] = useState<Campaign | null>(null);
  const PAGE_SIZE = 5;

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getCampaigns(), []);
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered } = useMarketplaceRegionFilter(CAMPAIGNS);
  const filtered = regionFiltered.filter(c => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.seller.toLowerCase().includes(search.toLowerCase()) && !c.id.includes(search)) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalBudget = regionFiltered.reduce((a, c) => a + c.budget, 0);
  const totalSpent = regionFiltered.reduce((a, c) => a + c.spent, 0);
  const totalRevenue = regionFiltered.reduce((a, c) => a + c.revenue, 0);

  const handleApprove = (c: Campaign) => { execute(() => adminMarketplaceApi.updateCampaign(c.id, { status: 'Approved' }), `${c.name} approved`, () => refetch()); setSelected(null); };
  const handleReject = (c: Campaign, reason: string) => { execute(() => adminMarketplaceApi.updateCampaign(c.id, { status: 'Rejected', reason }), `${c.name} rejected`, () => refetch()); setShowReject(null); setSelected(null); };
  const handlePause = (c: Campaign) => { execute(() => adminMarketplaceApi.updateCampaign(c.id, { status: 'Paused' }), `${c.name} paused`, () => refetch()); setSelected(null); };
  const handleResume = (c: Campaign) => { execute(() => adminMarketplaceApi.updateCampaign(c.id, { status: 'Active' }), `${c.name} resumed`, () => refetch()); setSelected(null); };
  const handleCreate = (data: any) => { execute(() => adminMarketplaceApi.createCampaign(data), 'Campaign created', () => refetch()); setShowCreate(false); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Campaign Management</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Create, approve, and monitor marketing campaigns</p></div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"><Plus className="w-4 h-4" /> Create Campaign</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white"><p className="text-sm font-bold opacity-80">Total Budget</p><p className="text-2xl font-black mt-1">₹{(totalBudget / 100000).toFixed(1)}L</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Spent</p><p className="text-xl font-black text-amber-600">₹{(totalSpent / 100000).toFixed(1)}L</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Revenue</p><p className="text-xl font-black text-emerald-600">₹{(totalRevenue / 100000).toFixed(1)}L</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Active</p><p className="text-xl font-black text-emerald-600">{regionFiltered.filter(c => c.status === 'Active').length}</p></div>
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-amber-600 font-bold">Pending</p><p className="text-xl font-black text-amber-600">{regionFiltered.filter(c => c.status === 'Pending Approval').length}</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search campaign, seller, or ID..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2 flex-wrap">{['All', 'Active', 'Pending Approval', 'Scheduled', 'Paused', 'Expired', 'Rejected'].map(s => (<button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Campaign</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Type</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Budget</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Duration</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Performance</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.length === 0 ? (
              <tr><td colSpan={7}><MarketplaceEmptyState title="No campaigns found" icon={Megaphone} /></td></tr>
            ) : paged.map(c => {
              const budgetPct = c.budget ? Math.round((c.spent / c.budget) * 100) : 0;
              return (
                <tr key={c.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setSelected(c)} tabIndex={0} onKeyDown={activateOnKey(() => setSelected(c))}>
                  <td className="px-4 py-3.5"><p className="font-bold text-slate-900 text-xs">{c.name}</p><p className="text-[10px] text-slate-400">{c.id} · {c.seller} · <CountryFlag code={COUNTRY_TO_CODE[c.country] || 'IN'} size="sm" /></p><div className="flex gap-1 mt-1">{c.placement.slice(0, 2).map(p => <span key={p} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{p}</span>)}{c.placement.length > 2 && <span className="text-[9px] text-slate-400">+{c.placement.length - 2}</span>}</div></td>
                  <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${TYPE_COLORS[c.type] || 'bg-slate-100'}`}>{c.type}</span></td>
                  <td className="px-4 py-3.5 text-center"><p className="text-xs font-bold text-slate-900">₹{(c.budget / 1000).toFixed(0)}K</p><div className="h-1.5 bg-slate-100 rounded-full mt-1 w-16 mx-auto overflow-hidden"><div className={`h-full rounded-full ${budgetPct >= 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${budgetPct}%` }} /></div></td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-600">{c.start}<br /><span className="text-slate-400">→ {c.end}</span></td>
                  <td className="px-4 py-3.5 text-center">{c.impressions > 0 ? <><p className="text-xs font-bold text-slate-900">{c.impressions.toLocaleString()} imp</p><p className="text-[10px] text-emerald-600">{c.orders.toLocaleString()} orders</p></> : <span className="text-[10px] text-slate-400">—</span>}</td>
                  <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[c.status]}`}>{c.status}</span></td>
                  <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {c.status === 'Pending Approval' && <><button onClick={() => handleApprove(c)} className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg"><CheckCircle className="w-3.5 h-3.5" /></button><button onClick={() => setShowReject(c)} className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"><XCircle className="w-3.5 h-3.5" /></button></>}
                      {c.status === 'Active' && <button onClick={() => handlePause(c)} className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg"><Pause className="w-3.5 h-3.5" /></button>}
                      <button onClick={() => setSelected(c)} className="p-1 hover:bg-slate-100 rounded-lg"><Eye className="w-3.5 h-3.5 text-slate-400" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (<div className="flex items-center justify-between px-2"><p className="text-xs text-slate-500">{filtered.length} campaigns</p><div className="flex items-center gap-2"><button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><span className="text-xs font-bold">{page}/{totalPages}</span><button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>)}

      {selected && <CampaignDrawer item={selected} onClose={() => setSelected(null)} onApprove={() => handleApprove(selected)} onReject={() => { setShowReject(selected); setSelected(null); }} onPause={() => handlePause(selected)} onResume={() => handleResume(selected)} />}
      {showCreate && <CampaignModal onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      {showReject && <RejectModal onReject={(reason) => handleReject(showReject, reason)} onClose={() => setShowReject(null)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
