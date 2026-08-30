'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileCheck, UtensilsCrossed, ShoppingCart,
  CalendarDays, ShoppingBag, Bike, Percent, BarChart3, Globe,
  AlertTriangle, Megaphone, MapPin, CheckSquare, TrendingUp,
} from 'lucide-react';
import { useRestaurantRegionFilter } from '@/hooks/useRestaurantRegionFilter';

const NAV_ITEMS = [
  // Overview
  { href: '/admin/restaurant', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/restaurant/analytics', label: 'Analytics', icon: TrendingUp },
  // Approvals
  { href: '/admin/restaurant/approvals', label: 'Approvals', icon: FileCheck },
  { href: '/admin/restaurant/menu-approvals', label: 'Menu Review', icon: CheckSquare },
  // Catalog
  { href: '/admin/restaurant/cuisines', label: 'Cuisines', icon: UtensilsCrossed },
  // Orders
  { href: '/admin/restaurant/orders', label: 'Delivery Orders', icon: Bike },
  { href: '/admin/restaurant/takeaway-orders', label: 'Takeaway', icon: ShoppingBag },
  { href: '/admin/restaurant/dine-in-orders', label: 'Dine-In', icon: ShoppingCart },
  { href: '/admin/restaurant/table-bookings', label: 'Table Bookings', icon: CalendarDays },
  // Operations
  { href: '/admin/restaurant/zones', label: 'Delivery Zones', icon: MapPin },
  { href: '/admin/restaurant/complaints', label: 'Complaints', icon: AlertTriangle },
  // Finance & Marketing
  { href: '/admin/restaurant/commissions', label: 'Commissions', icon: Percent },
  { href: '/admin/restaurant/promotions', label: 'Promotions', icon: Megaphone },
  // Content
  { href: '/admin/restaurant/landing-editor', label: 'Landing Page', icon: Globe },
];

export default function RestaurantAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { regionLabel, isFiltered, countryFlag, currencySymbol } = useRestaurantRegionFilter([]);

  return (
    <div className="flex flex-col">
      {/* Sub-Navigation — Pharmacy-style horizontal tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-0.5 overflow-x-auto py-1 scrollbar-thin">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href
                || (item.href !== '/admin/restaurant' && pathname.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    isActive ? 'bg-orange-50 text-orange-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {/* Region Indicator Bar */}
      {isFiltered && (
        <div className="bg-linear-to-r from-orange-500 to-amber-500 text-white px-4 py-1.5">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs font-semibold">
            <span className="text-base">{countryFlag}</span>
            <span>Restaurant filtered to <strong>{regionLabel}</strong></span>
            <span className="ml-auto bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold">{currencySymbol}</span>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </div>
    </div>
  );
}
