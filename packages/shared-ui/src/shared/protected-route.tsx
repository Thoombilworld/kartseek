'use client';

import React from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { FullPageLoader } from '@/components/kartseek-loader';

/**
 * Wraps a page that requires authentication.
 * Redirects to /auth/login if not authenticated after hydration.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      // The sign-in page belongs to the shell, and this component renders inside
      // all eight zones. router.replace would prepend the zone's basePath and
      // send a signed-out pharmacy visitor to /pharmacy/auth/login, which does
      // not exist. window.location is not rewritten, and crossing into another
      // application is a document request in any case.
      //
      // window.location.pathname already carries the basePath, so the redirect
      // target is the full public path the shell can route back to.
      window.location.assign('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
    }
  }, [isHydrated, isAuthenticated]);

  if (!isHydrated) {
    return <FullPageLoader message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <FullPageLoader message="Redirecting to login..." />;
  }

  return <>{children}</>;
}
