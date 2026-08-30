'use client';

import React from 'react';
import Link from 'next/link';
import { Settings, Info, ArrowRight } from 'lucide-react';

/**
 * Grocery settings — franchise view.
 *
 * The page presented editable grocery policy for the franchise, from constants,
 * with a save that went nowhere.
 *
 * A franchise does not own grocery policy. Commission, delivery fees, order
 * minimums and moderation rules are platform-wide and live in
 * `grocery_settings`, editable by admins only; a store's own radius, minimum and
 * hours belong to the seller. The one grocery thing a franchise genuinely governs
 * is the lifecycle state of stores in its estate — `FranchiseViewService`
 * deliberately exposes `updateStoreStatus` scoped to the franchise, and nothing
 * else — so that is what this points at.
 */
export default function FranchiseGrocerySettingsPage() {
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-green-400" /> Grocery Settings
        </h1>
        <p className="text-slate-400 mt-1">What a franchise controls for grocery</p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              Grocery policy — commission, delivery fees, order minimums, flash-deal rules — is set
              platform-wide and applies to every franchise equally. Individual store settings such as delivery
              radius, opening hours and minimum order are the seller&apos;s own, editable from their portal.
            </p>
            <p>
              What you control is which stores in your estate are trading. That lives on the Stores screen,
              where approving or suspending a store is scoped to your franchise and cannot touch anyone else&apos;s.
            </p>
          </div>
        </div>

        <Link
          href="/franchise/grocery/stores"
          className="inline-flex items-center gap-1.5 mt-5 bg-green-500/10 text-green-400 border border-green-500/30 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-500/20 transition-colors"
        >
          Go to your stores <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
