'use client';

/**
 * Restaurant order tracking.
 *
 * Rendered a fixed milestone ladder with clock times written into the markup and
 * a rider at a fixed latitude and longitude, for any id.
 *
 * `GET /orders/restaurant/:orderId/tracking` now builds the timeline from the
 * timestamps the order carries — a step is complete only where the row records
 * that it happened — and covers dine-in and takeaway, which have no courier leg
 * and so should not be shown delivery steps that will never arrive.
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { restaurantApi } from '@/lib/api/restaurant';
import { OrderTracking, type TrackingData } from '@/components/orders/order-tracking';

export default function RestaurantOrderTrackPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');

  return (
    <OrderTracking
      module="restaurant"
      orderId={id}
      backHref={`/restaurant/orders/${encodeURIComponent(id)}`}
      load={async (orderId) => {
        const res: any = await restaurantApi.getOrderTracking(orderId);
        const facts: Array<{ label: string; value: string }> = [];
        if (res.orderType) {
          const type = String(res.orderType).replace('_', '-').toLowerCase();
          facts.push({ label: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1) });
        }
        return {
          reference: res.orderNumber ?? res.orderId ?? orderId,
          title: res.restaurantName ?? 'Your order',
          status: res.status,
          estimatedAt: res.estimatedDeliveryAt ?? null,
          cancelReason: res.cancelled ? (res.cancelReason ?? 'This order was cancelled.') : null,
          steps: (Array.isArray(res.steps) ? res.steps : []).map((s: any) => ({
            label: s.label, at: s.at ?? null, done: !!s.done,
          })),
          facts,
        } satisfies TrackingData;
      }}
    />
  );
}
