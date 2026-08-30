'use client';

/**
 * Pharmacy order tracking.
 *
 * Rendered five steps with clock times written into the markup — including
 * "Prescription Verified" at 2:45 PM for orders that carry no prescription —
 * and counted an ETA down from a `useState(12)` that no order supplied.
 *
 * pharmacy-service has no separate tracking endpoint, but a pharmacy order
 * records each transition it goes through (`acceptedAt`, `preparedAt`,
 * `pickedUpAt`, `deliveredAt`). The timeline is built from those, so a step is
 * complete only where the order says it happened, and the prescription step
 * appears only for orders that need one.
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { pharmacyApi } from '@/lib/api/pharmacy';
import { OrderTracking, type TrackingData } from '@/components/orders/order-tracking';

export default function PharmacyOrderTrackPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');

  return (
    <OrderTracking
      module="pharmacy"
      orderId={id}
      backHref={`/pharmacy/orders/${encodeURIComponent(id)}`}
      load={async (orderId) => {
        const order: any = await pharmacyApi.getOrder(orderId);

        const steps: TrackingData['steps'] = [
          { label: 'Order placed', at: order.createdAt ?? null, done: !!order.createdAt },
        ];
        if (order.requiresPrescription) {
          // Verification is what gates a prescription order moving at all, so it
          // is shown — but only for the orders that actually require it.
          steps.push({
            label: 'Prescription verified',
            at: order.acceptedAt ?? null,
            done: !!order.acceptedAt && !!order.prescriptionId,
          });
        }
        steps.push(
          { label: 'Accepted by pharmacy', at: order.acceptedAt ?? null, done: !!order.acceptedAt },
          { label: 'Prepared', at: order.preparedAt ?? null, done: !!order.preparedAt },
        );
        if (String(order.orderType).toUpperCase() !== 'PICKUP') {
          steps.push(
            { label: 'Out for delivery', at: order.pickedUpAt ?? null, done: !!order.pickedUpAt },
            { label: 'Delivered', at: order.deliveredAt ?? null, done: !!order.deliveredAt },
          );
        } else {
          steps.push({
            label: 'Collected from store',
            at: order.completedAt ?? null,
            done: !!order.completedAt,
          });
        }

        const facts: Array<{ label: string; value: string }> = [];
        if (order.requiresPrescription) facts.push({ label: 'Prescription', value: order.prescriptionId ? 'Verified' : 'Awaiting verification' });
        if (order.coldChainRequired) facts.push({ label: 'Handling', value: 'Cold chain' });
        if (order.deliveryOtp) facts.push({ label: 'Delivery OTP', value: String(order.deliveryOtp) });

        return {
          reference: order.orderNumber ?? order.id ?? orderId,
          title: order.store?.name ?? 'Your order',
          status: order.status,
          estimatedAt: order.estimatedDeliveryAt ?? null,
          cancelReason: order.cancelReason ?? null,
          steps,
          facts,
        } satisfies TrackingData;
      }}
    />
  );
}
