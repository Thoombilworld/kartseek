'use client';
import { SellerRoleGuard } from '@/components/shared/seller-role-guard';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, BedDouble, CalendarCheck, DollarSign,
  Tag, Star, FileCheck, Users, MessageCircle, BarChart3,
  Menu, X, Hotel, LogOut, Bell, Trophy, CheckCheck,
  Sparkles, UserCheck, Settings,
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const NAV: { href: string; label: string; icon: typeof LayoutDashboard; children?: { href: string; label: string }[] }[] = [
  { href: '/hotel-owner', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/hotel-owner/properties', label: 'Properties', icon: Building2, children: [
    { href: '/hotel-owner/properties/add', label: 'Add Property' },
  ] },
  { href: '/hotel-owner/photos', label: 'Photos', icon: CheckCheck },
  { href: '/hotel-owner/rooms', label: 'Rooms', icon: BedDouble, children: [
    { href: '/hotel-owner/rooms/add', label: 'Add Room Type' },
    { href: '/hotel-owner/rooms/inventory', label: 'Inventory' },
  ] },
  { href: '/hotel-owner/pricing', label: 'Pricing', icon: Tag, children: [
    { href: '/hotel-owner/pricing/rate-plans', label: 'Rate Plans' },
  ] },
  { href: '/hotel-owner/bookings', label: 'Bookings', icon: CalendarCheck, children: [
    { href: '/hotel-owner/bookings/calendar', label: 'Calendar' },
    { href: '/hotel-owner/bookings/refunds', label: 'Refunds' },
  ] },
  { href: '/hotel-owner/finance', label: 'Finance', icon: DollarSign, children: [
    { href: '/hotel-owner/finance/payouts', label: 'Payouts' },
    { href: '/hotel-owner/finance/invoices', label: 'Invoices' },
  ] },
  { href: '/hotel-owner/reviews', label: 'Reviews', icon: Star },
  { href: '/hotel-owner/loyalty', label: 'Loyalty', icon: Trophy },
  { href: '/hotel-owner/documents', label: 'Documents', icon: FileCheck },
  { href: '/hotel-owner/staff', label: 'Staff', icon: Users, children: [
    { href: '/hotel-owner/staff/add', label: 'Add Staff' },
  ] },
  { href: '/hotel-owner/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/hotel-owner/housekeeping', label: 'Housekeeping', icon: Sparkles },
  { href: '/hotel-owner/guests', label: 'Guests', icon: UserCheck },
  { href: '/hotel-owner/messages', label: 'Messages', icon: MessageCircle },
  { href: '/hotel-owner/support', label: 'Support', icon: MessageCircle, children: [
    { href: '/hotel-owner/support/live-chat', label: 'Live Chat' },
  ] },
  { href: '/hotel-owner/settings', label: 'Settings', icon: Settings },
];

const INITIAL_NOTIFICATIONS = [
  { id: '1', text: 'New booking HBK-006 — Sarah K., Deluxe King, Jul 10–12', time: '2m ago', unread: true },
  { id: '2', text: 'Guest John D. checked in to Executive Suite (Room 405)', time: '15m ago', unread: true },
  { id: '3', text: 'Payout of AED 45,000 has been processed to your bank', time: '1h ago', unread: true },
  { id: '4', text: 'New 5-star review from Maria L. — "Perfect in every way"', time: '3h ago', unread: false },
  { id: '5', text: 'Executive Suite inventory low — only 1 room available', time: '5h ago', unread: false },
];

export default function HotelOwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // The sign-in page cannot sit behind the guard that sends people to it: the
  // guard redirects an unauthenticated visitor to this module's login, so wrapping
  // the login itself left it redirecting to itself and stuck on the loader — hotel
  // owners had no way in at all. Matches how the pharmacy and doctor layouts
  // exclude their own auth pages.
  if (pathname.startsWith('/hotel-owner/login') || pathname.startsWith('/hotel-owner/register')) {
    return <>{children}</>;
  }

  return (
    <SellerRoleGuard allowed="hotel">
      <div className="min-h-screen bg-slate-50 flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-slate-800">
          <Link href="/hotel-owner" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-rose-500 rounded-xl flex items-center justify-center">
              <Hotel className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-lg">KARTSEEK</span>
              <span className="ml-1 text-xs font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-md">HOTEL OWNER</span>
            </div>
          </Link>
        </div>
        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {NAV.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isSectionActive = pathname.startsWith(item.href) && item.href !== '/hotel-owner';
            return (
              <div key={item.href}>
                <Link href={item.href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive || isSectionActive ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}>
                  <Icon className="w-4 h-4" /> {item.label}
                </Link>
                {item.children && isSectionActive && (
                  <div className="ml-6 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
                    {item.children.map(child => (
                      <Link key={child.href} href={child.href} onClick={() => setSidebarOpen(false)}
                        className={`block px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          pathname === child.href ? 'text-rose-300 bg-slate-800' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                        }`}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-xs font-bold">AM</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-bold text-white truncate">Ahmed Al Maktoum</p><p className="text-xs text-slate-400 truncate">Grand Palace Hotel</p></div>
            <Link href="/" className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"><LogOut className="w-4 h-4" /></Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 3xl:ml-72">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 rounded-xl hover:bg-slate-100" title="Toggle menu">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h2 className="text-lg font-bold text-slate-900 hidden md:block">Hotel Owner Portal</h2>
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                title="Notifications"
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-xl hover:bg-slate-100 relative transition-colors"
              >
                <Bell className="w-5 h-5 text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1">
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${n.unread ? 'bg-rose-50/40' : ''}`}>
                        <div className="flex items-start gap-3">
                          {n.unread && <span className="w-2 h-2 bg-rose-500 rounded-full mt-1.5 shrink-0" />}
                          <div className={n.unread ? '' : 'ml-5'}>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">{n.text}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                    <p className="text-center text-xs text-slate-400">You&apos;re all caught up!</p>
                  </div>
                </div>
              )}
            </div>
            <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-700">← Super App</Link>
          </div>
        </header>
        <main id="main-content" className="p-3 xs:p-4 md:p-6 3xl:p-8 safe-bottom">{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} ><DismissOnEscape onDismiss={() => setSidebarOpen(false)} /></div>}
      </div>
    </SellerRoleGuard>
  );
}