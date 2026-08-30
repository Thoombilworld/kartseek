'use client';

import React from 'react';
import { FeatureUnavailable } from '@/components/seller/grocery/feature-unavailable';

/**
 * Tax settings.
 *
 * This screen was generated boilerplate: a MOCK_DATA table of invented rows, with
 * the grocery API client imported and never called. No endpoint on the platform
 * backs it, so it now says so rather than presenting fabricated figures to a
 * seller as their own business data.
 */
export default function Page() {
  return (
    <FeatureUnavailable
      title="Tax settings"
      description={"Tax is applied per market from the platform localization registry — GST in India, VAT in the Gulf and the UK — and is not configurable per store."}
    />
  );
}
