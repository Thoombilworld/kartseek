'use client';

/**
 * useGroceryStoreSocket — Real-time events for grocery store owners/staff.
 *
 * Listens on the `/seller` namespace for grocery-specific events:
 *  - grocery_new_order      — new incoming order
 *  - grocery_order_update   — order status changed
 *  - store_status_changed   — approval/suspension
 *  - low_stock_alert        — low inventory warning (type: 'grocery')
 *  - grocery_product_created — new product added
 *  - grocery_category_updated — admin category change
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '../socket/socket';
import type { ConnectionStatus } from './use-socket';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GroceryOrder {
  orderId: string;
  storeId: string;
  customerId?: string;
  customerName?: string;
  items?: number;
  total?: number;
  status: string;
  timestamp: string;
}

export interface GroceryStoreStatus {
  storeId?: string;
  ownerId?: string;
  storeName?: string;
  event: 'store_approved' | 'store_suspended';
  reason?: string;
  timestamp: string;
}

export interface GroceryLowStock {
  storeId: string;
  productId: string;
  productName?: string;
  currentStock: number;
  reorderLevel?: number;
  type: 'grocery';
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useGroceryStoreSocket(storeId: string, options?: { token?: string }) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [orders, setOrders] = useState<GroceryOrder[]>([]);
  const [stockAlerts, setStockAlerts] = useState<GroceryLowStock[]>([]);
  const [storeStatus, setStoreStatus] = useState<GroceryStoreStatus | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!storeId) return;

    const socket = getSocket('orders', {
      userId: storeId,
      role: 'seller',
      token: options?.token,
    });
    socketRef.current = socket;

    // ── Connection events ────────────────────────────────────────────────
    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onError = () => setStatus('error');

    // ── Grocery-specific events ──────────────────────────────────────────
    const onNewOrder = (data: GroceryOrder) => {
      setOrders((prev) => [data, ...prev].slice(0, 50)); // Keep last 50
    };

    const onOrderUpdate = (data: GroceryOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.orderId === data.orderId ? { ...o, ...data } : o)),
      );
    };

    // No `store_status_changed` listener: nothing on the server emits one. The
    // `storeStatus` slot stays null until a gateway broadcasts it, rather than
    // being fed by a listener that can never fire.
    void setStoreStatus;

    const onLowStock = (data: GroceryLowStock) => {
      if (data.type === 'grocery') {
        setStockAlerts((prev) => [data, ...prev].slice(0, 30));
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);
    // Event names come from OrderGateway, which is module-agnostic: it emits
    // `new_order` and `order_status`, never a `grocery_`-prefixed variant, so
    // the three listeners below never fired once. `low_stock_alert` was the only
    // correct name of the four — it is emitted by SellerGateway and filtered on
    // `data.type === 'grocery'` below.
    socket.on('new_order', onNewOrder);
    socket.on('order_status', onOrderUpdate);
    socket.on('low_stock_alert', onLowStock);

    if (socket.connected) setStatus('connected');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
      socket.off('new_order', onNewOrder);
      socket.off('order_status', onOrderUpdate);
      socket.off('low_stock_alert', onLowStock);
    };
  }, [storeId, options?.token]);

  /** Dismiss a stock alert */
  const dismissStockAlert = useCallback((productId: string) => {
    setStockAlerts((prev) => prev.filter((a) => a.productId !== productId));
  }, []);

  /** Clear all orders from the local list */
  const clearOrders = useCallback(() => setOrders([]), []);

  return {
    status,
    orders,
    stockAlerts,
    storeStatus,
    dismissStockAlert,
    clearOrders,
    socket: socketRef.current,
  };
}
