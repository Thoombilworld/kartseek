'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Package, Tag, AlertTriangle, Truck, CheckCircle } from 'lucide-react';
import { AuthGate } from '@/components/shared/auth-gate';
import { api } from '@/lib/api-endpoints';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { useGroceryLocale } from '@/i18n/grocery-locale';

/**
 * Notification inbox.
 *
 * Six notifications lived in a constant — "Price drop alert: Amul Butter dropped
 * from ₹299 to ₹275", "Order delivered", "Weekend offer" — and Mark-read and
 * Delete edited that array, so a customer's inbox was identical on every device
 * and reset on every navigation.
 *
 * `GET /marketplace/notifications` is the platform's per-user inbox: it takes the
 * user from the JWT and is not marketplace-specific in nature. It has existed the
 * whole time and no grocery screen called it.
 */
export default function GroceryNotificationsPage() {
  return (
    <AuthGate reason="Sign in to see your notifications.">
      <NotificationsContent />
    </AuthGate>
  );
}

interface Notification {
  id: string;
  title: string;
  body?: string;
  message?: string;
  type?: string;
  read?: boolean;
  isRead?: boolean;
  createdAt: string;
}

/** Maps a notification type onto its icon and tint. */
const TYPE_STYLE: Record<string, { icon: typeof Bell; className: string }> = {
  order:    { icon: Package,     className: 'bg-blue-50 text-blue-600' },
  delivery: { icon: Truck,       className: 'bg-emerald-50 text-emerald-600' },
  deal:     { icon: Tag,         className: 'bg-orange-50 text-orange-600' },
  alert:    { icon: AlertTriangle, className: 'bg-red-50 text-red-600' },
};

const FILTERS = ['All', 'Unread'] as const;

function NotificationsContent() {
  const { tr } = useGroceryLocale();
  const { user } = useAuth();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const { data: itemsData, loading, error, reload: load } = useAsyncData<Notification[]>(
    async () => {
      // The inbox response has shifted shape across services, so accept the two
      // it is known to use rather than assuming one and rendering blank.
      const res = await api.get<any>('/marketplace/notifications', { page: 1, limit: 50 });
      const rows = Array.isArray(res) ? res : res?.data ?? res?.notifications ?? [];
      return Array.isArray(rows) ? rows : [];
    },
    [user?.id],
    { enabled: !!user?.id },
  );
  const items = error ? [] : (itemsData ?? []);

  const isRead = (n: Notification) => n.read ?? n.isRead ?? false;
  const shown = filter === 'Unread' ? items.filter((n) => !isRead(n)) : items;
  const unreadCount = items.filter((n) => !isRead(n)).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="touch-target -ml-2 text-slate-500 hover:text-green-600 transition-colors" aria-label={tr('Back')}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{tr('Notifications')}</h1>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading…' : unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </p>
        </div>
      </div>

      {/* Mark-all-read and Delete are gone: the inbox exposes no write route, and
          buttons that only edit a local array make an inbox look managed when the
          same items return on the next load. */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === f ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={() => void load()} className="font-bold shrink-0">{tr('Retry')}</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-20 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-20 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-600 mb-1">
            {filter === 'Unread' ? 'Nothing unread' : 'No notifications yet'}
          </h2>
          <p className="text-sm text-slate-400">{tr('Order updates and offers will appear here.')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((n) => {
            const style = TYPE_STYLE[n.type ?? ''] ?? { icon: Bell, className: 'bg-slate-100 text-slate-500' };
            const Icon = style.icon;
            const read = isRead(n);
            return (
              <li
                key={n.id}
                className={`bg-white rounded-xl border p-4 flex items-start gap-3 ${read ? 'border-slate-200' : 'border-green-300 bg-green-50/30'}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${style.className}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{n.title}</p>
                  {(n.body ?? n.message) && (
                    <p className="text-xs text-slate-500 mt-0.5">{n.body ?? n.message}</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                  </p>
                </div>
                {read && <CheckCircle className="w-4 h-4 text-slate-300 shrink-0" aria-label={tr('Read')} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
