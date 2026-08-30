'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'rental_booking' | 'intercity_booking' | 'ride_assignment' | 'booking_cancelled' | 'payment_received' | 'system';

export interface TaxiNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// ── Mock Notifications ───────────────────────────────────────────────────────

const MOCK_NOTIFICATIONS: TaxiNotification[] = [
  { id: 'n-001', type: 'rental_booking', title: 'New Rental Booking', message: 'Vikram Singh booked Toyota Prado for 3 days starting Jul 10. Accept or decline.', data: { bookingId: 'RNT-501', vehicle: 'Toyota Prado', days: 3, fare: 22500 }, read: false, createdAt: '2026-07-08T14:30:00Z', actionUrl: '/seller/taxi/rentals' },
  { id: 'n-002', type: 'intercity_booking', title: 'Intercity Shuttle Assignment', message: 'New passenger for Mumbai → Delhi departing Jul 9, 06:00 AM. 2 seats reserved.', data: { bookingId: 'IC-301', route: 'Mumbai → Delhi', seats: 2, fare: 3600 }, read: false, createdAt: '2026-07-08T14:25:00Z', actionUrl: '/seller/taxi/intercity' },
  { id: 'n-003', type: 'ride_assignment', title: 'Ride Request', message: 'New ride request from Westlands to CBD. Economy vehicle. Estimated fare 280.', data: { rideId: 'RIDE-9301', fare: 280 }, read: false, createdAt: '2026-07-08T14:20:00Z' },
  { id: 'n-004', type: 'payment_received', title: 'Payment Received', message: '22,500 received for Rental RNT-498 (Toyota Fielder, 5 days).', data: { amount: 22500 }, read: true, createdAt: '2026-07-08T12:00:00Z' },
  { id: 'n-005', type: 'booking_cancelled', title: 'Booking Cancelled', message: 'Customer Ali Hassan cancelled Intercity IC-295 (Mumbai → Pune, Jul 8).', data: { bookingId: 'IC-295' }, read: true, createdAt: '2026-07-08T10:00:00Z' },
  { id: 'n-006', type: 'rental_booking', title: 'Rental Return Due', message: 'Priya Menon\'s rental RNT-497 (Mercedes C-Class) is due for return tomorrow.', data: { bookingId: 'RNT-497' }, read: true, createdAt: '2026-07-08T08:00:00Z' },
  { id: 'n-007', type: 'system', title: 'Document Expiry Warning', message: 'Vehicle MH 01 AB 1234 insurance expires in 7 days. Please renew.', read: true, createdAt: '2026-07-07T16:00:00Z' },
  { id: 'n-008', type: 'intercity_booking', title: 'Shuttle Fully Booked', message: 'Mumbai → Chennai, Jul 9, 07:00 AM departure is now fully booked (14/14 seats).', data: { route: 'Mumbai → Chennai' }, read: true, createdAt: '2026-07-07T14:00:00Z' },
];

const TYPE_CONFIG: Record<NotificationType, { emoji: string; color: string }> = {
  rental_booking: { emoji: '🚗', color: 'bg-blue-500' },
  intercity_booking: { emoji: '🛣️', color: 'bg-violet-500' },
  ride_assignment: { emoji: '📍', color: 'bg-amber-500' },
  booking_cancelled: { emoji: '❌', color: 'bg-red-500' },
  payment_received: { emoji: '💰', color: 'bg-emerald-500' },
  system: { emoji: '⚙️', color: 'bg-slate-500' },
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTaxiNotifications(filter?: NotificationType[]) {
  const [notifications, setNotifications] = useState<TaxiNotification[]>(MOCK_NOTIFICATIONS);
  const [toastQueue, setToastQueue] = useState<TaxiNotification[]>([]);

  const filtered = useMemo(() => {
    if (!filter || filter.length === 0) return notifications;
    return notifications.filter(n => filter.includes(n.type));
  }, [notifications, filter]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((notif: Omit<TaxiNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotif: TaxiNotification = {
      ...notif,
      id: `n-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
    setToastQueue(prev => [...prev, newNotif]);
    setTimeout(() => setToastQueue(prev => prev.filter(t => t.id !== newNotif.id)), 5000);
  }, []);

  // Simulate incoming notification after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      addNotification({
        type: 'rental_booking',
        title: 'New Rental Request',
        message: 'Sarah Johnson requested Toyota HiAce Van for Jul 12–15 (4 days).',
        data: { bookingId: 'RNT-502', vehicle: 'Toyota HiAce Van', days: 4, fare: 36000 },
        actionUrl: '/seller/taxi/rentals',
      });
    }, 8000);
    return () => clearTimeout(timer);
  }, [addNotification]);

  return {
    notifications: filtered,
    allNotifications: notifications,
    unreadCount,
    toastQueue,
    markRead,
    markAllRead,
    dismiss,
    addNotification,
    TYPE_CONFIG,
  };
}

export { TYPE_CONFIG as NOTIFICATION_TYPE_CONFIG };
