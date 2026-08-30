'use client';

import React, { useState, useCallback } from 'react';
import { useTaxiNotifications, NOTIFICATION_TYPE_CONFIG, type NotificationType } from '@/hooks/useTaxiNotifications';
import {
  Bell, CheckCircle, Check, Trash2, Filter, ChevronDown, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { vendorTaxiApi } from '@/lib/api/vendor-taxi';

const FILTER_OPTIONS: { key: NotificationType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'rental_booking', label: '🚗 Rentals' },
  { key: 'intercity_booking', label: '🛣️ Intercity' },
  { key: 'ride_assignment', label: '📍 Rides' },
  { key: 'payment_received', label: '💰 Payments' },
  { key: 'booking_cancelled', label: '❌ Cancellations' },
  { key: 'system', label: '⚙️ System' },
];

export default function VendorNotificationsPage() {
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const filterTypes = typeFilter === 'all' ? undefined : [typeFilter];
  const { notifications, unreadCount, markRead, markAllRead, dismiss, toastQueue, TYPE_CONFIG } = useTaxiNotifications(filterTypes);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Toast from hook */}
      {toastQueue.map(t => (
        <div key={t.id} className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-in slide-in-from-right">
          <Bell className="w-4 h-4 animate-bounce" />{t.title}: {t.message.slice(0, 60)}…
        </div>
      ))}
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium"><CheckCircle className="w-4 h-4" />{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6" /> Notifications
            {unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full">{unreadCount}</span>}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Booking alerts, payment updates, and system messages</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => { markAllRead(); showToast('All marked as read'); }} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-lg text-sm">
            <Check className="w-4 h-4" /> Mark All Read
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button key={opt.key} onClick={() => setTypeFilter(opt.key as any)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${typeFilter === opt.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No notifications to show
          </div>
        ) : notifications.map(n => {
          const cfg = TYPE_CONFIG[n.type];
          return (
            <div key={n.id} className={`bg-white border rounded-xl p-4 transition-all hover:shadow-md ${n.read ? 'border-slate-200' : 'border-blue-300 shadow-blue-50'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shrink-0 ${cfg.color}`}>
                  {cfg.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className={`text-sm font-bold ${n.read ? 'text-slate-700' : 'text-slate-900'}`}>{n.title}</h3>
                    {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                  </div>
                  <p className={`text-sm ${n.read ? 'text-slate-400' : 'text-slate-600'}`}>{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="text-[10px] font-bold text-blue-600 hover:text-blue-800">Mark read</button>
                    )}
                    {n.actionUrl && (
                      <Link href={n.actionUrl} className="text-[10px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-0.5">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                    <button onClick={() => dismiss(n.id)} className="text-[10px] text-slate-400 hover:text-red-500 ml-auto" title="Dismiss notification"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
