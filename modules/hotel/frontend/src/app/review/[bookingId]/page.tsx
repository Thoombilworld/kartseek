'use client';
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Star, Camera, Send, ChevronRight, CheckCircle, Sparkles,
  BedDouble, Users, Droplets, MapPin, Banknote,
} from 'lucide-react';

const CATEGORIES = [
  { key: 'overall', label: 'Overall Stay', icon: Star, color: 'text-amber-500' },
  { key: 'cleanliness', label: 'Room Cleanliness', icon: Droplets, color: 'text-blue-500' },
  { key: 'service', label: 'Service & Staff', icon: Users, color: 'text-emerald-500' },
  { key: 'location', label: 'Location', icon: MapPin, color: 'text-purple-500' },
  { key: 'value', label: 'Value for Money', icon: Banknote, color: 'text-rose-500' },
];

export default function HotelReviewPage() {
  const { bookingId } = useParams();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hoveredStar, setHoveredStar] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState('');
  const [title, setTitle] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const avgRating = Object.values(ratings).length > 0
    ? Math.round(Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length * 10) / 10
    : 0;

  const pointsEarned = avgRating >= 4 ? 25 : avgRating >= 3 ? 15 : avgRating > 0 ? 5 : 0;
  const isComplete = Object.keys(ratings).length === CATEGORIES.length && title.trim() && reviewText.trim().length >= 10;

  function handleSubmit() {
    if (!isComplete) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Thank You! 🎉</h1>
        <p className="text-slate-500 mb-2">Your review has been submitted successfully.</p>
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm font-bold text-amber-700 mb-6">
          <Sparkles className="w-4 h-4" /> +{pointsEarned} Stay Points earned!
        </div>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link href="/hotel-booking/my-bookings" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm text-center transition-colors">
            View My Bookings
          </Link>
          <Link href="/hotel-booking" className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-sm text-center transition-colors">
            Browse More Hotels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-slate-900 mb-1">Rate Your Stay</h1>
      <p className="text-sm text-slate-500 mb-6">Booking: {bookingId} · The Grand Palace Hotel, Dubai</p>

      {/* Rating Categories */}
      <div className="space-y-4 mb-6">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const currentRating = ratings[cat.key] || 0;
          const hovered = hoveredStar[cat.key] || 0;
          return (
            <div key={cat.key} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${cat.color}`} />
                  <span className="font-bold text-slate-900 text-sm">{cat.label}</span>
                </div>
                <div className="flex gap-1" role="radiogroup" aria-label={`Rate ${cat.label}`}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s}
                      onClick={() => setRatings(prev => ({ ...prev, [cat.key]: s }))}
                      onMouseEnter={() => setHoveredStar(prev => ({ ...prev, [cat.key]: s }))}
                      onMouseLeave={() => setHoveredStar(prev => ({ ...prev, [cat.key]: 0 }))}
                      className="p-0.5 transition-transform hover:scale-125"
                      aria-label={`${s} star${s > 1 ? 's' : ''}`}
                    >
                      <Star className={`w-6 h-6 transition-colors ${
                        s <= (hovered || currentRating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Points Preview */}
      {avgRating > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-bold text-amber-800 text-sm">Points you will earn</p>
              <p className="text-xs text-amber-600">Based on your average rating of {avgRating} ★</p>
            </div>
          </div>
          <span className="text-xl font-black text-amber-700">+{pointsEarned} pts</span>
        </div>
      )}

      {/* Review Title */}
      <div className="mb-4">
        <label htmlFor="review-title" className="block text-xs font-bold text-slate-500 mb-1.5">Review Title <span className="text-rose-500">*</span></label>
        <input id="review-title" type="text" value={title} onChange={e => setTitle(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all"
          placeholder="e.g. Amazing experience!" maxLength={100}
        />
      </div>

      {/* Review Text */}
      <div className="mb-4">
        <label htmlFor="review-text" className="block text-xs font-bold text-slate-500 mb-1.5">Your Review <span className="text-rose-500">*</span></label>
        <textarea id="review-text" rows={4} value={reviewText} onChange={e => setReviewText(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all resize-none"
          placeholder="Tell us about your stay — room quality, service, amenities..."
        />
        <p className="text-xs text-slate-400 mt-1">{reviewText.length}/500 characters (min 10)</p>
      </div>

      {/* Photo Upload (Mock) */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-500 mb-1.5">Photos <span className="text-slate-400">(optional)</span></label>
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-rose-300 transition-colors cursor-pointer">
          <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">Click to upload photos of your stay</p>
          <p className="text-xs text-slate-400 mt-1">JPG, PNG up to 5MB each · Max 5 photos</p>
        </div>
      </div>

      {/* Submit */}
      <button onClick={handleSubmit} disabled={!isComplete}
        className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg text-sm"
      >
        <Send className="w-4 h-4" /> Submit Review & Earn {pointsEarned > 0 ? `+${pointsEarned} pts` : 'Points'}
      </button>
    </div>
  );
}
