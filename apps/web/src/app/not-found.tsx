import React from 'react';
import Link from 'next/link';
import { Search, Home, ShoppingBag, UtensilsCrossed, Stethoscope, Car } from 'lucide-react';

/**
 * Global 404 page — shown when a user navigates to a non-existent route.
 * Provides quick links to all major modules for recovery.
 * This is a Server Component for maximum performance (no JS bundle).
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 Badge */}
        <div className="inline-flex items-center justify-center w-28 h-28 bg-linear-to-br from-blue-600 to-indigo-600 rounded-[2rem] mb-6 shadow-xl shadow-blue-200/40">
          <span className="text-4xl font-black text-white tracking-tighter">404</span>
        </div>

        <h1 className="text-3xl font-black text-slate-900 mb-3">
          Page not found
        </h1>
        <p className="text-slate-500 text-sm mb-10 leading-relaxed max-w-sm mx-auto">
          The page you are looking for does not exist or has been moved.
          Try one of the links below to get back on track.
        </p>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            { href: '/marketplace', icon: ShoppingBag, label: 'Marketplace', color: 'bg-violet-50 text-violet-600' },
            { href: '/restaurant', icon: UtensilsCrossed, label: 'Restaurants', color: 'bg-orange-50 text-orange-600' },
            { href: '/grocery', icon: ShoppingBag, label: 'Grocery', color: 'bg-emerald-50 text-emerald-600' },
            { href: '/doctor', icon: Stethoscope, label: 'Doctors', color: 'bg-blue-50 text-blue-600' },
            { href: '/taxi', icon: Car, label: 'Taxi', color: 'bg-amber-50 text-amber-600' },
            { href: '/search', icon: Search, label: 'Search', color: 'bg-slate-100 text-slate-600' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-700">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Home Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3 rounded-xl transition-colors shadow-sm"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
