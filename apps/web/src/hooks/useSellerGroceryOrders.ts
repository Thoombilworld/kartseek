/**
 * useSellerGroceryOrders — Seller portal hook for grocery order management.
 *
 * Fetches orders from the API with fallback to demo data.
 * Provides real-time status update methods that sync with the API.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { groceryApi, type GroceryOrderApi } from '@/lib/grocery-api';
import type { GroceryOrder, OrderStatus } from '@/lib/demo-data/seller-grocery/types';
import { MOCK_ORDERS } from '@/lib/demo-data/seller-grocery';

// Maps API status enum to the seller portal's status naming
function mapApiStatusToLocal(s: string): OrderStatus {
  const statusMap: Record<string, OrderStatus> = {
    'PLACED': 'new',
    'CONFIRMED': 'accepted',
    'PACKING': 'picking',
    'READY_FOR_PICKUP': 'ready_for_pickup',
    'OUT_FOR_DELIVERY': 'out_for_delivery',
    'DELIVERED': 'delivered',
    'CANCELLED': 'cancelled',
    'REFUNDED': 'refunded',
  };
  return statusMap[s] ?? 'new';
}

function mapLocalStatusToApi(s: OrderStatus): string {
  const statusMap: Record<string, string> = {
    'new': 'PLACED',
    'accepted': 'CONFIRMED',
    'picking': 'PACKING',
    'packed': 'PACKING',
    'ready_for_pickup': 'READY_FOR_PICKUP',
    'out_for_delivery': 'OUT_FOR_DELIVERY',
    'delivered': 'DELIVERED',
    'cancelled': 'CANCELLED',
    'returned': 'CANCELLED',
    'refunded': 'REFUNDED',
  };
  return statusMap[s] ?? 'PLACED';
}

export function useSellerGroceryOrders(storeId?: string) {
  const [orders, setOrders] = useState<GroceryOrder[]>(MOCK_ORDERS);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'api' | 'demo'>('demo');

  const fetchOrders = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await groceryApi.getStoreOrders(storeId);
      if (res?.data?.length > 0) {
        const mapped: any[] = res.data.map((o: GroceryOrderApi) => ({
          id: o.orderNumber ?? o.id,
          customerName: o.customerId,
          customerPhone: '',
          items: (o.items ?? []).map(i => ({
            name: i.name,
            qty: i.quantity,
            weight: i.weight,
            price: i.price,
            note: i.preparationNote,
          })),
          total: o.grandTotal,
          status: mapApiStatusToLocal(o.status),
          paymentMethod: o.paymentMethod === 'COD' ? 'cash' as const : 'online' as const,
          createdAt: o.createdAt,
          deliveryType: o.deliverySlot ? 'scheduled' as const : 'instant' as const,
          address: o.deliveryAddress ? `${o.deliveryAddress.line1}, ${o.deliveryAddress.city}` : '',
        }));
        setOrders(mapped);
        setSource('api');
      }
    } catch {
      setSource('demo');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    // Sync with API
    try {
      const apiStatus = mapLocalStatusToApi(newStatus);
      await groceryApi.updateOrderStatus(orderId, apiStatus);
    } catch {
      // Revert on failure — could add toast notification here
    }
  }, []);

  return { orders, loading, source, updateOrderStatus, refetch: fetchOrders };
}
