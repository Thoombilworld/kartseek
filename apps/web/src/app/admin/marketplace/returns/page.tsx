'use client';
import React, { useState } from 'react';
import { RotateCcw, Search, Download, Eye, CheckCircle, XCircle, X, Package, Camera, Clock, AlertTriangle, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import MarketplaceStatusBadge from '@/components/admin/marketplace/marketplace-status-badge';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', Qatar: 'QA', 'Saudi Arabia': 'SA' };

type ReturnItem = {
  id: string; order: string; product: string; customer: string; seller: string; country: string;
  reason: string; type: 'Return' | 'Replacement'; status: 'Requested' | 'Approved' | 'Rejected' | 'Picked Up' | 'Refund Initiated' | 'Completed';
  amount: number; date: string; images: string[]; customerNote: string; sellerNote: string;
};

const RETURNS: ReturnItem[] = [
  { id: 'RET-001', order: 'ORD-8820001', product: 'iPhone 15 Pro Max', customer: 'Ananya Sharma', seller: 'Apple India Store', country: 'India', reason: 'Defective — screen flickering', type: 'Return', status: 'Requested', amount: 159900, date: '2026-06-05', images: ['📸', '📸'], customerNote: 'Screen flickers intermittently when brightness is above 80%.', sellerNote: '' },
  { id: 'RET-002', order: 'ORD-8820002', product: 'Galaxy Buds3 Pro', customer: 'Ravi Kumar', seller: 'Samsung Store', country: 'India', reason: 'Wrong item delivered', type: 'Replacement', status: 'Approved', amount: 22491, date: '2026-06-04', images: ['📸'], customerNote: 'Received Galaxy Buds2 instead of Buds3 Pro.', sellerNote: 'Confirmed — sending replacement.' },
  { id: 'RET-003', order: 'ORD-8820003', product: 'Anker PowerCore', customer: 'Fatima Al Rashid', seller: 'Gulf Electronics FZE', country: 'UAE', reason: 'Not as described', type: 'Return', status: 'Picked Up', amount: 149, date: '2026-06-03', images: [], customerNote: 'Capacity is 10000mAh, listed as 20000mAh.', sellerNote: 'Listing error — full refund approved.' },
  { id: 'RET-004', order: 'ORD-8820005', product: 'Nike Air Jordan 1', customer: 'Priya Mehta', seller: 'Nike Official', country: 'India', reason: 'Size mismatch', type: 'Replacement', status: 'Completed', amount: 17995, date: '2026-06-01', images: [], customerNote: 'Ordered US 8, received US 9.', sellerNote: 'Replacement shipped — DL9876543.' },
  { id: 'RET-005', order: 'ORD-8820007', product: "Levi's 501 Jeans", customer: 'Sneha Nair', seller: "Levi's India", country: 'India', reason: 'Damaged product', type: 'Return', status: 'Refund Initiated', amount: 2999, date: '2026-06-02', images: ['📸', '📸', '📸'], customerNote: 'Ripped at the seam. Clearly a manufacturing defect.', sellerNote: 'Quality check confirmed. Refund processing.' },
  { id: 'RET-006', order: 'ORD-9001', product: 'Sony WH-1000XM5', customer: 'Ahmed Al-Farsi', seller: 'Gulf Electronics FZE', country: 'UAE', reason: 'Changed mind', type: 'Return', status: 'Rejected', amount: 1299, date: '2026-06-03', images: [], customerNote: 'No longer needed.', sellerNote: 'Non-returnable category — electronics opened.' },
  { id: 'RET-007', order: 'ORD-9101', product: 'Thobe Premium', customer: 'Abdullah Al-Otaibi', seller: 'Riyadh Fashion Co', country: 'Saudi Arabia', reason: 'Wrong color', type: 'Replacement', status: 'Requested', amount: 890, date: '2026-06-05', images: ['📸'], customerNote: 'Ordered white, received cream.', sellerNote: '' },
];

const STATUS_MAP: Record<string, { status: string; color: string }> = {
  Requested: { status: 'pending', color: 'text-amber-600' },
  Approved: { status: 'active', color: 'text-blue-600' },
  Rejected: { status: 'rejected', color: 'text-red-600' },
  'Picked Up': { status: 'processing', color: 'text-purple-600' },
  'Refund Initiated': { status: 'processing', color: 'text-violet-600' },
  Completed: { status: 'approved', color: 'text-emerald-600' },
};

const PAGE_SIZE = 6;

// ── Return Detail Drawer ─────────────────────────────────────────────────────
function ReturnDetailDrawer({ ret, onClose, onApprove, onReject }: { ret: ReturnItem; onClose: () => void; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{ret.id}</h2><p className="text-xs text-slate-500 mt-0.5">{ret.date}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Status & Type */}
          <div className="flex gap-2">
            <MarketplaceStatusBadge status={STATUS_MAP[ret.status]?.status || 'pending'} customLabel={ret.status} />
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${ret.type === 'Return' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>{ret.type}</span>
          </div>

          {/* Product */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Product</h3>
            <p className="text-sm text-slate-700 font-bold">{ret.product}</p>
            <p className="text-xs text-slate-500 mt-1">Order: <span className="text-blue-600 font-bold">{ret.order}</span></p>
            <p className="text-lg font-black text-slate-900 mt-2">₹{ret.amount.toLocaleString()}</p>
          </div>

          {/* Reason */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-amber-600" /><h3 className="text-sm font-bold text-amber-900">Return Reason</h3></div>
            <p className="text-sm text-amber-800">{ret.reason}</p>
          </div>

          {/* Customer Note */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-slate-400" /> Customer Note</h3>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{ret.customerNote}</p>
          </div>

          {/* Evidence Images */}
          {ret.images.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2"><Camera className="w-4 h-4 text-slate-400" /> Evidence ({ret.images.length})</h3>
              <div className="flex gap-2">{ret.images.map((img, i) => (<div key={i} className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-2xl border border-slate-200">{img}</div>))}</div>
            </div>
          )}

          {/* Seller Note */}
          {ret.sellerNote && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Seller Response</h3>
              <p className="text-sm text-slate-700 bg-blue-50 rounded-xl p-3 border border-blue-200">{ret.sellerNote}</p>
            </div>
          )}

          {/* People */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Customer</p><p className="text-sm font-bold text-slate-900">{ret.customer}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Seller</p><p className="text-sm font-bold text-slate-900">{ret.seller}</p></div>
          </div>

          {/* Actions */}
          {ret.status === 'Requested' && (
            <div className="flex gap-3">
              <button onClick={onApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Approve Return</button>
              <button onClick={onReject} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Reject</button>
            </div>
          )}
          {ret.status === 'Picked Up' && (
            <button onClick={() => {}} className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Initiate Refund</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ returnId, onConfirm, onClose }: { returnId: string; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4"><XCircle className="w-6 h-6 text-red-500" /><h3 className="text-lg font-black text-slate-900">Reject Return</h3></div>
        <p className="text-sm text-slate-600 mb-4">Provide a reason for rejecting <span className="font-bold">{returnId}</span>.</p>
        <select value={reason} onChange={e => setReason(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm mb-4 outline-none focus:ring-2 focus:ring-red-200">
          <option value="">Select reason...</option>
          <option value="Product opened / used">Product opened / used</option>
          <option value="Return window expired">Return window expired</option>
          <option value="Non-returnable category">Non-returnable category</option>
          <option value="Insufficient evidence">Insufficient evidence</option>
          <option value="Other">Other</option>
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Cancel</button>
          <button onClick={() => onConfirm(reason)} disabled={!reason} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors">Reject</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ReturnsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedReturn, setSelectedReturn] = useState<ReturnItem | null>(null);
  const [rejectReturn, setRejectReturn] = useState<ReturnItem | null>(null);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getReturns({ status: statusFilter || undefined }),
    [statusFilter]
  );
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered, formatCurrencyValue } = useMarketplaceRegionFilter(RETURNS);

  const filtered = regionFiltered.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search && !r.id.includes(search) && !r.order.includes(search) && !r.product.toLowerCase().includes(search.toLowerCase()) && !r.customer.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpis = [
    { label: 'Pending', val: regionFiltered.filter(r => r.status === 'Requested').length, color: 'text-amber-600' },
    { label: 'Approved', val: regionFiltered.filter(r => r.status === 'Approved' || r.status === 'Picked Up').length, color: 'text-blue-600' },
    { label: 'Completed', val: regionFiltered.filter(r => r.status === 'Completed' || r.status === 'Refund Initiated').length, color: 'text-emerald-600' },
    { label: 'Rejected', val: regionFiltered.filter(r => r.status === 'Rejected').length, color: 'text-red-600' },
  ];

  const handleApprove = (ret: ReturnItem) => {
    execute(() => adminMarketplaceApi.approveReturn(ret.id), `Return ${ret.id} approved`, () => refetch());
    setSelectedReturn(null);
  };
  const handleReject = (reason: string) => {
    if (!rejectReturn) return;
    execute(() => adminMarketplaceApi.rejectReturn(rejectReturn.id, { reason }), `Return ${rejectReturn.id} rejected`, () => refetch());
    setRejectReturn(null);
    setSelectedReturn(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Return Requests</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Manage product returns and replacements</p></div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"><Download className="w-4 h-4" /> Export</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (<div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className={`text-2xl font-black ${k.color}`}>{k.val}</p><p className="text-xs text-slate-500 mt-1">{k.label}</p></div>))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search return ID, order, product, customer..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2 flex-wrap">{['', 'Requested', 'Approved', 'Picked Up', 'Refund Initiated', 'Completed', 'Rejected'].map(s => (<button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s || 'All'}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={5} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Return ID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Product</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Customer</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Country</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Reason</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Type</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Date</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.length === 0 ? (
              <tr><td colSpan={9}><MarketplaceEmptyState title="No returns found" icon={RotateCcw} /></td></tr>
            ) : paged.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setSelectedReturn(r)} tabIndex={0} onKeyDown={activateOnKey(() => setSelectedReturn(r))}>
                <td className="px-4 py-3.5"><p className="font-mono font-bold text-blue-700 text-xs">{r.id}</p><p className="text-[10px] text-slate-400">{r.order}</p></td>
                <td className="px-4 py-3.5 text-sm font-medium text-slate-800 max-w-[160px] truncate">{r.product}</td>
                <td className="px-4 py-3.5 text-sm text-slate-700">{r.customer}</td>
                <td className="px-4 py-3.5 text-center"><CountryFlag code={COUNTRY_TO_CODE[r.country] || 'IN'} size="sm" /></td>
                <td className="px-4 py-3.5 text-xs text-slate-600 max-w-[200px] truncate">{r.reason}</td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${r.type === 'Return' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>{r.type}</span></td>
                <td className="px-4 py-3.5 text-center"><MarketplaceStatusBadge status={STATUS_MAP[r.status]?.status || 'pending'} customLabel={r.status} /></td>
                <td className="px-4 py-3.5 text-center text-xs text-slate-500">{r.date}</td>
                <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setSelectedReturn(r)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button>
                    {r.status === 'Requested' && <>
                      <button onClick={() => handleApprove(r)} className="p-1.5 hover:bg-emerald-50 rounded-lg"><CheckCircle className="w-4 h-4 text-emerald-500" /></button>
                      <button onClick={() => setRejectReturn(r)} className="p-1.5 hover:bg-red-50 rounded-lg"><XCircle className="w-4 h-4 text-red-500" /></button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">{filtered.length} returns</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-bold">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {selectedReturn && <ReturnDetailDrawer ret={selectedReturn} onClose={() => setSelectedReturn(null)} onApprove={() => handleApprove(selectedReturn)} onReject={() => setRejectReturn(selectedReturn)} />}
      {rejectReturn && <RejectModal returnId={rejectReturn.id} onConfirm={handleReject} onClose={() => setRejectReturn(null)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
