'use client';

import React from 'react';
import { AdminFeatureUnavailable } from '@/components/admin/grocery/feature-unavailable';

/**
 * Platform offers.
 *
 * A list of offer codes with usage counts, whose Delete button posted `{ deleteOffer }` into store settings and whose Edit button called `alert()`.
 *
 * Nothing on the platform stores any of it, so the screen now says so rather than
 * presenting an operator with a queue that is not real.
 */
export default function Page() {
  return (
    <AdminFeatureUnavailable
      title="Platform offers"
      description={"Grocery does not have an offer entity. The discount mechanisms that genuinely exist are flash deals, which sellers submit and admins approve, and the fixed coupon codes the storefront honours."}
      owner="grocery-service"
      alternative={{ href: "/admin/grocery/flash-deals", label: "Manage flash deals" }}
    />
  );
}
