'use client';

import React from 'react';
import { FeatureUnavailable } from '@/components/seller/grocery/feature-unavailable';

/**
 * Delivery settings.
 *
 * This screen was generated boilerplate: a MOCK_DATA table of invented rows, with
 * the grocery API client imported and never called. No endpoint on the platform
 * backs it, so it now says so rather than presenting fabricated figures to a
 * seller as their own business data.
 */
export default function Page() {
  return (
    <FeatureUnavailable
      title="Delivery settings"
      description={"Delivery zones, fees and radius for grocery are configured centrally by the platform, not per store. Your own delivery radius and minimum order live in Store Settings."}
      alternative={{ href: "/seller/grocery/settings", label: "Go to Store Settings" }}
    />
  );
}
