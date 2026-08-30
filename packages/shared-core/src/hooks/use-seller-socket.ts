'use client';

/**
 * KARTSEEK Seller Socket Hook
 * ────────────────────────────
 * Real-time WebSocket integration for the seller portal.
 * Provides live order notifications, status updates, and admin events.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../socket/socket';
import { getAuthToken } from '@/lib/auth-token';
import type { ConnectionStatus, OrderEvent, Notification } from './use-socket';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewOrderEvent {
  orderId: string;
  productName: string;
  buyerName: string;
  amount: number;
  timestamp: string;
}

export interface SellerSocketState {
  /** WebSocket connection status */
  status: ConnectionStatus;
  /** Live new order events (most recent first) */
  newOrders: NewOrderEvent[];
  /** Live order status change events */
  orderUpdates: OrderEvent[];
  /** Admin-pushed notifications (approvals, payout, policy) */
  adminNotifications: Notification[];
  /** Unread notification count */
  unreadCount: number;
  /** Clear new order events */
  clearNewOrders: () => void;
  /** Mark all notifications as read */
  markAllRead: () => void;
  /** Acknowledge a specific new order */
  acknowledgeOrder: (orderId: string) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSellerSocket(sellerId: string | null): SellerSocketState {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [newOrders, setNewOrders] = useState<NewOrderEvent[]>([]);
  const [orderUpdates, setOrderUpdates] = useState<OrderEvent[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!sellerId) return;

    setStatus('connecting');

    // The `/seller` namespace, not `/orders`.
    //
    // `SellerGateway` is the only gateway that joins `seller:<sellerId>` and the
    // only one that emits `new_order` for a seller — but this connected to
    // `/orders`, a different gateway with different rooms. Every push the server
    // made (`notifyNewOrder`, low-stock alerts, delivery assignment) went to a
    // namespace the portal was not listening on, so the live toast, the badge
    // and the pending-order count never fired once.
    //
    // The token is required now: the room used to be joined from the `userId`
    // query param alone, which let anyone stream any seller's orders.
    const token = getAuthToken() ?? undefined;
    const socket = getSocket('seller', {
      userId: sellerId,
      userType: 'seller',
      role: 'seller',
      token,
    });
    socketRef.current = socket;

    // Also connect to notifications namespace
    const notifSocket = getSocket('notifications', { userId: sellerId, token });

    // ── Connection handlers ────────────────────────────────────────
    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onError = () => setStatus('error');

    // ── Order events ───────────────────────────────────────────────
    // `SellerGateway.notifyNewOrder` emits `{ orderId, customerName, items,
    // total, currency }`; this hook's consumers read `productName` / `buyerName`
    // / `amount`. Normalised here rather than at each call site, so the toast in
    // the portal layout renders regardless of which shape arrives.
    const onNewOrder = (raw: any) => {
      const event: NewOrderEvent = {
        orderId: String(raw?.orderId ?? ''),
        productName: raw?.productName
          ?? (typeof raw?.items === 'number'
            ? `${raw.items} item${raw.items === 1 ? '' : 's'}`
            : 'New order'),
        buyerName: raw?.buyerName ?? raw?.customerName ?? 'Customer',
        amount: Number(raw?.amount ?? raw?.total ?? 0),
        timestamp: raw?.timestamp ?? new Date().toISOString(),
      };
      setNewOrders(prev => [event, ...prev.slice(0, 49)]);

      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          // The currency comes from the event — this used to hard-code ₹ and
          // `en-IN`, so a Qatari seller's browser notification announced their
          // takings in rupees.
          const currency = raw?.currency ?? 'INR';
          const amount = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(event.amount);
          new window.Notification('New Order!', {
            body: `${event.productName} — ${amount}`,
            icon: '/favicon.ico',
          });
        } catch { /* notification permission not granted, or an unknown currency */ }
      }
    };

    const onOrderStatus = (event: OrderEvent) => {
      setOrderUpdates(prev => [event, ...prev.slice(0, 49)]);
    };

    // ── Admin notifications ────────────────────────────────────────
    const onNotification = (n: Notification) => {
      setAdminNotifications(prev => [n, ...prev.slice(0, 99)]);
      setUnreadCount(c => c + 1);
    };

    const onUnreadCount = ({ count }: { count: number }) => {
      setUnreadCount(count);
    };

    // ── Subscribe ──────────────────────────────────────────────────
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);
    socket.on('new_order', onNewOrder);
    socket.on('order_status', onOrderStatus);
    socket.on('order_event', onOrderStatus);

    notifSocket.on('notification', onNotification);
    notifSocket.on('unread_count', onUnreadCount);

    if (socket.connected) {
      setStatus('connected');
    }

    // Request any pending notifications
    if (notifSocket.connected) {
      notifSocket.emit('subscribe_notifications', { userId: sellerId });
    }
    notifSocket.on('connect', () => {
      notifSocket.emit('subscribe_notifications', { userId: sellerId });
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
      socket.off('new_order', onNewOrder);
      socket.off('order_status', onOrderStatus);
      socket.off('order_event', onOrderStatus);

      notifSocket.off('notification', onNotification);
      notifSocket.off('unread_count', onUnreadCount);
    };
  }, [sellerId]);

  const clearNewOrders = useCallback(() => {
    setNewOrders([]);
  }, []);

  const markAllRead = useCallback(() => {
    if (!sellerId) return;
    const notifSocket = getSocket('notifications', { userId: sellerId });
    notifSocket.emit('mark_read', { userId: sellerId });
    setAdminNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [sellerId]);

  const acknowledgeOrder = useCallback((orderId: string) => {
    setNewOrders(prev => prev.filter(o => o.orderId !== orderId));
  }, []);

  return {
    status,
    newOrders,
    orderUpdates,
    adminNotifications,
    unreadCount,
    clearNewOrders,
    markAllRead,
    acknowledgeOrder,
  };
}
