'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bell, CheckCircle, Tag, CalendarCheck, TrendingDown,
  Star, Gift, Info, Check,
} from 'lucide-react';

/* ── Mock notifications ────────────────────────────────────────────────────── */
const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1', type: 'booking' as const,
    title: 'Booking Confirmed',
    message: 'Your reservation at The Grand Palace Hotel, Dubai has been confirmed. Confirmation code: KS-A7B3C9.',
    time: '2 minutes ago', read: false,
  },
  {
    id: 'n2', type: 'reminder' as const,
    title: 'Check-in Tomorrow',
    message: 'Your stay at Seaside Family Resort, Mumbai starts tomorrow. Check-in is after 14:00.',
    time: '1 hour ago', read: false,
  },
  {
    id: 'n3', type: 'offer' as const,
    title: 'Flash Sale: 30% OFF Dubai Hotels',
    message: 'Book any 5-star hotel in Dubai this weekend and get 30% off. Use code DUBAI30.',
    time: '3 hours ago', read: false,
  },
  {
    id: 'n4', type: 'price' as const,
    title: 'Price Drop Alert',
    message: 'Heritage Boutique Hotel in London dropped to £270/night — 15% less than your last search.',
    time: '5 hours ago', read: true,
  },
  {
    id: 'n5', type: 'review' as const,
    title: 'Rate Your Stay',
    message: 'How was your stay at KARTSEEK Business Suites, Doha? Share your experience and earn 50 loyalty points.',
    time: '1 day ago', read: true,
  },
  {
    id: 'n6', type: 'loyalty' as const,
    title: 'Loyalty Points Earned',
    message: 'You earned 320 KARTSEEK points for your recent booking. You now have 1,480 points total.',
    time: '2 days ago', read: true,
  },
  {
    id: 'n7', type: 'info' as const,
    title: 'COVID-19 Travel Update',
    message: 'New entry requirements for UAE travelers. Please review the latest guidelines before your trip.',
    time: '3 days ago', read: true,
  },
];

const ICON_CFG: Record<string, { icon: typeof Bell; bg: string; color: string }> = {
  booking:  { icon: CheckCircle, bg: 'bg-emerald-100', color: 'text-emerald-600' },
  reminder: { icon: CalendarCheck, bg: 'bg-blue-100', color: 'text-blue-600' },
  offer:    { icon: Tag, bg: 'bg-rose-100', color: 'text-rose-600' },
  price:    { icon: TrendingDown, bg: 'bg-amber-100', color: 'text-amber-600' },
  review:   { icon: Star, bg: 'bg-purple-100', color: 'text-purple-600' },
  loyalty:  { icon: Gift, bg: 'bg-pink-100', color: 'text-pink-600' },
  info:     { icon: Info, bg: 'bg-slate-100', color: 'text-slate-600' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const unreadCount = notifications.filter(n => !n.read).length;

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  function toggleRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-rose-500" /> Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm font-bold text-rose-600 hover:text-rose-700 transition-colors px-3 py-2 rounded-xl hover:bg-rose-50"
          >
            <Check className="w-4 h-4" /> Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-700 mb-1">No notifications</h3>
          <p className="text-sm text-slate-400">You are all caught up. Check back later.</p>
        </div>
      ) : (
        <div className="space-y-2" role="list" aria-label="Notifications">
          {notifications.map(n => {
            const cfg = ICON_CFG[n.type] || ICON_CFG.info;
            const Icon = cfg.icon;
            return (
              <button key={n.id} onClick={() => toggleRead(n.id)}
                className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                  n.read
                    ? 'bg-white border-slate-100 hover:bg-slate-50'
                    : 'bg-rose-50/50 border-rose-100 hover:bg-rose-50 shadow-sm'
                }`}
                role="listitem"
                aria-label={`${n.read ? 'Read' : 'Unread'}: ${n.title}`}
              >
                <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className={`font-bold text-sm truncate ${n.read ? 'text-slate-700' : 'text-slate-900'}`}>{n.title}</h3>
                    {!n.read && <span className="w-2 h-2 bg-rose-500 rounded-full shrink-0" aria-label="Unread" />}
                  </div>
                  <p className={`text-xs leading-relaxed mb-1 ${n.read ? 'text-slate-400' : 'text-slate-600'}`}>{n.message}</p>
                  <span className="text-[10px] text-slate-400 font-medium">{n.time}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
