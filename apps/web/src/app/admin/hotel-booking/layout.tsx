'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, BedDouble, CalendarCheck, FileCheck,
  DollarSign, Gift, RotateCcw, Percent, Wallet, Receipt, Star,
  MessageCircle, BarChart3, Settings, Tag,
} from 'lucide-react';
import '@/styles/hotel-booking.css';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';

const NAV_ITEMS = [
  { href: '/admin/hotel-booking', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/hotel-booking/hotels', label: 'Hotels', icon: Building2 },
  { href: '/admin/hotel-booking/rooms', label: 'Rooms', icon: BedDouble },
  { href: '/admin/hotel-booking/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/admin/hotel-booking/verifications', label: 'Verifications', icon: FileCheck },
  { href: '/admin/hotel-booking/pricing', label: 'Pricing', icon: Tag },
  { href: '/admin/hotel-booking/offers', label: 'Offers', icon: Gift },
  { href: '/admin/hotel-booking/refunds', label: 'Refunds', icon: RotateCcw },
  { href: '/admin/hotel-booking/commissions', label: 'Commissions', icon: Percent },
  { href: '/admin/hotel-booking/settlements', label: 'Settlements', icon: Wallet },
  { href: '/admin/hotel-booking/tax', label: 'Tax', icon: Receipt },
  { href: '/admin/hotel-booking/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/hotel-booking/loyalty', label: 'Loyalty', icon: Gift },
  { href: '/admin/hotel-booking/complaints', label: 'Complaints', icon: MessageCircle },
  { href: '/admin/hotel-booking/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/hotel-booking/settings', label: 'Settings', icon: Settings },
];

export default function HotelBookingAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { regionLabel, isFiltered, countryFlag, currencySymbol } = useHotelRegionFilter([]);

  return (
    <div className="flex flex-col">
      {/* Sub-Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-0.5 overflow-x-auto py-1 hotel-nav-scroll">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    isActive ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
        <div className="bg-linear-to-r from-rose-500 to-pink-500 text-white px-4 py-1.5">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs font-semibold">
            <span className="text-base">{countryFlag}</span>
            <span>Hotel Booking filtered to <strong>{regionLabel}</strong></span>
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

