'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Star, ThumbsUp, Filter, SortAsc,
  ChevronDown, Flag, MessageSquare, Camera,
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const RATING_CATS = [
  { label: 'Cleanliness', score: 9.2 },
  { label: 'Comfort', score: 9.0 },
  { label: 'Location', score: 9.5 },
  { label: 'Facilities', score: 8.8 },
  { label: 'Staff', score: 9.4 },
  { label: 'Value', score: 8.6 },
  { label: 'Wi-Fi', score: 8.3 },
];

const REVIEWS = [
  {
    id: 'rev-1', name: 'Sarah K.', avatar: '🇦🇪', country: 'UAE', date: 'Jun 10, 2026',
    rating: 5, title: 'Absolutely stunning hotel!',
    comment: 'The service was impeccable from check-in to check-out. The room was spacious, the pool was beautiful, and the breakfast buffet had an incredible selection. Staff went above and beyond to make our anniversary special.',
    stayType: 'Couple', roomType: 'Executive Suite', nights: 3,
    helpful: 24, hasPhotos: true, verified: true,
    response: { text: 'Thank you for your wonderful review, Sarah! We are delighted that you enjoyed your anniversary stay with us. We look forward to welcoming you again soon.', date: 'Jun 12, 2026' },
  },
  {
    id: 'rev-2', name: 'Amit P.', avatar: '🇮🇳', country: 'India', date: 'Jun 5, 2026',
    rating: 4, title: 'Great location and clean rooms',
    comment: 'Perfect for a business trip. The business center was well-equipped and the Wi-Fi was fast. The only downside was the restaurant could have more variety for vegetarian options.',
    stayType: 'Business', roomType: 'Deluxe King Room', nights: 2,
    helpful: 12, hasPhotos: false, verified: true,
    response: null,
  },
  {
    id: 'rev-3', name: 'James C.', avatar: '🇬🇧', country: 'UK', date: 'May 28, 2026',
    rating: 5, title: 'Best hotel stay in years!',
    comment: 'From the moment we arrived, we were treated like royalty. The kids loved the pool and kids club. The room was pristine and the view was breathtaking. We will definitely be back!',
    stayType: 'Family', roomType: 'Family Suite', nights: 5,
    helpful: 31, hasPhotos: true, verified: true,
    response: { text: 'Dear James, thank you for choosing us for your family holiday! We are thrilled the children enjoyed the Kids Club. See you next time!', date: 'May 30, 2026' },
  },
  {
    id: 'rev-4', name: 'Fatima A.', avatar: '🇶🇦', country: 'Qatar', date: 'May 20, 2026',
    rating: 5, title: 'Exceeded all expectations',
    comment: 'The spa was world-class and the fine dining restaurant was outstanding. Every detail was perfect. The concierge helped us plan amazing day trips. Highly recommended!',
    stayType: 'Couple', roomType: 'Premium Twin Room', nights: 4,
    helpful: 18, hasPhotos: false, verified: true,
    response: null,
  },
  {
    id: 'rev-5', name: 'Omar S.', avatar: '🇸🇦', country: 'Saudi Arabia', date: 'May 15, 2026',
    rating: 4, title: 'Good value, minor issues',
    comment: 'Overall a pleasant stay. The room was comfortable and clean. Check-in was a bit slow due to a system issue but staff apologized and upgraded us. Breakfast was excellent.',
    stayType: 'Solo', roomType: 'Deluxe King Room', nights: 2,
    helpful: 8, hasPhotos: false, verified: true,
    response: { text: 'Thank you Omar. We apologize for the check-in delay and are glad we could make it up with an upgrade. Your feedback helps us improve!', date: 'May 17, 2026' },
  },
];

const SORT_OPTIONS = ['Most Recent', 'Highest Rated', 'Lowest Rated', 'Most Helpful'];
const FILTER_OPTIONS = ['All Ratings', '5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'];
const TRAVELER_TYPES = ['All', 'Couple', 'Family', 'Business', 'Solo', 'Friends'];

export default function ReviewsPage() {
  const { hotelId } = useParams();
  const [sortBy, setSortBy] = useState('Most Recent');
  const [filterRating, setFilterRating] = useState('All Ratings');
  const [travelerType, setTravelerType] = useState('All');
  const [showSort, setShowSort] = useState(false);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  const overallRating = 4.8;
  const totalReviews = 1240;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/hotel-booking/hotel/${hotelId}`} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Guest Reviews</h1>
              <p className="text-xs text-slate-500">{totalReviews.toLocaleString()} verified reviews</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Overall Rating Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-start gap-6 mb-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-rose-600 rounded-2xl flex items-center justify-center mb-2">
                <span className="text-3xl font-black text-white">{overallRating}</span>
              </div>
              <p className="text-xs font-bold text-slate-900">Exceptional</p>
              <p className="text-[10px] text-slate-400">{totalReviews.toLocaleString()} reviews</p>
            </div>
            <div className="flex-1 space-y-2">
              {RATING_CATS.map(cat => (
                <div key={cat.label} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-20 font-medium">{cat.label}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${(cat.score / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-900 w-8 text-right">{cat.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <SortAsc className="w-4 h-4 text-slate-400" />
              {sortBy}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showSort && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowSort(false)} ><DismissOnEscape onDismiss={() => setShowSort(false)} /></div>
                <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 w-44">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => { setSortBy(opt); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${sortBy === opt ? 'bg-rose-50 text-rose-700 font-bold' : 'hover:bg-slate-50'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Rating Filter */}
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setFilterRating(opt)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                filterRating === opt
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Traveler Type */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {TRAVELER_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setTravelerType(type)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                travelerType === type
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Reviews */}
        <div className="space-y-4">
          {REVIEWS.map(review => (
            <div key={review.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-lg">
                    {review.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900">{review.name}</p>
                      {review.verified && (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Verified Stay</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{review.country} · {review.stayType} · {review.nights} nights</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg">
                  <Star className="w-3 h-3 text-rose-500 fill-current" />
                  <span className="text-sm font-bold text-rose-700">{review.rating}</span>
                </div>
              </div>

              {/* Content */}
              <h3 className="font-bold text-slate-900 mb-1">{review.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">{review.comment}</p>

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                <span>{review.date}</span>
                <span>·</span>
                <span>{review.roomType}</span>
                {review.hasPhotos && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-rose-500"><Camera className="w-3 h-3" /> Photos</span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-50">
                <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 transition-colors">
                  <ThumbsUp className="w-3.5 h-3.5" /> Helpful ({review.helpful})
                </button>
                <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  <Flag className="w-3.5 h-3.5" /> Report
                </button>
              </div>

              {/* Hotel Response */}
              {review.response && (
                <div className="mt-4 bg-slate-50 rounded-xl p-4 border-l-4 border-rose-400">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-xs font-bold text-slate-700">Hotel Response</span>
                    <span className="text-[10px] text-slate-400">· {review.response.date}</span>
                  </div>
                  <p className="text-sm text-slate-600">{review.response.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center py-4">
          <button className="bg-white border border-slate-200 px-8 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
            Load More Reviews
          </button>
        </div>
      </div>
    </div>
  );
}
