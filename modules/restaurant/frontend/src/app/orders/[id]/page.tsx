'use client';

/**
 * Restaurant order detail.
 *
 * Rendered one `ORDER` constant — a ₹1,036 biryani order from "The Grand
 * Biryani House" with a five-step timeline all ticked and a driver named Rahul
 * Kumar with a phone number — for whatever id was in the URL. `useParams()` was
 * called and the id then discarded.
 *
 * `GET /orders/restaurant/:orderId` resolves an order id or order number against
 * `restaurant_orders`, scoped to the customer who placed it.
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { restaurantApi } from '@/lib/api/restaurant';
import { OrderDetail, type OrderDetailData, type OrderCharge } from '@/components/orders/order-detail';

/** Join the parts an address actually has, in order, skipping the ones it lacks. */
function formatAddress(address: any): string | null {
  if (!address) return null;
  if (typeof address === 'string') return address;
  const parts = [address.line1, address.line2, address.city, address.state, address.pincode]
    .filter((p) => typeof p === 'string' && p.trim() !== '');
  return parts.length ? parts.join(', ') : null;
}

/** A charge line is included only when the order records a non-zero figure for it. */
function chargesOf(order: any): OrderCharge[] {
  const rows: Array<[string, unknown, boolean?]> = [
    ['Items', order.itemTotal],
    ['Delivery fee', order.deliveryFee],
    ['Packaging', order.packagingFee],
    ['Platform fee', order.platformFee],
    ['Tax', order.taxAmount],
    ['Tip', order.tip],
    ['Discount', order.discount, true],
  ];
  return rows
    .map(([label, value, isDiscount]) => ({ label, amount: Number(value ?? 0), isDiscount }))
    .filter((c) => Number.isFinite(c.amount) && c.amount !== 0);
}

function toDetail(order: any): OrderDetailData {
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const type = String(order.orderType ?? '').replace('_', '-').toLowerCase();

  const facts: Array<{ label: string; value: string }> = [];
  if (type) facts.push({ label: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1) });
  if (order.guestCount) facts.push({ label: 'Guests', value: String(order.guestCount) });
  if (order.customerPhone) facts.push({ label: 'Contact', value: order.customerPhone });
  if (order.couponCode) facts.push({ label: 'Coupon', value: order.couponCode });

  return {
    reference: order.orderNumber ?? order.id,
    title: order.restaurant?.name ?? 'Restaurant order',
    subtitle: `${items.length} item${items.length === 1 ? '' : 's'}`,
    status: order.status,
    dateISO: order.createdAt ?? null,
    lines: items.map((i) => ({
      name: i.name,
      quantity: Number(i.quantity) || 0,
      unitPrice: i.price !== undefined && i.price !== null ? Number(i.price) : null,
      lineTotal: i.price !== undefined && i.price !== null
        ? Number(i.price) * (Number(i.quantity) || 0)
        : null,
      note: [
        i.specialInstructions,
        Array.isArray(i.customizations)
          ? i.customizations.map((c: any) => c.selected?.join(', ')).filter(Boolean).join(' · ')
          : null,
      ].filter(Boolean).join(' · ') || undefined,
    })),
    charges: chargesOf(order),
    total: order.grandTotal !== undefined && order.grandTotal !== null ? Number(order.grandTotal) : null,
    currency: null,
    address: formatAddress(order.deliveryAddress),
    paymentMethod: order.paymentMethod ?? null,
    paymentStatus: order.paymentStatus ?? null,
    timeline: [
      { label: 'Order placed', at: order.createdAt ?? null, done: !!order.createdAt },
      { label: 'Accepted by restaurant', at: order.acceptedAt ?? null, done: !!order.acceptedAt },
      { label: 'Ready', at: order.preparedAt ?? null, done: !!order.preparedAt },
      { label: 'Picked up', at: order.pickedUpAt ?? null, done: !!order.pickedUpAt },
      { label: 'Delivered', at: order.deliveredAt ?? order.completedAt ?? null, done: !!(order.deliveredAt ?? order.completedAt) },
    ],
    facts,
    cancelReason: order.cancelReason ?? null,
  };
}

export default function RestaurantOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');

  return (
    <OrderDetail
      module="restaurant"
      orderId={id}
      backHref="/restaurant/orders"
      trackHref={`/restaurant/orders/${encodeURIComponent(id)}/track`}
      load={async (orderId) => toDetail(await restaurantApi.getOrderDetail(orderId))}
    />
  );
}
