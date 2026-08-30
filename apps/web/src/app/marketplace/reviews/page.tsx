'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Star, Camera, X, ThumbsUp, ThumbsDown, CheckCircle, Filter,
  ArrowLeft, MessageSquare, Shield, AlertCircle, Edit2, Award,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { getCustomerReviews, getOrders, addProductReview, voteReviewHelpful } from '@/lib/api/marketplace';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type Review = {
  id: string; productId: string; productName: string; rating: number; title: string;
  body: string; author: string; date: string; verified: boolean; helpful: number;
  notHelpful: number; images: string[];
};

type PendingReview = { orderId: string; productId: string; productName: string; brand: string; deliveredDate: string };

// Maps a backend review → this page's Review shape.
function normalizeReview(r: any): Review {
  return {
    id: r.id,
    productId: r.productId || '',
    productName: r.productName || r.product?.name || '',
    rating: Number(r.rating || 0),
    title: r.title || '',
    body: r.comment || r.body || '',
    author: r.customerName || 'You',
    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
    verified: !!r.isVerifiedPurchase,
    helpful: Number(r.helpfulCount || 0),
    notHelpful: 0,
    images: r.imageUrls || [],
  };
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'written'>('pending');
  /** Reviews this session has voted on, so the button reads as spent. */
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  /** Server-confirmed counts, which replace the loaded value once known. */
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});
  const [votingId, setVotingId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  /**
   * Mark a review helpful.
   *
   * The count is taken from the response rather than incremented locally: the
   * server owns it, and a second tab or a repeat vote would otherwise drift the
   * number away from the row behind it.
   */
  const voteHelpful = async (reviewId: string) => {
    if (votedIds.has(reviewId)) return;
    setVotingId(reviewId);
    setVoteError(null);
    try {
      const res: any = await voteReviewHelpful(reviewId);
      const count = res?.helpfulCount ?? res?.data?.helpfulCount;
      setVotedIds(prev => new Set(prev).add(reviewId));
      if (typeof count === 'number') setHelpfulCounts(prev => ({ ...prev, [reviewId]: count }));
    } catch {
      setVoteError(reviewId);
    } finally {
      setVotingId(null);
    }
  };
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [writeProduct, setWriteProduct] = useState<PendingReview | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res: any = await getCustomerReviews(user?.id);
        const list = res?.data ?? res?.reviews ?? [];
        if (!cancelled) setReviews(Array.isArray(list) ? list.map(normalizeReview) : []);
      } catch { if (!cancelled) setReviews([]); }
    })();
    (async () => {
      try {
        const res: any = await getOrders(user?.id ? { userId: user.id, status: 'DELIVERED' } : { status: 'DELIVERED' });
        const orders = res?.data ?? res?.orders ?? [];
        const items: PendingReview[] = [];
        (Array.isArray(orders) ? orders : []).forEach((o: any) => {
          (o.items || []).forEach((it: any) => items.push({
            orderId: o.orderNumber || o.id,
            productId: it.productId || '',
            productName: it.name || 'Product',
            brand: it.brand || '',
            deliveredDate: (o.updatedAt || o.createdAt || '').slice(0, 10),
          }));
        });
        if (!cancelled) setPending(items);
      } catch { if (!cancelled) setPending([]); }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const filtered = reviews.filter(r => ratingFilter === 0 || r.rating === ratingFilter);
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'helpful') return b.helpful - a.helpful;
    if (sortBy === 'highest') return b.rating - a.rating;
    if (sortBy === 'lowest') return a.rating - b.rating;
    return 0;
  });

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star, count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  const openWrite = (product: PendingReview) => {
    setWriteProduct(product); setRating(0); setHoverRating(0);
    setReviewTitle(''); setReviewBody('');
    setShowWriteModal(true);
  };

  async function submitReview() {
    if (!writeProduct?.productId || rating === 0) return;
    setSubmittingReview(true);
    try {
      await addProductReview(writeProduct.productId, {
        customerId: user?.id,
        customerName: user?.name,
        rating,
        title: reviewTitle,
        comment: reviewBody,
        isVerifiedPurchase: true,
      });
      setShowWriteModal(false);
      const res: any = await getCustomerReviews(user?.id);
      const list = res?.data ?? res?.reviews ?? [];
      setReviews(Array.isArray(list) ? list.map(normalizeReview) : []);
      setActiveTab('written');
    } catch {
      // leave the modal open so the user can retry
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto px-3 xs:px-4 py-6 space-y-6 pb-mobile-nav">
      <div className="flex items-center gap-3">
        <Link href="/marketplace/orders" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <div><h1 className="text-2xl font-black text-slate-900">My Reviews & Ratings</h1><p className="text-sm text-slate-500">Rate products you've purchased</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {[
          { key: 'pending', label: `Pending (${pending.length})` },
          { key: 'written', label: `My Reviews (${reviews.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{tab.label}</button>
        ))}
      </div>

      {/* Pending Reviews */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pending.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700">
              <Award className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Rate your purchases to earn <span className="font-bold">50 KARTSEEK Coins</span> per review! Photo reviews earn <span className="font-bold">100 Coins</span>.</p>
            </div>
          )}
          {pending.map(p => (
            <div key={p.orderId} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{p.productName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.brand} · Delivered: {p.deliveredDate}</p>
              </div>
              <button onClick={() => openWrite(p)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Edit2 className="w-3.5 h-3.5" />Write Review</button>
            </div>
          ))}
          {pending.length === 0 && (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
              <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">All caught up!</p>
              <p className="text-xs text-slate-400">No pending reviews</p>
            </div>
          )}
        </div>
      )}

      {/* Written Reviews */}
      {activeTab === 'written' && (
        <div className="space-y-5">
          {/* Rating Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex gap-8 flex-wrap">
            <div className="text-center">
              <p className="text-4xl font-black text-slate-900">{avgRating}</p>
              <div className="flex gap-0.5 justify-center my-1">
                {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(avgRating)) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />)}
              </div>
              <p className="text-xs text-slate-500">{reviews.length} reviews</p>
            </div>
            <div className="flex-1 space-y-1.5 min-w-[200px]">
              {ratingDist.map(d => (
                <button key={d.star} onClick={() => setRatingFilter(ratingFilter === d.star ? 0 : d.star)} className="flex items-center gap-2 w-full group">
                  <span className="text-xs text-slate-500 w-3">{d.star}</span>
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${ratingFilter === d.star ? 'bg-blue-500' : 'bg-yellow-400'}`} style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 w-8 text-right">{d.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{sorted.length} reviews{ratingFilter > 0 ? ` (${ratingFilter}★ filter)` : ''}</p>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white" aria-label="Sort">{[['newest', 'Newest First'], ['helpful', 'Most Helpful'], ['highest', 'Highest Rated'], ['lowest', 'Lowest Rated']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>

          {/* Review Cards */}
          {sorted.map(r => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />)}</div>
                <span className="font-bold text-sm text-slate-900">{r.title}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{r.body}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-bold text-slate-600">{r.author}</span>
                  {r.verified && <span className="flex items-center gap-0.5 text-emerald-600 font-bold"><Shield className="w-3 h-3" />Verified</span>}
                  <span>{r.date}</span>
                  <span className="text-slate-300">·</span>
                  <span>{r.productName}</span>
                </div>
                {/* Was two handlerless buttons. The thumbs-down had no counter
                    behind it either — `reviews` has `helpfulCount` and nothing
                    else — so a "not helpful" vote had nowhere to go even in
                    principle, and the number beside it was always zero. Only
                    the helpful vote is offered, and it posts. */}
                <div className="flex items-center gap-3 text-xs">
                  <button
                    onClick={() => voteHelpful(r.id)}
                    disabled={votedIds.has(r.id) || votingId === r.id}
                    aria-label={votedIds.has(r.id) ? 'You marked this helpful' : 'Mark this review helpful'}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
                      votedIds.has(r.id)
                        ? 'text-blue-600 font-semibold'
                        : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                    } disabled:cursor-default`}
                  >
                    <ThumbsUp className={`w-3 h-3 ${votedIds.has(r.id) ? 'fill-blue-600' : ''}`} />
                    {helpfulCounts[r.id] ?? r.helpful}
                  </button>
                  {voteError === r.id && (
                    <span role="alert" className="text-red-600">Couldn&apos;t register that — try again.</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Write Review Modal */}
      {showWriteModal && writeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowWriteModal(false)} ><DismissOnEscape onDismiss={() => setShowWriteModal(false)} /></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div><h3 className="text-lg font-black text-slate-900">Write a Review</h3><p className="text-xs text-slate-500">{writeProduct.productName}</p></div>
              <button onClick={() => setShowWriteModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Star Rating */}
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700 mb-2">How would you rate this product?</p>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(s)} className="p-1">
                      <Star className={`w-8 h-8 transition-colors ${s <= (hoverRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
                {rating > 0 && <p className="text-xs text-slate-500 mt-1">{['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][rating]}</p>}
              </div>
              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block" htmlFor="review-title">Review Title *</label>
                <input id="review-title" value={reviewTitle} onChange={e => setReviewTitle(e.target.value)} placeholder="Summarize your experience..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" />
              </div>
              {/* Body */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block" htmlFor="detailed-review">Detailed Review *</label>
                <textarea id="detailed-review" value={reviewBody} onChange={e => setReviewBody(e.target.value)} rows={5} placeholder="What did you like or dislike? How was the quality? Would you recommend it?" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none resize-none" />
                <p className="text-[10px] text-slate-400 text-right mt-1">{reviewBody.length} / 2000</p>
              </div>
              {/* Photos */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Add Photos <span className="text-slate-400">(earn bonus coins!)</span></label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30">
                      <Camera className="w-5 h-5 text-slate-300" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Upload up to 4 photos (JPG/PNG, max 5MB each)</p>
              </div>
              {/* A "Would you recommend this product?" Yes/No pair stood here.
                  Neither button had a handler, neither answer was part of
                  `submitReview`, and `reviews` has no column to hold one — so
                  the customer was asked a question that was discarded on every
                  submission. The star rating already carries this signal; the
                  question is removed rather than faked. */}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setShowWriteModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={submitReview} disabled={submittingReview || rating === 0} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" />{submittingReview ? 'Submitting…' : 'Submit Review'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
