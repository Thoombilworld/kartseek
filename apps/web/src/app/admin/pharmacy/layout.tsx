'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, Package, ShoppingCart, Tag, Image, Percent, Settings, BarChart3, Gift, RotateCcw, FileCheck, MessageCircle, Wallet, Receipt } from 'lucide-react';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';

const NAV_ITEMS = [
  { href: '/admin/pharmacy', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pharmacy/stores', label: 'Stores', icon: Store },
  { href: '/admin/pharmacy/products', label: 'Products', icon: Package },
  { href: '/admin/pharmacy/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/pharmacy/categories', label: 'Categories', icon: Tag },
  { href: '/admin/pharmacy/verifications', label: 'Verifications', icon: FileCheck },
  { href: '/admin/pharmacy/offers', label: 'Offers', icon: Gift },
  { href: '/admin/pharmacy/refunds', label: 'Refunds', icon: RotateCcw },
  { href: '/admin/pharmacy/banners', label: 'Banners', icon: Image },
  { href: '/admin/pharmacy/commissions', label: 'Commissions', icon: Percent },
  { href: '/admin/pharmacy/settlements', label: 'Settlements', icon: Wallet },
  { href: '/admin/pharmacy/complaints', label: 'Complaints', icon: MessageCircle },
  { href: '/admin/pharmacy/tax', label: 'Tax', icon: Receipt },
  { href: '/admin/pharmacy/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/pharmacy/settings', label: 'Settings', icon: Settings },
];


export default function PharmacyAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { regionLabel, isFiltered, countryFlag, currencySymbol } = usePharmacyRegionFilter([]);

  return (
    <div className="flex flex-col">
      {/* Sub-Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-0.5 overflow-x-auto py-1 scrollbar-thin">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    isActive ? 'bg-cyan-50 text-cyan-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
        <div className="bg-linear-to-r from-cyan-500 to-teal-500 text-white px-4 py-1.5">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs font-semibold">
            <span className="text-base">{countryFlag}</span>
            <span>Pharmacy filtered to <strong>{regionLabel}</strong></span>
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

