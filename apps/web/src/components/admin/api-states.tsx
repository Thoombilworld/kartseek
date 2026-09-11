'use client';

import React from 'react';
import { Lock, PlugZap } from 'lucide-react';
import { AdminLoadingSkeleton } from '@/hooks/useAdminData';

/**
 * The three things an admin surface is allowed to say when it has no rows.
 *
 * Every console page that reads the gateway can end up in one of exactly three
 * states that are *not* "here is your data": it is still asking, the server
 * answered and refused, or nobody answered. Drawing all three as an empty table
 * — or, worse, as a fixture — is the defect this module exists to make
 * impossible, so the distinction is a component boundary rather than a comment.
 *
 * `/admin/audit-logs` keeps its own copies: its wording is written around the
 * trail specifically ("this page cannot say what administrators have done"),
 * so lifting it here would not be an extraction but a rewrite of copy that is
 * already pinned by `audit-logs-render.spec.ts`.
 */

/**
 * Which of the two failures happened, from the message the gateway sent.
 *
 * Re-exported rather than reimplemented: the classification is not specific to
 * the audit trail — "Missing required permissions: security.manage" and
 * "Your account is restricted to the QA market" are the same kind of answer as
 * "Missing required permissions: audit.logs", and `lib/audit-trail.ts` already
 * owns the patterns and their spec.
 */
export { classifyAuditFailure as classifyApiFailure } from '@/lib/audit-trail';
export type { AuditFailureKind as ApiFailureKind } from '@/lib/audit-trail';

/**
 * Nobody answered.
 *
 * `route` is mandatory. "Failed to load data" sends the reader to guess which
 * of a page's six calls died; the method and path tell them what to curl.
 */
export function AdminNotConnected({
  route,
  error,
  onRetry,
  what = 'This page',
}: {
  /** The call that failed, e.g. `GET /admin/security/status`. */
  route: string;
  /** What the client reported — shown verbatim, never rephrased. */
  error: string;
  onRetry?: () => void;
  /** Subject of the sentence, e.g. `The threat board`. */
  what?: string;
}) {
  return (
    <div className="bg-white border border-red-200 rounded-2xl p-8 text-center">
      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
        <PlugZap className="w-6 h-6" />
      </div>
      <p className="font-bold text-slate-900">{what} is not connected.</p>
      <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
        <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{route}</code> did
        not answer, so nothing is shown here rather than something invented. If you have been on
        this page a while, your session may have expired — sign in again.
      </p>
      <p className="text-xs text-red-600 mt-3 font-medium">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-slate-800"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * The server answered, and said no.
 *
 * Deliberately not the panel above: a 403 under "did not answer" sends an
 * administrator hunting an outage that is not happening, when what they need is
 * the name of the permission they lack.
 */
export function AdminForbidden({
  message,
  route,
  needs,
  what = 'this page',
}: {
  /** The server's own words. */
  message: string;
  route?: string;
  /** The permission key the route requires, if it is known. */
  needs?: string;
  what?: string;
}) {
  return (
    <div className="bg-white border border-amber-200 rounded-2xl p-8 text-center">
      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
        <Lock className="w-6 h-6" />
      </div>
      <p className="font-bold text-slate-900">You cannot open {what}.</p>
      <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
        {route && (
          <>
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              {route}
            </code>{' '}
          </>
        )}
        answered and refused.
        {needs && (
          <>
            {' '}
            It needs the <span className="font-mono text-xs">{needs}</span> permission, which your
            role does not hold.
          </>
        )}{' '}
        A market-locked account may also be refused anything that belongs to every market.
      </p>
      <p className="text-xs text-amber-700 mt-3 font-medium">{message}</p>
    </div>
  );
}

/** Still asking. Thin wrapper so a page imports its three states from one place. */
export function AdminLoading({ rows = 5 }: { rows?: number }) {
  return <AdminLoadingSkeleton rows={rows} />;
}
