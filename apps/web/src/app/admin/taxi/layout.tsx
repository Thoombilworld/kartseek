'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Car, Settings2, DollarSign, Building2, Users,
  Truck, Shield, CreditCard, AlertOctagon, Scale, Globe,
  Navigation, Calendar, Zap, Landmark, CarFront, Route, Warehouse,
} from 'lucide-react';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';

const NAV_ITEMS = [
  { href: '/admin/taxi', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/taxi/rides', label: 'Rides', icon: Navigation },
  { href: '/admin/taxi/scheduled', label: 'Scheduled', icon: Calendar },
  { href: '/admin/taxi/rentals', label: 'Rentals', icon: CarFront },
  { href: '/admin/taxi/intercity', label: 'Intercity', icon: Route },
  { href: '/admin/taxi/routes', label: 'Routes', icon: Globe },
  { href: '/admin/taxi/rental-fleet', label: 'Rental Fleet', icon: Warehouse },
  { href: '/admin/taxi/settings', label: 'Settings', icon: Settings2 },
  { href: '/admin/taxi/pricing', label: 'Pricing', icon: DollarSign },
  { href: '/admin/taxi/surge', label: 'Surge', icon: Zap },
  { href: '/admin/taxi/vendors', label: 'Vendors', icon: Building2 },
  { href: '/admin/taxi/drivers', label: 'Drivers', icon: Users },
  { href: '/admin/taxi/fleet', label: 'Fleet', icon: Truck },
  { href: '/admin/taxi/pending-approvals', label: 'Approvals', icon: Shield },
  { href: '/admin/taxi/payouts', label: 'Payouts', icon: CreditCard },
  { href: '/admin/taxi/reconciliation', label: 'Reconciliation', icon: Landmark },
  { href: '/admin/taxi/complaints', label: 'Complaints', icon: AlertOctagon },
  { href: '/admin/taxi/compliance', label: 'Compliance', icon: Scale },
  { href: '/admin/taxi/landing-editor', label: 'Landing', icon: Globe },
];

export default function TaxiAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { regionLabel, isFiltered, countryFlag, currencySymbol } = useTaxiRegionFilter([]);

  return (
    <div className="flex flex-col">
      {/* Sub-Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-0.5 overflow-x-auto py-1 scrollbar-thin">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href
                || (item.href !== '/admin/taxi' && pathname.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    isActive ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
        <div className="bg-linear-to-r from-amber-500 to-yellow-500 text-white px-4 py-1.5">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs font-semibold">
            <span className="text-base">{countryFlag}</span>
            <span>Taxi & Rides filtered to <strong>{regionLabel}</strong></span>
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
