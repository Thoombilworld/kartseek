'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Truck, MapPin, Users, BarChart3, Package,
  Bell, Settings, LogOut, Menu, X, ChevronRight, Navigation,
  Clock, CheckCircle, AlertCircle, Zap,
} from 'lucide-react';
import { SellerRoleGuard } from '@/components/shared/seller-role-guard';
import { useAuth } from '@/lib/contexts/auth-context';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const NAV_ITEMS = [
  { href: '/seller/delivery', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller/delivery/orders', label: 'Delivery Orders', icon: Package, badge: '8' },
  { href: '/seller/delivery/handover', label: 'Handover Requests', icon: Zap, badge: '3' },
  { href: '/seller/delivery/tracking', label: 'Live Tracking', icon: Navigation },
  { href: '/seller/delivery/partners', label: 'Delivery Partners', icon: Users },
  { href: '/seller/delivery/zones', label: 'Zones & Routes', icon: MapPin },
  { href: '/seller/delivery/reports', label: 'Reports', icon: BarChart3 },
  { href: '/seller/delivery/settings', label: 'Settings', icon: Settings },
];

const MOCK_NOTIFICATIONS = [
  { id: '1', text: 'Delivery #DLV-4821 completed', time: '3m ago', unread: true },
  { id: '2', text: '3 handover requests pending', time: '8m ago', unread: true },
  { id: '3', text: 'Partner Ravi Kumar is now online', time: '22m ago', unread: false },
];

export default function DeliveryPartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SellerRoleGuard allowed="delivery">
      <DeliveryLayoutInner>{children}</DeliveryLayoutInner>
    </SellerRoleGuard>
  );
}

function DeliveryLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="w-[240px] bg-white border-r border-slate-200 hidden lg:flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-2.5">
          <div className="w-9 h-9 bg-linear-to-br from-cyan-500 to-sky-600 rounded-xl flex items-center justify-center shadow-sm">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-sm text-slate-900 leading-tight">KARTSEEK</h1>
            <p className="text-[9px] font-bold text-cyan-600 uppercase tracking-[0.15em]">Delivery Partner</p>
          </div>
        </div>

        {/* Region badge */}
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-cyan-50 rounded-lg">
            <span className="text-xs font-bold text-cyan-700">
              {user?.regionCode ?? 'IN'} Portal
            </span>
            <span className="ml-auto w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
          </div>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all mb-0.5 ${
                  active
                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${active ? 'text-cyan-600' : 'text-slate-400'}`} />
                <span className="flex-1">{item.label}</span>
                {'badge' in item && item.badge && (
                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl mb-1">
            <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-700 text-xs font-black">
              {user?.name?.charAt(0) ?? 'D'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name ?? 'Delivery Partner'}</p>
              <p className="text-[10px] text-slate-400">{user?.regionCode ?? 'IN'} · Delivery</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-600 hover:bg-red-50 font-medium transition-colors"
            type="button"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} ><DismissOnEscape onDismiss={() => setMobileOpen(false)} /></div>
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-[260px] bg-white z-50 shadow-2xl flex flex-col">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
              <span className="font-black text-slate-900">Delivery Portal</span>
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100" aria-label="Close">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <nav className="flex-1 py-2 overflow-y-auto">
              {NAV_ITEMS.map(item => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-semibold mb-0.5 ${active ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Icon className="w-5 h-5" />
                    <span className="flex-1">{item.label}</span>
                    {'badge' in item && item.badge && (
                      <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100" aria-label="Menu">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="hidden md:flex items-center gap-1 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Delivery Portal</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-bold text-slate-900">
                {NAV_ITEMS.find(n => isActive(n.href))?.label ?? 'Dashboard'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setNotifOpen(n => !n)} className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100" aria-label="Notifications">
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">
                  {MOCK_NOTIFICATIONS.filter(n => n.unread).length}
                </span>
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-100"><h3 className="text-sm font-black text-slate-900">Notifications</h3></div>
                  {MOCK_NOTIFICATIONS.map(n => (
                    <div key={n.id} className={`px-3 py-2.5 flex items-start gap-2 border-b border-slate-50 hover:bg-slate-50 ${n.unread ? 'bg-cyan-50/40' : ''}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${n.unread ? 'bg-cyan-500' : 'bg-slate-300'}`} />
                      <div><p className="text-xs font-semibold text-slate-800">{n.text}</p><p className="text-[10px] text-slate-400">{n.time}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
              {user?.name?.charAt(0) ?? 'D'}
            </div>
          </div>
        </header>
        <main id="main-content" className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
