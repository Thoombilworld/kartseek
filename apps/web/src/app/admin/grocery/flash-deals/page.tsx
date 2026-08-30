'use client';

import React, { useState, useMemo } from 'react';
import { Search, Zap, Clock, Eye, Pause, Play, XCircle, CheckCircle, TrendingUp, Package, Store, Plus, AlertTriangle, X, Calendar, DollarSign, Hash, Tag } from 'lucide-react';
import { type FlashDeal, type FlashDealStatus } from '@/lib/demo-data/grocery-home';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { adminGroceryApi } from '@/lib/api/admin-grocery';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { useDismissOnEscape } from '@/lib/hooks/use-dismiss-on-escape';

const STATUS_CONFIG: Record<FlashDealStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  approved: { label: 'Approved', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  active:   { label: 'Active',   color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  expired:  { label: 'Expired',  color: 'text-slate-500',  bg: 'bg-slate-50 border-slate-200' },
  rejected: { label: 'Rejected', color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
  paused:   { label: 'Paused',   color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
};

function FlashDealCountdown({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = React.useState('');
  React.useEffect(() => {
    const tick = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime]);
  return <span className="text-xs font-mono">{timeLeft}</span>;
}

export default function AdminFlashDealsPage() {
  const { formatPrice } = useGroceryLocale();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FlashDealStatus>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<FlashDeal | null>(null);

  /**
   * Load the real moderation queue.
   *
   * The page rendered `FLASH_DEALS` — the demo array — so the pending count and
   * every card on screen were fixtures. Worse, the endpoint behind it could not
   * have supplied a queue: the gateway routed `GET /grocery/flash-deals` to
   * `get_store_flash_deals`, which returns ACTIVE deals for one store and ignores
   * `status` entirely, so a deal a seller submitted was invisible here and could
   * never be approved.
   */
  const { data: loadedDeals, loading, error: loadError, reload: load } = useAsyncData<FlashDeal[]>(
    async () => {
      const res = await adminGroceryApi.getFlashDeals({ page: 1, limit: 100 });
      if (!res.success || !res.data) throw new Error(res.error ?? 'Could not load flash deals');
      return (res.data.data ?? []) as unknown as FlashDeal[];
    },
    [],
  );
  // Memoised: three useMemo hooks below take this as a dependency, and a bare
  // ternary hands each of them a fresh array on every render.
  const deals = useMemo(() => (loadError ? [] : (loadedDeals ?? [])), [loadError, loadedDeals]);

  // Create Flash Deal form state
  const [createForm, setCreateForm] = useState({
    // `productId` is required: a flash deal is priced against a catalogue row, and
    // the form used to invent one from a timestamp.
    storeId: '', storeName: '', productId: '', productName: '', productEmoji: '📦',
    category: '', originalPrice: '', flashPrice: '', stockLimit: '',
    startTime: '', endTime: '',
  });

  // Unique stores for filter dropdown
  const storeOptions = useMemo(() => {
    const map = new Map<string, string>();
    deals.forEach(d => map.set(d.storeId, d.storeName));
    return Array.from(map.entries());
  }, [deals]);

  // Apply filters
  const filtered = useMemo(() => {
    let list = deals;
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    if (storeFilter !== 'all') list = list.filter(d => d.storeId === storeFilter);
    if (search.trim()) list = list.filter(d =>
      d.productName.toLowerCase().includes(search.toLowerCase()) ||
      d.storeName.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [deals, statusFilter, storeFilter, search]);

  // Stats
  const stats = useMemo(() => ({
    active: deals.filter(d => d.status === 'active').length,
    pending: deals.filter(d => d.status === 'pending').length,
    totalSold: deals.filter(d => d.status === 'active').reduce((s, d) => s + d.soldCount, 0),
    totalRevenue: deals.filter(d => d.status === 'active').reduce((s, d) => s + d.soldCount * d.flashPrice, 0),
  }), [deals]);

  /**
   * Apply a moderation decision.
   *
   * The old version swallowed every failure and then flipped the card's status
   * anyway — "Always update local state for responsiveness" — so a rejected
   * approval looked identical to a successful one, and refreshing put it back.
   * A refusal (wrong current status, deal already expired) is now shown, and the
   * list is re-read so the card matches what was stored.
   */
  // Both dialogs closed on a backdrop click only; neither answered Escape.
  useDismissOnEscape(showCreateModal, () => setShowCreateModal(false));
  useDismissOnEscape(!!selectedDeal, () => setSelectedDeal(null));

  const updateStatus = async (dealId: string, newStatus: FlashDealStatus, reason?: string) => {
    setBusyId(dealId);
    setActionError(null);
    let res;
    switch (newStatus) {
      case 'approved':
      case 'active':
        res = await adminGroceryApi.approveFlashDeal(dealId);
        break;
      case 'rejected':
        res = await adminGroceryApi.rejectFlashDeal(dealId, reason || 'Rejected by admin');
        break;
      default:
        // Pause and resume are seller-side controls; the console does not own them.
        setBusyId(null);
        return;
    }
    setBusyId(null);
    if (!res.success) { setActionError(res.error ?? 'Could not update this deal'); return; }
    await load();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" /> Flash Deals Management
          </h1>
          <p className="text-sm text-slate-500">Approve, monitor, and control store flash deals across the platform</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:from-red-600 hover:to-orange-600 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Flash Deal
        </button>
      </div>

      {loadError && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{loadError}</span>
          <button onClick={() => void load()} className="font-bold shrink-0">Retry</button>
        </div>
      )}
      {actionError && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-4">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold shrink-0">Dismiss</button>
        </div>
      )}
      {loading && (
        <p className="text-sm text-slate-400 mb-4" aria-busy="true">Loading flash deals…</p>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-green-600" /><p className="text-xs text-slate-500">Active Deals</p></div>
          <p className="text-2xl font-bold text-green-700">{stats.active}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-amber-600" /><p className="text-xs text-slate-500">Pending Approval</p></div>
          <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-blue-600" /><p className="text-xs text-slate-500">Items Sold</p></div>
          <p className="text-2xl font-bold text-blue-700">{stats.totalSold.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-purple-600" /><p className="text-xs text-slate-500">Flash Revenue</p></div>
          <p className="text-2xl font-bold text-purple-700">{formatPrice(stats.totalRevenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals by product, store, or ID..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none" />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Status filter */}
        {(['all', 'active', 'pending', 'approved', 'paused', 'expired', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label}
            {s === 'pending' && stats.pending > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{stats.pending}</span>}
          </button>
        ))}

        {/* Store filter */}
        <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)} className="bg-white border border-slate-200 rounded-lg text-sm py-2 px-3 outline-none focus:ring-2 focus:ring-orange-500/20">
          <option value="all">All Stores</option>
          {storeOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Product</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Store</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Price</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Discount</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Stock</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Time Left</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(deal => {
              const sc = STATUS_CONFIG[deal.status];
              const stockPercent = Math.round((deal.soldCount / deal.stockLimit) * 100);
              return (
                <tr key={deal.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  {/* Product */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{deal.productEmoji}</span>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{deal.productName}</p>
                        <p className="text-[11px] text-slate-400">{deal.category} • {deal.id}</p>
                      </div>
                    </div>
                  </td>

                  {/* Store */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-sm text-slate-600">{deal.storeName}</span>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4 text-center">
                    <div>
                      <span className="text-red-600 font-bold">{formatPrice(deal.flashPrice)}</span>
                      <span className="text-slate-400 text-xs line-through block">{formatPrice(deal.originalPrice)}</span>
                    </div>
                  </td>

                  {/* Discount */}
                  <td className="py-3 px-4 text-center">
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-lg">{deal.discountPercent}% OFF</span>
                  </td>

                  {/* Stock */}
                  <td className="py-3 px-4 text-center">
                    <div className="w-24 mx-auto">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>{deal.soldCount} sold</span><span>{deal.stockLimit} total</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${stockPercent > 80 ? 'bg-red-500' : stockPercent > 50 ? 'bg-orange-400' : 'bg-green-500'}`} style={{ width: `${stockPercent}%` }} />
                      </div>
                    </div>
                  </td>

                  {/* Time Left */}
                  <td className="py-3 px-4 text-center">
                    {deal.status === 'active' ? (
                      <div className="flex items-center justify-center gap-1 text-orange-600">
                        <Clock className="w-3 h-3" />
                        <FlashDealCountdown endTime={deal.endTime} />
                      </div>
                    ) : deal.status === 'pending' ? (
                      <span className="text-xs text-slate-400">Scheduled</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${sc.bg} ${sc.color}`}>
                      {sc.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {deal.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(deal.id, 'active')} title="Approve & Activate" className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateStatus(deal.id, 'rejected')} title="Reject" className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {deal.status === 'active' && (
                        <button onClick={() => updateStatus(deal.id, 'paused')} title="Pause Deal" className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {deal.status === 'paused' && (
                        <button onClick={() => updateStatus(deal.id, 'active')} title="Resume Deal" className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => setSelectedDeal(deal)} title="View Details" className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <span className="text-4xl block mb-3">⚡</span>
            <p className="text-slate-500 font-medium">No flash deals match your filters</p>
            <button onClick={() => { setSearch(''); setStatusFilter('all'); setStoreFilter('all'); }} className="text-orange-600 text-sm font-semibold mt-2 hover:underline">Clear filters</button>
          </div>
        )}
      </div>

      {/* Summary Row */}
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <p>Showing {filtered.length} of {deals.length} flash deals</p>
        <p className="text-xs">Flash deals are submitted by sellers and require Super Admin approval before going live.</p>
      </div>

      {/* ═══════════ CREATE FLASH DEAL MODAL ═══════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Create Flash Deal</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Store */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block" htmlFor="store">Store</label>
                <select id="store" value={createForm.storeId} onChange={e => {
                  const opt = storeOptions.find(([id]) => id === e.target.value);
                  setCreateForm(f => ({ ...f, storeId: e.target.value, storeName: opt ? opt[1] : '' }));
                }} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20">
                  <option value="">Select store...</option>
                  {storeOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
              {/* Catalogue product id — the deal is priced from this row's first
                  weight variant, and the service rejects an id the store does not
                  sell. Previously the form collected only a free-text name and the
                  handler generated an id no product had. */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block" htmlFor="product-id">Product ID</label>
                <input
                  id="product-id" type="text" value={createForm.productId}
                  onChange={e => setCreateForm(f => ({ ...f, productId: e.target.value.trim() }))}
                  placeholder="Catalogue product UUID"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">Copy from Grocery → Catalogue. The discount is computed from the product&apos;s live price.</p>
              </div>
              {/* Product Name + Emoji — display only */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block" htmlFor="product-name">Product Name (label)</label>
                  <input id="product-name" type="text" value={createForm.productName} onChange={e => setCreateForm(f => ({ ...f, productName: e.target.value }))} placeholder="e.g. Organic Bananas 1 Dozen" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block" htmlFor="emoji">Emoji</label>
                  <input id="emoji" type="text" value={createForm.productEmoji} onChange={e => setCreateForm(f => ({ ...f, productEmoji: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-center outline-none focus:ring-2 focus:ring-orange-500/20" />
                </div>
              </div>
              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block" htmlFor="category">Category</label>
                <select id="category" value={createForm.category} onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20">
                  <option value="">Select category...</option>
                  {['Fruits & Vegetables', 'Dairy & Bread', 'Fresh Meat', 'Beverages', 'Snacks', 'Daily Essentials', 'Dry Fruits', 'Personal Care'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Original Price</label>
                  <input type="number" min="1" value={createForm.originalPrice} onChange={e => setCreateForm(f => ({ ...f, originalPrice: e.target.value }))} placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Flash Price</label>
                  <input type="number" min="1" value={createForm.flashPrice} onChange={e => setCreateForm(f => ({ ...f, flashPrice: e.target.value }))} placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                </div>
              </div>
              {/* Discount Preview */}
              {Number(createForm.originalPrice) > 0 && Number(createForm.flashPrice) > 0 && (
                <div className={`p-3 rounded-lg border text-sm font-semibold flex items-center gap-2 ${
                  Number(createForm.flashPrice) / Number(createForm.originalPrice) > 0.7 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
                }`}>
                  <span>{Math.round((1 - Number(createForm.flashPrice) / Number(createForm.originalPrice)) * 100)}% discount</span>
                  {Number(createForm.flashPrice) / Number(createForm.originalPrice) > 0.7 && <span className="text-xs">⚠️ Minimum 30% discount recommended</span>}
                </div>
              )}
              {/* Stock + Schedule */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Stock Limit</label>
                  <input type="number" min="1" value={createForm.stockLimit} onChange={e => setCreateForm(f => ({ ...f, stockLimit: e.target.value }))} placeholder="50" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Start</label>
                  <input type="datetime-local" value={createForm.startTime} onChange={e => setCreateForm(f => ({ ...f, startTime: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> End</label>
                  <input type="datetime-local" value={createForm.endTime} onChange={e => setCreateForm(f => ({ ...f, endTime: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
              <button
                onClick={async () => {
                  // A deal is created against a real catalogue product. The old
                  // handler minted `productId: 'product-<timestamp>'`, posted that
                  // to the API, discarded the inevitable 404 with `.catch(() => {})`,
                  // and unshifted a card marked `status: 'active'` into the local
                  // list — the deal appeared live in the console and existed nowhere.
                  if (!createForm.storeId || !createForm.productId || !createForm.flashPrice
                      || !createForm.stockLimit || !createForm.startTime || !createForm.endTime) {
                    setActionError('Store, product, flash price, stock limit and both times are required.');
                    return;
                  }
                  setActionError(null);
                  const res = await adminGroceryApi.createFlashDeal({
                    storeId: createForm.storeId,
                    productId: createForm.productId,
                    flashPrice: Number(createForm.flashPrice),
                    stockLimit: Number(createForm.stockLimit),
                    startTime: new Date(createForm.startTime).toISOString(),
                    endTime: new Date(createForm.endTime).toISOString(),
                  });
                  if (!res.success) {
                    // The service enforces a 30% minimum discount and a valid
                    // window; the moderator needs to see which rule bit.
                    setActionError(res.error ?? 'Could not create this flash deal');
                    return;
                  }
                  await load();
                  setShowCreateModal(false);
                  setCreateForm({ storeId: '', storeName: '', productId: '', productName: '', productEmoji: '📦', category: '', originalPrice: '', flashPrice: '', stockLimit: '', startTime: '', endTime: '' });
                }}
                disabled={!createForm.storeId || !createForm.productId || !createForm.flashPrice || !createForm.stockLimit || !createForm.startTime || !createForm.endTime}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg text-sm font-bold hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >Create & Activate Deal</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ VIEW DETAILS MODAL ═══════════ */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedDeal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="text-2xl">{selectedDeal.productEmoji}</span> {selectedDeal.productName}
              </h2>
              <button onClick={() => setSelectedDeal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${STATUS_CONFIG[selectedDeal.status].bg} ${STATUS_CONFIG[selectedDeal.status].color}`}>
                  {STATUS_CONFIG[selectedDeal.status].label}
                </span>
                <span className="text-xs text-slate-400">ID: {selectedDeal.id}</span>
              </div>

              {/* Store Info */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Store</p>
                <p className="font-bold text-slate-800 flex items-center gap-2"><Store className="w-4 h-4 text-green-600" /> {selectedDeal.storeName}</p>
                <p className="text-xs text-slate-500 mt-0.5">Category: {selectedDeal.category}</p>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Flash Price</p>
                  <p className="text-lg font-black text-red-600">{formatPrice(selectedDeal.flashPrice)}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Original</p>
                  <p className="text-lg font-black text-slate-400 line-through">{formatPrice(selectedDeal.originalPrice)}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Discount</p>
                  <p className="text-lg font-black text-green-600">{selectedDeal.discountPercent}%</p>
                </div>
              </div>

              {/* Stock Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-slate-700">Stock Progress</span>
                  <span className="text-slate-500">{selectedDeal.soldCount} / {selectedDeal.stockLimit} sold</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    (selectedDeal.soldCount / selectedDeal.stockLimit) > 0.8 ? 'bg-red-500' :
                    (selectedDeal.soldCount / selectedDeal.stockLimit) > 0.5 ? 'bg-orange-400' : 'bg-green-500'
                  }`} style={{ width: `${Math.round((selectedDeal.soldCount / selectedDeal.stockLimit) * 100)}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{selectedDeal.stockLimit - selectedDeal.soldCount} units remaining</p>
              </div>

              {/* Timeline */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Timeline</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-slate-500">Start:</span>
                    <span className="font-semibold text-slate-700">{new Date(selectedDeal.startTime).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-slate-500">End:</span>
                    <span className="font-semibold text-slate-700">{new Date(selectedDeal.endTime).toLocaleString()}</span>
                  </div>
                  {selectedDeal.status === 'active' && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Remaining: </span>
                      <FlashDealCountdown endTime={selectedDeal.endTime} />
                    </div>
                  )}
                </div>
              </div>

              {/* Revenue Estimate */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Revenue Generated</p>
                  <p className="text-lg font-black text-purple-600">{formatPrice(selectedDeal.soldCount * selectedDeal.flashPrice)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Customer Savings</p>
                  <p className="text-lg font-black text-blue-600">{formatPrice(selectedDeal.soldCount * (selectedDeal.originalPrice - selectedDeal.flashPrice))}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setSelectedDeal(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Close</button>
              {selectedDeal.status === 'pending' && (
                <>
                  <button onClick={() => { updateStatus(selectedDeal.id, 'active'); setSelectedDeal(null); }} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"><CheckCircle className="w-4 h-4" /> Approve</button>
                  <button onClick={() => { updateStatus(selectedDeal.id, 'rejected'); setSelectedDeal(null); }} className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5"><XCircle className="w-4 h-4" /> Reject</button>
                </>
              )}
              {selectedDeal.status === 'active' && (
                <button onClick={() => { updateStatus(selectedDeal.id, 'paused'); setSelectedDeal(null); }} className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-1.5"><Pause className="w-4 h-4" /> Pause Deal</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
