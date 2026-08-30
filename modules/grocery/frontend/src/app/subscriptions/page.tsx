'use client';

import React from 'react';
import { GroceryFeatureUnavailable } from '@/components/grocery/feature-unavailable';

/**
 * Recurring grocery deliveries.
 *
 * The page listed active subscriptions — milk daily, bread weekly — each with a
 * next-delivery date, and offered Pause and Cancel buttons that spliced a local
 * array. A customer reading it believed a recurring delivery was scheduled.
 * Nothing was: there is no subscription entity, no scheduler, and no endpoint;
 * `grocery_orders` models one-off orders only.
 *
 * Reordering is the nearest thing that genuinely works, so that is what this
 * points at.
 */
export default function GrocerySubscriptionsPage() {
  return (
    <GroceryFeatureUnavailable
      emoji="🔁"
      title="Subscriptions aren't available yet"
      description={
        'Recurring grocery deliveries are not something the platform can schedule today. You can reorder any past order in two taps from your order history, which repeats the same basket at current prices.'
      }
      alternative={{ href: '/orders', label: 'View past orders' }}
    />
  );
}
