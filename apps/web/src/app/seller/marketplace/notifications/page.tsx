'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import { SellerLoading, SellerError } from '@/components/seller/marketplace/data-state';
import {
  Bell, CheckCircle, Package, DollarSign, RotateCcw, Shield,
  AlertTriangle, Star, Zap, Trash2, Check, X, Eye, Clock,
  MessageSquare, Settings, Archive, Filter,
} from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type NotifType = 'order' | 'return' | 'payout' | 'admin' | 'review' | 'stock' | 'campaign' | 'system';
type Notif = { id: string; type: NotifType; title: string; desc: string; time: string; read: boolean; actionUrl?: string; };

const ICONS: Record<NotifType, { icon: React.ElementType; bg: string }> = {
  order: { icon: Package, bg: 'bg-blue-50 text-blue-600' },
  return: { icon: RotateCcw, bg: 'bg-red-50 text-red-600' },
  payout: { icon: DollarSign, bg: 'bg-emerald-50 text-emerald-600' },
  admin: { icon: Shield, bg: 'bg-purple-50 text-purple-600' },
  review: { icon: Star, bg: 'bg-amber-50 text-amber-600' },
  stock: { icon: AlertTriangle, bg: 'bg-orange-50 text-orange-600' },
  campaign: { icon: Zap, bg: 'bg-cyan-50 text-cyan-600' },
  system: { icon: Settings, bg: 'bg-slate-100 text-slate-600' },
};


export default function NotificationsPage() {
  const { seller, socket } = useSeller();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | NotifType>('all');

  // Fetch notifications from API on mount.
  //
  // This used to seed twelve invented notifications — a payout of ₹2,00,000 to
  // "HDFC Bank ••4532", an approved product, a five-star review — and only
  // replace them `if (res.data.length > 0)`, with `catch { /* keep demo data */ }`.
  // A seller with no notifications, and a seller whose request failed, both saw
  // the same fictional twelve.
  useEffect(() => {
    if (!seller.sellerId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await sellerApi.getNotifications(seller.sellerId);
        if (cancelled) return;
        setNotifs((res?.data ?? []).map((n: any) => ({
          id: n.id, type: n.type as NotifType,
          title: n.title, desc: n.body, time: n.createdAt,
          read: n.read, actionUrl: n.actionUrl,
        })));
        setLoadError(null);
      } catch (e: unknown) {
        if (cancelled) return;
        setNotifs([]);
        setLoadError(e instanceof Error ? e.message : 'Could not load your notifications.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [seller.sellerId]);

  // Merge incoming socket notifications
  useEffect(() => {
    if (socket.adminNotifications.length > 0) {
      const latest = socket.adminNotifications[0];
      setNotifs(prev => {
        if (prev.some(n => n.id === (latest as any).id)) return prev;
        return [{
          id: (latest as any).id || `socket-${Date.now()}`,
          type: ((latest as any).type || 'system') as NotifType,
          title: (latest as any).title || 'New Notification',
          desc: (latest as any).body || (latest as any).message || '',
          time: 'Just now', read: false,
        }, ...prev];
      });
    }
  }, [socket.adminNotifications]);

  const unreadCount = notifs.filter(n => !n.read).length;

  const filtered = notifs.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const markAllRead = async () => {
    socket.markAllRead();
    try { await sellerApi.markAllNotificationsRead(seller.sellerId); } catch {}
    setNotifs(p => p.map(n => ({ ...n, read: true })));
  };
  const markRead = async (id: string) => {
    try { await sellerApi.markNotificationRead(seller.sellerId, id); } catch {}
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const deleteNotif = (id: string) => setNotifs(p => p.filter(n => n.id !== id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900">Notifications</h1><p className="text-sm text-slate-500 mt-0.5">{unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}</p></div>
        {unreadCount > 0 && <button onClick={markAllRead} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50"><Check className="w-3 h-3" />Mark All Read</button>}
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([['all', 'All'], ['unread', 'Unread'], ['order', 'Orders'], ['return', 'Returns'], ['payout', 'Payouts'], ['admin', 'Admin'], ['review', 'Reviews'], ['stock', 'Stock'], ['campaign', 'Campaigns']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k as typeof filter)}
            className={`px-3 py-2 text-xs font-bold rounded-lg border whitespace-nowrap transition-colors ${filter === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
            {l} {k === 'unread' && unreadCount > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <SellerLoading label="Loading notifications…" />
        ) : loadError ? (
          <SellerError message={loadError} />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center"><Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">No notifications</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(n => {
              const { icon: Icon, bg } = ICONS[n.type];
              return (
                <div key={n.id} onClick={() => markRead(n.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => markRead(n.id))}
                  className={`flex items-start gap-3 px-5 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}><Icon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!n.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }} className="p-1 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" /></button>
                </div>
              );
            })}
          </div>
        )}
        {filtered.length > 0 && <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-400">{filtered.length} notifications</div>}
      </div>
    </div>
  );
}
