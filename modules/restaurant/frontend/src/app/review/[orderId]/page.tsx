'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Star, Camera, X, ChevronLeft, UtensilsCrossed,
  Truck, CheckCircle, Send, ImagePlus,
} from 'lucide-react';

/* ── Mock Data ─────────────────────────────────────────────────────────── */

const ORDER = {
  id: 'ORD-R-44821',
  restaurant: 'Masala Kitchen',
  date: '2026-06-17',
  items: ['Butter Chicken', 'Garlic Naan (x2)', 'Mango Lassi'],
  type: 'delivery' as const,
};

const RATING_CATEGORIES = [
  { id: 'food', label: 'Food Quality', icon: UtensilsCrossed, description: 'Taste, freshness, and presentation' },
  { id: 'delivery', label: 'Delivery', icon: Truck, description: 'Speed and packaging' },
];

const EMOJI_LABELS = ['😞', '😕', '😐', '🙂', '🤩'];
const TEXT_LABELS = ['Terrible', 'Bad', 'Okay', 'Good', 'Excellent'];

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function RestaurantReviewPage() {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hovering, setHovering] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const allRated = RATING_CATEGORIES.every((c) => ratings[c.id] > 0);
  const overallRating = allRated
    ? Math.round((Object.values(ratings).reduce((a, b) => a + b, 0) / Object.keys(ratings).length) * 10) / 10
    : 0;

  const handlePhotoUpload = () => {
    // Simulate photo upload
    const mockPhotos = [
      'Photo 1 - Butter Chicken',
      'Photo 2 - Garlic Naan',
    ];
    setPhotos((prev) => [...prev, mockPhotos[prev.length % mockPhotos.length]]);
  };

  const handleSubmit = async () => {
    if (!allRated) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Thank You!</h1>
          <p className="text-sm text-slate-500 mb-3 max-w-sm mx-auto">
            Your review for <span className="font-semibold text-slate-700">{ORDER.restaurant}</span> has been submitted.
          </p>
          {overallRating > 0 && (
            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="text-4xl">{EMOJI_LABELS[Math.round(overallRating) - 1]}</span>
              <span className="text-lg font-black text-slate-900">{overallRating}/5</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
              Browse Restaurants
            </Link>
            <Link href="/orders" className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-6 py-3 rounded-xl transition-colors text-sm">
              View Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href="/orders" className="inline-flex items-center gap-1.5 text-orange-200 hover:text-white text-sm font-medium mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Orders
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black mb-1">Rate Your <span className="text-orange-200">Experience</span></h1>
          <div className="mt-4 bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{ORDER.restaurant}</h2>
                <p className="text-orange-200 text-xs">
                  {ORDER.items.join(' · ')} · {new Date(ORDER.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-3 pb-12 space-y-5">
        {/* ── Rating Cards ────────────────────────────────────────── */}
        {RATING_CATEGORIES.map((cat) => {
          const currentRating = hovering[cat.id] || ratings[cat.id] || 0;
          return (
            <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <cat.icon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{cat.label}</h3>
                  <p className="text-[10px] text-slate-400">{cat.description}</p>
                </div>
                {currentRating > 0 && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-2xl">{EMOJI_LABELS[currentRating - 1]}</span>
                    <span className="text-xs font-bold text-slate-600">{TEXT_LABELS[currentRating - 1]}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3 mt-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHovering({ ...hovering, [cat.id]: star })}
                    onMouseLeave={() => setHovering({ ...hovering, [cat.id]: 0 })}
                    onClick={() => setRatings({ ...ratings, [cat.id]: star })}
                    className="group/star"
                    title={`${TEXT_LABELS[star - 1]} (${star}/5)`}
                  >
                    <Star
                      className={`w-10 h-10 transition-all duration-150 ${
                        star <= currentRating
                          ? 'text-amber-400 fill-amber-400 scale-110'
                          : 'text-slate-200 hover:text-amber-300 group-hover/star:scale-110'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* ── Review Text ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Write a Review <span className="text-slate-400 font-normal">(optional)</span></h3>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience — what did you love? What could be better?"
            className="w-full h-28 px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-400 transition-all placeholder-slate-400"
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-slate-400">{reviewText.length}/500 characters</p>
          </div>
        </div>

        {/* ── Photo Upload ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Add Photos <span className="text-slate-400 font-normal">(optional)</span></h3>
          <div className="flex gap-3 flex-wrap">
            {photos.map((photo, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                <Camera className="w-6 h-6 text-orange-400" />
                <button
                  onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  title="Remove photo"
                >
                  <X className="w-3 h-3" />
                </button>
                <span className="absolute bottom-1 text-[8px] font-bold text-orange-600 truncate max-w-[60px]">{photo}</span>
              </div>
            ))}

            {photos.length < 4 && (
              <button
                onClick={handlePhotoUpload}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-colors"
                title="Upload photo"
              >
                <ImagePlus className="w-5 h-5 mb-1" />
                <span className="text-[9px] font-bold">Upload</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Submit ──────────────────────────────────────────────── */}
        <button
          onClick={handleSubmit}
          disabled={!allRated || loading}
          className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            allRated
              ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
         aria-label="Send">
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              {allRated ? 'Submit Review' : 'Please rate all categories to submit'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
