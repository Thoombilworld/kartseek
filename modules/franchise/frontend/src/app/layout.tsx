import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Outfit, Inter } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { getMessages } from 'next-intl/server';

import '@/styles/globals.css';

import { AppShell } from '@/components/app-shell';
import FranchiseClientLayout from './franchise-layout-client';
import { resolveLocaleForCountry, getLocaleDirection } from '@/i18n/config';
import { DEFAULT_COUNTRY, isCountryCode } from '@/lib/localization';

/**
 * Root layout for the franchise zone.
 *
 * A zone is a whole Next.js application, so it owns its own <html> and <body>
 * even though the shell has them too — the two never render together. Crossing
 * a zone boundary is a full document request, not a client-side transition.
 *
 * The provider stack comes from <AppShell> in shared-ui, so this zone mounts the
 * same tree as the shell and the other six zones.
 *
 * Unlike the storefront zones this one carries no SEO. Every route under
 * /franchise is a franchise operator's back-office — the dashboards, payouts,
 * staff and commission screens for someone who has already signed in. There is
 * nothing here for a search engine to index and a fair amount that should never
 * appear in a result, so the organization/website JSON-LD, the analytics
 * scripts and `moduleMeta` are all deliberately absent, and robots is noindex.
 */
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Franchise Console — KARTSEEK',
  description: 'Operations console for KARTSEEK franchise partners.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a56db',
};

export default async function FranchiseZoneLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // Same resolution the shell performs, so an operator crossing from / into
  // /franchise keeps their market and language rather than snapping back to the
  // default on the first zone request.
  const detected = headerStore.get('X-Country-Code') ?? cookieStore.get('kartseek_country')?.value;
  const country = isCountryCode(detected) ? detected : DEFAULT_COUNTRY;

  const language = resolveLocaleForCountry(
    headerStore.get('X-Detected-Language') ?? cookieStore.get('kartseek_language')?.value,
    country,
  );
  const dir = getLocaleDirection(language);
  const messages = await getMessages();

  return (
    <html
      lang={language}
      dir={dir}
      className={`${outfit.variable} ${inter.variable}`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        {/* Critical inline CSS — prevents an unstyled flash before Tailwind loads */}
        <style
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              '*,*::before,*::after{box-sizing:border-box}html{background:#f8fafc;color:#0f172a;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}body{margin:0;min-height:100vh;background:#f8fafc}',
          }}
        />
      </head>
      <body className="bg-slate-50 min-h-screen text-slate-900 antialiased">
        {/*
          Skip link — WCAG 2.4.1 (Bypass Blocks, Level A). Targets the
          <main id="main-content"> that the franchise layout renders; it is not
          rendered here because that layout already owns one and nesting <main>
          elements is invalid.
        */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          Skip to main content
        </a>

        <AppShell
          messages={messages as Record<string, unknown>}
          language={language}
          country={country}
        >
          <FranchiseClientLayout>{children}</FranchiseClientLayout>
        </AppShell>
      </body>
    </html>
  );
}
