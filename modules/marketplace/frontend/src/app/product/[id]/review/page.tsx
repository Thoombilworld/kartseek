'use client';

import React, { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, Camera, ChevronRight, Send, CheckCircle, ArrowLeft, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { addProductReview } from '@/lib/api/marketplace';
import { api, ApiError } from '@/lib/api-endpoints';
import { useRequireAuth } from '@/lib/contexts/login-prompt';
import { parseProductParam } from '@/lib/marketplace/product-url';

const TITLE_MAX = 120;
const COMMENT_MAX = 2000;

export default function WriteReviewPage() {
  const params = useParams();
  const router = useRouter();
  /**
   * The route segment is `<slug>-<uuid>`; the API keys on the uuid alone.
   *
   * `params.id` used to be the bare uuid and was passed straight through, so
   * every call here would 404 against the new URL shape. `segment` is kept for
   * the link back to the product, which is already canonical.
   */
  const segment = params?.id as string;
  const { id: productId } = parseProductParam(segment);
  const requireAuth = useRequireAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_PHOTOS = 4;

  /**
   * Upload the chosen photos and keep their URLs for the review payload.
   *
   * The picker was a `<button>` with no handler and no `<input type="file">`
   * behind it, and the submit below hardcoded `photos: []` — under a key the
   * service does not read, so even a wired picker would have been discarded.
   * `POST /upload/review-image` was added for this; every other upload route on
   * that controller is restricted to sellers, drivers or admins.
   */
  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - imageUrls.length;
    if (room <= 0) {
      setError(`You can attach at most ${MAX_PHOTOS} photos.`);
      return;
    }
    setUploading(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        const res = await api.upload<{ url: string }>('/upload/review-image', file);
        if (res?.url) uploaded.push(res.url);
      }
      setImageUrls(prev => [...prev, ...uploaded]);
    } catch (e) {
      setError(e instanceof ApiError
        ? (e.message || 'That photo could not be uploaded.')
        : 'We could not upload your photo. Please try again.');
    } finally {
      setUploading(false);
      // Clearing lets the same file be picked again after a failure.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const ratingLabels = ['', 'Poor', 'Below Average', 'Good', 'Very Good', 'Excellent'];

  /**
   * Post the review and only claim success when the server agrees.
   *
   * The previous version fired a bare `fetch`, which resolves on 401 and 500
   * alike, and set `submitted` unconditionally outside any status check — so the
   * customer got "Thank You! Your review has been submitted" whether or not
   * anything was stored. It also sent `userId: 'guest-user'`, which the gateway
   * ignores (it takes the author from the JWT), and no `Authorization` header at
   * all, so in production every one of these was a 401 behind a success screen.
   */
  const submitReview = async () => {
    // `parseProductParam` returns null for a segment carrying no uuid, which
    // means the URL was never one of ours — there is nothing to review.
    if (!productId) {
      setError('This product could not be identified. Please reopen it from the catalogue.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await addProductReview(productId, {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
        // `imageUrls` is what `addProductReview` reads and what the column is
        // called; the `photos` key this used to send went nowhere.
        imageUrls,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof ApiError
        ? (e.message || 'Your review could not be submitted.')
        : 'We could not reach the review service. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (rating === 0) { setError('Please choose a star rating.'); return; }
    if (title.length > TITLE_MAX) { setError(`Keep the headline under ${TITLE_MAX} characters.`); return; }
    if (comment.length > COMMENT_MAX) { setError(`Keep the review under ${COMMENT_MAX} characters.`); return; }
    // Reviews are attributed to the signed-in account, so gate before posting.
    requireAuth({ reason: 'to publish your review', onAuthenticated: () => { void submitReview(); } });
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Thank You!</h2>
          <p className="text-slate-500 mb-6">Your review has been submitted and is pending moderation.</p>
          <Link href={`/product/${segment}`}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Product
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50/30">
      <section className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white py-8 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Star className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold">Write a Review</h1>
          </div>
          <p className="text-white/70 text-sm">Share your experience with other shoppers</p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <Link href={`/product/${segment}`} className="hover:text-blue-600">Product</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Write Review</span>
        </nav>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          {/* Rating */}
          <div>
            <h3 className="font-bold text-slate-800 mb-3">Overall Rating</h3>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(s)}
                  className="p-1 hover:scale-110 transition-transform">
                  <Star className={`w-10 h-10 transition-colors ${(hoverRating || rating) >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                </button>
              ))}
              {(hoverRating || rating) > 0 && (
                <span className={`text-sm font-bold ml-2 ${rating >= 4 ? 'text-green-600' : rating >= 3 ? 'text-amber-600' : 'text-red-500'}`}>
                  {ratingLabels[hoverRating || rating]}
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="review-title">Review Title</label>
            <input id="review-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={TITLE_MAX}
              placeholder="Summarize your experience..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="your-review">Your Review</label>
            <textarea id="your-review" value={comment} onChange={e => setComment(e.target.value)} maxLength={COMMENT_MAX}
              placeholder="What did you like or dislike? Would you recommend this product?"
              rows={5}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" />
            <div className="text-xs text-slate-400 mt-1 text-right">{comment.length} / {COMMENT_MAX}</div>
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Add Photos (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="sr-only"
              onChange={e => handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || imageUrls.length >= MAX_PHOTOS}
              className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex flex-col items-center gap-2 disabled:opacity-60 disabled:hover:border-slate-300"
            >
              {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8" />}
              <span className="text-sm font-medium">
                {uploading
                  ? 'Uploading…'
                  : imageUrls.length >= MAX_PHOTOS
                    ? `Maximum ${MAX_PHOTOS} photos attached`
                    : 'Click to upload photos'}
              </span>
            </button>

            {imageUrls.length > 0 && (
              <ul className="flex flex-wrap gap-2 mt-3">
                {imageUrls.map(url => (
                  <li key={url} className="relative">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => setImageUrls(prev => prev.filter(u => u !== url))}
                      className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white rounded-full p-0.5 hover:bg-slate-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={submitting || rating === 0}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors flex items-center justify-center gap-2">
            <Send className="w-5 h-5" /> {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
