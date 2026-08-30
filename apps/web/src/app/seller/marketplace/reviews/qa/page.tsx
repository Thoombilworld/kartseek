'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import { useSellerData } from '@/lib/hooks/use-seller-data';
import { SellerDataState } from '@/components/seller/marketplace/data-state';
import { MessageSquare, Send, CheckCircle, AlertCircle, Clock } from 'lucide-react';

/**
 * Customer questions on this seller's listings.
 *
 * `product_questions` and `product_answers` both existed, but nothing
 * seller-facing read them — so questions customers asked went unanswered
 * because the seller never saw them. Backed by `/sellers/:id/questions`, and
 * answers post with `authorRole: 'SELLER'` so the storefront badges them as
 * coming from the seller rather than another shopper.
 */

interface Answer {
  id: string;
  authorName: string;
  authorRole: string;
  answerText: string;
  answeredAt: string;
}

interface Question {
  id: string;
  productId: string;
  customerName: string;
  questionText: string;
  upvoteCount: number;
  askedAt: string;
  answers: Answer[];
  answered: boolean;
}

type Filter = 'unanswered' | 'answered' | 'all';

export default function ProductQAPage() {
  const { seller } = useSeller();
  const [filter, setFilter] = useState<Filter>('unanswered');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const res = useSellerData<{ data: Question[]; total: number }>(
    (sellerId) => sellerApi.getQuestions(sellerId, { status: filter }) as any,
    [filter],
  );
  const questions = (res.data?.data ?? []) as Question[];

  const post = useCallback(async (questionId: string) => {
    const answer = (drafts[questionId] ?? '').trim();
    if (!answer) { setError('Type an answer first.'); return; }

    setBusyId(questionId); setError(null);
    try {
      await sellerApi.answerQuestion(seller.sellerId, questionId, answer);
      setDrafts((d) => ({ ...d, [questionId]: '' }));
      res.reload();
      setToast('Answer posted');
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The answer could not be posted.');
    } finally {
      setBusyId(null);
    }
  }, [drafts, seller.sellerId, res]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/seller/marketplace/reviews" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-flex items-center gap-1">
            ← Back to reviews
          </Link>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" aria-hidden />
            Customer Questions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Answers appear on the listing under your store name — an unanswered question costs sales.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['unanswered', 'answered', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-colors ${
                filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <SellerDataState
          loading={res.loading}
          error={res.error}
          unavailable={res.unavailable}
          isEmpty={questions.length === 0}
          feature="Questions"
          onRetry={res.reload}
          emptyTitle={filter === 'unanswered' ? 'Nothing waiting on you' : 'No questions yet'}
          emptyDescription={
            filter === 'unanswered'
              ? 'Every question customers have asked has an answer.'
              : 'Questions customers ask on your listings appear here.'
          }
          emptyIcon={CheckCircle}
        >
          <div className="divide-y divide-slate-100">
            {questions.map((q) => (
              <div key={q.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {(q.customerName || 'C').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">{q.customerName}</p>
                      <span className="text-xs text-slate-400">
                        {q.askedAt ? new Date(q.askedAt).toLocaleDateString() : ''}
                      </span>
                      {q.answered ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" />Answered
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />Awaiting answer
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{q.questionText}</p>

                    {q.answers.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {q.answers.map((a) => (
                          <div key={a.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              {a.authorName}
                              {a.authorRole === 'SELLER' && (
                                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">SELLER</span>
                              )}
                            </p>
                            <p className="text-sm text-slate-600 mt-1">{a.answerText}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <input
                        value={drafts[q.id] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') void post(q.id); }}
                        placeholder={q.answered ? 'Add another answer…' : 'Answer this customer…'}
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => void post(q.id)}
                        disabled={busyId === q.id}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-bold"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {busyId === q.id ? 'Posting…' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SellerDataState>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-xl">{toast}</div>
      )}
    </div>
  );
}
