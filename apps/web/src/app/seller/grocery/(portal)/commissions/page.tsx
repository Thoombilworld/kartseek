'use client';

import React from 'react';
import { FeatureUnavailable } from '@/components/seller/grocery/feature-unavailable';

/**
 * Commission statements.
 *
 * This screen was generated boilerplate: a MOCK_DATA table of invented rows, with
 * the grocery API client imported and never called. No endpoint on the platform
 * backs it, so it now says so rather than presenting fabricated figures to a
 * seller as their own business data.
 */
export default function Page() {
  return (
    <FeatureUnavailable
      title="Commission statements"
      description={"Commission is charged by commission-service when an order is delivered, and it does not yet expose a per-seller grocery statement. Your delivered order values are on the dashboard."}
      alternative={{ href: "/seller/grocery/dashboard", label: "Go to Dashboard" }}
    />
  );
}
