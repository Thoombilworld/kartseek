'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogOut, Package, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';

/**
 * Account control for storefront headers.
 *
 * Signing out used to be reachable only from inside `/profile` — the one header
 * component that carried a "Sign Out" button was never rendered anywhere — so a
 * customer browsing the shop had no way to end their session. This is deliberately
 * self-contained and colour-inheriting so it can drop into any module header.
 *
 * `logout()` clears this browser and calls the gateway, which blacklists the
 * token; every module and service rejects it from that moment.
 */
export function AccountMenu({ className = '' }: { className?: string }) {
  const { isAuthenticated, isHydrated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click and on Escape — a dropdown pinned open over the page
  // is worse than no dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    router.push('/');
  };

  // Until auth has hydrated from localStorage, render the signed-out control:
  // it matches what the server rendered, so there is no hydration mismatch.
  if (!isHydrated || !isAuthenticated) {
    return (
      <Link
        href="/auth/login"
        className={`flex flex-col items-center p-1.5 transition-colors hover:opacity-80 ${className}`}
        title="Sign in"
      >
        <User className="w-5 h-5" />
        <span className="text-[9px] mt-0.5 font-medium">Sign in</span>
      </Link>
    );
  }

  const label = user?.name?.split(' ')[0] || 'Account';

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex flex-col items-center p-1.5 transition-colors hover:opacity-80"
        title={user?.email || 'Account'}
      >
        <span className="flex items-center gap-0.5">
          <User className="w-5 h-5" />
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
        <span className="text-[9px] mt-0.5 font-medium max-w-[64px] truncate">{label}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-60 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-1.5 z-50"
        >
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="font-bold truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>

          <Link href="/profile" role="menuitem" onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors">
            <User className="w-4 h-4 text-slate-500" /> My Account
          </Link>
          <Link href="/profile/orders" role="menuitem" onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors">
            <Package className="w-4 h-4 text-slate-500" /> Orders &amp; Bookings
          </Link>
          <Link href="/profile/security" role="menuitem" onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors">
            <Settings className="w-4 h-4 text-slate-500" /> Security Settings
          </Link>

          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
