'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, ChevronRight, ThumbsUp, CheckCircle, Send, Store, User as UserIcon } from 'lucide-react';
import { unwrapCatalogList } from '@/lib/api/map-catalog-product';
import { apiFetch } from '@/lib/api-fetch';
import { upvoteQuestion } from '@/lib/api/marketplace';
import { parseProductParam } from '@/lib/marketplace/product-url';

interface Answer { id: string; answerText: string; authorName?: string; authorRole: string; helpfulCount: number; isAccepted: boolean; createdAt: string; }
interface Question { id: string; questionText: string; customerName?: string; upvoteCount: number; createdAt: string; answers?: Answer[]; }

export default function ProductQAPage() {
  const params = useParams();
  /**
   * The route segment is `<slug>-<uuid>`; the API keys on the uuid alone.
   *
   * `params.id` used to be the bare uuid and was passed straight through, so
   * every call here would 404 against the new URL shape. `segment` is kept for
   * the link back to the product, which is already canonical.
   */
  const segment = params?.id as string;
  const { id: productId } = parseProductParam(segment);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [upvoting, setUpvoting] = useState<Set<string>>(new Set());

  // The gateway answers `{ success, data: { data, total, page, limit } }`, so the
  // rows are at `d.data.data`. Assigning `d.data` put the *page object* into a
  // state typed as an array — `questions.length` was `undefined` so the empty
  // branch never ran, and `questions.map` threw, collapsing the whole page into
  // the "Something went wrong" boundary. Same shape, same fix, in `handleAsk`.
  const applyThread = (d: unknown) => {
    const page = (d as { data?: unknown })?.data ?? d;
    setQuestions(unwrapCatalogList(d) as Question[]);
    setTotal(Number((page as { total?: unknown })?.total) || 0);
  };

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/v1/marketplace/products/${productId}/qa?page=1&limit=20`)
      .then(r => r.json()).then(applyThread)
      .catch(() => {}).finally(() => setLoading(false));
  }, [productId]);

  /**
   * Upvote a question.
   *
   * The thumbs-up rendered a count and a hover colour but carried no handler, so
   * the one signal customers can give on a question did nothing. `upvoteQuestion`
   * is JWT-guarded, so it goes through the typed client for the bearer token;
   * the count is bumped optimistically and rolled back if the write is rejected.
   */
  const handleUpvote = async (questionId: string) => {
    if (upvoting.has(questionId)) return;
    setUpvoting(prev => new Set(prev).add(questionId));
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, upvoteCount: (q.upvoteCount ?? 0) + 1 } : q));

    try {
      await upvoteQuestion(questionId);
    } catch {
      setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, upvoteCount: Math.max(0, (q.upvoteCount ?? 1) - 1) } : q));
    } finally {
      setUpvoting(prev => { const next = new Set(prev); next.delete(questionId); return next; });
    }
  };

  const handleAsk = async () => {
    if (!newQuestion.trim()) return;
    setSubmitting(true);
    try {
      // Posting is `@UseGuards(JwtAuthGuard)`, so it has to go through `apiFetch`
      // to carry the bearer token — a bare `fetch` sent none and the question was
      // silently dropped with a 401 that the empty `catch` swallowed. The author
      // is taken from that token: the `userId: 'guest-user'` this used to send was
      // never read by the gateway, which sets `customerId` from the JWT.
      await apiFetch(`/marketplace/products/${productId}/qa`, {
        method: 'POST',
        body: JSON.stringify({ text: newQuestion }),
      });
      setNewQuestion('');
      const d = await apiFetch(`/marketplace/products/${productId}/qa?page=1&limit=20`).then(r => r.json());
      applyThread(d);
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <section className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <MessageCircle className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold">Questions & Answers</h1>
          </div>
          <p className="text-white/70 text-sm">{total} question{total !== 1 ? 's' : ''} from customers</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <Link href={`/product/${segment}`} className="hover:text-blue-600">Product</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Q&A</span>
        </nav>

        {/* Ask a Question */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h3 className="font-bold text-slate-800 mb-3">Have a question?</h3>
          <div className="flex gap-3">
            <input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Type your question..."
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleAsk()} />
            <button onClick={handleAsk} disabled={submitting || !newQuestion.trim()}
              className="px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors flex items-center gap-2 shrink-0">
              <Send className="w-4 h-4" /> {submitting ? '...' : 'Ask'}
            </button>
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-14 h-14 mx-auto text-slate-200 mb-3" />
            <h2 className="text-lg font-bold text-slate-800 mb-1">No questions yet</h2>
            <p className="text-sm text-slate-500">Be the first to ask a question about this product.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map(q => (
              <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex gap-3 mb-3">
                  <span className="text-blue-600 font-bold text-lg shrink-0">Q.</span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{q.questionText}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {q.customerName || 'Customer'}</span>
                      <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={() => handleUpvote(q.id)}
                        disabled={upvoting.has(q.id)}
                        aria-label="This question is helpful"
                        className="flex items-center gap-1 text-slate-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
                      >
                        <ThumbsUp className="w-3 h-3" /> {q.upvoteCount}
                      </button>
                    </div>
                  </div>
                </div>

                {(q.answers || []).map(a => (
                  <div key={a.id} className={`ml-7 mt-2 p-3 rounded-lg border-l-3 ${a.isAccepted ? 'bg-green-50 border-l-green-500' : 'bg-slate-50 border-l-blue-400'}`}
                    style={{ borderLeftWidth: '3px' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-600 font-bold text-sm">A.</span>
                      {a.isAccepted && (
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <CheckCircle className="w-3 h-3" /> Accepted
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.authorRole === 'SELLER' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                        {a.authorRole === 'SELLER' && <Store className="w-3 h-3 inline mr-0.5" />}{a.authorRole}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{a.answerText}</p>
                    <div className="text-xs text-slate-400 mt-1.5">
                      {a.authorName || 'User'} • {new Date(a.createdAt).toLocaleDateString()} • <ThumbsUp className="w-3 h-3 inline" /> {a.helpfulCount}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
