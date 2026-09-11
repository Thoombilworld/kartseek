'use client';

import React, { Suspense } from 'react';
import { AdminLoadingSkeleton } from '@/hooks/useAdminData';
import { MARKETPLACE_ENTITY_TYPES } from '@/lib/audit-trail';
import { AuditLogsScreen } from '../../audit-logs/page';

/**
 * Marketplace Audit Logs.
 *
 * The same trail as `/admin/audit-logs`, filtered to marketplace record kinds.
 * It used to be a different thing entirely: ten `AUDIT_LOGS` fixtures compiled
 * into the bundle — named administrators, IP addresses, session ids, reasons —
 * rendered unconditionally, while the live call beside them went to
 * `GET /admin/marketplace/audit-logs`, a gateway stub that returned
 * `{ data: [], total: 0 }` and whose result the page never read. So the screen
 * showed invented history whether or not the API answered, and the region
 * filter narrowed the fixtures rather than the trail.
 *
 * There is no second marketplace audit endpoint now, and no second table: one
 * collection, one query, one set of scoping rules, with `entityType` presetting
 * the record kinds this module owns.
 */
export default function MarketplaceAuditLogsPage() {
  return (
    <Suspense fallback={<AdminLoadingSkeleton rows={6} />}>
      <AuditLogsScreen
        title="Marketplace Audit Logs"
        subtitle="Immutable record of marketplace administration — who, what, when, and on which record."
        entityTypes={MARKETPLACE_ENTITY_TYPES}
        csvName="marketplace-audit-logs"
      />
    </Suspense>
  );
}
