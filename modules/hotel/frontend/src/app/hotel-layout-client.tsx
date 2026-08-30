'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Hotel, ArrowLeft, Bell, User, MapPin, ChevronDown, Check, CalendarCheck, Tag } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import type { SupportedCountryCode } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';

export default function HotelBookingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { selectedRegion, setSelectedRegion, currentRegionConfig, allRegions } = useRegion();
  const [locationOpen, setLocationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayCity = currentRegionConfig?.defaultCity || 'Select Location';
  // Flag display handled by CountryFlag component
  const displayCode = currentRegionConfig?.code || '';

  return (
    <div className="min-h-screen module-surface-hotel">
      {/* Header */}
      <header className="sticky top-0 z-50 module-header-hotel">
        <nav className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 py-3 flex items-center justify-between" role="navigation" aria-label="Hotel booking navigation">
          {/* Left: Back + Logo */}
          {/* The brand lockup is the flexible half of this bar: it shrinks and
              truncates so the action buttons on the right, which are the
              functional half, always fit. At 320px the untruncated lockup plus
              the actions measured wider than the viewport, and the header
              pushed the whole page into horizontal scroll. */}
          <div className="flex items-center gap-2 xs:gap-3 min-w-0">
            {!isHome && (
              <Link href="/" className="p-2 rounded-xl hover:bg-slate-100 transition-colors" aria-label="Back to hotel booking home">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
            )}
            <Link href="/" className="flex items-center gap-2 xs:gap-2.5 min-w-0" aria-label="KARTSEEK Hotels home">
              <div className="module-icon-badge shrink-0">
                <Hotel className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex items-center">
                <span className="font-black text-base xs:text-lg text-white truncate">KARTSEEK</span>
                <span className="ml-1.5 text-xs font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-md border border-white/30 hidden xs:inline shrink-0">HOTELS</span>
              </div>
            </Link>
          </div>

          {/* Right: Location + My Bookings + Notifications + Profile */}
          <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
            {/* Location Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setLocationOpen(!locationOpen)}
                className="flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-sm text-white font-semibold"
                aria-haspopup="listbox"
                aria-label={`Current location: ${displayCity}. Click to change.`}
              >
                <MapPin className="w-4 h-4 text-rose-200" />
                {displayCode ? <CountryFlag code={displayCode} size="md" /> : <span className="text-lg leading-none" aria-hidden="true">🌍</span>}
                <span className="font-semibold text-white hidden sm:inline max-w-[100px] truncate">{displayCity}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${locationOpen ? 'rotate-180' : ''}`} />
              </button>

              {locationOpen && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50" role="menu" aria-label="Select country">
                  <p className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Select Country</p>
                  {allRegions.map(r => {
                    const isActive = selectedRegion === r.code;
                    return (
                      <button
                        key={r.code}
                        role="menuitem"
                        onClick={() => { setSelectedRegion(r.code as SupportedCountryCode); setLocationOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isActive ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <CountryFlag code={r.code} size="md" />
                        <div className="flex-1 text-left">
                          <span className="font-semibold">{r.name}</span>
                          <span className="text-xs text-slate-400 ml-1.5">{r.defaultCity}</span>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-rose-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Secondary action: dropped below `xs` so the primary ones fit.
                Deals are reachable from the hotel home page. */}
            <Link
              href="/deals"
              className="module-nav-btn hidden xs:flex"
              title="Deals & Offers"
              aria-label="Deals & Offers"
            >
              <Tag className="w-5 h-5" />
            </Link>

            {/* My Bookings */}
            <Link
              href="/hotel-bookings"
              className="module-nav-btn"
              title="My Bookings"
              aria-label="My Bookings"
            >
              <CalendarCheck className="w-5 h-5" />
            </Link>

            {/* Notifications */}
            <Link
              href="/notifications"
              className="module-nav-btn relative hidden xs:flex"
              title="Notifications"
              aria-label="Notifications (3 unread)"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" aria-hidden="true" />
            </Link>

            {/* Profile */}
            <Link
              href="/profile"
              className="module-nav-btn"
              title="Hotels profile"
              aria-label="Hotels profile"
            >
              <User className="w-5 h-5" />
            </Link>
          </div>
        </nav>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
