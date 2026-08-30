'use client';

import React, { useState } from 'react';
import { Flag, X, CheckCircle2, Loader2 } from 'lucide-react';
import { reportProduct, type ProductReportReason } from '@/lib/api/marketplace';
import { ApiError } from '@/lib/api-endpoints';
import { useRequireAuth } from '@/lib/contexts/login-prompt';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';

/**
 * "Report this listing" — the control and the form behind it.
 *
 * This was a `<button>` with no handler for as long as the product page has
 * existed, then briefly a link to the help centre carrying the product id,
 * because there was no endpoint to call. `POST /marketplace/products/:id/report`
 * now exists, so the control does what it says.
 *
 * A client island rather than part of the page: the product page is a server
 * component, and this needs form state.
 */

const REASONS: { value: ProductReportReason; label: string; hint: string }[] = [
  { value: 'COUNTERFEIT', label: 'Counterfeit or fake', hint: 'Not the genuine branded product' },
  { value: 'MISLEADING', label: 'Misleading listing', hint: 'Photos, title or specs do not match the item' },
  { value: 'PROHIBITED', label: 'Prohibited item', hint: 'Should not be sold here at all' },
  { value: 'PRICING', label: 'Pricing problem', hint: 'Price or discount is wrong or deceptive' },
  { value: 'OFFENSIVE', label: 'Offensive content', hint: 'Images or text that should not be published' },
  { value: 'OTHER', label: 'Something else', hint: '' },
];

const DETAILS_MAX = 2000;

export function ReportProductButton({ productId }: { productId: string }) {
  const requireAuth = useRequireAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ProductReportReason>('COUNTERFEIT');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { updated: boolean }>(null);
  const [error, setError] = useState('');

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await reportProduct(productId, {
        reason,
        details: details.trim() || undefined,
      });
      // Only claim it was filed when the server says so.
      setDone({ updated: Boolean(res?.updated) });
    } catch (e) {
      setError(e instanceof ApiError
        ? (e.message || 'Your report could not be submitted.')
        : 'We could not reach the moderation service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    setOpen(false);
    setDone(null);
    setError('');
    setDetails('');
  };

  return (
    <>
      <button
        type="button"
        // Reporting is attributed to an account, so signing in comes first.
        // `requireAuth` runs the callback immediately when already signed in,
        // and otherwise opens the prompt and resumes afterwards.
        onClick={() => requireAuth({
          reason: 'to report a listing',
          onAuthenticated: () => setOpen(true),
        })}
        className="w-full mt-4 text-xs text-red-500 hover:text-red-700 font-bold flex items-center justify-center gap-1.5 py-2 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
      >
        <Flag className="w-3.5 h-3.5" /> Report this listing
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <DismissOnEscape onDismiss={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 id="report-title" className="font-bold text-slate-900">
                {done ? 'Report received' : 'Report this listing'}
              </h2>
              <button type="button" onClick={close} aria-label="Close" className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {done ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-semibold text-slate-800">
                  {done.updated ? 'Your report has been updated.' : 'Thanks — our team will review this listing.'}
                </p>
                {/* No promise about outcome or timing: the queue is worked by
                    humans and this page cannot know either. */}
                <p className="text-sm text-slate-500">
                  We review every report. You will not usually hear back individually.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="p-5 space-y-4 overflow-y-auto">
                  <fieldset>
                    <legend className="text-sm font-semibold text-slate-700 mb-2">What is wrong with it?</legend>
                    <div className="space-y-1.5">
                      {REASONS.map(r => (
                        <label
                          key={r.value}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            reason === r.value ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="report-reason"
                            value={r.value}
                            checked={reason === r.value}
                            onChange={() => setReason(r.value)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="block text-sm font-medium text-slate-800">{r.label}</span>
                            {r.hint && <span className="block text-xs text-slate-500">{r.hint}</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="report-details" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Anything else? <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      id="report-details"
                      value={details}
                      onChange={e => setDetails(e.target.value.slice(0, DETAILS_MAX))}
                      rows={3}
                      placeholder="What did you notice?"
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                    />
                    <div className="text-xs text-slate-400 mt-1 text-right">{details.length} / {DETAILS_MAX}</div>
                  </div>

                  {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                </div>

                <div className="flex gap-3 p-5 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={close}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : 'Submit report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
