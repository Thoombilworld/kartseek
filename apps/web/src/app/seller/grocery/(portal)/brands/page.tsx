'use client';

import React from 'react';
import { FeatureUnavailable } from '@/components/seller/grocery/feature-unavailable';

/**
 * Brand management.
 *
 * This screen was generated boilerplate: a MOCK_DATA table of invented rows, with
 * the grocery API client imported and never called. No endpoint on the platform
 * backs it, so it now says so rather than presenting fabricated figures to a
 * seller as their own business data.
 */
export default function Page() {
  return (
    <FeatureUnavailable
      title="Brand management"
      description={"Grocery products carry a free-text brand name rather than a managed brand record, so there is no brand catalogue to administer here yet. Set the brand on each product instead."}
      alternative={{ href: "/seller/grocery/products", label: "Go to Products" }}
    />
  );
}
