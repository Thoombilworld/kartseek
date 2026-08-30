'use client';

/**
 * Restaurant order history.
 *
 * Rendered a five-item `ORDERS` constant — The Grand Biryani House, Pizza
 * Paradise, Punjab Da Dhaba, Sushi Kingdom, Green Bowl — with dates in June and
 * ratings already given. It made no request, so a customer who had just ordered
 * saw five strangers' meals and not their own.
 *
 * `GET /orders/restaurant/history` returns the customer's real orders from
 * `restaurant_orders`; until now that route answered with three orders written
 * into the gateway controller, which is where the fiction on this page came from
 * in the first place.
 */

import React from 'react';
import { restaurantApi } from '@/lib/api/restaurant';
import { OrderHistory, type HistoryRow } from '@/components/orders/order-history';

/** Type icons keyed by the order types restaurant-service records. */
const TYPE_ICON: Record<string, string> = {
  DELIVERY: '🛵',
  TAKEAWAY: '🥡',
  DINE_IN: '🍽️',
};

const TYPE_LABEL: Record<string, string> = {
  DELIVERY: 'Delivery',
  TAKEAWAY: 'Takeaway',
  DINE_IN: 'Dine-in',
};

function normalise(order: any): HistoryRow {
  const type = String(order.orderType ?? order.type ?? 'DELIVERY').toUpperCase().replace('-', '_');
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const itemNames = items
    .map((i) => (typeof i === 'string' ? i : i?.name))
    .filter(Boolean) as string[];
  const reference = order.orderNumber ?? order.id;

  return {
    id: String(order.id ?? reference),
    reference: String(reference ?? ''),
    title: order.restaurant?.name ?? order.restaurantName ?? 'Restaurant order',
    subtitle: itemNames.length ? itemNames.join(', ') : `${items.length} item${items.length === 1 ? '' : 's'}`,
    meta: [
      TYPE_LABEL[type] ?? type,
      `${items.length} item${items.length === 1 ? '' : 's'}`,
    ],
    dateISO: order.createdAt ?? order.placedAt ?? null,
    status: order.status,
    // `grandTotal` is a Postgres decimal and arrives as a string.
    amount: order.grandTotal !== undefined && order.grandTotal !== null
      ? Number(order.grandTotal)
      : (order.total ?? null),
    currency: null,
    icon: TYPE_ICON[type] ?? '🍔',
    kind: type,
    detailHref: `/restaurant/orders/${encodeURIComponent(String(reference ?? order.id))}`,
    trackHref: `/restaurant/orders/${encodeURIComponent(String(reference ?? order.id))}/track`,
    searchText: itemNames.join(' '),
  };
}

export default function RestaurantOrdersPage() {
  return (
    <OrderHistory
      module="restaurant"
      heading="My food orders"
      backHref="/restaurant"
      searchPlaceholder="Search by restaurant, dish or order number…"
      filters={[
        { key: 'delivery', label: 'Delivery', match: (r) => r.kind === 'DELIVERY' },
        { key: 'takeaway', label: 'Takeaway', match: (r) => r.kind === 'TAKEAWAY' },
        { key: 'dine-in', label: 'Dine-in', match: (r) => r.kind === 'DINE_IN' },
      ]}
      load={async () => {
        const res: any = await restaurantApi.getOrderHistory();
        const rows: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return rows.map(normalise);
      }}
    />
  );
}
