'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket/socket';

/**
 * useAdminSocket — Hook for admin real-time events.
 *
 * Connects to the `/orders` namespace, where OrderGateway auto-joins any socket
 * whose JWT carries an admin role into the `admin:orders` room and broadcasts
 * every order lifecycle change as a single `order_event` envelope.
 *
 * Requires a signed-in admin: `getSocket` sends the session token, and the room
 * is chosen server-side from the role inside it.
 *
 * Usage:
 *   const { events, connected, clearEvents } = useAdminSocket('adm_001');
 */

export interface AdminEvent {
  id: string;
  type: 'new_order' | 'new_seller' | 'complaint' | 'kyc_pending' | 'system_alert';
  data: any;
  timestamp: string;
}

interface UseAdminSocketResult {
  events: AdminEvent[];
  connected: boolean;
  clearEvents: () => void;
  /** Latest event of each type */
  latestOrder: AdminEvent | null;
  latestSeller: AdminEvent | null;
  latestComplaint: AdminEvent | null;
  latestKyc: AdminEvent | null;
  latestAlert: AdminEvent | null;
  /** Counts since last clear */
  counts: {
    orders: number;
    sellers: number;
    complaints: number;
    kyc: number;
    alerts: number;
  };
}

const MAX_EVENTS = 100;

export function useAdminSocket(adminId?: string): UseAdminSocketResult {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const counterRef = useRef({ orders: 0, sellers: 0, complaints: 0, kyc: 0, alerts: 0 });

  const addEvent = useCallback((type: AdminEvent['type'], data: any) => {
    const event: AdminEvent = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    setEvents(prev => [event, ...prev].slice(0, MAX_EVENTS));

    // Update counters
    switch (type) {
      case 'new_order':   counterRef.current.orders++;    break;
      case 'new_seller':  counterRef.current.sellers++;   break;
      case 'complaint':   counterRef.current.complaints++; break;
      case 'kyc_pending': counterRef.current.kyc++;       break;
      case 'system_alert': counterRef.current.alerts++;   break;
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    counterRef.current = { orders: 0, sellers: 0, complaints: 0, kyc: 0, alerts: 0 };
  }, []);

  useEffect(() => {
    if (!adminId) return;

    // `/orders`, not `/tracking` — no gateway has ever registered a `/tracking`
    // namespace, so this handshake failed with `Invalid namespace` and the feed
    // received nothing. OrderGateway auto-joins `admin:orders` from the role in
    // the JWT, so there is no room to subscribe to by hand either: the
    // `subscribe_admin` / `unsubscribe_admin` emits had no `@SubscribeMessage`
    // on any gateway and were silently discarded.
    const socket = getSocket('orders');
    if (!socket) return;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    // The gateway multiplexes the admin dashboard through one `order_event`
    // envelope whose `event` field names the kind — see OrderGateway
    // `notifyNewOrder` / `broadcastOrderStatus`. The five `admin:*` events this
    // hook used to listen for are emitted by nothing on the server.
    const handleOrderEvent = (payload: any) => {
      const kind = payload?.event === 'new_order' ? 'new_order' : 'system_alert';
      addEvent(kind, payload);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('orders_connected', () => setConnected(true));
    socket.on('order_event', handleOrderEvent);

    // Seller signups, complaints and KYC submissions have no server-side
    // emitter yet; they arrive through polling until one exists.

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('orders_connected');
      socket.off('order_event', handleOrderEvent);
    };
  }, [adminId, addEvent]);

  const getLatest = (type: AdminEvent['type']) =>
    events.find(e => e.type === type) || null;

  return {
    events,
    connected,
    clearEvents,
    latestOrder: getLatest('new_order'),
    latestSeller: getLatest('new_seller'),
    latestComplaint: getLatest('complaint'),
    latestKyc: getLatest('kyc_pending'),
    latestAlert: getLatest('system_alert'),
    counts: { ...counterRef.current },
  };
}
