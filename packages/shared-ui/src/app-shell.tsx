import React, { type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';

import { AuthProvider } from '@/lib/contexts/auth-context';
import { AuditProvider } from '@/lib/contexts/audit-context';
import { PincodeSearchLogProvider } from '@/lib/contexts/pincode-search-log';
import { ToastProvider } from '@/lib/contexts/toast-context';
import { RegionProvider } from '@/lib/contexts/region-context';
import { CartProvider } from '@/lib/contexts/cart-context';
import { LoginPromptProvider } from '@/lib/contexts/login-prompt';
import { WishlistProvider } from '@/lib/contexts/wishlist-context';
import { PageErrorBoundary } from '@/lib/error-boundary';
import { NavigationProgress } from '@/components/shared/navigation-progress';
import { ConsentBanner } from '@/components/shared/consent-banner';
import { GoogleTagManagerNoScript } from '@/lib/seo/analytics';

/**
 * The provider stack every KARTSEEK frontend runs inside.
 *
 * Extracted from the shell's root layout so the shell and each module zone
 * mount an identical tree. A zone is a separate Next.js application with its
 * own root layout, so without this the stack would be copied per zone — and a
 * provider added later would reach the shell only, giving pages that behave
 * differently depending on which application happens to serve them. That class
 * of bug is invisible in review and obvious only in production.
 *
 * Nesting order is load-bearing and preserved exactly:
 *   AuthProvider    JWT and user state; RegionProvider reads user preferences
 *   RegionProvider  country/city with auto-detection; needed by everything
 *   ToastProvider   notifications, owns a DOM portal
 *   CartProvider    outside LoginPromptProvider, so signing in from the
 *                   checkout prompt re-syncs the server cart immediately
 *   WishlistProvider inside LoginPromptProvider, so a heart clicked while
 *                   signed out can prompt and then complete the save
 */
export function AppShell({
  children,
  messages,
  language,
  country,
  showConsentBanner = true,
}: {
  children: ReactNode;
  messages: Record<string, unknown>;
  language: string;
  country: string;
  /** Zones that render inside another surface can suppress the duplicate banner. */
  showConsentBanner?: boolean;
}) {
  return (
    <>
      <NavigationProgress />
      <GoogleTagManagerNoScript />
      <AuthProvider>
        <NextIntlClientProvider messages={messages as never} locale={language}>
          <RegionProvider serverRegion={country} serverLanguage={language}>
            <ToastProvider>
              <AuditProvider>
                <PincodeSearchLogProvider>
                  <CartProvider>
                    <LoginPromptProvider>
                      <WishlistProvider>
                        <PageErrorBoundary>{children}</PageErrorBoundary>
                        {/* Consent on the terms of the customer's own regime —
                            in Qatar (PDPPL) nothing optional starts enabled. */}
                        {showConsentBanner ? <ConsentBanner /> : null}
                      </WishlistProvider>
                    </LoginPromptProvider>
                  </CartProvider>
                </PincodeSearchLogProvider>
              </AuditProvider>
            </ToastProvider>
          </RegionProvider>
        </NextIntlClientProvider>
      </AuthProvider>
    </>
  );
}
