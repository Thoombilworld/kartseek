'use client';

/**
 * Pharmacy order detail.
 *
 * Rendered one `ORDER` constant — three medicines from "HealthPlus Pharmacy" at
 * a Mumbai address, out for delivery with a courier named Rohit Mehta and his
 * mobile number — for every order id. The `params` promise was accepted and
 * never read.
 *
 * `GET /pharmacy/orders/:orderId` returns the real order. pharmacy-service
 * scopes that read to the order's own customer, so opening somebody else's id
 * is a 404 rather than a look at their prescription.
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { pharmacyApi } from '@/lib/api/pharmacy';
import { OrderDetail, type OrderDetailData, type OrderCharge } from '@/components/orders/order-detail';

function formatAddress(address: any): string | null {
  if (!address) return null;
  if (typeof address === 'string') return address;
  const parts = [address.line1, address.line2, address.city, address.state, address.pincode]
    .filter((p) => typeof p === 'string' && p.trim() !== '');
  return parts.length ? parts.join(', ') : null;
}

function chargesOf(order: any): OrderCharge[] {
  const rows: Array<[string, unknown, boolean?]> = [
    ['Medicines', order.itemTotal],
    ['Delivery fee', order.deliveryFee],
    ['Packaging', order.packagingFee],
    ['Platform fee', order.platformFee],
    ['Tax', order.taxAmount],
    ['Discount', order.discount, true],
  ];
  return rows
    // Every one of these is a Postgres decimal and arrives as a string.
    .map(([label, value, isDiscount]) => ({ label, amount: Number(value ?? 0), isDiscount }))
    .filter((c) => Number.isFinite(c.amount) && c.amount !== 0);
}

function toDetail(order: any): OrderDetailData {
  const items: any[] = Array.isArray(order.items) ? order.items : [];

  const facts: Array<{ label: string; value: string }> = [];
  if (order.orderType) facts.push({ label: 'Fulfilment', value: String(order.orderType).toLowerCase() === 'pickup' ? 'Store pickup' : 'Delivery' });
  if (order.requiresPrescription) facts.push({ label: 'Prescription', value: order.prescriptionId ? 'On file' : 'Required' });
  if (order.containsScheduleHDrugs) facts.push({ label: 'Schedule H', value: 'Yes' });
  if (order.coldChainRequired) facts.push({ label: 'Cold chain', value: 'Yes' });
  if (order.couponCode) facts.push({ label: 'Coupon', value: order.couponCode });

  return {
    reference: order.orderNumber ?? order.id,
    title: order.store?.name ?? 'Pharmacy order',
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
        i.dosageForm,
        i.requiresPrescription ? 'Prescription required' : null,
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
      { label: 'Accepted by pharmacy', at: order.acceptedAt ?? null, done: !!order.acceptedAt },
      { label: 'Prepared', at: order.preparedAt ?? null, done: !!order.preparedAt },
      { label: 'Picked up', at: order.pickedUpAt ?? null, done: !!order.pickedUpAt },
      { label: 'Delivered', at: order.deliveredAt ?? order.completedAt ?? null, done: !!(order.deliveredAt ?? order.completedAt) },
    ],
    facts,
    cancelReason: order.cancelReason ?? null,
  };
}

export default function PharmacyOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');

  return (
    <OrderDetail
      module="pharmacy"
      orderId={id}
      backHref="/orders"
      trackHref={`/orders/${encodeURIComponent(id)}/track`}
      load={async (orderId) => toDetail(await pharmacyApi.getOrder(orderId))}
    />
  );
}
