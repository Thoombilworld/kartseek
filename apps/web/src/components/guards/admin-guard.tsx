'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';

/**
 * Route guard for the admin marketplace console.
 *
 * This used to gate on `localStorage.getItem('kartseek_admin_token')` — a key
 * nothing in the app has ever written. `AuthProvider` stores the session under
 * `kartseek_token` / `kartseek_user`, so the lookup was permanently `null` and
 * every one of the 105 pages under `/admin/marketplace` bounced a correctly
 * signed-in SUPER_ADMIN straight back to `/admin/login`. The console was
 * unreachable.
 *
 * It now asks the auth context the same question `app/admin/layout.tsx` asks, so
 * the two cannot disagree. `isHydrated` matters: `AuthProvider` restores the
 * session in an effect, so on the first render nobody is authenticated yet and
 * redirecting there would log out every direct navigation and refresh.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, hasRole, isHydrated } = useAuth();

  const authorized = isAuthenticated && hasRole('SUPER_ADMIN');

  useEffect(() => {
    if (isHydrated && !authorized) router.replace('/admin/login');
  }, [isHydrated, authorized, router]);

  if (!isHydrated || !authorized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        Authenticating...
      </div>
    );
  }

  return <>{children}</>;
}
