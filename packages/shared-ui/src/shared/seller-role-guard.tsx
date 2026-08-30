'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldX, LogOut, Home } from 'lucide-react';
import { useAuth, type SellerType, SELLER_DASHBOARDS, SELLER_LOGIN_URLS } from '@/lib/contexts/auth-context';
import { KartseekLoader } from '@/components/kartseek-loader';

interface SellerRoleGuardProps {
  /** The seller type this page tree belongs to */
  allowed: SellerType;
  children: React.ReactNode;
}

/**
 * SellerRoleGuard — wraps a module's layout to enforce:
 *   1. Authentication (must be signed in)
 *   2. A seller account (role must be SELLER)
 *   3. The right module (`sellerType` must equal `allowed`)
 *
 * All three are required. This used to admit any authenticated session that
 * carried no `sellerType` — "legacy session, treat as allowed" — and since the
 * gateway never issued one, an ordinary customer account opened all eight seller
 * portals. `sellerType` is now signed into the token, so its absence means the
 * account has no portal, not that it has every portal.
 *
 * Admins are NOT special-cased: an admin who needs to see a seller's portal
 * should get an explicit, audited impersonation path rather than a silent bypass
 * living in a module guard.
 */
export function SellerRoleGuard({ allowed, children }: SellerRoleGuardProps) {
  const { isHydrated, isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      // Send them to this module's own login rather than the generic hub, so they
      // land where they expect to sign in.
      const loginUrl = SELLER_LOGIN_URLS[allowed] ?? '/seller/login';
      router.replace(`${loginUrl}?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [isHydrated, isAuthenticated, allowed, router]);

  // While localStorage hydration is in progress, show a loader
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <KartseekLoader size="lg" message="Verifying access..." />
      </div>
    );
  }

  // Not logged in — redirect to module-specific login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <KartseekLoader size="lg" message="Redirecting to login..." />
      </div>
    );
  }

  // Signed in, but not as a seller — e.g. a customer account that navigated here.
  if (user?.role !== 'SELLER') {
    return <AccessDeniedPage ownDashboard={null} onLogout={logout} />;
  }

  // A seller with no module cannot be placed in one. Fail closed: guessing would
  // hand them somebody else's portal.
  if (!user.sellerType) {
    return <AccessDeniedPage ownDashboard={null} onLogout={logout} />;
  }

  // Wrong module — offer a way back to the portal they do own.
  if (user.sellerType !== allowed) {
    return <AccessDeniedPage ownDashboard={SELLER_DASHBOARDS[user.sellerType]} onLogout={logout} />;
  }

  // Right module, but the registration has not been approved yet. Checked here as
  // well as at sign-in so a direct URL cannot skip the approval step.
  if (user.sellerApproved === false) {
    return <AccessDeniedPage ownDashboard="/seller/approval-status" onLogout={logout} />;
  }

  return <>{children}</>;
}

// ─── Access Denied UI ─────────────────────────────────────────────────────────

function AccessDeniedPage({
  ownDashboard,
  onLogout,
}: {
  /** The portal this account does own, or null when it owns none. */
  ownDashboard: string | null;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8 text-red-600" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          {ownDashboard
            ? 'Your account is not authorised to access this portal. Each seller account is bound to a single module — please use your assigned dashboard.'
            : 'This account is not registered as a seller for any portal. If you believe that is wrong, contact support and sign in with your seller account.'}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href={ownDashboard ?? '/'}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            {ownDashboard ? 'Go to My Dashboard' : 'Back to KARTSEEK'}
          </Link>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            type="button"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Branding */}
        <p className="mt-6 text-xs text-slate-400">
          KARTSEEK Seller Portal · Role-Based Access Control
        </p>
      </div>
    </div>
  );
}
