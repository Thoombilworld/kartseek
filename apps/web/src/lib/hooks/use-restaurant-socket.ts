'use client';

/**
 * useRestaurantSocket — Real-time events for restaurant owners/staff.
 *
 * Listens on the `/tracking` namespace (restaurant rooms) for:
 *  - restaurant_status       — open/closed/busy status changes
 *  - restaurant_approved     — restaurant approval notification
 *  - menu_item_created       — new menu item added by another staff
 *  - table_booked            — new table reservation
 *
 * Also listens on `/orders` for restaurant order lifecycle events.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../socket/socket';
import type { ConnectionStatus } from './use-socket';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RestaurantStatus {
  restaurantId: string;
  status: string;
  timestamp: string;
}

export interface TableBooking {
  restaurantId: string;
  reservationId?: string;
  customerId?: string;
  customerName?: string;
  tableNumber?: string;
  guestCount?: number;
  bookingTime?: string;
  timestamp: string;
}

export interface MenuItemEvent {
  restaurantId: string;
  menuItemId?: string;
  name?: string;
  categoryId?: string;
  price?: number;
  timestamp: string;
}

export interface RestaurantOrder {
  orderId: string;
  restaurantId?: string;
  status: string;
  customerName?: string;
  items?: number;
  total?: number;
  estimatedTime?: number;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useRestaurantSocket(
  restaurantId: string,
  options?: { userId?: string; token?: string },
) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [restaurantStatus, setRestaurantStatus] = useState<RestaurantStatus | null>(null);
  const [tableBookings, setTableBookings] = useState<TableBooking[]>([]);
  const [menuEvents, setMenuEvents] = useState<MenuItemEvent[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const trackingSocketRef = useRef<Socket | null>(null);
  const orderSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    // `/orders`, not the `/tracking` namespace this used to name — no gateway
    // registers `/tracking`, so the handshake failed outright.
    //
    // Note the events below (`restaurant_status`, `table_booked`,
    // `menu_item_created`, `restaurant_approved`) still have no server-side
    // emitter, and `join_order_tracking` has no `@SubscribeMessage` — OrderGateway
    // listens for `track_order`. Repointing the namespace makes the socket
    // connect and the order feed work; the restaurant-specific events remain
    // unimplemented on the gateway.
    const trackingSocket = getSocket('orders', {
      userId: options?.userId || restaurantId,
      userType: 'restaurant_staff',
      token: options?.token,
    });
    trackingSocketRef.current = trackingSocket;

    // Named, so the cleanup below can actually detach it. As an inline arrow it
    // was never removed, and every re-run of this effect stacked another copy on
    // the shared singleton socket.
    const onTrackingConnect = () => setStatus('connected');
    trackingSocket.on('connect', onTrackingConnect);

    const onDisconnect = () => setStatus('disconnected');
    const onError = () => setStatus('error');

    // ── Restaurant status events ─────────────────────────────────────────
    const onRestaurantStatus = (data: RestaurantStatus) => {
      if (data.restaurantId === restaurantId) {
        setRestaurantStatus(data);
      }
    };

    const onTableBooked = (data: TableBooking) => {
      setTableBookings((prev) => [data, ...prev].slice(0, 50));
    };

    const onMenuItemCreated = (data: MenuItemEvent) => {
      setMenuEvents((prev) => [data, ...prev].slice(0, 30));
    };

    const onRestaurantApproved = () => {
      setIsApproved(true);
    };

    trackingSocket.on('disconnect', onDisconnect);
    trackingSocket.on('connect_error', onError);
    trackingSocket.on('restaurant_status', onRestaurantStatus);
    trackingSocket.on('table_booked', onTableBooked);
    trackingSocket.on('menu_item_created', onMenuItemCreated);
    trackingSocket.on('restaurant_approved', onRestaurantApproved);

    // ── Orders namespace (order lifecycle) ───────────────────────────────
    const orderSocket = getSocket('orders', {
      userId: restaurantId,
      role: 'seller',
      token: options?.token,
    });
    orderSocketRef.current = orderSocket;

    const onNewOrder = (data: RestaurantOrder) => {
      setOrders((prev) => [data, ...prev].slice(0, 50));
    };

    const onOrderStatus = (data: RestaurantOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.orderId === data.orderId ? { ...o, ...data } : o)),
      );
    };

    orderSocket.on('new_order', onNewOrder);
    orderSocket.on('order_status', onOrderStatus);

    if (trackingSocket.connected) setStatus('connected');

    return () => {
      trackingSocket.off('connect', onTrackingConnect);
      trackingSocket.off('disconnect', onDisconnect);
      trackingSocket.off('connect_error', onError);
      trackingSocket.off('restaurant_status', onRestaurantStatus);
      trackingSocket.off('table_booked', onTableBooked);
      trackingSocket.off('menu_item_created', onMenuItemCreated);
      trackingSocket.off('restaurant_approved', onRestaurantApproved);
      orderSocket.off('new_order', onNewOrder);
      orderSocket.off('order_status', onOrderStatus);
    };
  }, [restaurantId, options?.userId, options?.token]);

  /** Dismiss a table booking from the local list */
  const dismissBooking = useCallback((reservationId: string) => {
    setTableBookings((prev) => prev.filter((b) => b.reservationId !== reservationId));
  }, []);

  /** Clear all orders from the local list */
  const clearOrders = useCallback(() => setOrders([]), []);

  return {
    status,
    restaurantStatus,
    tableBookings,
    menuEvents,
    orders,
    isApproved,
    dismissBooking,
    clearOrders,
    trackingSocket: trackingSocketRef.current,
    orderSocket: orderSocketRef.current,
  };
}
