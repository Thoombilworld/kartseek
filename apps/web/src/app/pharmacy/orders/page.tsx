'use client';

/**
 * Pharmacy order history.
 *
 * Rendered a six-item `ORDERS` constant naming HealthPlus, Apollo, MedPlus and
 * WellBeing at `₹` prices — a hardcoded rupee symbol on a platform whose
 * currency comes from the region registry — and made no request at all.
 *
 * `GET /pharmacy/my-orders` returns the signed-in customer's real orders. It
 * used to take the customer id from the query string, which meant that omitting
 * it (as every caller did) returned every customer's pharmacy orders; the id now
 * comes from the bearer token.
 */

import React from 'react';
import { pharmacyApi } from '@/lib/api/pharmacy';
import { OrderHistory, type HistoryRow } from '@/components/orders/order-history';
import { isOpen } from '@/lib/modules/profile-data';

function normalise(order: any): HistoryRow {
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const itemNames = items.map((i) => i?.name).filter(Boolean) as string[];
  const reference = order.orderNumber ?? order.id;

  const meta = [`${items.length} item${items.length === 1 ? '' : 's'}`];
  if (order.orderType) meta.push(String(order.orderType).toLowerCase() === 'pickup' ? 'Store pickup' : 'Delivery');
  // Prescription-only medicines are the one fact a customer most needs on the
  // row: it decides whether the order can move before a pharmacist verifies it.
  if (order.requiresPrescription) meta.push('Prescription required');
  if (order.coldChainRequired) meta.push('Cold chain');

  return {
    id: String(order.id ?? reference),
    reference: String(reference ?? ''),
    title: order.store?.name ?? 'Pharmacy order',
    subtitle: itemNames.length ? itemNames.join(', ') : 'Medicines',
    meta,
    dateISO: order.createdAt ?? null,
    status: order.status,
    // Postgres decimals arrive as strings — `"645.00"`, not 645.
    amount: order.grandTotal !== undefined && order.grandTotal !== null ? Number(order.grandTotal) : null,
    currency: null,
    icon: order.requiresPrescription ? '📋' : '💊',
    kind: order.requiresPrescription ? 'rx' : 'otc',
    detailHref: `/pharmacy/orders/${encodeURIComponent(String(order.id ?? reference))}`,
    trackHref: `/pharmacy/orders/${encodeURIComponent(String(order.id ?? reference))}/track`,
    searchText: itemNames.join(' '),
  };
}

export default function PharmacyOrdersPage() {
  return (
    <OrderHistory
      module="pharmacy"
      heading="My pharmacy orders"
      backHref="/pharmacy"
      searchPlaceholder="Search by pharmacy, medicine or order number…"
      filters={[
        { key: 'active', label: 'Active', match: (r) => isOpen(r.status) },
        { key: 'past', label: 'Past', match: (r) => !isOpen(r.status) },
        { key: 'rx', label: 'Prescription', match: (r) => r.kind === 'rx' },
      ]}
      load={async () => {
        const res: any = await pharmacyApi.getMyOrders({ limit: 50 });
        const rows: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return rows.map(normalise);
      }}
    />
  );
}
