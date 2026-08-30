'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronRight, CheckCheck, Package, TrendingDown, Truck, Star, MessageCircle, RotateCcw, Banknote, Settings } from 'lucide-react';
import { unwrapCatalogList } from '@/lib/api/map-catalog-product';
import { apiFetch } from '@/lib/api-fetch';

interface Notification { id: string; type: string; title: string; message: string; imageUrl?: string; actionUrl?: string; isRead: boolean; createdAt: string; }

const TYPE_CONFIG: Record<string, { icon: typeof Package; color: string; bg: string }> = {
  ORDER_UPDATE: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
  PRICE_DROP: { icon: TrendingDown, color: 'text-green-600', bg: 'bg-green-100' },
  DELIVERY_UPDATE: { icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  PROMOTION: { icon: Star, color: 'text-amber-600', bg: 'bg-amber-100' },
  REVIEW_RESPONSE: { icon: MessageCircle, color: 'text-purple-600', bg: 'bg-purple-100' },
  RETURN_UPDATE: { icon: RotateCcw, color: 'text-rose-600', bg: 'bg-rose-100' },
  REFUND_UPDATE: { icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  SYSTEM: { icon: Settings, color: 'text-slate-600', bg: 'bg-slate-100' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Rows live at `d.data.data` behind the gateway envelope; `d.data` is the page
  // object. Storing that object in an array-typed state made `filtered.map` throw
  // and replaced the inbox with the "Something went wrong" boundary.
  //
  // The inbox is `@UseGuards(JwtAuthGuard)` and the gateway scopes it to the JWT's
  // subject, so it must be requested via `apiFetch` to carry the token. The
  // `userId=demo-user` this used to pass was never read — the gateway takes the
  // user from the token — so it only served to make the call look user-scoped
  // when it was not.
  useEffect(() => {
    apiFetch('/marketplace/notifications?limit=50')
      .then(r => r.json())
      .then(d => {
        const page = d?.data ?? d;
        setNotifications(unwrapCatalogList(d) as Notification[]);
        setUnreadCount(Number(page?.unreadCount) || 0);
      })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const markAllRead = () => {
    apiFetch('/marketplace/notifications/read-all', { method: 'PUT', body: '{}' })
      .catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Hero */}
      <section className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white py-8 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Bell className="w-7 h-7" />
              <h1 className="text-2xl font-extrabold">Notifications</h1>
            </div>
            <p className="text-white/70 text-sm">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <nav className="text-sm text-slate-500 mb-4">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Notifications</span>
        </nav>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'
              }`}>
              {f}{f === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg" />
                <div className="flex-1"><div className="h-4 bg-slate-100 rounded w-3/4 mb-2" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-14 h-14 mx-auto text-slate-200 mb-3" />
            <h2 className="text-lg font-bold text-slate-800 mb-1">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</h2>
            <p className="text-sm text-slate-500">We'll notify you about orders, deals, and more.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEM;
              const Icon = config.icon;
              return (
                <div key={n.id} className={`bg-white border rounded-xl p-4 flex items-start gap-3 transition-all hover:shadow-sm ${
                  n.isRead ? 'border-slate-200' : 'border-blue-200 bg-blue-50/30'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm mb-0.5 ${n.isRead ? 'text-slate-700' : 'text-slate-900 font-semibold'}`}>{n.title}</div>
                    <div className="text-sm text-slate-500 line-clamp-2">{n.message}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {!n.isRead && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
