'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Star, Camera, Send, Check, ThumbsUp, MessageSquare } from 'lucide-react';

const CATEGORIES = ['Cleanliness', 'Comfort', 'Location', 'Facilities', 'Staff', 'Value for Money'];

export default function WriteReviewPage() {
  const { bookingId } = useParams();
  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [title, setTitle] = useState('');
  const [review, setReview] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-emerald-500" /></div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Review Submitted!</h1>
          <p className="text-sm text-slate-500 mb-2">Thank you for sharing your experience. Your review will be published after moderation.</p>
          <p className="text-xs text-amber-600 font-medium mb-6">🎉 You earned 50 bonus loyalty points!</p>
          <Link href="/hotel-bookings" className="block w-full bg-rose-600 text-white font-bold py-4 rounded-2xl hover:bg-rose-700 transition-colors">Back to My Bookings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href={`/hotel-bookings/${bookingId}`} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-lg font-bold text-slate-900">Write a Review</h1>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Hotel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-50 rounded-xl flex items-center justify-center text-3xl">🏰</div>
          <div><h2 className="font-bold text-slate-900">The Grand Palace Hotel</h2><p className="text-xs text-slate-400">Dubai, UAE · Jul 1–3, 2026</p></div>
        </div>
        {/* Overall Rating */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-3">Overall Rating</h3>
          <div className="flex items-center gap-2 justify-center">
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setOverallRating(s)} className="p-1" aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}>
                <Star className={`w-10 h-10 transition-colors ${s <= overallRating ? 'text-amber-400 fill-current' : 'text-slate-200'}`} />
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">{['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][overallRating] || 'Tap to rate'}</p>
        </div>
        {/* Category Ratings */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-4">Rate by Category</h3>
          <div className="space-y-3">
            {CATEGORIES.map(cat => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-slate-700 font-medium w-36">{cat}</span>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setCategoryRatings(prev => ({ ...prev, [cat]: s }))} aria-label={`Rate ${cat} ${s} star${s > 1 ? 's' : ''}`}>
                      <Star className={`w-5 h-5 transition-colors ${s <= (categoryRatings[cat] || 0) ? 'text-amber-400 fill-current' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Written Review */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-3">Your Review</h3>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Review title..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 mb-3 transition-all font-bold" />
          <textarea value={review} onChange={e => setReview(e.target.value)} rows={4} placeholder="Share your experience..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none transition-all" />
          <div className="flex items-center justify-between mt-3">
            <button className="flex items-center gap-2 text-xs text-rose-600 font-medium hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors"><Camera className="w-4 h-4" /> Add Photos</button>
            <span className="text-[10px] text-slate-400">{review.length}/2000</span>
          </div>
        </div>
        <button onClick={() => setSubmitted(true)} disabled={overallRating === 0} className={`w-full font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 ${overallRating > 0 ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
          <Send className="w-4 h-4" /> Submit Review
        </button>
        <p className="text-center text-[10px] text-slate-400">Earn 50 loyalty points for submitting a review</p>
      </div>
    </div>
  );
}
