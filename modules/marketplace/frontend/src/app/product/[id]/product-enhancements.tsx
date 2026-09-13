'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Truck,
  CheckCircle,
  Star,
  ThumbsUp,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Calculator,
  HelpCircle,
  Send,
  Award,
  User,
  RefreshCw,
  BadgeCheck,
  Store,
} from 'lucide-react';
import {
  getQuestions,
  createQuestion,
  getAnswers,
  upvoteQuestion,
  voteAnswerHelpful,
  getProductBundles,
  getProductReviews,
  voteReviewHelpful,
  getEmiOptions,
  type ProductBundle,
  type ProductReviewRow,
  type EmiPlan,
} from '@/lib/api/marketplace';
import { api, ApiError } from '@/lib/api-endpoints';
import { usePincodeSearchLog } from '@/lib/contexts/pincode-search-log';
import { useRegion } from '@/lib/contexts/region-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useToast } from '@/lib/contexts/toast-context';
import { useRequireAuth } from '@/lib/contexts/login-prompt';
import NotifyMeModal from '@/components/shared/notify-me-modal';
import { productPath } from '@/lib/marketplace/product-url';
import { zoneHref } from '@/lib/routes/zone-href';

/* ── Product Q&A ─────────────────────────────────────────────────────────── */

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

const QA_PAGE = 10;

/**
 * Questions & answers, read from and written to the catalogue.
 *
 * Two things were silently broken here. Answers never rendered: the client
 * read `res.data` as the answer array, but the endpoint answers
 * `{ questionId, answers, total }`, so every "2 answers" link expanded to
 * nothing. And every write swallowed its failure — asking while signed out
 * produced a 401 the empty catch discarded, so the question vanished with no
 * message. Writes are now auth-gated up front and failures are said out loud.
 */
export function ProductQA({ productId, linkSegment }: { productId: string; linkSegment?: string }) {
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showAskForm, setShowAskForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [voted, setVoted] = useState<Set<string>>(new Set());

  const mapQuestion = (q: Record<string, any>): Question => ({
    id: String(q.id),
    questionText: String(q.questionText ?? ''),
    customerName: String(q.customerName ?? ''),
    upvotes: Number(q.upvoteCount ?? q.upvotes ?? 0) || 0,
    answersCount: Number(q.answerCount ?? q.answersCount ?? 0) || 0,
    createdAt: String(q.createdAt ?? ''),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res: any = await getQuestions(productId, { page: 1, limit: QA_PAGE });
      const rows: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setQuestions(rows.map(mapQuestion));
      setTotal(Number(res?.total ?? rows.length) || rows.length);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const loadAnswers = useCallback(
    async (questionId: string) => {
      if (expandedQ === questionId) {
        setExpandedQ(null);
        return;
      }
      if (answers[questionId]) {
        setExpandedQ(questionId);
        return;
      }
      try {
        const res = await getAnswers(questionId);
        const rows = Array.isArray(res?.answers) ? res.answers : [];
        setAnswers((prev) => ({
          ...prev,
          [questionId]: rows.map((a) => ({
            id: String(a.id),
            answerText: String(a.answerText ?? ''),
            authorName: a.authorName || 'KARTSEEK user',
            authorRole: String(a.authorRole ?? 'customer').toLowerCase(),
            helpfulVotes: Number(a.helpfulCount ?? 0) || 0,
            isAccepted: Boolean(a.isAccepted),
            createdAt: String(a.createdAt ?? ''),
          })),
        }));
        setExpandedQ(questionId);
      } catch {
        toast.error('We could not load the answers right now.');
      }
    },
    [answers, expandedQ, toast],
  );

  const submitQuestion = async () => {
    const text = newQuestion.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res: any = await createQuestion(productId, { questionText: text });
      const q = res?.data ?? res;
      if (q?.id) setQuestions((prev) => [mapQuestion(q), ...prev]);
      setTotal((t) => t + 1);
      setNewQuestion('');
      setShowAskForm(false);
      toast.success('Your question has been posted.');
    } catch (e) {
      toast.error(
        e instanceof ApiError && e.message ? e.message : 'Your question could not be posted.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitQuestion = () => {
    if (!newQuestion.trim()) return;
    requireAuth({
      reason: 'to ask a question',
      onAuthenticated: () => {
        void submitQuestion();
      },
    });
  };

  const handleUpvote = (questionId: string) => {
    if (voted.has(questionId)) return;
    requireAuth({
      reason: 'to vote on questions',
      onAuthenticated: () => {
        setVoted((prev) => new Set(prev).add(questionId));
        setQuestions((prev) =>
          prev.map((q) => (q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q)),
        );
        upvoteQuestion(questionId).catch(() => {
          setVoted((prev) => {
            const next = new Set(prev);
            next.delete(questionId);
            return next;
          });
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === questionId ? { ...q, upvotes: Math.max(0, q.upvotes - 1) } : q,
            ),
          );
          toast.error('Your vote could not be recorded.');
        });
      },
    });
  };

  const handleAnswerHelpful = (answerId: string, questionId: string) => {
    if (voted.has(answerId)) return;
    requireAuth({
      reason: 'to mark an answer helpful',
      onAuthenticated: () => {
        setVoted((prev) => new Set(prev).add(answerId));
        setAnswers((prev) => ({
          ...prev,
          [questionId]: (prev[questionId] ?? []).map((a) =>
            a.id === answerId ? { ...a, helpfulVotes: a.helpfulVotes + 1 } : a,
          ),
        }));
        voteAnswerHelpful(answerId).catch(() => {
          setVoted((prev) => {
            const next = new Set(prev);
            next.delete(answerId);
            return next;
          });
          toast.error('Your vote could not be recorded.');
        });
      },
    });
  };

  return (
    <section
      aria-labelledby="qa-heading"
      className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6"
      data-testid="product-qa"
    >
      <div className="flex items-center justify-between gap-3 mb-4 border-b border-slate-200 pb-2">
        <h2 id="qa-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
          Questions &amp; answers
          {total > 0 && <span className="text-sm font-normal text-slate-400">({total})</span>}
        </h2>
        <button
          type="button"
          onClick={() => setShowAskForm((v) => !v)}
          aria-expanded={showAskForm}
          className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 shrink-0"
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Ask a question
        </button>
      </div>

      {showAskForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <label htmlFor="qa-question" className="sr-only">
            Your question
          </label>
          <textarea
            id="qa-question"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Type your question about this product..."
            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white resize-none outline-none focus:ring-2 focus:ring-blue-300"
            rows={3}
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-slate-400">{newQuestion.length}/500</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAskForm(false);
                  setNewQuestion('');
                }}
                className="text-xs text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitQuestion}
                disabled={!newQuestion.trim() || submitting}
                className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1"
              >
                <Send className="w-3 h-3" aria-hidden="true" />{' '}
                {submitting ? 'Posting…' : 'Post question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : failed ? (
        <div className="text-center py-6">
          <p className="text-sm text-slate-600 mb-3">
            We couldn&apos;t load the questions right now.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Try again
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8">
          <HelpCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-slate-400">No questions yet. Be the first to ask.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {questions.map((q) => (
            <li key={q.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleUpvote(q.id)}
                  aria-label={`Upvote question, ${q.upvotes} votes`}
                  aria-pressed={voted.has(q.id)}
                  className="flex flex-col items-center text-slate-400 hover:text-blue-600 transition-colors mt-0.5 min-w-[2.5rem] min-h-[2.5rem] justify-center"
                >
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  <span className="text-[11px] font-bold">{q.upvotes}</span>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    <span className="text-blue-600 font-bold mr-1.5">Q:</span>
                    {q.questionText}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3" aria-hidden="true" />{' '}
                      {q.customerName || 'Anonymous'}
                    </span>
                    {q.createdAt && (
                      <span className="text-[11px] text-slate-400">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void loadAnswers(q.id)}
                      aria-expanded={expandedQ === q.id}
                      className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 min-h-[1.5rem]"
                    >
                      <MessageSquare className="w-3 h-3" aria-hidden="true" />
                      {q.answersCount} {q.answersCount === 1 ? 'answer' : 'answers'}
                    </button>
                  </div>

                  {expandedQ === q.id && (
                    <div className="mt-3 space-y-2 pl-3 border-l-2 border-blue-200">
                      {(answers[q.id] ?? []).length === 0 ? (
                        <p className="text-xs text-slate-400">No answers yet.</p>
                      ) : (
                        (answers[q.id] ?? []).map((a) => (
                          <div
                            key={a.id}
                            className="bg-white rounded-lg p-2.5 border border-slate-100"
                          >
                            <p className="text-xs text-slate-700">
                              <span className="text-emerald-600 font-bold mr-1">A:</span>
                              {a.answerText}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                {a.authorRole === 'seller' ? (
                                  <Award className="w-3 h-3 text-amber-500" aria-hidden="true" />
                                ) : (
                                  <User className="w-3 h-3" aria-hidden="true" />
                                )}
                                {a.authorName}
                                {a.authorRole === 'seller' && (
                                  <span className="bg-amber-100 text-amber-700 px-1 rounded text-[10px] font-bold">
                                    Seller
                                  </span>
                                )}
                              </span>
                              {a.isAccepted && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold flex items-center gap-0.5">
                                  <CheckCircle className="w-2.5 h-2.5" aria-hidden="true" />{' '}
                                  Accepted
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleAnswerHelpful(a.id, q.id)}
                                aria-pressed={voted.has(a.id)}
                                className="text-[11px] text-slate-400 hover:text-blue-600 flex items-center gap-0.5 min-h-[1.5rem]"
                              >
                                <ThumbsUp className="w-3 h-3" aria-hidden="true" /> Helpful (
                                {a.helpfulVotes})
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > questions.length && linkSegment && (
        <Link
          href={`/product/${linkSegment}/qa`}
          className="block text-xs font-bold text-blue-600 hover:underline w-full text-center py-2 mt-2"
        >
          See all {total} questions →
        </Link>
      )}
    </section>
  );
}

/* ── Pincode delivery check (India only) ─────────────────────────────────── */
/**
 * Delivery serviceability for a PIN code, from
 * `GET /regions/india/delivery-check/:pin`. Rendered only in the Indian
 * market; the Gulf markets address by zone and have no such lookup.
 */
export function PincodeChecker() {
  const [pin, setPin] = useState('');
  const [result, setResult] = useState<{
    available: boolean;
    date: string;
    express: boolean;
    city: string;
    reason: string;
  } | null>(null);
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
      setFailed(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="border-t border-slate-200 pt-4 mt-2">
      <label
        htmlFor="pdp-pincode"
        className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5"
      >
        <MapPin className="w-4 h-4 text-blue-600" aria-hidden="true" /> Check delivery to your PIN
        code
      </label>
      <div className="flex gap-2">
        <input
          id="pdp-pincode"
          value={pin}
          inputMode="numeric"
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Enter PIN code"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none font-mono min-w-0"
        />
        <button
          type="button"
          onClick={check}
          disabled={pin.length !== 6 || checking}
          className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50 min-w-[4.5rem]"
        >
          {checking ? '…' : 'Check'}
        </button>
      </div>
      {failed && (
        <div
          className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg"
          role="alert"
        >
          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          We couldn&apos;t check this PIN code right now. Please try again.
        </div>
      )}
      {result && (
        <div className="mt-2 space-y-1.5" role="status">
          {result.available ? (
            <>
              {result.city && <div className="text-xs text-slate-500">{result.city}</div>}
              {result.date && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    Delivery by <span className="font-bold">{result.date}</span>
                  </span>
                </div>
              )}
              {result.express && (
                <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                  <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    <span className="font-bold">Express delivery</span> available to this PIN code
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                {result.reason || 'Delivery not available at this PIN code'}
              </div>
              <button
                type="button"
                onClick={() => setShowNotifyMe(true)}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2.5 rounded-lg transition-colors"
              >
                Notify me when delivery starts here
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

/* ── EMI options ─────────────────────────────────────────────────────────── */
/**
 * Instalment plans for this product in this market, as the backend quotes
 * them. Nothing is shown unless the backend says the product is eligible and
 * names at least one plan — the component used to compute plans itself from
 * an invented 14% and a hard-coded bank list.
 */
export function EmiCalculator({
  productId,
  market,
  linkSegment,
}: {
  productId: string;
  market: string;
  linkSegment?: string;
}) {
  const [showEmi, setShowEmi] = useState(false);
  const [plans, setPlans] = useState<EmiPlan[]>([]);
  const { formatCurrencyValue } = useRegion();

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    getEmiOptions(productId, market)
      .then((res) => {
        if (cancelled || !res || res.eligible === false) return;
        const rows = Array.isArray(res.plans) ? res.plans : [];
        setPlans(
          rows
            .filter((p) => Number(p?.monthlyEmi) > 0 && Number(p?.tenure) > 0)
            .map((p) => ({
              tenure: Number(p.tenure),
              bank: String(p.bank ?? ''),
              interestRate: Number(p.interestRate) || 0,
              monthlyEmi: Number(p.monthlyEmi),
              totalCost: Number(p.totalCost) || undefined,
              label: String(p.label ?? ''),
            })),
        );
      })
      .catch(() => {
        /* no quote — the section stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [productId, market]);

  if (plans.length === 0) return null;
  const cheapest = plans.reduce((min, p) => (p.monthlyEmi < min.monthlyEmi ? p : min), plans[0]);

  return (
    <div className="border-t border-slate-200 pt-4 mt-2" data-testid="product-emi">
      <button
        type="button"
        onClick={() => setShowEmi((v) => !v)}
        aria-expanded={showEmi}
        className="flex items-center justify-between w-full min-h-[2.5rem]"
      >
        <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-green-600" aria-hidden="true" /> EMI from{' '}
          <span className="text-green-600">{formatCurrencyValue(cheapest.monthlyEmi)}/month</span>
        </span>
        {showEmi ? (
          <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
        )}
      </button>
      {showEmi && (
        <div className="mt-3 space-y-1.5">
          {plans.map((plan) => (
            <div
              key={`${plan.tenure}-${plan.bank}`}
              className="flex items-center justify-between gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2"
            >
              <span className="text-slate-600">
                {plan.tenure} months
                {plan.bank && <span className="text-slate-400"> · {plan.bank}</span>}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-slate-900">
                  {formatCurrencyValue(plan.monthlyEmi)}/mo
                </span>
                {plan.interestRate === 0 ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    No-cost EMI
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">{plan.interestRate}% p.a.</span>
                )}
              </span>
            </div>
          ))}
          {linkSegment && (
            <Link
              href={`/product/${linkSegment}/emi`}
              className="block text-xs font-bold text-blue-600 hover:underline pt-1"
            >
              Compare all plans →
            </Link>
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            Instalment plans are subject to your card issuer&apos;s approval. T&amp;C apply.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Ratings & reviews ───────────────────────────────────────────────────── */

interface ProductReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  date: string | null;
  verified: boolean;
  helpful: number;
  images: string[];
  sellerReply: string | null;
  sellerRepliedAt: string | null;
}

type ReviewSort = 'helpful' | 'recent' | 'rating_desc' | 'rating_asc';
const REVIEW_PAGE = 5;

function mapReview(row: ProductReviewRow | Record<string, any>): ProductReview {
  const r = row as Record<string, any>;
  return {
    id: String(r?.id ?? ''),
    rating: Math.max(0, Math.min(5, Number(r?.rating ?? 0) || 0)),
    title: String(r?.title ?? ''),
    body: String(r?.comment ?? r?.body ?? ''),
    author: String(r?.customerName || 'KARTSEEK customer'),
    date: r?.createdAt ? String(r.createdAt) : null,
    // Only a recorded purchase earns the badge. `!== false` used to award it
    // to any row that simply lacked the field.
    verified: r?.isVerifiedPurchase === true,
    helpful: Number(r?.helpfulCount ?? 0) || 0,
    images: Array.isArray(r?.imageUrls)
      ? r.imageUrls.filter((u: unknown) => typeof u === 'string' && u)
      : [],
    sellerReply: r?.sellerReply ? String(r.sellerReply) : null,
    sellerRepliedAt: r?.sellerRepliedAt ? String(r.sellerRepliedAt) : null,
  };
}

/**
 * Ratings & reviews for this product, paged from the catalogue.
 *
 * The average and the star histogram are the backend's figures over every
 * published review (`averageRating`, `ratingDistribution`), not over the
 * handful loaded on this page; when an older service omits the histogram the
 * bars are computed from the loaded rows and labelled as such. "Verified" is
 * shown only for a recorded purchase, and "helpful" is a real, auth-gated
 * vote.
 */
export function ProductReviewSection({
  productId,
  linkSegment,
  aggregateRating = 0,
  aggregateCount = 0,
}: {
  productId: string;
  /** The canonical route segment (`<slug>-<uuid>`), for the review sub-page link. */
  linkSegment?: string;
  /** The product record's own rating tally, shown while the reviews load. */
  aggregateRating?: number;
  aggregateCount?: number;
}) {
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [distribution, setDistribution] = useState<Record<string, number> | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ReviewSort>('helpful');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [voted, setVoted] = useState<Set<string>>(new Set());

  const fetchPage = useCallback(
    async (nextPage: number, nextSort: ReviewSort, append: boolean) => {
      const res: any = await getProductReviews(productId, {
        page: nextPage,
        limit: REVIEW_PAGE,
        sort: nextSort,
      });
      const rows: any[] = Array.isArray(res?.reviews)
        ? res.reviews
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
      const mapped = rows.map(mapReview);
      setReviews((prev) => (append ? [...prev, ...mapped] : mapped));
      const avg = Number(res?.averageRating);
      setAverage(Number.isFinite(avg) && avg > 0 ? avg : null);
      setTotal(Number(res?.total ?? rows.length) || rows.length);
      setDistribution(
        res?.ratingDistribution && typeof res.ratingDistribution === 'object'
          ? res.ratingDistribution
          : null,
      );
    },
    [productId],
  );

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setPage(1);
    fetchPage(1, sort, false)
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, sort, attempt, fetchPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      await fetchPage(next, sort, true);
      setPage(next);
    } catch {
      toast.error('More reviews could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  };

  const markHelpful = (reviewId: string) => {
    if (voted.has(reviewId)) return;
    requireAuth({
      reason: 'to mark a review helpful',
      onAuthenticated: () => {
        setVoted((prev) => new Set(prev).add(reviewId));
        voteReviewHelpful(reviewId)
          .then((res) => {
            setReviews((prev) =>
              prev.map((r) =>
                r.id === reviewId
                  ? { ...r, helpful: Number(res?.helpfulCount ?? r.helpful + 1) }
                  : r,
              ),
            );
            if (res?.alreadyVoted) toast.success('You already marked this review helpful.');
          })
          .catch(() => {
            setVoted((prev) => {
              const next = new Set(prev);
              next.delete(reviewId);
              return next;
            });
            toast.error('Your vote could not be recorded.');
          });
      },
    });
  };

  const writeHref = `/product/${linkSegment ?? productId}/review`;
  const shownAverage = average ?? (aggregateRating > 0 ? aggregateRating : null);
  const shownTotal = total || aggregateCount;

  // Histogram: the backend's, else computed from what is loaded and said so.
  const hist = distribution
    ? {
        rows: [5, 4, 3, 2, 1].map((s) => ({
          star: s,
          count: Number(distribution[String(s)] ?? 0) || 0,
        })),
        partial: false,
      }
    : {
        rows: [5, 4, 3, 2, 1].map((s) => ({
          star: s,
          count: reviews.filter((r) => r.rating === s).length,
        })),
        partial: true,
      };
  const histTotal = hist.rows.reduce((n, r) => n + r.count, 0);

  const heading = (
    <div className="flex items-center justify-between gap-3 mb-4 border-b border-slate-200 pb-2">
      <h2 id="reviews-heading" className="text-lg font-bold text-slate-900">
        Ratings &amp; reviews
      </h2>
      <Link href={writeHref} className="text-xs text-blue-600 font-bold hover:underline shrink-0">
        Write a review →
      </Link>
    </div>
  );

  if (loading) {
    return (
      <section
        aria-labelledby="reviews-heading"
        className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6"
        aria-busy="true"
      >
        {heading}
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-4/5" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (failed) {
    return (
      <section
        aria-labelledby="reviews-heading"
        className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6"
      >
        {heading}
        <div className="text-center py-6">
          <p className="text-sm text-slate-600 mb-3">
            We couldn&apos;t load the reviews right now.
          </p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Try again
          </button>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return (
      <section
        aria-labelledby="reviews-heading"
        className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6"
        data-testid="product-reviews"
      >
        {heading}
        <div className="text-center py-8">
          {shownTotal > 0 && shownAverage ? (
            <>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-2xl font-black text-slate-900">
                  {shownAverage.toFixed(1)}
                </span>
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" aria-hidden="true" />
              </div>
              <p className="text-sm text-slate-600 font-medium">
                {shownTotal.toLocaleString()} rating{shownTotal === 1 ? '' : 's'}, no written
                reviews yet
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Be the first to write one.</p>
            </>
          ) : (
            <>
              <Star className="w-10 h-10 text-slate-200 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-slate-600 font-medium">No reviews yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Be the first to review this product.</p>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="reviews-heading"
      className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6"
      data-testid="product-reviews"
    >
      {heading}

      <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-5">
        <div className="text-center sm:w-32 shrink-0">
          <p className="text-3xl font-black text-slate-900">
            {shownAverage ? shownAverage.toFixed(1) : '—'}
          </p>
          <div className="flex gap-0.5 justify-center my-1" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${shownAverage !== null && s <= Math.round(shownAverage) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`}
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            {total.toLocaleString()} review{total === 1 ? '' : 's'}
          </p>
        </div>
        <div
          className="flex-1 space-y-1"
          aria-label={hist.partial ? 'Rating breakdown of loaded reviews' : 'Rating breakdown'}
        >
          {hist.rows.map(({ star, count }) => {
            const pct = histTotal ? Math.round((count / histTotal) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 w-3">{star}</span>
                <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" aria-hidden="true" />
                <div
                  className="flex-1 bg-slate-100 rounded-full h-1.5"
                  role="img"
                  aria-label={`${star} star: ${count}`}
                >
                  <div className="h-1.5 rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[11px] text-slate-400 w-8 text-right tabular-nums">
                  {count}
                </span>
              </div>
            );
          })}
          {hist.partial && (
            <p className="text-[10px] text-slate-400">Breakdown of the reviews shown</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end mb-3">
        <label htmlFor="review-sort" className="text-xs text-slate-500 mr-2">
          Sort by
        </label>
        <select
          id="review-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as ReviewSort)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
        >
          <option value="helpful">Most helpful</option>
          <option value="recent">Most recent</option>
          <option value="rating_desc">Highest rating</option>
          <option value="rating_asc">Lowest rating</option>
        </select>
      </div>

      <ul className="space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="border-b border-slate-100 pb-4 last:border-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="bg-green-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                {r.rating} <Star className="w-2.5 h-2.5 fill-white" aria-hidden="true" />
                <span className="sr-only">out of 5</span>
              </span>
              {r.title && <span className="font-bold text-sm text-slate-900">{r.title}</span>}
            </div>
            {r.body && (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{r.body}</p>
            )}
            {r.images.length > 0 && (
              <ul className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar">
                {r.images.map((src, i) => (
                  <li
                    key={`${r.id}-${i}`}
                    className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={src}
                      alt={`Photo ${i + 1} from ${r.author}'s review`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
              <span className="font-bold text-slate-600">{r.author}</span>
              {r.verified && (
                <span className="text-emerald-600 font-bold inline-flex items-center gap-0.5">
                  <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Verified purchase
                </span>
              )}
              {r.date && (
                <span>
                  {new Date(r.date).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
              <button
                type="button"
                onClick={() => markHelpful(r.id)}
                aria-pressed={voted.has(r.id)}
                className={`flex items-center gap-1 min-h-[1.75rem] hover:text-blue-600 ${voted.has(r.id) ? 'text-blue-600' : ''}`}
              >
                <ThumbsUp className="w-3 h-3" aria-hidden="true" /> Helpful ({r.helpful})
              </button>
            </div>
            {r.sellerReply && (
              <div className="mt-2 ml-3 pl-3 border-l-2 border-amber-200 text-xs text-slate-600">
                <p className="font-bold text-amber-700 flex items-center gap-1 mb-0.5">
                  <Store className="w-3 h-3" aria-hidden="true" /> Seller response
                  {r.sellerRepliedAt && (
                    <span className="text-slate-400 font-normal">
                      · {new Date(r.sellerRepliedAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
                <p className="whitespace-pre-line">{r.sellerReply}</p>
              </div>
            )}
          </li>
        ))}
      </ul>

      {reviews.length < total && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="w-full mt-3 text-blue-600 font-bold text-sm py-2.5 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : `Show more reviews (${total - reviews.length} more)`}
        </button>
      )}
    </section>
  );
}

/* ── Legacy export ───────────────────────────────────────────────────────── */
export function ProductQASection({
  productId,
  linkSegment,
}: {
  productId: string;
  linkSegment?: string;
}) {
  return <ProductQA productId={productId} linkSegment={linkSegment} />;
}

/* ── Frequently bought together ──────────────────────────────────────────── */
/**
 * The bundle this product belongs to, if any, priced at basket prices for the
 * market being browsed. Renders nothing when no bundle contains the product.
 */
export function FrequentlyBoughtTogether({
  productId,
  market,
}: {
  productId: string;
  market: string;
}) {
  const { formatCurrencyValue } = useRegion();
  const cart = useCartContext();
  const toast = useToast();

  const [bundle, setBundle] = useState<ProductBundle | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    getProductBundles(market)
      .then((res) => {
        if (cancelled) return;
        const rows: ProductBundle[] = Array.isArray(res) ? res : (res?.data ?? []);
        const match = rows.find(
          (b) => b?.status !== 'inactive' && (b?.products ?? []).some((p) => p?.id === productId),
        );
        if (!match) return;
        // Every line needs a price in this market, or the basket total lies.
        const priced = (match.products ?? []).filter(
          (p) => Number(p.price) > 0 || Number(p.mrp) > 0,
        );
        if (priced.length < 2) return;
        setBundle({ ...match, products: priced });
        setSelected(new Set(priced.map((p) => p.id)));
      })
      .catch(() => {
        /* no bundle to show */
      });
    return () => {
      cancelled = true;
    };
  }, [productId, market]);

  if (!bundle) return null;

  const items = bundle.products ?? [];
  const chosen = items.filter((i) => selected.has(i.id));
  const linePrice = (i: { mrp: string | number; price?: number }) =>
    Number(i.price) || Number(i.mrp) || 0;
  const allChosen = chosen.length === items.length && items.length > 0;
  const payable = chosen.reduce((sum, i) => sum + linePrice(i), 0);
  const saving = allChosen ? Number(bundle.savings) || 0 : 0;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addAll = () => {
    if (chosen.length === 0) return;
    for (const item of chosen) {
      cart.add({ id: item.id, name: item.name, price: linePrice(item), quantity: 1 });
    }
    toast.success(`Added ${chosen.length} item${chosen.length > 1 ? 's' : ''} to cart`);
  };

  return (
    <section
      aria-labelledby="fbt-heading"
      className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6"
      data-testid="product-fbt"
    >
      <h2
        id="fbt-heading"
        className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2"
      >
        Frequently bought together
      </h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                className="w-4 h-4 rounded accent-blue-600"
                aria-label={`Include ${item.name} in the bundle`}
              />
              <div>
                <Link
                  href={zoneHref(productPath(item))}
                  className="text-sm font-bold text-slate-900 hover:text-blue-600"
                >
                  {item.name}
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-black text-slate-900">
                    {formatCurrencyValue(linePrice(item))}
                  </span>
                  {Number(item.price) > 0 && Number(item.mrp) > Number(item.price) && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatCurrencyValue(Number(item.mrp))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
        <div>
          <p className="text-xs text-blue-600">
            {allChosen
              ? `${items.length} items selected`
              : `${chosen.length} of ${items.length} selected`}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-black text-blue-700">{formatCurrencyValue(payable)}</span>
            {saving > 0 && (
              <>
                <span className="text-xs text-slate-400 line-through">
                  {formatCurrencyValue(Number(bundle.totalMrp) || 0)}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  Save {formatCurrencyValue(saving)}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={addAll}
          disabled={chosen.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors shrink-0"
        >
          Add all to cart
        </button>
      </div>
    </section>
  );
}
