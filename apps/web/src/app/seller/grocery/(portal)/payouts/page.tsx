'use client';

import React from 'react';
import { FeatureUnavailable } from '@/components/seller/grocery/feature-unavailable';

/**
 * Wallet and payouts.
 *
 * The page rendered `MOCK_WALLET` and `MOCK_PAYOUTS` — a balance, a payout
 * schedule and a settlement history, all invented — and its one API call was
 * `getStoreAnalytics('current-store', '30d')`, which 404'd and was discarded.
 * Showing a seller a fabricated balance is the most damaging kind of stub in this
 * portal, so it is gone.
 *
 * Payouts are owned by payout-service, which has no grocery-store view: it settles
 * against marketplace sellers, and a grocery store is a separate record keyed on
 * `grocery_stores.ownerId`. Until that link exists there is nothing truthful to
 * show here. Delivered order value — the figure this screen was approximating — is
 * on the dashboard and in Analytics.
 */
export default function Page() {
  return (
    <FeatureUnavailable
      title="Wallet and payouts"
      description={
        'Grocery payouts are not yet wired to payout-service, so there is no balance or settlement history to show. Your delivered order value is available in Analytics in the meantime.'
      }
      alternative={{ href: '/seller/grocery/analytics', label: 'Go to Analytics' }}
    />
  );
}
