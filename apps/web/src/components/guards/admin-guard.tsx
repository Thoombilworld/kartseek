'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { isStaffRole } from '@/auth/staff-roles';

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
 *
 * The check used to be `hasRole('SUPER_ADMIN')`, which only ever matched the
 * one role every admin login used to be stamped with. Once the console started
 * carrying a signed-in account's real role (ADMIN, SUPPORT_AGENT, ...), that
 * check turned into a regression: a correctly signed-in regional admin passed
 * the shell's own guard and then bounced straight back out on every one of the
 * 105 pages under here.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, isHydrated } = useAuth();

  const authorized = isAuthenticated && isStaffRole(user?.role);

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
