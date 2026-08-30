'use client';

import React from 'react';
import { AdminFeatureUnavailable } from '@/components/admin/grocery/feature-unavailable';

/**
 * Promotional banners.
 *
 * Six banners with click and impression counts (4,200 clicks / 52,000 impressions) came from a constant, and Delete called `updateStoreSettings('admin', { deleteBanner })` — a store-settings endpoint, a store id of "admin", and a key the whitelist drops.
 *
 * Nothing on the platform stores any of it, so the screen now says so rather than
 * presenting an operator with a queue that is not real.
 */
export default function Page() {
  return (
    <AdminFeatureUnavailable
      title="Promotional banners"
      description={"Storefront banners are not CMS-managed yet. There is no banner entity, and no impression or click tracking behind the figures this screen used to report."}
      owner="grocery-service"
      alternative={{ href: "/admin/grocery/flash-deals", label: "Manage flash deals" }}
    />
  );
}
