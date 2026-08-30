'use client';

import React from 'react';
import { FeatureUnavailable } from '@/components/seller/grocery/feature-unavailable';

/**
 * Store coupons.
 *
 * This screen was generated boilerplate: a MOCK_DATA table of invented rows, with
 * the grocery API client imported and never called. No endpoint on the platform
 * backs it, so it now says so rather than presenting fabricated figures to a
 * seller as their own business data.
 */
export default function Page() {
  return (
    <FeatureUnavailable
      title="Store coupons"
      description={"Coupon codes are validated on the customer basket by the storefront; there is no seller-managed coupon store behind this screen yet. Flash deals are the discount mechanism available to you today."}
      alternative={{ href: "/seller/grocery/flash-deals", label: "Go to Flash Deals" }}
    />
  );
}
