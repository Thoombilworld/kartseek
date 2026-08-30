'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, Package, ShoppingCart, Tag, Image, Percent, Settings, Award, Gift, RotateCcw, BarChart3, Globe, ChevronLeft, ChevronRight, Paintbrush, Zap } from 'lucide-react';
import { useRegion, REGIONS } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';

const NAV_ITEMS = [
  { href: '/admin/grocery', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/grocery/stores', label: 'Stores', icon: Store },
  { href: '/admin/grocery/products', label: 'Products', icon: Package },
  { href: '/admin/grocery/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/grocery/categories', label: 'Categories', icon: Tag },
  { href: '/admin/grocery/brands', label: 'Brands', icon: Award },
  { href: '/admin/grocery/offers', label: 'Offers', icon: Gift },
  { href: '/admin/grocery/flash-deals', label: 'Flash Deals', icon: Zap },
  { href: '/admin/grocery/refunds', label: 'Refunds', icon: RotateCcw },
  { href: '/admin/grocery/banners', label: 'Banners', icon: Image },
  { href: '/admin/grocery/page-builder', label: 'Page Builder', icon: Paintbrush },
  { href: '/admin/grocery/commissions', label: 'Commissions', icon: Percent },
  { href: '/admin/grocery/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/grocery/countries', label: 'Countries', icon: Globe },
  { href: '/admin/grocery/settings', label: 'Settings', icon: Settings },
];

export default function GroceryAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { selectedRegion } = useRegion();
  const isFiltered = selectedRegion !== 'ALL';
  const regionConfig = isFiltered ? REGIONS[selectedRegion] : null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      const ro = new ResizeObserver(checkScroll);
      ro.observe(el);
      return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
    }
  }, []);

  // Auto-scroll the active tab into view on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeLink = el.querySelector('[data-active="true"]') as HTMLElement | null;
    if (activeLink) {
      activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [pathname]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col">
      {/* Sub-Navigation with scroll arrows */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 relative">
          {/* Left fade + arrow */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
              <div className="w-12 h-full bg-linear-to-r from-white via-white/90 to-transparent flex items-center pl-1">
                <button
                  onClick={() => scroll('left')}
                  className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}

          {/* Right fade + arrow */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center">
              <div className="w-12 h-full bg-linear-to-l from-white via-white/90 to-transparent flex items-center justify-end pr-1">
                <button
                  onClick={() => scroll('right')}
                  className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}

          {/* Scrollable nav container */}
          <nav
            ref={scrollRef}
            className="flex gap-0.5 overflow-x-auto py-1 scrollbar-none"
          >
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={isActive}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    isActive ? 'bg-green-50 text-green-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
      {isFiltered && regionConfig && (
        <div className="bg-linear-to-r from-green-50 to-emerald-50 border-b border-green-200/60">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
            <CountryFlag code={selectedRegion} size="md" />
            <span className="text-xs font-bold text-green-800">
              Grocery filtered to {regionConfig.name}
            </span>
            <span className="text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-bold">
              {regionConfig.currencyCode}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </div>
    </div>
  );
}
