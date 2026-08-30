'use client';

import React from 'react';
import { AdminFeatureUnavailable } from '@/components/admin/grocery/feature-unavailable';

/**
 * Refund requests.
 *
 * A queue of refund requests whose Approve and Reject buttons posted `{ refundAction }` into store settings and swallowed the failure, so every decision appeared to land and none did.
 *
 * Nothing on the platform stores any of it, so the screen now says so rather than
 * presenting an operator with a queue that is not real.
 */
export default function Page() {
  return (
    <AdminFeatureUnavailable
      title="Refund requests"
      description={"Refunds are owned by refund-service, which does not expose a grocery view yet. A grocery order can be moved to REFUNDED through its own lifecycle, which is visible on the order."}
      owner="refund-service"
      alternative={{ href: "/admin/grocery/orders", label: "Go to orders" }}
    />
  );
}
