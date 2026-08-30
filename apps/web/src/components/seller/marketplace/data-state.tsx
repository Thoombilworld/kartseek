'use client';

/**
 * The three honest answers a seller portal panel can give when it has no rows to
 * show, kept distinct because they mean completely different things to a seller:
 *
 *   • Loading      — we don't know yet.
 *   • Empty        — we asked, and you genuinely have none.
 *   • Failed       — we asked and could not get an answer. Not the same as none.
 *   • Unavailable  — there is no such feature on this deployment.
 *
 * Every page in this portal used to collapse all four into "here are five
 * plausible rows", which is why a seller could not tell an empty refund queue
 * from a broken one.
 */

import React from 'react';
import { AlertTriangle, Inbox, Loader2, Wrench, RefreshCw } from 'lucide-react';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {children}
    </div>
  );
}

export function SellerLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <Frame>
      <Loader2 className="w-6 h-6 text-slate-300 animate-spin mb-3" aria-hidden />
      <p className="text-sm text-slate-500">{label}</p>
    </Frame>
  );
}

export function SellerEmpty({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <Frame>
      <Icon className="w-10 h-10 text-slate-300 mb-3" aria-hidden />
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Frame>
  );
}

export function SellerError({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  return (
    <Frame>
      <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" aria-hidden />
      <p className="text-sm font-bold text-slate-700">Couldn&apos;t load this</p>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">
        {message || 'Something went wrong fetching your data.'} Nothing shown here is your real data.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      )}
    </Frame>
  );
}

/**
 * The feature has no backend on this deployment. Said plainly, because the
 * alternative this replaces was a page full of invented figures that a seller
 * had no way to recognise as fictional.
 */
export function SellerUnavailable({
  feature,
  description,
}: {
  feature: string;
  description?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <Frame>
        <Wrench className="w-10 h-10 text-slate-300 mb-3" aria-hidden />
        <p className="text-sm font-bold text-slate-700">{feature} isn&apos;t available yet</p>
        <p className="text-xs text-slate-500 mt-1 max-w-md">
          {description
            ?? 'This part of Seller Central has not been switched on for your account. Nothing is being hidden from you — there is no data behind it yet.'}
        </p>
      </Frame>
    </div>
  );
}

/**
 * Renders whichever of the four states applies, or the children when there is
 * data. Keeps the decision in one place so no page can accidentally show rows
 * while an error is pending.
 */
export function SellerDataState({
  loading,
  error,
  unavailable,
  isEmpty,
  feature,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRetry,
  children,
}: {
  loading: boolean;
  error?: string | null;
  unavailable?: boolean;
  isEmpty: boolean;
  feature: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ElementType;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (loading) return <SellerLoading />;
  if (unavailable) return <SellerUnavailable feature={feature} />;
  if (error) return <SellerError message={error} onRetry={onRetry} />;
  if (isEmpty) {
    return (
      <SellerEmpty
        title={emptyTitle ?? `No ${feature.toLowerCase()} yet`}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }
  return <>{children}</>;
}
