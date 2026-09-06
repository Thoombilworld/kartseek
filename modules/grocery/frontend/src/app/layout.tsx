import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Outfit, Inter } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { getMessages } from 'next-intl/server';

import '@/styles/globals.css';

import { AppShell } from '@/components/app-shell';
import GroceryClientLayout from './grocery-layout-client';
import { JsonLd } from '@/components/seo/json-ld';
import { AnalyticsScripts } from '@/lib/seo/analytics';
import { organizationSchema, websiteSchema } from '@/lib/seo/schema';
import { SITE_URL } from '@/lib/seo/metadata';
import { resolveLocaleForCountry, getLocaleDirection } from '@/i18n/config';
import { DEFAULT_COUNTRY, isCountryCode } from '@/lib/localization';

/**
 * Root layout for the grocery zone.
 *
 * A zone is a whole Next.js application, so it owns its own <html> and <body>
 * even though the shell has them too — the two never render together. Crossing
 * a zone boundary is a full document request, not a client-side transition.
 *
 * The provider stack comes from <AppShell> in shared-ui, which the shell and the
 * marketplace zone also use, so all three surfaces mount an identical tree.
 */
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

// Carried over verbatim from the former app/grocery/layout.tsx. Every route in
// this zone is grocery, so that file had no distinct level left to occupy once
// the routes moved: its metadata and its client wrapper belong to the zone root.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s | KARTSEEK Grocery',
    default: 'KARTSEEK Grocery — Fresh Groceries Delivered in Minutes',
  },
  description:
    'Order fresh groceries, fruits, vegetables, meat, dairy, and household essentials from local stores. Same-day delivery with live order tracking across India, UAE, Qatar, Saudi Arabia, UK, and USA.',
  keywords: [
    'grocery delivery',
    'online grocery',
    'fresh vegetables',
    'fruit delivery',
    'meat delivery',
    'dairy products',
    'household essentials',
    'same-day delivery',
    'KARTSEEK',
    'multi-vendor grocery',
    'local stores',
    'grocery near me',
  ],
  openGraph: {
    title: 'KARTSEEK Grocery — Fresh Groceries Delivered in Minutes',
    description:
      'Shop from local stores near you. Fresh produce, meat, dairy, and essentials delivered to your door.',
    type: 'website',
    siteName: 'KARTSEEK',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a56db',
};

export default async function GroceryZoneLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // Same resolution the shell performs, so a customer crossing from / into
  // /grocery keeps their market and language rather than snapping back to the
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
        <link rel="dns-prefetch" href="https://cdn.kartseek.com" />
        <link rel="dns-prefetch" href="https://api.kartseek.com" />
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        <AnalyticsScripts />
      </head>
      <body className="bg-slate-50 min-h-screen text-slate-900 antialiased">
        {/*
          Skip link — WCAG 2.4.1 (Bypass Blocks, Level A). Targets the
          <main id="main-content"> that the grocery layout renders; it is not
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
          <GroceryClientLayout>{children}</GroceryClientLayout>
        </AppShell>
      </body>
    </html>
  );
}
