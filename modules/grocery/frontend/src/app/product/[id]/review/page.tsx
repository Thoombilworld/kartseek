'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, Camera, X, Send, ThumbsUp } from 'lucide-react';
import { groceryApi } from '@/lib/grocery-api';
import { AuthGate } from '@/components/shared/auth-gate';
import { useAuth } from '@/lib/contexts/auth-context';
import { useGroceryLocale } from '@/i18n/grocery-locale';

/**
 * Standalone review form.
 *
 * `submitReview('store-1', productId, { customerId: 'demo-user' })` posted every
 * review against a store called "store-1" under a user called "demo-user", threw
 * the failure away with `catch (_e) {}`, then showed a "Thank you!" screen after a
 * 1.5-second timer whether or not anything had been stored. The store now comes
 * from the product and the reviewer from the session, and a rejection is shown.
 */
export default function SubmitReviewPage() {
  return (
    <AuthGate reason="Sign in to review this product.">
      <SubmitReviewContent />
    </AuthGate>
  );
}

function SubmitReviewContent() {
  const { tr } = useGroceryLocale();
  const params = useParams();
  const productId = params.id as string;
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A review belongs to a (store, product) pair, and this route carries only the
  // product — so resolve the store before the form can be submitted.
  React.useEffect(() => {
    let cancelled = false;
    groceryApi.getProduct(productId)
      .then((p: any) => { if (!cancelled) setStoreId(p?.storeId ?? null); })
      .catch(() => { if (!cancelled) setError('We could not find this product.'); });
    return () => { cancelled = true; };
  }, [productId]);

  const handlePhotoUpload = () => {
    // Demo: add placeholder photos
    if (photos.length < 3) {
      setPhotos(prev => [...prev, `📸 Photo ${prev.length + 1}`]);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0 || !storeId || !user?.id) return;
    setLoading(true);
    setError(null);
    try {
      await groceryApi.submitReview(storeId, productId, {
        rating,
        customerId: user.id,
        customerName: user.name || undefined,
        // `title` was being sent as the reviewer's *name*, so a review headed
        // "Great value" was attributed to a customer of that name.
        comment: [title.trim(), comment.trim()].filter(Boolean).join('\n\n') || undefined,
      });
      setSubmitted(true);
    } catch (e) {
      // "You have already reviewed this product" is the common case here and the
      // customer needs to see it rather than a thank-you screen.
      setError(e instanceof Error ? e.message : 'Could not submit your review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ThumbsUp className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">{tr('Thank you!')}</h2>
          <p className="text-sm text-slate-500 mb-6">Your review has been submitted and will appear after moderation.</p>
          <div className="flex gap-3 justify-center">
            <Link href={`/grocery/product/${productId}`} className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 transition-colors">{tr('View Product')}</Link>
            <Link href="/grocery" className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">{tr('Continue Shopping')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href={`/grocery/product/${productId}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />{tr('Back to Product')}</Link>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{tr('Write a Review')}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Star Rating */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
          <p className="text-sm font-bold text-slate-700 mb-3">{tr('How would you rate this product?')}</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
                title={`Rate ${i} star${i > 1 ? 's' : ''}`}
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    i <= (hoverRating || rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-200'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {rating === 0 ? 'Tap a star' : ['', 'Poor', 'Below Average', 'Good', 'Very Good', 'Excellent'][rating]}
          </p>
        </div>

        {/* Review Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block" htmlFor="review-title">{tr('Review Title')}</label>
            <input id="review-title"
              type="text"
              placeholder={tr('e.g., Fresh and great quality!')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block" htmlFor="your-review">{tr('Your Review')}</label>
            <textarea id="your-review"
              placeholder={tr('Tell others what you think about this product...')}
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={5}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all resize-none"
              maxLength={1000}
            />
            <p className="text-[10px] text-slate-400 text-right mt-1">{comment.length}/1000</p>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">{tr('Add Photos (Optional)')}</label>
            <div className="flex gap-2 flex-wrap">
              {photos.map((p, i) => (
                <div key={i} className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center relative group">
                  <span className="text-2xl">{p}</span>
                  <button
                    onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title={tr('Remove photo')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <button
                  onClick={handlePhotoUpload}
                  className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  <Camera className="w-5 h-5 text-slate-400" />
                  <span className="text-[9px] text-slate-400 font-medium mt-1">Add</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || loading || !storeId}
          title={!storeId ? 'Loading product…' : undefined}
          className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            rating === 0 || loading || !storeId
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20'
          }`}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}
