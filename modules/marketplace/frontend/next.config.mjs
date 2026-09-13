/**
 * Marketplace micro-frontend zone.
 *
 * This is an independently built and deployed Next.js application that serves
 * every /marketplace/* route. The shell (apps/web, port 3000) rewrites those
 * paths here; nothing links to port 3002 directly.
 *
 * `basePath` is what makes that work. With it set, this app expects to be
 * mounted at /marketplace and emits every internal link, router push and — the
 * part that silently breaks without it — every /_next/* asset URL under that
 * prefix. A zone without basePath renders once and then 404s on its own
 * JavaScript, because the shell has no /_next route pointing here.
 */
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Every market outside the home market is refused by isActiveCountry() when
// this is unset — the country picker then snaps back to Qatar on every choice.
// Loud rather than silent: the fallback renders a perfectly healthy-looking page.
if (!process.env.NEXT_PUBLIC_ACTIVE_REGIONS) {
  console.warn(
    '[marketplace-frontend] NEXT_PUBLIC_ACTIVE_REGIONS is not set — only the home market will be active. Copy .env.example to .env.local.',
  );
}

// Same i18n request config the shell loads, so both resolve locale and
// messages identically. Literal path, not a tsconfig alias — the plugin reads
// it at config-load time.
const withNextIntl = createNextIntlPlugin('../../../packages/shared-core/src/i18n/request.ts');

const nextConfig = {
  reactStrictMode: true,

  // Absolute path to the monorepo root so Turbopack resolves next/package.json
  // from the hoisted root node_modules. Same reason apps/web sets it; without
  // it Next 16 refuses to start when a custom webpack() config is also present.
  turbopack: {
    root: path.resolve(__dirname, '../../..'),
  },

  // ── Container output (infra/docker/nextjs.Dockerfile) ─────────────────────
  //
  // Standalone emits .next/standalone: a self-contained server.js plus only the
  // node_modules the traced import graph actually reaches. The zone image's
  // runtime stage copies that directory, so without this key the zone builds
  // and then fails on the standalone COPY — which is what every zone did until
  // Task IN11. Purely additive: `next dev` and `next start` read .next as
  // before and are unchanged.
  //
  // The tracing root is the monorepo root, three levels up from
  // modules/<module>/frontend — the same path `turbopack.root` above resolves.
  // With the default root (the nearest lockfile's directory, resolved per file)
  // everything this zone imports from packages/shared-core is traced from
  // outside the workspace and silently left out of the bundle; the image then
  // starts and 500s on the first page that needs one.
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../../..'),

  // ── Images ────────────────────────────────────────────────────────────────
  //
  // Carried over from the shell. A zone is its own Next application, so it
  // needs its own image configuration — and none of the eight had one after
  // the extraction. Every remote image threw "Invalid src prop ...
  // next-image-unconfigured-host", which is not a broken image but a thrown
  // error: the nearest error boundary caught it and replaced the whole page
  // with "Page failed to load".
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

  basePath: '/marketplace',

  // The same value, readable from client code.
  //
  // `zoneHref()` needs to know this application's basePath so it can strip it
  // from the full public paths the shared route helpers return — otherwise
  // next/link prepends it a second time. Declared here beside `basePath`
  // rather than read from Next's private __NEXT_ROUTER_BASEPATH.
  env: { NEXT_PUBLIC_ZONE_BASE_PATH: '/marketplace' },

  // Asset requests arrive at the shell's origin, so they must carry the prefix
  // that the shell rewrites back to this zone.
  assetPrefix: '/marketplace',

  async rewrites() {
    const gateway = (process.env.API_GATEWAY_ORIGIN ?? 'http://localhost:3001').replace(/\/$/, '');
    return [
      { source: '/api/v1/:path*', destination: `${gateway}/api/v1/:path*` },
      { source: '/api/:path*', destination: `${gateway}/api/:path*` },
    ];
  },

  webpack(config) {
    config.module.rules.push({ test: /\.svg$/, use: ['@svgr/webpack'] });
    return config;
  },
};

export default withNextIntl(nextConfig);
