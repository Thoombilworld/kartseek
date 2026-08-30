'use client';
import React, { useState } from 'react';
import { MessageSquare, Search, CheckCircle, XCircle, Eye, X, ChevronLeft, ChevronRight, Download, Edit3, Send, HelpCircle, AlertTriangle } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', 'Saudi Arabia': 'SA' };

type QAItem = {
  id: string; product: string; question: string; askedBy: string; country: string; date: string;
  answer: string; answeredBy: string; answerDate: string;
  status: 'Published' | 'Pending' | 'Rejected' | 'Needs Answer';
  reports: number; category: string;
};

const QA_ITEMS: QAItem[] = [
  { id: 'QA-001', product: 'iPhone 15 Pro', question: 'Does this support eSIM dual SIM in India?', askedBy: 'Rohit S.', country: 'India', date: '2026-06-06', answer: 'Yes, iPhone 15 Pro supports eSIM + nano-SIM dual SIM in India.', answeredBy: 'Apple India Store', answerDate: '2026-06-06', status: 'Published', reports: 0, category: 'Electronics' },
  { id: 'QA-002', product: 'Samsung Galaxy S24', question: 'What is the actual battery backup with AI features enabled?', askedBy: 'Priya M.', country: 'India', date: '2026-06-05', answer: '', answeredBy: '', answerDate: '', status: 'Needs Answer', reports: 0, category: 'Electronics' },
  { id: 'QA-003', product: 'MacBook Air M3', question: 'Can I run Windows via Boot Camp on M3?', askedBy: 'Vikram K.', country: 'India', date: '2026-06-05', answer: 'Boot Camp is not supported on Apple Silicon. You can use Parallels Desktop to run Windows in a VM.', answeredBy: 'TechExpert', answerDate: '2026-06-05', status: 'Published', reports: 0, category: 'Electronics' },
  { id: 'QA-004', product: 'Cheap Power Bank', question: 'Is this original or duplicate?', askedBy: 'Anonymous', country: 'India', date: '2026-06-04', answer: '100% original with warranty. Contact us for authenticity certificate.', answeredBy: 'QuickMart Express', answerDate: '2026-06-04', status: 'Pending', reports: 2, category: 'Accessories' },
  { id: 'QA-005', product: 'Nike Air Jordan 1', question: 'Are these US sizing or UK sizing?', askedBy: 'Amit P.', country: 'India', date: '2026-06-04', answer: 'These are US sizing. Please refer to the size chart on the product page for conversion.', answeredBy: 'Nike India', answerDate: '2026-06-04', status: 'Published', reports: 0, category: 'Fashion' },
  { id: 'QA-006', product: 'Dyson V15', question: 'Does the warranty cover battery replacement?', askedBy: 'Abdullah O.', country: 'Saudi Arabia', date: '2026-06-03', answer: '', answeredBy: '', answerDate: '', status: 'Needs Answer', reports: 0, category: 'Home' },
  { id: 'QA-007', product: 'Galaxy Z Fold5', question: 'How durable is the inner screen? Any crease issues?', askedBy: 'Ahmed F.', country: 'UAE', date: '2026-06-03', answer: 'The crease is minimal and not visible during use. Samsung offers free screen protection with purchase.', answeredBy: 'Gulf Electronics FZE', answerDate: '2026-06-03', status: 'Rejected', reports: 1, category: 'Electronics' },
];

const STATUS_STYLES: Record<string, string> = { Published: 'bg-emerald-50 text-emerald-700', Pending: 'bg-amber-50 text-amber-700', Rejected: 'bg-red-50 text-red-700', 'Needs Answer': 'bg-blue-50 text-blue-700' };
const PAGE_SIZE = 6;

// ── QA Detail Drawer ─────────────────────────────────────────────────────────
function QADrawer({ item: q, onClose, onApprove, onReject, onAnswer }: { item: QAItem; onClose: () => void; onApprove: () => void; onReject: () => void; onAnswer: (answer: string) => void }) {
  const [editAnswer, setEditAnswer] = useState(q.answer);
  const [editing, setEditing] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{q.id}</h2><p className="text-xs text-slate-500">{q.date}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[q.status]}`}>{q.status}</span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{q.category}</span>
            {q.reports > 0 && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">⚠ {q.reports} reports</span>}
          </div>

          <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">Product</p><p className="text-sm font-bold text-slate-900">{q.product}</p></div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><HelpCircle className="w-4 h-4 text-blue-600" /><span className="text-xs font-bold text-blue-700">Question</span></div>
            <p className="text-sm text-blue-900 font-medium">{q.question}</p>
            <p className="text-xs text-blue-500 mt-2">Asked by {q.askedBy} · <CountryFlag code={COUNTRY_TO_CODE[q.country] || 'IN'} size="sm" /> · {q.date}</p>
          </div>

          {/* Answer section */}
          {q.answer && !editing ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-600" /><span className="text-xs font-bold text-emerald-700">Answer</span></div>
                <button onClick={() => setEditing(true)} className="p-1 hover:bg-emerald-100 rounded-lg"><Edit3 className="w-3.5 h-3.5 text-emerald-600" /></button>
              </div>
              <p className="text-sm text-emerald-900">{q.answer}</p>
              <p className="text-xs text-emerald-500 mt-2">By {q.answeredBy} · {q.answerDate}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900">{q.answer ? 'Edit Answer' : 'Write Answer'}</h3>
              <textarea value={editAnswer} onChange={e => setEditAnswer(e.target.value)} placeholder="Type answer..." className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-28 outline-none focus:ring-2 focus:ring-blue-200" />
              <div className="flex gap-2">
                <button onClick={() => { onAnswer(editAnswer); setEditing(false); }} disabled={!editAnswer.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Submit Answer</button>
                {editing && <button onClick={() => setEditing(false)} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Cancel</button>}
              </div>
            </div>
          )}

          {/* Moderation Actions */}
          {q.status === 'Pending' && (
            <div className="flex gap-3">
              <button onClick={onApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Approve</button>
              <button onClick={onReject} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Reject</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function QAModerationPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<QAItem | null>(null);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getQAItems({ status: filter !== 'all' ? filter : undefined }),
    [filter]
  );
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered } = useMarketplaceRegionFilter(QA_ITEMS);
  const filtered = regionFiltered.filter(q => {
    if (filter !== 'all' && q.status !== filter) return false;
    if (search && !q.product.toLowerCase().includes(search.toLowerCase()) && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleApprove = (q: QAItem) => { execute(() => adminMarketplaceApi.moderateQAItem(q.id, { action: 'approve' }), `Q&A ${q.id} approved`, () => refetch()); setSelectedItem(null); };
  const handleReject = (q: QAItem) => { execute(() => adminMarketplaceApi.moderateQAItem(q.id, { action: 'reject' }), `Q&A ${q.id} rejected`, () => refetch()); setSelectedItem(null); };
  const handleAnswer = (q: QAItem, answer: string) => { execute(() => adminMarketplaceApi.moderateQAItem(q.id, { action: 'answer', answer }), `Answer submitted for ${q.id}`, () => refetch()); setSelectedItem(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Q&A Moderation</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Moderate product questions and answers</p></div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: 'Total', v: regionFiltered.length, c: 'text-slate-900' }, { l: 'Pending', v: regionFiltered.filter(q => q.status === 'Pending').length, c: 'text-amber-600' }, { l: 'Needs Answer', v: regionFiltered.filter(q => q.status === 'Needs Answer').length, c: 'text-blue-600' }, { l: 'Published', v: regionFiltered.filter(q => q.status === 'Published').length, c: 'text-emerald-600' }].map(k => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className={`text-2xl font-black ${k.c}`}>{k.v}</p><p className="text-xs text-slate-500 mt-1">{k.l}</p></div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search product or question..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2 flex-wrap">{['all', 'Pending', 'Needs Answer', 'Published', 'Rejected'].map(s => (<button key={s} onClick={() => { setFilter(s); setPage(1); }} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="space-y-3">
        {paged.length === 0 ? (
          <MarketplaceEmptyState title="No Q&A items found" icon={MessageSquare} />
        ) : paged.map(q => (
          <div key={q.id} onClick={() => setSelectedItem(q)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setSelectedItem(q))} className={`bg-white border rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow ${q.status === 'Pending' && q.reports > 0 ? 'border-red-200' : 'border-slate-200'}`}>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 shrink-0 mt-0.5"><HelpCircle className="w-4 h-4 text-blue-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-xs font-bold text-slate-500">{q.product}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[q.status]}`}>{q.status}</span>
                  {q.reports > 0 && <span className="text-[10px] font-bold text-red-600">⚠ {q.reports}</span>}
                </div>
                <p className="text-sm font-bold text-slate-900 mb-1">{q.question}</p>
                {q.answer && <p className="text-xs text-slate-600 line-clamp-1"><span className="text-emerald-600 font-bold">A:</span> {q.answer}</p>}
                <p className="text-xs text-slate-400 mt-2">by {q.askedBy} · <CountryFlag code={COUNTRY_TO_CODE[q.country] || 'IN'} size="sm" /> · {q.date}</p>
              </div>
              <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                {q.status === 'Pending' && <>
                  <button onClick={() => handleApprove(q)} className="p-1.5 hover:bg-emerald-50 rounded-lg"><CheckCircle className="w-4 h-4 text-emerald-500" /></button>
                  <button onClick={() => handleReject(q)} className="p-1.5 hover:bg-red-50 rounded-lg"><XCircle className="w-4 h-4 text-red-500" /></button>
                </>}
                <button onClick={() => setSelectedItem(q)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (<div className="flex items-center justify-between px-2"><p className="text-xs text-slate-500">{filtered.length} items</p><div className="flex items-center gap-2"><button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><span className="text-xs font-bold">{page}/{totalPages}</span><button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>)}

      {selectedItem && <QADrawer item={selectedItem} onClose={() => setSelectedItem(null)} onApprove={() => handleApprove(selectedItem)} onReject={() => handleReject(selectedItem)} onAnswer={(answer) => handleAnswer(selectedItem, answer)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
