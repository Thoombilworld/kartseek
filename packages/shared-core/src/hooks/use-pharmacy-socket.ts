'use client';

/**
 * usePharmacySocket — Real-time events for pharmacy store owners/staff.
 *
 * Listens on the `/seller` namespace (pharmacy rooms) for:
 *  - pharmacy_new_order          — new customer order received
 *  - pharmacy_order_update       — order status change
 *  - pharmacy_prescription_uploaded — new prescription needs review
 *  - pharmacy_store_approved     — store KYC/approval notification
 *  - pharmacy_low_stock          — inventory low-stock alert
 *
 * Also listens on `/orders` namespace for customer-facing order tracking.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../socket/socket';
import type { ConnectionStatus } from './use-socket';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PharmacyOrderEvent {
  id: string;
  orderNumber: string;
  storeId: string;
  customerId?: string;
  status?: string;
  items?: number;
  total?: number;
  requiresPrescription?: boolean;
  timestamp: string;
}

export interface PrescriptionEvent {
  id: string;
  customerId?: string;
  patientName?: string;
  storeId?: string;
  timestamp: string;
}

export interface LowStockEvent {
  itemId: string;
  name: string;
  storeId: string;
  stockLevel: number;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePharmacySocket(
  storeId: string,
  options?: { userId?: string; token?: string },
) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [orders, setOrders] = useState<PharmacyOrderEvent[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionEvent[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockEvent[]>([]);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const sellerSocketRef = useRef<Socket | null>(null);
  const orderSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!storeId) return;

    // ── Seller namespace (pharmacy store rooms) ────────────────────────────
    const sellerSocket = getSocket('seller', {
      userId: options?.userId || storeId,
      userType: 'pharmacy_staff',
      token: options?.token,
    });
    sellerSocketRef.current = sellerSocket;

    // Join the pharmacy room
    sellerSocket.on('connect', () => {
      sellerSocket.emit('join_room', { room: `pharmacy:${storeId}` });
      setStatus('connected');
    });

    const onDisconnect = () => setStatus('disconnected');
    const onError = () => setStatus('error');

    // ── New order ─────────────────────────────────────────────────────────
    const onNewOrder = (data: PharmacyOrderEvent) => {
      setOrders((prev) => [data, ...prev].slice(0, 50));
    };

    // ── Order update ──────────────────────────────────────────────────────
    const onOrderUpdate = (data: PharmacyOrderEvent) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.id ? { ...o, ...data } : o)),
      );
    };

    // ── Prescription uploaded ─────────────────────────────────────────────
    const onPrescriptionUploaded = (data: PrescriptionEvent) => {
      setPrescriptions((prev) => [data, ...prev].slice(0, 30));
    };

    // ── Store approved ────────────────────────────────────────────────────
    const onStoreApproved = () => {
      setIsApproved(true);
    };

    // ── Low stock ─────────────────────────────────────────────────────────
    const onLowStock = (data: LowStockEvent) => {
      setLowStockAlerts((prev) => [data, ...prev].slice(0, 20));
    };

    sellerSocket.on('disconnect', onDisconnect);
    sellerSocket.on('connect_error', onError);
    sellerSocket.on('pharmacy_new_order', onNewOrder);
    sellerSocket.on('pharmacy_order_update', onOrderUpdate);
    sellerSocket.on('pharmacy_prescription_uploaded', onPrescriptionUploaded);
    sellerSocket.on('pharmacy_store_approved', onStoreApproved);
    sellerSocket.on('pharmacy_low_stock', onLowStock);

    // ── Orders namespace (customer order tracking) ────────────────────────
    const orderSocket = getSocket('orders', {
      userId: storeId,
      role: 'seller',
      token: options?.token,
    });
    orderSocketRef.current = orderSocket;

    const onOrderStatus = (data: PharmacyOrderEvent) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.id ? { ...o, ...data } : o)),
      );
    };

    orderSocket.on('pharmacy_order_status', onOrderStatus);

    if (sellerSocket.connected) setStatus('connected');

    return () => {
      sellerSocket.off('disconnect', onDisconnect);
      sellerSocket.off('connect_error', onError);
      sellerSocket.off('pharmacy_new_order', onNewOrder);
      sellerSocket.off('pharmacy_order_update', onOrderUpdate);
      sellerSocket.off('pharmacy_prescription_uploaded', onPrescriptionUploaded);
      sellerSocket.off('pharmacy_store_approved', onStoreApproved);
      sellerSocket.off('pharmacy_low_stock', onLowStock);
      orderSocket.off('pharmacy_order_status', onOrderStatus);
    };
  }, [storeId, options?.userId, options?.token]);

  /** Dismiss a low-stock alert */
  const dismissStockAlert = useCallback((itemId: string) => {
    setLowStockAlerts((prev) => prev.filter((a) => a.itemId !== itemId));
  }, []);

  /** Clear all orders */
  const clearOrders = useCallback(() => setOrders([]), []);

  /** Clear all prescriptions */
  const clearPrescriptions = useCallback(() => setPrescriptions([]), []);

  return {
    status,
    orders,
    prescriptions,
    lowStockAlerts,
    isApproved,
    dismissStockAlert,
    clearOrders,
    clearPrescriptions,
    sellerSocket: sellerSocketRef.current,
    orderSocket: orderSocketRef.current,
  };
}
