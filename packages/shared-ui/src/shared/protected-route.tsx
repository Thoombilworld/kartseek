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
      router.replace('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated) {
    return <FullPageLoader message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <FullPageLoader message="Redirecting to login..." />;
  }

  return <>{children}</>;
}
