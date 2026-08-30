'use client';
import React, { useState } from 'react';
import { AccountMenu } from '@/components/shared/account-menu';
import Link from 'next/link';
import { Car, MapPin, Navigation, Clock, Menu, X, ChevronDown, User } from 'lucide-react';

const tabs = [
  { label: 'Ride', href: '/taxi' },
  { label: 'Drive', href: '/taxi/drive' },
  { label: 'Rentals', href: '/taxi/rentals' },
  { label: 'Intercity', href: '/taxi/intercity' },
];

export default function TaxiLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans">
      <header className="bg-black text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 3xl:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/taxi" className="flex items-center gap-2 shrink-0 min-h-[44px]">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              KARTSEEK<span className="text-yellow-400 font-black"> RIDES</span>
            </h1>
          </Link>

          {/* Desktop Nav Tabs.
              lg, not md: at 768–1023 the logo, four tabs and the four CTA items
              add up to more than the header's content box, so the row overflowed
              the page and gave the whole taxi module a horizontal scrollbar.
              Every one of these links is already in the slide-down menu, which
              now covers that band. */}
          <nav className="hidden lg:flex items-center gap-1">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:bg-white/10 hover:text-yellow-400"
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Carries this module's sign-out control — see AccountMenu. */}
            <AccountMenu className="text-sm font-semibold text-white hover:text-yellow-400" />
            <Link
              href="/taxi/rides"
              className="text-sm font-semibold text-white hover:text-yellow-400 transition-colors flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4" /> My Rides
            </Link>
            <Link
              href="/taxi/drive/login"
              className="text-sm font-semibold text-white hover:text-yellow-400 transition-colors"
            >
              Driver Login
            </Link>
            <Link
              href="/taxi/login"
              className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-yellow-400 transition-colors"
            >
              Log in
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden touch-target text-white rounded-lg hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Slide-down Menu */}
        {menuOpen && (
          <div className="lg:hidden bg-zinc-900 border-t border-white/10 px-4 py-4 space-y-1">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-semibold text-white hover:bg-white/10 hover:text-yellow-400 transition-colors"
              >
                {tab.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <Link
                href="/taxi/profile"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-yellow-400 flex items-center gap-2"
              >
                <User className="w-4 h-4" /> Profile
              </Link>
              <Link
                href="/taxi/rides"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-yellow-400 flex items-center gap-2"
              >
                <Clock className="w-4 h-4" /> My Rides
              </Link>
              <Link
                href="/taxi/drive/login"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-yellow-400"
              >
                Driver Login
              </Link>
              <Link
                href="/taxi/login"
                onClick={() => setMenuOpen(false)}
                className="block w-full bg-yellow-400 text-black px-4 py-3 rounded-xl text-sm font-bold text-center"
              >
                Log in as Rider
              </Link>
            </div>
          </div>
        )}
      </header>

      <main id="main-content" className="flex-1 w-full relative">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-black text-slate-400 py-8 px-4">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 3xl:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p>© 2026 KARTSEEK Rides. All rights reserved.</p>
          {/* A row of footer links is not a sentence, so the inline exception to
              the 44px target guidance does not apply — these measured 20px tall
              and, at `gap-6`, sat close enough together that a thumb hits the
              gap as often as the link. `gap` shrinks as the padding grows so the
              row keeps its width. */}
          <nav className="flex flex-wrap justify-center gap-x-2 gap-y-1" aria-label="Rides">
            <Link href="/taxi" className="inline-flex items-center px-2 min-h-[44px] hover:text-yellow-400 transition-colors">Ride</Link>
            <Link href="/taxi/drive" className="inline-flex items-center px-2 min-h-[44px] hover:text-yellow-400 transition-colors">Drive</Link>
            <Link href="/taxi/rentals" className="inline-flex items-center px-2 min-h-[44px] hover:text-yellow-400 transition-colors">Rentals</Link>
            <Link href="/taxi/intercity" className="inline-flex items-center px-2 min-h-[44px] hover:text-yellow-400 transition-colors">Intercity</Link>
            <Link href="/support" className="inline-flex items-center px-2 min-h-[44px] hover:text-yellow-400 transition-colors">Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
