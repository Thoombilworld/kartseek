'use client';

import React from 'react';
import { FeatureUnavailable } from '@/components/seller/grocery/feature-unavailable';

/**
 * Returns and refunds.
 *
 * This screen was generated boilerplate: a MOCK_DATA table of invented rows, with
 * the grocery API client imported and never called. No endpoint on the platform
 * backs it, so it now says so rather than presenting fabricated figures to a
 * seller as their own business data.
 */
export default function Page() {
  return (
    <FeatureUnavailable
      title="Returns and refunds"
      description={"Grocery orders are cancelled or refunded through the order lifecycle rather than a separate returns queue, and refund-service does not expose a per-store grocery view yet. Cancellations appear against the order."}
      alternative={{ href: "/seller/grocery/orders", label: "Go to Orders" }}
    />
  );
}
