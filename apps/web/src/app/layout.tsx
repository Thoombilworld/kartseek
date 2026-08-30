import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Outfit, Inter } from 'next/font/google';
import '@/styles/globals.css';
import { cookies, headers } from 'next/headers';
import { AnalyticsScripts } from '@/lib/seo/analytics';
import { AppShell } from '@/components/app-shell';
import { JsonLd } from '@/components/seo/json-ld';
import { organizationSchema, websiteSchema } from '@/lib/seo/schema';
import { SITE_URL } from '@/lib/seo/metadata';
import { getMessages } from 'next-intl/server';
import { resolveLocaleForCountry, getLocaleDirection } from '@/i18n/config';
import { DEFAULT_COUNTRY, isCountryCode } from '@/lib/localization';

/** Coerce whatever arrived to a market we actually serve. */
function resolveRegion(value: string | undefined | null): string {
  return isCountryCode(value) ? value!.toUpperCase() : DEFAULT_COUNTRY;
}

// ─── Fonts ────────────────────────────────────────────────────────────────────
const outfit = Outfit({
  subsets: ['latin'],
  weight:  ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight:  ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

// ─── SEO Metadata (Global) ───────────────────────────────────────────────────
//
// Everything here is a *default*, inherited by any route that does not state
// its own. Two consequences shape what may live in this object:
//
//  1. No `alternates`. Next merges metadata field by field, so the canonical
//     declared here was inherited by every one of the ~770 routes that does not
//     export its own — every product, category, brand and city page told Google
//     "the canonical version of me is the homepage", which is an instruction to
//     drop them from the index. Canonicals and hreflang are per-page facts and
//     are set per page, by `generateMetadata` in `lib/seo/metadata.ts`.
//  2. No absolute image URLs. `metadataBase` resolves the relative ones below,
//     so a preview deploy advertises its own origin instead of production's.
// The site-wide share card. Regenerate with `scripts/build-og-image.mjs` after
// editing `scripts/og-card.html` — it renders that file to exactly 1200×630.
const OG_DEFAULT_IMAGE = '/og-image.png';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  'KARTSEEK — The Ultimate Super App',
    template: '%s | KARTSEEK',
  },
  description:
    'KARTSEEK is your all-in-one super app for Marketplace, Groceries, Food Delivery, Pharmacy, Doctor Appointments, and Taxi Booking — across Africa, Asia & the Middle East.',
  keywords: [
    'super app', 'marketplace', 'grocery delivery', 'food delivery',
    'pharmacy', 'doctor appointment', 'taxi booking', 'KARTSEEK',
    'online shopping', 'medicine delivery', 'ride booking',
    'India', 'UAE', 'Qatar', 'Saudi Arabia', 'Kuwait', 'Bahrain', 'Oman',
    'United Kingdom', 'United States',
  ],
  authors:   [{ name: 'KARTSEEK Engineering', url: SITE_URL }],
  creator:   'KARTSEEK',
  publisher: 'KARTSEEK',
  robots:    { index: true, follow: true },
  manifest:  '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
  // ── Open Graph ─────────────────────────────────────────────────────────────
  // `/og-image.jpg` and `/twitter-card.jpg` were referenced here and have never
  // existed in `public/` — a share on Facebook, WhatsApp or LinkedIn fetched a
  // 404 and rendered a blank card. One asset now serves both: X's
  // `summary_large_image` takes the same 1200×630 as Open Graph, so a separate
  // Twitter file is a second thing to keep in step for no benefit.
  openGraph: {
    type:      'website',
    locale:    'en_US',
    url:       SITE_URL,
    siteName:  'KARTSEEK',
    title:     'KARTSEEK — The Ultimate Super App',
    description: 'One-stop destination for Marketplace, Groceries, Food, Pharmacy, Doctor & Rides.',
    images: [{
      url:    OG_DEFAULT_IMAGE,
      width:  1200,
      height: 630,
      alt:    'KARTSEEK Super App',
    }],
  },
  // ── Twitter/X Card ─────────────────────────────────────────────────────────
  twitter: {
    card:        'summary_large_image',
    site:        '@kartseekapp',
    creator:     '@kartseekapp',
    title:       'KARTSEEK — The Ultimate Super App',
    description: 'Your all-in-one super app for shopping, food, health & rides.',
    images:      [OG_DEFAULT_IMAGE],
  },
  // ── Search Console / Bing Verification ─────────────────────────────────────
  // Omitted entirely when unset. An empty `content=""` is not a neutral tag:
  // Search Console reads it as a failed verification attempt.
  ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || process.env.NEXT_PUBLIC_BING_VERIFICATION
    ? {
        verification: {
          ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION && {
            google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
          }),
          ...(process.env.NEXT_PUBLIC_BING_VERIFICATION && {
            other: { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION },
          }),
        },
      }
    : {}),
};

// ─── Viewport ─────────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  themeColor:   '#2563eb',
  width:        'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // The edge proxy has already validated both against the region registry and
  // forwarded them as request headers, so they are the authoritative answer.
  // The cookies are the fallback for the rare request the proxy did not match
  // (its matcher excludes static assets), and the registry default backs both.
  const country = resolveRegion(
    headerStore.get('X-Country-Code') ?? cookieStore.get('kartseek_country')?.value,
  );

  // Constrained to the languages the resolved region serves — a stale cookie
  // from another market must not put the page into a language this region has
  // no catalogue, support or legal copy for.
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
        {/* Critical inline CSS — prevents unstyled flash before Tailwind loads */}
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: '*,*::before,*::after{box-sizing:border-box}html{background:#f8fafc;color:#0f172a;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}body{margin:0;min-height:100vh;background:#f8fafc}' }} />
        {/* DNS prefetch for CDN and API */}
        <link rel="dns-prefetch" href="https://cdn.kartseek.com" />
        <link rel="dns-prefetch" href="https://api.kartseek.com" />
        {/* Global JSON-LD: Organization + WebSite + SearchAction */}
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        {/* Analytics Scripts */}
        <AnalyticsScripts />
      </head>
      <body className="bg-slate-50 min-h-screen text-slate-900 antialiased">
        {/*
          Skip link — WCAG 2.4.1 (Bypass Blocks, Level A). First focusable
          element on every page so keyboard and screen-reader users can jump
          past the header nav straight to the page content. Visually hidden
          until focused. Targets the `<main id="main-content">` rendered by
          each route group's layout; it is not rendered here because 31 route
          layouts already own their own <main> and nesting them is invalid.
        */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          Skip to main content
        </a>
        {/* The provider stack lives in <AppShell> (packages/shared-ui) so this
            app and every module zone mount an identical tree. Nesting order and
            the reasons for it are documented there. */}
        <AppShell messages={messages as Record<string, unknown>} language={language} country={country}>
          {children}
        </AppShell>
        {/* Service Worker Registration */}
        <script dangerouslySetInnerHTML={{ __html: "if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').then(function(r){console.log('[KARTSEEK] SW registered:',r.scope)}).catch(function(e){console.warn('[KARTSEEK] SW failed:',e)})})}" }} />
      </body>
    </html>
  );
}
