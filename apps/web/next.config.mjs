import path from 'path';
import { fileURLToPath } from 'url';
import createNextIntlPlugin from 'next-intl/plugin';
import { buildContentSecurityPolicy } from './config/csp.cjs';

// The i18n request config moved into packages/shared-core so both the shell and
// the module zones load the same locale resolution and message catalogues. This
// path is resolved by the plugin at config load, not through tsconfig aliases,
// so it has to be the real relative path rather than `@/i18n/request`.
const withNextIntl = createNextIntlPlugin('../../packages/shared-core/src/i18n/request.ts');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header for security

  // ── Dev Indicators ─────────────────────────────────────────────────────
  // Hide the floating Next.js dev indicator on all pages
  devIndicators: false,

  // ── Turbopack (Next.js 16) ─────────────────────────────────────────────────
  // Absolute path to monorepo root so Turbopack finds next/package.json
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },

  // ── Container output (infra/docker/nextjs.Dockerfile) ─────────────────────
  // Standalone emits .next/standalone: a self-contained server.js plus only the
  // node_modules the traced import graph actually reaches, which is what keeps
  // the image small enough to be worth building. Purely additive — `next dev`
  // and `next start` read .next as before and are unchanged.
  //
  // The tracing root is the monorepo root, not this workspace: the shell
  // imports from packages/shared-core and modules/*/frontend, and with the
  // default root (the nearest lockfile's directory, resolved per file) those
  // files are traced from outside apps/web and silently left out of the bundle
  // — the image then starts and 500s on the first page that needs one.
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../..'),

  // ── Image Optimization ────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    minimumCacheTTL: 3600,
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // ── Compiler Options ──────────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // ── Security HTTP Headers ─────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '0' }, // Deprecated — CSP handles this
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), bluetooth=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          {
            // Built from the configured gateway origin — see config/csp.cjs.
            // Hardcoding the allowlist meant any deploy whose API host was not
            // literally api.kartseek.com had its own API calls refused by the
            // browser, which the UI reports as a connection problem.
            key: 'Content-Security-Policy',
            value: buildContentSecurityPolicy({
              nodeEnv: process.env.NODE_ENV,
              apiUrl: process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL,
              wsUrl: process.env.NEXT_PUBLIC_WS_URL,
            }),
          },
          // No HSTS here. These headers are static, so this one was sent on
          // every response including `http://localhost:3000` — and an HSTS
          // entry for `localhost` is sticky for a year and applies to every
          // port, so a browser that honours it makes *all* local development
          // on that machine unreachable over http. Browsers are specified to
          // ignore HSTS received over plain http, but sending a `preload`
          // directive from a dev server is a hazard with no upside.
          //
          // `proxy.ts` sets it instead, gated on the request host actually
          // being kartseek.com — which is the only place that can see the host.
        ],
      },
      // Cache static assets aggressively
      {
        source: '/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  // ── Redirects ─────────────────────────────────────────────────────────────
  async redirects() {
    return [
      // The sign-in surface lives under /auth; the bare names are what people type.
      { source: '/login', destination: '/auth/login', permanent: false },
      { source: '/register', destination: '/auth/signup', permanent: false },
      { source: '/signup', destination: '/auth/signup', permanent: false },
      { source: '/forgot-password', destination: '/auth/forgot-password', permanent: false },
      { source: '/home', destination: '/', permanent: true },
      { source: '/shop', destination: '/marketplace', permanent: true },
      { source: '/rides', destination: '/taxi', permanent: true },
      // Renamed route redirects (directory reorganization)
      { source: '/franchise-opportunity', destination: '/franchise/opportunity', permanent: true },
      {
        source: '/franchise-opportunity/:path*',
        destination: '/franchise/opportunity/:path*',
        permanent: true,
      },
      { source: '/admin/restaurants', destination: '/admin/restaurant', permanent: true },
      {
        source: '/admin/restaurants/:path*',
        destination: '/admin/restaurant/:path*',
        permanent: true,
      },
      {
        source: '/marketplace/categories',
        destination: '/marketplace/category-list',
        permanent: true,
      },
      {
        source: '/marketplace/categories/:path*',
        destination: '/marketplace/category-list/:path*',
        permanent: true,
      },
    ];
  },

  // ── Rewrites ──────────────────────────────────────────────────────────────
  // The gateway origin comes from the environment. It used to be the literal
  // `http://localhost:3001`, which meant any deploy that forgot to set the
  // variable proxied the whole storefront at a host that only exists on a
  // developer's machine — and did so silently.
  async rewrites() {
    const gateway = (process.env.API_GATEWAY_ORIGIN ?? 'http://localhost:3001').replace(/\/$/, '');

    // Marketplace is served by its own Next application (the marketplace zone)
    // rather than by routes in this app. Two rules are needed, not one:
    // the pages themselves, and the zone's own /_next/* assets — those are
    // requested from this origin, so without the second rule the page renders
    // and then fails to hydrate on a 404 for its own JavaScript.
    const marketplaceZone = (
      process.env.MARKETPLACE_ZONE_ORIGIN ?? 'http://localhost:3002'
    ).replace(/\/$/, '');
    const groceryZone = (process.env.GROCERY_ZONE_ORIGIN ?? 'http://localhost:3003').replace(
      /\/$/,
      '',
    );
    const restaurantZone = (process.env.RESTAURANT_ZONE_ORIGIN ?? 'http://localhost:3004').replace(
      /\/$/,
      '',
    );
    const pharmacyZone = (process.env.PHARMACY_ZONE_ORIGIN ?? 'http://localhost:3005').replace(
      /\/$/,
      '',
    );
    const doctorZone = (process.env.DOCTOR_ZONE_ORIGIN ?? 'http://localhost:3006').replace(
      /\/$/,
      '',
    );
    const hotelZone = (process.env.HOTEL_ZONE_ORIGIN ?? 'http://localhost:3007').replace(/\/$/, '');
    const taxiZone = (process.env.TAXI_ZONE_ORIGIN ?? 'http://localhost:3008').replace(/\/$/, '');
    const franchiseZone = (process.env.FRANCHISE_ZONE_ORIGIN ?? 'http://localhost:3009').replace(
      /\/$/,
      '',
    );

    return [
      {
        source: '/api/v1/:path*',
        destination: `${gateway}/api/v1/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${gateway}/api/:path*`,
      },
      {
        source: '/marketplace',
        destination: `${marketplaceZone}/marketplace`,
      },
      {
        source: '/marketplace/:path*',
        destination: `${marketplaceZone}/marketplace/:path*`,
      },
      {
        source: '/marketplace/_next/:path*',
        destination: `${marketplaceZone}/marketplace/_next/:path*`,
      },
      {
        source: '/grocery',
        destination: `${groceryZone}/grocery`,
      },
      {
        source: '/grocery/:path*',
        destination: `${groceryZone}/grocery/:path*`,
      },
      {
        source: '/grocery/_next/:path*',
        destination: `${groceryZone}/grocery/_next/:path*`,
      },
      {
        source: '/restaurant',
        destination: `${restaurantZone}/restaurant`,
      },
      {
        source: '/restaurant/:path*',
        destination: `${restaurantZone}/restaurant/:path*`,
      },
      {
        source: '/restaurant/_next/:path*',
        destination: `${restaurantZone}/restaurant/_next/:path*`,
      },
      {
        source: '/pharmacy',
        destination: `${pharmacyZone}/pharmacy`,
      },
      {
        source: '/pharmacy/:path*',
        destination: `${pharmacyZone}/pharmacy/:path*`,
      },
      {
        source: '/pharmacy/_next/:path*',
        destination: `${pharmacyZone}/pharmacy/_next/:path*`,
      },
      {
        source: '/doctor',
        destination: `${doctorZone}/doctor`,
      },
      {
        source: '/doctor/:path*',
        destination: `${doctorZone}/doctor/:path*`,
      },
      {
        source: '/doctor/_next/:path*',
        destination: `${doctorZone}/doctor/_next/:path*`,
      },
      // Only the customer booking surface is a zone. /hotel-owner is the vendor
      // portal and stays in this app alongside the other /seller/* portals,
      // which share its login, OTP, registration and approval-status flows.
      {
        source: '/hotel-booking',
        destination: `${hotelZone}/hotel-booking`,
      },
      {
        source: '/hotel-booking/:path*',
        destination: `${hotelZone}/hotel-booking/:path*`,
      },
      {
        source: '/hotel-booking/_next/:path*',
        destination: `${hotelZone}/hotel-booking/_next/:path*`,
      },
      // Customer ride booking only. /admin/taxi and /seller/taxi stay in this
      // app with the other admin and vendor surfaces.
      {
        source: '/taxi',
        destination: `${taxiZone}/taxi`,
      },
      {
        source: '/taxi/:path*',
        destination: `${taxiZone}/taxi/:path*`,
      },
      {
        source: '/taxi/_next/:path*',
        destination: `${taxiZone}/taxi/_next/:path*`,
      },
      // The franchise partner console. /admin/franchise is the platform admin's
      // view of the same partners and stays in this app with the rest of /admin.
      {
        source: '/franchise',
        destination: `${franchiseZone}/franchise`,
      },
      {
        source: '/franchise/:path*',
        destination: `${franchiseZone}/franchise/:path*`,
      },
      {
        source: '/franchise/_next/:path*',
        destination: `${franchiseZone}/franchise/_next/:path*`,
      },
    ];
  },

  // ── Webpack ───────────────────────────────────────────────────────────────
  webpack(config) {
    // SVG as React component
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

export default withNextIntl(nextConfig);
