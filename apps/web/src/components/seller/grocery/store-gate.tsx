'use client';

import React from 'react';
import Link from 'next/link';
import { Store, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useGrocerySellerStore, type GrocerySellerStore } from '@/lib/hooks/use-grocery-seller-store';

/**
 * StoreGate — resolves the seller's store once, and renders the states around it.
 *
 * Every screen in the portal used `const storeId = 'current-store'`, so each one
 * separately queried a store that does not exist and separately fell back to demo
 * data. Wrapping them means the "you have not finished onboarding" and "your store
 * is suspended" cases are handled once, in the place that knows about them, rather
 * than being invisible behind fabricated numbers.
 */
export function StoreGate({
  children,
  requireApproved = false,
}: {
  children: (store: GrocerySellerStore) => React.ReactNode;
  /** Screens about trading (orders, payouts, analytics) are meaningless unapproved. */
  requireApproved?: boolean;
}) {
  const { store, loading, error, refresh } = useGrocerySellerStore();

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-8 w-64 bg-slate-100 rounded animate-pulse" />
        <div className="h-40 bg-white border border-slate-200 rounded-xl animate-pulse" />
        <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="font-bold text-red-800">We could not load your store</h2>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button onClick={() => void refresh()} className="mt-3 inline-flex items-center gap-1.5 bg-white border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-50">
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Store className="w-7 h-7 text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">No store yet</h2>
        <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">
          Your account is not linked to a grocery store. Complete onboarding and a store will be created for you.
        </p>
        <Link href="/seller/grocery/onboarding" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">
          Start onboarding
        </Link>
      </div>
    );
  }

  if (requireApproved && store.status !== 'APPROVED') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {store.status === 'SUSPENDED' ? 'Your store is suspended' : 'Awaiting approval'}
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {store.status === 'SUSPENDED'
            ? `${store.name} cannot take orders right now. Contact support to resolve this.`
            : `${store.name} is being reviewed. This screen becomes available once your store is approved.`}
        </p>
      </div>
    );
  }

  return <>{children(store)}</>;
}

export default StoreGate;
