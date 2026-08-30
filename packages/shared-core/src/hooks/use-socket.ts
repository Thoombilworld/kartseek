'use client';

/**
 * KARTSEEK WebSocket React Hooks
 * ──────────────────────────────
 * Ready-to-use hooks for all real-time features across the admin portal.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket, type NamespaceKey } from '../socket/socket';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'order' | 'promotion' | 'system' | 'chat' | 'delivery' | 'payment';
  icon?: string;
  actionUrl?: string;
  data?: Record<string, any>;
  createdAt: string;
  read: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'driver' | 'support' | 'seller';
  content: string;
  type: 'text' | 'image' | 'location' | 'system';
  metadata?: Record<string, any>;
  createdAt: string;
  readBy: string[];
}

export interface OrderEvent {
  orderId: string;
  status: string;
  message?: string;
  estimatedTime?: number;
  partnerId?: string;
  partnerName?: string;
  partnerLocation?: { lat: number; lng: number };
  timestamp: string;
}

export interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading: number;
  speed?: number;
  distKm?: number;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base Hook: Connection Status + Socket Access
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Low-level hook that manages a socket connection lifecycle.
 * Use the higher-level hooks below instead of this directly.
 */
export function useSocket(
  // Sourced from the socket module so it cannot drift from the gateway's
  // registered namespaces — this union used to lead with `'tracking'`, which
  // no gateway declares.
  namespace: NamespaceKey,
  options: { userId?: string; userType?: string; role?: string; autoConnect?: boolean } = {},
) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const { autoConnect = true } = options;

  useEffect(() => {
    if (!autoConnect) return;

    setStatus('connecting');
    const socket = getSocket(namespace, options);
    socketRef.current = socket;

    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onError = () => setStatus('error');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);

    // If already connected
    if (socket.connected) setStatus('connected');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
      // Don't disconnect — socket is shared across components
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, options.userId, autoConnect]);

  return { socket: socketRef.current, status };
}

// ─────────────────────────────────────────────────────────────────────────────
// useNotifications — Real-time push notifications for admin/user
// ─────────────────────────────────────────────────────────────────────────────

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    if (!userId) return;

    setStatus('connecting');
    const socket = getSocket('notifications', { userId });

    const onConnect = () => {
      setStatus('connected');
      socket.emit('subscribe_notifications', { userId });
    };
    const onDisconnect = () => setStatus('disconnected');
    const onNotification = (n: Notification) => {
      setNotifications((prev) => [n, ...prev.slice(0, 99)]);
      setUnreadCount((c) => c + 1);
    };
    const onQueued = (pending: Notification[]) => {
      setNotifications((prev) => [...pending, ...prev]);
      setUnreadCount((c) => c + pending.length);
    };
    const onUnreadCount = ({ count }: { count: number }) => setUnreadCount(count);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('notification', onNotification);
    socket.on('queued_notifications', onQueued);
    socket.on('pending_notifications', onQueued);
    socket.on('unread_count', onUnreadCount);

    if (socket.connected) {
      setStatus('connected');
      socket.emit('subscribe_notifications', { userId });
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('notification', onNotification);
      socket.off('queued_notifications', onQueued);
      socket.off('pending_notifications', onQueued);
      socket.off('unread_count', onUnreadCount);
    };
  }, [userId]);

  const markAllRead = useCallback(() => {
    if (!userId) return;
    const socket = getSocket('notifications', { userId });
    socket.emit('mark_read', { userId });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [userId]);

  return { notifications, unreadCount, status, markAllRead };
}

// ─────────────────────────────────────────────────────────────────────────────
// useOrderTracking — Track a single order's live status
// ─────────────────────────────────────────────────────────────────────────────

export function useOrderTracking(orderId: string | null, userId: string | null) {
  const [orderStatus, setOrderStatus] = useState<OrderEvent | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    if (!orderId || !userId) return;

    setStatus('connecting');
    const socket = getSocket('orders', { userId, role: 'customer' });

    const onConnect = () => {
      setStatus('connected');
      socket.emit('track_order', { orderId });
    };
    const onDisconnect = () => setStatus('disconnected');
    const onOrderStatus = (payload: OrderEvent) => setOrderStatus(payload);
    const onPartnerLocation = (loc: { lat: number; lng: number }) => setPartnerLocation(loc);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('order_status', onOrderStatus);
    socket.on('partner_location', onPartnerLocation);

    if (socket.connected) {
      setStatus('connected');
      socket.emit('track_order', { orderId });
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order_status', onOrderStatus);
      socket.off('partner_location', onPartnerLocation);
      if (socket.connected) socket.emit('stop_tracking', { orderId });
    };
  }, [orderId, userId]);

  return { orderStatus, partnerLocation, status };
}

// ─────────────────────────────────────────────────────────────────────────────
// useAdminOrderFeed — Admin dashboard live order event stream
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminOrderFeed(adminId: string | null) {
  const [recentEvents, setRecentEvents] = useState<OrderEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    if (!adminId) return;

    setStatus('connecting');
    const socket = getSocket('orders', { userId: adminId, role: 'admin' });

    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onOrderEvent = (event: OrderEvent) => {
      setRecentEvents((prev) => [event, ...prev.slice(0, 49)]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('order_event', onOrderEvent);

    if (socket.connected) setStatus('connected');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order_event', onOrderEvent);
    };
  }, [adminId]);

  return { recentEvents, status };
}

// ─────────────────────────────────────────────────────────────────────────────
// useChat — Full chat room state management
// ─────────────────────────────────────────────────────────────────────────────

export function useChat(roomId: string | null, userId: string | null, userType = 'support') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    if (!roomId || !userId) return;

    setStatus('connecting');
    const socket = getSocket('chat', { userId, userType });

    const onConnect = () => {
      setStatus('connected');
      socket.emit('join_room', { roomId, loadHistory: true });
    };
    const onDisconnect = () => setStatus('disconnected');
    const onHistory = ({ messages: hist }: { messages: ChatMessage[] }) => setMessages(hist);
    const onNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        // Deduplicate
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Mark as read if we're in the room
      if (socket.connected) {
        socket.emit('mark_messages_read', { roomId, messageIds: [msg.id] });
      }
    };
    const onTypingStart = ({ userId: uid }: { userId: string }) => {
      setTypingUsers((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
    };
    const onTypingStop = ({ userId: uid }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== uid));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat_history', onHistory);
    socket.on('new_message', onNewMessage);
    socket.on('user_typing', onTypingStart);
    socket.on('typing_stopped', onTypingStop);

    if (socket.connected) {
      setStatus('connected');
      socket.emit('join_room', { roomId, loadHistory: true });
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat_history', onHistory);
      socket.off('new_message', onNewMessage);
      socket.off('user_typing', onTypingStart);
      socket.off('typing_stopped', onTypingStop);
      if (socket.connected) socket.emit('leave_room', { roomId });
    };
  }, [roomId, userId, userType]);

  const sendMessage = useCallback(
    (content: string, type: 'text' | 'image' | 'location' = 'text') => {
      if (!roomId || !userId) return;
      const socket = getSocket('chat', { userId, userType });
      socket.emit('send_message', { roomId, content, type });
    },
    [roomId, userId, userType],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!roomId || !userId) return;
      const socket = getSocket('chat', { userId, userType });
      socket.emit(isTyping ? 'typing_start' : 'typing_stop', { roomId });
    },
    [roomId, userId, userType],
  );

  return { messages, typingUsers, status, sendMessage, sendTyping };
}

// ─────────────────────────────────────────────────────────────────────────────
// useNearbyDrivers — Live driver map for taxi admin / dispatch
// ─────────────────────────────────────────────────────────────────────────────

export function useNearbyDrivers(
  lat: number | null,
  lng: number | null,
  radiusKm = 10,
  pollIntervalMs = 8000,
) {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    if (lat === null || lng === null) return;

    setStatus('connecting');
    const socket = getSocket('taxi');

    const onConnect = () => {
      setStatus('connected');
      socket.emit('findNearbyDrivers', { lat, lng, radiusKm });
    };
    const onDisconnect = () => setStatus('disconnected');
    const onDrivers = (result: DriverLocation[]) => setDrivers(result);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('nearbyDriversResult', onDrivers);

    if (socket.connected) {
      setStatus('connected');
      socket.emit('findNearbyDrivers', { lat, lng, radiusKm });
    }

    // Poll for updated driver positions
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit('findNearbyDrivers', { lat, lng, radiusKm });
      }
    }, pollIntervalMs);

    return () => {
      clearInterval(interval);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('nearbyDriversResult', onDrivers);
    };
  }, [lat, lng, radiusKm, pollIntervalMs]);

  return { drivers, status };
}

// ─────────────────────────────────────────────────────────────────────────────
// useConnectionStatus — Connection indicator for UI
// ─────────────────────────────────────────────────────────────────────────────

export function useConnectionStatus(
  namespaces: NamespaceKey[],
  userId: string | null,
) {
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({});

  useEffect(() => {
    if (!userId) return;

    const cleanups: Array<() => void> = [];

    namespaces.forEach((ns) => {
      const socket = getSocket(ns, { userId });
      const update = (s: ConnectionStatus) =>
        setStatuses((prev) => ({ ...prev, [ns]: s }));

      const onConnect = () => update('connected');
      const onDisconnect = () => update('disconnected');
      const onError = () => update('error');

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('connect_error', onError);

      update(socket.connected ? 'connected' : 'connecting');

      cleanups.push(() => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('connect_error', onError);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const overallStatus: ConnectionStatus =
    Object.values(statuses).some((s) => s === 'connected')
      ? 'connected'
      : Object.values(statuses).some((s) => s === 'connecting')
      ? 'connecting'
      : Object.values(statuses).some((s) => s === 'error')
      ? 'error'
      : 'disconnected';

  return { statuses, overallStatus };
}
