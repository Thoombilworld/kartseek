'use client';

import React from 'react';
import { FeatureUnavailable } from '@/components/seller/grocery/feature-unavailable';

/**
 * Compliance documents.
 *
 * The three upload buttons all called
 * `updateStoreSettings('current-store', { compliance: { [type]: 'uploaded' } })`
 * — a store id that does not exist, and a `compliance` field the service's
 * whitelist drops on the floor — then set a local status to "uploaded" inside
 * `catch {}`, so the badge turned green whatever happened. No document was ever
 * stored, and nothing on the platform accepts one: there is no document store, no
 * verification workflow and no `compliance` column on `grocery_stores`.
 *
 * KYC for a grocery store is handled through the store's approval status, which
 * the admin console drives.
 */
export default function Page() {
  return (
    <FeatureUnavailable
      title="Compliance documents"
      description={
        'Document upload and verification is not available in the seller portal yet — there is no document store behind this screen. Your store\'s KYC state is reflected in its approval status, which the platform team manages.'
      }
      alternative={{ href: '/seller/grocery/settings', label: 'Go to Store Settings' }}
    />
  );
}
