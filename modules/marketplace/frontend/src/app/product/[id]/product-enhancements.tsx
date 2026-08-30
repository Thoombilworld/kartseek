'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MapPin, Truck, Clock, CheckCircle, Star, ThumbsUp, Camera, MessageSquare, ChevronDown, ChevronUp, Package, Calculator, CreditCard, HelpCircle, Send, Award, User } from 'lucide-react';
import { getQuestions, createQuestion, getAnswers, upvoteQuestion, voteAnswerHelpful, getProductBundles, getProductReviews, type ProductBundle } from '@/lib/api/marketplace';

import { api } from '@/lib/api-endpoints';

/** One instalment plan as quoted by `/marketplace/products/:id/emi-options`. */
interface EmiPlan {
  tenure: number;
  bank: string;
  interestRate: number;
  monthlyEmi: number;
  label: string;
}

/** One published review as the product page renders it. */
interface ProductReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  date: string | null;
  verified: boolean;
  helpful: number;
}
import { usePincodeSearchLog } from '@/lib/contexts/pincode-search-log';
import { useRegion } from '@/lib/contexts/region-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useToast } from '@/lib/contexts/toast-context';
import NotifyMeModal from '@/components/shared/NotifyMeModal';
import { productPath } from '@/lib/marketplace/product-url';

/*
 * The variant selector that used to live here has moved to
 * `variant-picker.tsx`, backed by `variant-context.tsx`. It re-fetched the
 * variants from the browser and read the response as an array when the endpoint returns
 * `{ data: { productId, variants, total } }`, so it threw on every product that
 * had variants; and it drove nothing — the gallery, the price and the cart each
 * kept their own idea of what was selected.
 */

/* ── Product Q&A Section (Amazon-style) ──────────────────────── */

interface Question {
  id: string;
  questionText: string;
  customerName: string;
  upvotes: number;
  answersCount: number;
  createdAt: string;
}

interface Answer {
  id: string;
  answerText: string;
  authorName: string;
  authorRole: string;
  helpfulVotes: number;
  isAccepted: boolean;
  createdAt: string;
}

export function ProductQA({ productId }: { productId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAskForm, setShowAskForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getQuestions(productId, { page: 1, limit: 20 });
        if (!cancelled && res?.data) {
          // The API spells these `answerCount` and `upvoteCount`; this component
          // read `answersCount`/`upvotes`, so every question rendered a bare
          // "answers" with no number in front of it and zero upvotes.
          setQuestions(res.data.map((q: Record<string, any>) => ({
            id: q.id,
            questionText: q.questionText,
            customerName: q.customerName,
            upvotes: Number(q.upvoteCount ?? q.upvotes ?? 0),
            answersCount: Number(q.answerCount ?? q.answersCount ?? 0),
            createdAt: q.createdAt,
          })));
        }
      } catch {
        // Graceful fallback — Q&A is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  const loadAnswers = useCallback(async (questionId: string) => {
    if (answers[questionId]) {
      setExpandedQ(expandedQ === questionId ? null : questionId);
      return;
    }
    try {
      const res = await getAnswers(questionId);
      if (res?.data) {
        // `helpfulCount` on the wire, `helpfulVotes` here — unmapped it rendered
        // "Helpful (undefined)". `authorRole` is the SELLER/CUSTOMER/ADMIN enum,
        // so it is lower-cased once rather than compared against 'seller' at
        // each use site, where the mismatch hid the seller badge entirely.
        setAnswers(prev => ({
          ...prev,
          [questionId]: (res.data as Record<string, any>[]).map((a) => ({
            id: a.id,
            answerText: a.answerText,
            authorName: a.authorName || 'KARTSEEK user',
            authorRole: String(a.authorRole ?? 'customer').toLowerCase(),
            helpfulVotes: Number(a.helpfulCount ?? a.helpfulVotes ?? 0),
            isAccepted: Boolean(a.isAccepted),
            createdAt: a.createdAt,
          })),
        }));
      }
    } catch { /* non-critical */ }
    setExpandedQ(questionId);
  }, [answers, expandedQ]);

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await createQuestion(productId, { questionText: newQuestion.trim() });
      if (res?.data) {
        const q = res.data as Record<string, any>;
        setQuestions(prev => [{
          id: q.id,
          questionText: q.questionText,
          customerName: q.customerName,
          upvotes: Number(q.upvoteCount ?? 0),
          answersCount: Number(q.answerCount ?? 0),
          createdAt: q.createdAt,
        }, ...prev]);
        setNewQuestion('');
        setShowAskForm(false);
      }
    } catch { /* show toast */ }
    setSubmitting(false);
  };

  const handleUpvote = async (questionId: string) => {
    try {
      await upvoteQuestion(questionId);
      setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q));
    } catch { /* already voted */ }
  };

  const handleAnswerHelpful = async (answerId: string, questionId: string) => {
    try {
      await voteAnswerHelpful(answerId);
      setAnswers(prev => ({
        ...prev,
        [questionId]: prev[questionId].map(a => a.id === answerId ? { ...a, helpfulVotes: a.helpfulVotes + 1 } : a),
      }));
    } catch { /* already voted */ }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6">
        <div className="h-6 bg-slate-100 rounded w-48 animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  const displayQuestions = showAll ? questions : questions.slice(0, 4);

  return (
    <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6">
      <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          Customer Questions & Answers
          {questions.length > 0 && <span className="text-sm font-normal text-slate-400">({questions.length})</span>}
        </h2>
        <button
          onClick={() => setShowAskForm(!showAskForm)}
          className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
        >
          <MessageSquare className="w-3.5 h-3.5" /> Ask a Question
        </button>
      </div>

      {/* Ask Question Form */}
      {showAskForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <textarea
            value={newQuestion}
            onChange={e => setNewQuestion(e.target.value)}
            placeholder="Type your question about this product..."
            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white resize-none outline-none focus:ring-2 focus:ring-blue-300"
            rows={3}
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-slate-400">{newQuestion.length}/500</span>
            <div className="flex gap-2">
              <button onClick={() => { setShowAskForm(false); setNewQuestion(''); }} className="text-xs text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100">Cancel</button>
              <button
                onClick={handleSubmitQuestion}
                disabled={!newQuestion.trim() || submitting}
                className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1"
               aria-label="Send">
                <Send className="w-3 h-3" /> {submitting ? 'Posting...' : 'Post Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="text-center py-8">
          <HelpCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No questions yet. Be the first to ask!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayQuestions.map(q => (
            <div key={q.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-start gap-3">
                <button onClick={() => handleUpvote(q.id)} className="flex flex-col items-center text-slate-400 hover:text-blue-600 transition-colors mt-0.5">
                  <ChevronUp className="w-4 h-4" />
                  <span className="text-[10px] font-bold">{q.upvotes}</span>
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    <span className="text-blue-600 font-bold mr-1.5">Q:</span>
                    {q.questionText}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3" /> {q.customerName || 'Anonymous'}
                    </span>
                    <span className="text-[10px] text-slate-400">{new Date(q.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => loadAnswers(q.id)}
                      className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <MessageSquare className="w-3 h-3" />
                      {q.answersCount} {q.answersCount === 1 ? 'answer' : 'answers'}
                    </button>
                  </div>

                  {/* Expanded Answers */}
                  {expandedQ === q.id && answers[q.id] && (
                    <div className="mt-3 space-y-2 pl-3 border-l-2 border-blue-200">
                      {answers[q.id].map(a => (
                        <div key={a.id} className="bg-white rounded-lg p-2.5 border border-slate-100">
                          <p className="text-xs text-slate-700">
                            <span className="text-emerald-600 font-bold mr-1">A:</span>
                            {a.answerText}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              {a.authorRole === 'seller' ? <Award className="w-3 h-3 text-amber-500" /> : <User className="w-3 h-3" />}
                              {a.authorName}
                              {a.authorRole === 'seller' && <span className="bg-amber-100 text-amber-700 px-1 rounded text-[9px] font-bold">Seller</span>}
                            </span>
                            {a.isAccepted && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold flex items-center gap-0.5">
                                <CheckCircle className="w-2.5 h-2.5" /> Verified
                              </span>
                            )}
                            <button
                              onClick={() => handleAnswerHelpful(a.id, q.id)}
                              className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-0.5"
                            >
                              <ThumbsUp className="w-3 h-3" /> Helpful ({a.helpfulVotes})
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {questions.length > 4 && (
            <button onClick={() => setShowAll(!showAll)} className="text-xs font-bold text-blue-600 hover:underline w-full text-center py-2">
              {showAll ? 'Show Less' : `See All ${questions.length} Questions`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Pincode Delivery Check ──────────────────────────────────── */
/**
 * Delivery serviceability for a PIN code.
 *
 * Answers come from `GET /regions/india/delivery-check/:pin`, which resolves the
 * PIN against the postal database and returns the city, whether it is served,
 * and standard/express lead times.
 *
 * What this replaces: a 600 ms `setTimeout` that declared every PIN serviceable
 * except three literals ('000000', '111111', '999999'), promised delivery on a
 * fixed date string — 'Wed, 11 Jun 2026', which had already passed — and offered
 * express delivery whenever the first digit was ≤ 5. The customer was given a
 * delivery promise the business had never made.
 */
export function PincodeChecker() {
  const [pin, setPin] = useState('');
  const [result, setResult] = useState<
    { available: boolean; date: string; express: boolean; city: string; reason: string } | null
  >(null);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showNotifyMe, setShowNotifyMe] = useState(false);
  const { logPincodeSearch, logNotifyMe } = usePincodeSearchLog();
  const { selectedRegion, formatDateValue } = useRegion();

  const check = async () => {
    if (pin.length !== 6) return;
    setChecking(true);
    setFailed(false);
    setResult(null);
    try {
      const res = await api.get<any>(`/regions/india/delivery-check/${pin}`);
      const available = res?.serviceable === true;
      const standardDays = Number(res?.estimatedDeliveryDays?.standard);
      const expressDays = Number(res?.estimatedDeliveryDays?.express);
      const eta = Number.isFinite(standardDays)
        ? new Date(Date.now() + standardDays * 86_400_000)
        : null;

      setResult({
        available,
        date: eta ? formatDateValue(eta.toISOString()) : '',
        // Express only when the service actually quotes a shorter express lead
        // time than the standard one.
        express: available && Number.isFinite(expressDays) && expressDays < standardDays,
        city: [res?.location?.city, res?.location?.state].filter(Boolean).join(', '),
        reason: String(res?.reason ?? ''),
      });

      logPincodeSearch({
        pincode: pin,
        source: 'product_page',
        serviceable: available,
        regionCode: selectedRegion === 'ALL' ? 'IN' : selectedRegion,
        module: 'marketplace',
      });
    } catch {
      // Say the check failed rather than guessing an answer either way.
      setFailed(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="border-t border-slate-200 pt-4 mt-2">
      <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-blue-600" /> Delivery Options</h4>
      <div className="flex gap-2">
        <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter Pincode" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none font-mono" />
        <button onClick={check} disabled={pin.length !== 6 || checking} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50">{checking ? '...' : 'Check'}</button>
      </div>
      {failed && (
        <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
          <MapPin className="w-3.5 h-3.5" />We couldn&apos;t check this pincode right now. Please try again.
        </div>
      )}
      {result && (
        <div className="mt-2 space-y-1.5">
          {result.available ? (
            <>
              {result.city && <div className="text-xs text-slate-500">{result.city}</div>}
              {result.date && <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg"><CheckCircle className="w-3.5 h-3.5" /><span>Delivery by <span className="font-bold">{result.date}</span></span></div>}
              {result.express && <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg"><Truck className="w-3.5 h-3.5" /><span><span className="font-bold">Express Delivery</span> available to this pincode</span></div>}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg"><MapPin className="w-3.5 h-3.5" />{result.reason || 'Delivery not available at this pincode'}</div>
              <button
                onClick={() => setShowNotifyMe(true)}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2.5 rounded-lg transition-colors"
              >
                🔔 Notify me when available
              </button>
            </>
          )}
        </div>
      )}
      {showNotifyMe && (
        <NotifyMeModal
          pincode={pin}
          onClose={() => setShowNotifyMe(false)}
          onSubmit={(data) => {
            logNotifyMe(data);
            setShowNotifyMe(false);
          }}
        />
      )}
    </div>
  );
}

/* ── EMI Calculator ──────────────────────────────────────────── */
/**
 * Instalment plans for this product, as quoted by the backend.
 *
 * `GET /marketplace/products/:id/emi-options` returns the tenures, the banks
 * offering each, the interest rate and the monthly instalment. The component
 * used to compute all of that itself from a made-up flat 14% and a hard-coded
 * "no cost" set of {6, 9, 12} months, formatted with a literal `₹` and
 * `en-IN` — so a Doha shopper saw rupee instalments at a rate no lender had
 * quoted. Nothing is shown unless the backend says the product is eligible.
 */
export function EmiCalculator({ productId, price }: { productId: string; price: number }) {
  const [showEmi, setShowEmi] = useState(false);
  const [plans, setPlans] = useState<EmiPlan[]>([]);
  const { formatCurrencyValue } = useRegion();

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;

    api.get<any>(`/marketplace/products/${productId}/emi-options`)
      .then((res) => {
        if (cancelled || res?.eligible === false) return;
        const rows: any[] = Array.isArray(res?.plans) ? res.plans : [];
        setPlans(rows
          .filter((p) => Number(p?.monthlyEmi) > 0)
          .map((p) => ({
            tenure: Number(p.tenure) || 0,
            bank: String(p.bank ?? ''),
            interestRate: Number(p.interestRate) || 0,
            monthlyEmi: Number(p.monthlyEmi),
            label: String(p.label ?? ''),
          })));
      })
      .catch(() => { /* no quote available — the section stays hidden */ });

    return () => { cancelled = true; };
  }, [productId]);

  if (plans.length === 0) return null;

  const cheapest = plans.reduce((min, p) => (p.monthlyEmi < min.monthlyEmi ? p : min), plans[0]);

  return (
    <div className="border-t border-slate-200 pt-4 mt-2">
      <button onClick={() => setShowEmi(!showEmi)} className="flex items-center justify-between w-full">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-green-600" /> EMI Options from{' '}
          <span className="text-green-600">{formatCurrencyValue(cheapest.monthlyEmi)}/month</span>
        </h4>
        {showEmi ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {showEmi && (
        <div className="mt-3 space-y-1.5">
          {plans.map(plan => (
            <div key={`${plan.tenure}-${plan.bank}`} className="flex items-center justify-between gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-600">
                {plan.tenure} months
                {plan.bank && <span className="text-slate-400"> · {plan.bank}</span>}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-slate-900">{formatCurrencyValue(plan.monthlyEmi)}/mo</span>
                {plan.interestRate === 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">No Cost EMI</span>
                )}
              </span>
            </div>
          ))}
          <p className="text-[10px] text-slate-400 mt-1">Instalment plans are subject to your card issuer&apos;s approval. T&amp;C apply.</p>
        </div>
      )}
    </div>
  );
}

/* ── Reviews Section (on PDP) ────────────────────────────────── */
/**
 * Ratings & reviews for this product, read from the catalogue.
 *
 * The three reviews that used to live here were literals — "Rahul M.", "Priya
 * S." and "Kiran R." praising build quality and battery life — rendered on
 * every product in the catalogue, books and groceries included, with a `4.0`
 * average computed from them. `productId` was taken as a prop and never used.
 * Invented testimonials are the one kind of placeholder that cannot be left in
 * a storefront: shoppers make purchase decisions on them.
 *
 * A product with no reviews now says so.
 */
export function ProductReviewSection({ productId, linkSegment, aggregateRating = 0, aggregateCount = 0 }: {
  productId: string;
  /**
   * The canonical route segment (`<slug>-<uuid>`), for the link to the review
   * sub-page. Separate from `productId` because the API keys on the uuid alone,
   * and linking with the uuid would send the shopper to a non-canonical URL.
   */
  linkSegment?: string;
  /** The product record's own rating tally, which counts ratings left without
   *  written text. Shown so the empty state does not contradict the "12,400
   *  ratings" printed beside the title. */
  aggregateRating?: number;
  aggregateCount?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);

    getProductReviews(productId)
      .then((res: any) => {
        if (cancelled) return;
        const rows: any[] = Array.isArray(res?.reviews) ? res.reviews
          : Array.isArray(res?.data) ? res.data
          : Array.isArray(res) ? res : [];
        setReviews(rows.map((r: any) => ({
          id: String(r?.id ?? ''),
          rating: Number(r?.rating ?? 0) || 0,
          title: r?.title ?? '',
          body: r?.comment ?? r?.body ?? '',
          author: r?.customerName ?? 'Verified buyer',
          date: r?.createdAt ?? null,
          verified: r?.isVerifiedPurchase !== false,
          helpful: Number(r?.helpfulCount ?? 0) || 0,
        })));
        const avg = Number(res?.averageRating);
        setAverage(Number.isFinite(avg) && avg > 0 ? avg : null);
        setTotal(Number(res?.total ?? rows.length) || rows.length);
      })
      .catch(() => { /* leave the section empty rather than inventing reviews */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [productId]);

  const avg = average !== null ? average.toFixed(1) : null;
  const shown = showAll ? reviews : reviews.slice(0, 2);

  if (loading) {
    return (
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6">
        <div className="h-5 w-40 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-4/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
          <h2 className="text-lg font-bold text-slate-900">Ratings & Reviews</h2>
          <Link href={`/marketplace/product/${linkSegment ?? productId}/review`} className="text-xs text-blue-600 font-bold">Write a Review →</Link>
        </div>
        <div className="text-center py-8">
          {aggregateCount > 0 ? (
            <>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-2xl font-black text-slate-900">{aggregateRating.toFixed(1)}</span>
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              </div>
              <p className="text-sm text-slate-600 font-medium">
                {aggregateCount.toLocaleString()} rating{aggregateCount === 1 ? '' : 's'}, no written reviews yet
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Be the first to write one.</p>
            </>
          ) : (
            <>
              <Star className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-600 font-medium">No reviews yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Be the first to review this product.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6">
      <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
        <h2 className="text-lg font-bold text-slate-900">Ratings & Reviews</h2>
        <Link href={`/marketplace/product/${linkSegment ?? productId}/review`} className="text-xs text-blue-600 font-bold">Write a Review →</Link>
      </div>
      {/* Rating summary */}
      <div className="flex items-center gap-6 mb-5">
        <div className="text-center">
          <p className="text-3xl font-black text-slate-900">{avg ?? '—'}</p>
          <div className="flex gap-0.5 justify-center my-1">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${avg !== null && s <= Math.round(Number(avg)) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />)}</div>
          <p className="text-[10px] text-slate-500">{total} review{total === 1 ? '' : 's'}</p>
        </div>
        <div className="flex-1 space-y-1">
          {[5,4,3,2,1].map(star => {
            // Distribution is over the reviews actually loaded on this page,
            // which is the only set whose ratings we know.
            const count = reviews.filter(r => r.rating === star).length;
            const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-3">{star}</span>
                <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                <div className="flex-1 bg-slate-100 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-yellow-400" style={{ width: `${pct}%` }} /></div>
                <span className="text-[10px] text-slate-400 w-4">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Reviews */}
      <div className="space-y-4">
        {shown.map(r => (
          <div key={r.id} className="border-b border-slate-100 pb-4 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">{r.rating} <Star className="w-2.5 h-2.5 fill-white" /></span>
              <span className="font-bold text-sm text-slate-900">{r.title}</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{r.body}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
              <span className="font-bold text-slate-600">{r.author}</span>
              {r.verified && <span className="text-emerald-600 font-bold">✓ Verified</span>}
              {r.date && <span>{new Date(r.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              {/* Rendered as a count, not a button: there is no
                  "mark review helpful" endpoint on the gateway, and a control
                  that silently does nothing is worse than a plain figure. */}
              <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{r.helpful}</span>
            </div>
          </div>
        ))}
      </div>
      {reviews.length > 2 && (
        <button onClick={() => setShowAll(!showAll)} className="w-full mt-3 text-blue-600 font-bold text-sm py-2 border border-blue-200 rounded-lg hover:bg-blue-50">
          {showAll ? 'Show Less' : `View All ${reviews.length} Reviews`}
        </button>
      )}
    </div>
  );
}

/* ── Q&A Section (legacy export wrapper → delegates to new API-connected ProductQA above) */
export function ProductQASection({ productId }: { productId: string }) {
  return <ProductQA productId={productId} />;
}

/* ── Frequently Bought Together ──────────────────────── */

/**
 * The bundle this product belongs to, if any.
 *
 * This widget used to be three hard-coded accessories — an Apple charger, a
 * Spigen case and an ESR screen protector — with invented prices, rendered on
 * every product page in the catalogue. A shopper looking at a pair of jeans was
 * told iPhone accessories were "frequently bought together" with them, the
 * checkboxes were `defaultChecked` with no state behind them so unticking one
 * changed nothing, and "Add All to Cart" had no handler at all.
 *
 * It now reads the real `/marketplace/bundles` feed and renders only a bundle
 * that actually contains this product. When none does, the section renders
 * nothing rather than inventing one.
 */
export function FrequentlyBoughtTogether({ productId }: { productId: string }) {
  const { formatCurrencyValue } = useRegion();
  const cart = useCartContext();
  const toast = useToast();

  const [bundle, setBundle] = useState<ProductBundle | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;

    getProductBundles()
      .then((res) => {
        if (cancelled) return;
        const rows: ProductBundle[] = Array.isArray(res) ? res : (res?.data ?? []);
        const match = rows.find(
          (b) => b?.status !== 'inactive' && (b?.products ?? []).some((p) => p?.id === productId),
        );
        if (!match) return;
        setBundle(match);
        setSelected(new Set((match.products ?? []).map((p) => p.id)));
      })
      .catch(() => { /* no bundle to show — the section stays hidden */ });

    return () => { cancelled = true; };
  }, [productId]);

  if (!bundle) return null;

  const items = bundle.products ?? [];
  const chosen = items.filter((i) => selected.has(i.id));
  // Price each line at what it will actually cost in the basket: the buy-box
  // `price`, falling back to `mrp` when a product has no active offer. `mrp`
  // arrives as a decimal string ("134999.00"), so coerce before summing.
  const linePrice = (i: { mrp: string | number; price?: number }) =>
    Number(i.price) || Number(i.mrp) || 0;
  const allChosen = chosen.length === items.length && items.length > 0;

  // Whatever is ticked, priced at basket prices. No bundle-level discount is
  // quoted: the backend does not price bundles, so claiming a saving here would
  // promise a total that checkout would not honour.
  const payable = chosen.reduce((sum, i) => sum + linePrice(i), 0);
  const saving = allChosen ? Number(bundle.savings) || 0 : 0;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const addAll = () => {
    if (chosen.length === 0) return;
    for (const item of chosen) {
      cart.add({
        id: item.id,
        name: item.name,
        price: linePrice(item),
        quantity: 1,
      });
    }
    toast.success(`Added ${chosen.length} item${chosen.length > 1 ? 's' : ''} to cart`);
  };

  return (
    <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Frequently Bought Together</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                className="w-4 h-4 rounded accent-blue-600"
                aria-label={`Include ${item.name} in the bundle`}
              />
              <div>
                <Link href={productPath(item)} className="text-sm font-bold text-slate-900 hover:text-blue-600">
                  {item.name}
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-black text-slate-900">{formatCurrencyValue(linePrice(item))}</span>
                  {Number(item.price) > 0 && Number(item.mrp) > Number(item.price) && (
                    <span className="text-xs text-slate-400 line-through">{formatCurrencyValue(Number(item.mrp))}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between bg-blue-50 rounded-lg p-3 border border-blue-200">
        <div>
          <p className="text-xs text-blue-600">
            {allChosen ? `${items.length} items selected` : `${chosen.length} of ${items.length} selected`}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-black text-blue-700">{formatCurrencyValue(payable)}</span>
            {saving > 0 && (
              <>
                <span className="text-xs text-slate-400 line-through">{formatCurrencyValue(Number(bundle.totalMrp) || 0)}</span>
                <span className="text-xs font-bold text-emerald-600">Save {formatCurrencyValue(saving)}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={addAll}
          disabled={chosen.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Add All to Cart
        </button>
      </div>
    </div>
  );
}
