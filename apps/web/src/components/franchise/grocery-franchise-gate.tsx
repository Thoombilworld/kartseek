'use client';

import React from 'react';
import { Building2, AlertTriangle } from 'lucide-react';
import { useFranchiseId } from '@/lib/hooks/use-franchise-id';

/**
 * Holds a franchise grocery screen until we know which estate it belongs to.
 *
 * All six `/franchise/grocery` pages were constants: `kpis` reading
 * "Total Stores 28 / Revenue ₹8.4L", and three store rows in Colaba, Bandra and
 * Andheri. None of them called an API — even though
 * `lib/modules/franchise-grocery-api.ts` is a complete client, the gateway exposes
 * `/franchise/:id/grocery/*`, franchise-service forwards it, and grocery-service's
 * `FranchiseViewService` implements it with tests. The whole chain worked and
 * nothing used it.
 *
 * They now fetch, against the estate `GET /franchise/me` resolves from the
 * caller's own token — so an operator can only ever see their own numbers, and
 * the three outcomes below are distinguishable instead of collapsing into one
 * hardcoded id.
 */
export function GroceryFranchiseGate({ children }: { children: (franchiseId: string) => React.ReactNode }) {
  const { franchiseId, resolved, loading, error } = useFranchiseId();

  if (loading) {
    return (
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-10 text-center">
        <div className="w-14 h-14 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Building2 className="w-7 h-7 text-slate-500" />
        </div>
        <p className="text-sm text-slate-400">Identifying your franchise…</p>
      </div>
    );
  }

  if (!resolved || !franchiseId) {
    return (
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-10 text-center">
        <div className="w-14 h-14 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-7 h-7 text-slate-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">
          {error ? 'Could not identify your franchise' : 'No franchise on this account'}
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          {error
            ? error
            : 'This account does not own a franchise estate, so there are no stores to show here. If you have just been granted one, sign out and back in.'}
        </p>
        <p className="inline-flex items-center gap-1.5 text-xs text-amber-300/80 mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Previously this page showed sample figures instead
        </p>
      </div>
    );
  }

  return <>{children(franchiseId)}</>;
}

export default GroceryFranchiseGate;
