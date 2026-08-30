'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api-endpoints';
import { useAuth, toAuthUser, SELLER_DASHBOARDS } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';

/**
 * The one sign-in path every seller portal uses.
 *
 * Each portal previously had its own copy: five of them never called `login()` at
 * all — they just pushed to a dashboard after a `setTimeout`, so the guard bounced
 * the seller straight back — and the hub let the seller pick their own module from
 * a dropdown, which is what made portal isolation meaningless.
 *
 * The destination now comes from the token's `sellerType`, never from the page the
 * seller happened to start on. A pharmacy seller who signs in on the grocery login
 * lands on the pharmacy dashboard: they authenticated correctly, so the useful
 * thing is to take them where they belong.
 */
export function useSellerLogin() {
  const router = useRouter();
  const { login } = useAuth();
  const { selectedRegion } = useRegion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = useCallback(async (email: string, password: string) => {
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return false;
    }

    setLoading(true);
    try {
      const session = await authApi.login(email.trim(), password);
      const regionCode = selectedRegion === 'ALL' ? undefined : selectedRegion;
      const user = toAuthUser(session.user, regionCode);

      // A customer account must not open a seller portal, and a seller with no
      // module cannot be placed in one. Both are refused here rather than being
      // signed in and bounced by the guard a moment later.
      if (user.role !== 'SELLER') {
        setError('This is not a seller account. Use the customer sign-in instead.');
        setLoading(false);
        return false;
      }
      if (!user.sellerType) {
        setError('This seller account is not assigned to a portal yet. Please contact support.');
        setLoading(false);
        return false;
      }

      login(user, session.accessToken, session.refreshToken);
      // A seller whose registration has not been approved yet is signed in, but
      // sent to watch their application rather than into a portal they cannot use.
      router.push(user.sellerApproved
        ? SELLER_DASHBOARDS[user.sellerType]
        : '/seller/approval-status');
      return true;
    } catch (err) {
      // The gateway's wording carries the remaining attempts and lockout detail.
      if (err instanceof ApiError) {
        setError(err.status >= 500
          ? 'We could not reach the sign-in service. Please try again in a moment.'
          : err.message || 'Sign-in failed. Please try again.');
      } else {
        setError('We could not reach the sign-in service. Check your connection.');
      }
      setLoading(false);
      return false;
    }
  }, [login, router, selectedRegion]);

  return { signIn, loading, error, setError };
}
