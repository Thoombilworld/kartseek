import React from 'react';
import type { Metadata } from 'next';
import { Stethoscope, Calendar, Search, MapPin, User, HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { moduleMeta } from '@/lib/seo/metadata';
import { AccountMenu } from '@/components/shared/account-menu';

// ── SEO: Dynamic Metadata ───────────────────────────────────────────────────
export const metadata: Metadata = moduleMeta('doctor');

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen module-surface-doctor flex flex-col">
      <header className="module-header-doctor sticky top-0 z-50">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/doctor" className="flex items-center gap-2.5">
            <div className="module-icon-badge">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              KARTSEEK
              <span className="font-light opacity-80 ml-1">Health</span>
            </h1>
          </Link>

          {/* Desktop Search */}
          <div className="flex-1 max-w-2xl px-8 hidden md:flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search doctors, specialties, hospitals..."
                className="module-search-input"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-[0.65rem] pointer-events-none" />
            </div>
            <div className="relative w-1/3">
              <input
                type="text"
                placeholder="Location..."
                className="module-search-input"
              />
              <MapPin className="w-4 h-4 text-indigo-200 absolute left-3 top-[0.65rem] pointer-events-none" />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            <Link
              href="/doctor/appointments"
              className="module-nav-btn hidden md:flex"
            >
              <Calendar className="w-4.5 h-4.5" />
              Appointments
            </Link>
            {/* Carries this module's sign-out control — see AccountMenu. */}
            <AccountMenu className="module-nav-btn hidden md:flex" />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 w-full pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden module-bottom-nav" style={{ '--module-active-color': 'var(--doctor-primary)' } as React.CSSProperties}>
        <Link href="/doctor" className="active flex flex-col items-center">
          <HeartPulse className="w-5 h-5 mb-0.5" />
          <span>Health</span>
        </Link>
        <Link href="/doctor#specialties-section" className="flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] text-slate-400 hover:text-indigo-600 transition-colors">
          <Search className="w-5 h-5 mb-0.5" />
          <span>Search</span>
        </Link>
        <Link href="/doctor/appointments" className="flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] text-slate-400 hover:text-indigo-600 transition-colors">
          <Calendar className="w-5 h-5 mb-0.5" />
          <span>Bookings</span>
        </Link>
        <Link href="/doctor/my-profile" className="flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] text-slate-400 hover:text-indigo-600 transition-colors">
          <User className="w-5 h-5 mb-0.5" />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
