'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, Flag, Eye, Search, MessageSquare, CheckCircle, XCircle, AlertTriangle, Send, Filter } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

/* ── Mock Review Data ──────────────────────────────────────────────── */
const REVIEW_STATS = { avgRating: 4.5, total: 324, published: 298, pending: 18, flagged: 8 };

const reviews = [
  { id: 'REV-001', guest: 'Sarah K.', hotel: 'The Grand Palace Hotel', rating: 5, comment: 'Absolutely stunning hotel! The service was impeccable and the room was spotless. Will definitely come back.', date: '2026-07-01', stayType: 'Couple', status: 'published', flagged: false, reply: 'Thank you, Sarah! We look forward to welcoming you again.', helpful: 12 },
  { id: 'REV-002', guest: 'Amit P.', hotel: 'The Grand Palace Hotel', rating: 4, comment: 'Great location and clean rooms. The breakfast could use more variety though.', date: '2026-06-28', stayType: 'Business', status: 'published', flagged: false, reply: null, helpful: 5 },
  { id: 'REV-003', guest: 'John D.', hotel: 'Budget Inn Express', rating: 2, comment: 'Room was dirty and AC was not working. Very disappointing stay. Staff was unhelpful.', date: '2026-06-20', stayType: 'Solo', status: 'published', flagged: true, reply: null, helpful: 0 },
  { id: 'REV-004', guest: 'Maria L.', hotel: 'Heritage Boutique Hotel', rating: 5, comment: 'The most beautiful hotel I have ever stayed in. Every detail was perfect from the decor to the cuisine.', date: '2026-06-15', stayType: 'Couple', status: 'published', flagged: false, reply: 'We are thrilled you enjoyed your stay, Maria!', helpful: 28 },
  { id: 'REV-005', guest: 'David W.', hotel: 'Seaside Family Resort', rating: 4, comment: 'Kids loved the pool and beach. Good family experience overall. Just a bit pricey.', date: '2026-06-10', stayType: 'Family', status: 'pending', flagged: false, reply: null, helpful: 3 },
  { id: 'REV-006', guest: 'Lisa M.', hotel: 'City Center Inn', rating: 1, comment: 'SCAM!! This hotel is nothing like the photos. Complete false advertising!!!', date: '2026-06-08', stayType: 'Solo', status: 'pending', flagged: true, reply: null, helpful: 0 },
  { id: 'REV-007', guest: 'Tom B.', hotel: 'Mountain Retreat', rating: 5, comment: 'Peaceful retreat in the mountains. Perfect for a weekend getaway. The fireplace was a lovely touch.', date: '2026-06-05', stayType: 'Couple', status: 'published', flagged: false, reply: null, helpful: 15 },
  { id: 'REV-008', guest: 'Anna R.', hotel: 'Airport Express Hotel', rating: 3, comment: 'Convenient for transit but nothing special. Room was basic but clean enough for one night.', date: '2026-06-03', stayType: 'Solo', status: 'published', flagged: false, reply: null, helpful: 2 },
];

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-red-700',
};

export default function ReviewsPage() {
  const { regionLabel, isFiltered, formatPrice } = useHotelRegionFilter([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRating, setFilterRating] = useState('All');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const filtered = reviews
    .filter(r => filterStatus === 'All' || r.status === filterStatus || (filterStatus === 'flagged' && r.flagged))
    .filter(r => filterRating === 'All' || r.rating === Number(filterRating))
    .filter(r => r.guest.toLowerCase().includes(search.toLowerCase()) || r.hotel.toLowerCase().includes(search.toLowerCase()) || r.comment.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Star className="w-6 h-6 text-rose-500 fill-rose-500" /> Review Management
        </h1>
        <p className="text-slate-500 text-sm">Moderate customer reviews, handle flagged content, and monitor sentiment.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
          <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
          <div><p className="text-2xl font-black text-amber-700">{REVIEW_STATS.avgRating}</p><p className="text-xs font-medium text-amber-600">Avg Rating</p></div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4"><p className="text-2xl font-black text-slate-700">{REVIEW_STATS.total}</p><p className="text-xs font-medium text-slate-500">Total Reviews</p></div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-2xl font-black text-emerald-700">{REVIEW_STATS.published}</p><p className="text-xs font-medium text-emerald-600">Published</p></div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-2xl font-black text-blue-700">{REVIEW_STATS.pending}</p><p className="text-xs font-medium text-blue-600">Pending</p></div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4"><p className="text-2xl font-black text-red-700">{REVIEW_STATS.flagged}</p><p className="text-xs font-medium text-red-600">Flagged</p></div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Rating Distribution</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map(star => {
            const count = reviews.filter(r => r.rating === star).length;
            const pct = Math.round((count / reviews.length) * 100);
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700 w-6">{star}★</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5"><div className={`bg-amber-400 rounded-full h-2.5 transition-all w-[${pct}%]`} /></div>
                <span className="text-xs text-slate-500 w-16 text-right">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full" /></div>
        <select title="Filter by status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2"><option>All</option><option value="published">Published</option><option value="pending">Pending</option><option value="flagged">Flagged</option></select>
        <select title="Filter by rating" value={filterRating} onChange={e => setFilterRating(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2"><option>All</option><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filtered.map(r => (
          <div key={r.id} className={`bg-white border ${r.flagged ? 'border-red-200' : 'border-slate-200'} rounded-xl p-5 shadow-sm hover:shadow-md transition-all`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900">{r.guest}</h3>
                  <span className="text-xs text-slate-400">• {r.stayType} • {r.date}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                  {r.flagged && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"><Flag className="w-2.5 h-2.5" />Flagged</span>}
                </div>
                <p className="text-xs text-slate-400">{r.hotel}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}</div>
                {r.helpful > 0 && <span className="text-[10px] text-slate-400 flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {r.helpful} helpful</span>}
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-3">{r.comment}</p>
            {r.reply && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 border-l-2 border-rose-300 mb-3">
                <p className="text-[10px] font-bold text-slate-400 mb-1">HOTEL REPLY</p>{r.reply}
              </div>
            )}

            {/* Reply Form */}
            {replyingTo === r.id && (
              <div className="bg-rose-50 rounded-lg p-3 mb-3 border border-rose-100">
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write an admin response..." className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-16 mb-2" />
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 flex items-center gap-1"><Send className="w-3 h-3" /> Post Reply</button>
                  <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="px-3 py-1.5 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button className="px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold border border-slate-200 flex items-center gap-1 transition-colors"><Eye className="w-3 h-3" />View</button>
              {!r.reply && <button onClick={() => { setReplyingTo(r.id); setReplyText(''); }} className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"><MessageSquare className="w-3 h-3" />Reply</button>}
              {r.status === 'pending' && (
                <>
                  <button className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"><CheckCircle className="w-3 h-3" />Approve</button>
                  <button className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"><XCircle className="w-3 h-3" />Reject</button>
                </>
              )}
              {r.flagged && <button className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors">Remove</button>}
              {!r.flagged && r.status === 'published' && <button className="px-3 py-1 rounded-lg text-amber-600 hover:bg-amber-50 text-xs font-bold border border-amber-200 flex items-center gap-1 transition-colors"><Flag className="w-3 h-3" />Flag</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
