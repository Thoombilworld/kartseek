'use client';

import React from 'react';
import { FeatureUnavailable } from '@/components/seller/grocery/feature-unavailable';

/**
 * Seller reports.
 *
 * Three constants — `METRICS`, `TOP_PRODUCTS` and a fourteen-day `DAILY_REVENUE`
 * array — rendered as a report, with no API call anywhere in the file.
 *
 * The store analytics endpoint the real version would use is already the whole of
 * the Analytics screen (revenue, orders, rating, fulfilment rate and a daily
 * series), so this page duplicated it with fictional numbers rather than adding
 * anything. Per-product sales ranking, which is the one thing it showed that
 * Analytics does not, has no endpoint behind it — order line items are stored as a
 * jsonb snapshot and nothing aggregates them yet.
 */
export default function Page() {
  return (
    <FeatureUnavailable
      title="Reports"
      description={
        'Store performance reporting lives in Analytics, which shows your real revenue, orders, rating and fulfilment rate. Per-product sales ranking is not available yet — nothing on the platform aggregates order line items.'
      }
      alternative={{ href: '/seller/grocery/analytics', label: 'Go to Analytics' }}
    />
  );
}
