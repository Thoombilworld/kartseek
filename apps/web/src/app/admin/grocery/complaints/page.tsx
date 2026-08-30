'use client';

import React from 'react';
import { AdminFeatureUnavailable } from '@/components/admin/grocery/feature-unavailable';

/**
 * Customer complaints.
 *
 * Five complaints in a constant, with priorities and ages, filtered by four tabs. `adminGroceryApi` was imported and never called.
 *
 * Nothing on the platform stores any of it, so the screen now says so rather than
 * presenting an operator with a queue that is not real.
 */
export default function Page() {
  return (
    <AdminFeatureUnavailable
      title="Customer complaints"
      description={"There is no complaint or support-ticket entity for grocery. Quality issues currently surface through product reviews and through order cancellations, both of which are real."}
      owner="grocery-service"
      alternative={{ href: "/admin/grocery/stores", label: "Review stores" }}
    />
  );
}
