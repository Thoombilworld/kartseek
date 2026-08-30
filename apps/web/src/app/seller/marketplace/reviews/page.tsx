'use client';

import React, { useState, useEffect } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type SellerReview } from '@/lib/modules/seller-api';
import { Star, Search, MessageSquare, ThumbsUp, Flag, StarIcon } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
function RatingStars({ rating }: { rating: number }) {
  return (<div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(s => (<Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />))}</div>);
}

export default function ReviewsPage() {
  const { seller } = useSeller();
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getReviews(seller.sellerId)
      .then(res => { setReviews(res?.data ?? []); setLoadError(null); })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setReviews([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  const handleReply = async (reviewId: string) => {
    const reply = replyText[reviewId];
    if (!reply?.trim()) return;
    try { await sellerApi.replyToReview(seller.sellerId, reviewId, reply); } catch {}
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reply, repliedAt: new Date().toISOString() } : r));
    setReplyText(prev => ({ ...prev, [reviewId]: '' }));
  };

  const filtered = reviews.filter(r =>
    (ratingFilter === 0 || r.rating === ratingFilter) &&
    (!search || r.productName.toLowerCase().includes(search.toLowerCase()) || r.comment.toLowerCase().includes(search.toLowerCase()))
  );

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const ratingDist = [5, 4, 3, 2, 1].map(r => ({ rating: r, count: reviews.filter(rv => rv.rating === r).length }));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Star className="w-7 h-7 text-blue-600" />Reviews & Q&A</h1><p className="text-sm text-slate-500 mt-1">Monitor and respond to customer reviews</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Avg Rating</p><div className="flex items-center gap-2 mt-1"><p className="text-2xl font-black text-slate-900">{avgRating}</p><RatingStars rating={Math.round(Number(avgRating))} /></div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Total Reviews</p><p className="text-2xl font-black text-slate-900 mt-1">{reviews.length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Replied</p><p className="text-2xl font-black text-emerald-600 mt-1">{reviews.filter(r => r.reply).length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Pending Reply</p><p className="text-2xl font-black text-amber-600 mt-1">{reviews.filter(r => !r.reply).length}</p></div>
      </div>

      {/* Rating distribution */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Rating Distribution</h3>
        <div className="space-y-2">
          {ratingDist.map(d => (
            <div key={d.rating} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded" onClick={() => setRatingFilter(ratingFilter === d.rating ? 0 : d.rating)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setRatingFilter(ratingFilter === d.rating ? 0 : d.rating))}>
              <span className="text-xs font-bold text-slate-600 w-4">{d.rating}★</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2"><div className="bg-amber-400 h-2 rounded-full transition-all" style={{ width: `${reviews.length > 0 ? (d.count / reviews.length) * 100 : 0}%` }} /></div>
              <span className="text-xs text-slate-500 w-8 text-right">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>

      <div className="space-y-3">
        {filtered.map(r => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1"><RatingStars rating={r.rating} /><span className="text-xs text-slate-400">{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                <h4 className="font-bold text-slate-900">{r.title}</h4>
                <p className="text-xs text-slate-500">by {r.customerName} · <span className="text-blue-600">{r.productName}</span></p>
              </div>
              <div className="flex items-center gap-2"><ThumbsUp className="w-3.5 h-3.5 text-slate-400" /><span className="text-xs text-slate-500">{r.helpful}</span></div>
            </div>
            <p className="text-sm text-slate-700 mb-3">{r.comment}</p>
            {r.reply ? (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2">
                <p className="text-[10px] font-bold text-blue-600 mb-1">Your Reply · {r.repliedAt ? new Date(r.repliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</p>
                <p className="text-sm text-blue-800">{r.reply}</p>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap gap-2">
                  <input value={replyText[r.id] || ''} onChange={e => setReplyText(prev => ({ ...prev, [r.id]: e.target.value }))} placeholder="Write a reply..." className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button onClick={() => handleReply(r.id)} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"><MessageSquare className="w-3.5 h-3.5 inline mr-1" />Reply</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 bg-white border border-slate-200 rounded-xl"><Star className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No reviews found</p></div>}
      </div>
    </div>
  );
}
