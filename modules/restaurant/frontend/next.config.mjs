/**
 * Restaurant micro-frontend zone.
 *
 * This is an independently built and deployed Next.js application that serves
 * every /restaurant/* route. The shell (apps/web, port 3000) rewrites those
 * paths here; nothing links to port 3002 directly.
 *
 * `basePath` is what makes that work. With it set, this app expects to be
 * mounted at /restaurant and emits every internal link, router push and — the
 * part that silently breaks without it — every /_next/* asset URL under that
 * prefix. A zone without basePath renders once and then 404s on its own
 * JavaScript, because the shell has no /_next route pointing here.
 */
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Same i18n request config the shell and the marketplace zone load, so all
// three resolve locale and messages identically. Literal path, not a tsconfig
// alias — the plugin reads it at config-load time.
const withNextIntl = createNextIntlPlugin('../../../packages/shared-core/src/i18n/request.ts');

const nextConfig = {
  reactStrictMode: true,

  // Absolute path to the monorepo root so Turbopack resolves next/package.json
  // from the hoisted root node_modules. Same reason apps/web sets it; without
  // it Next 16 refuses to start when a custom webpack() config is also present.
  turbopack: {
    root: path.resolve(__dirname, '../../..'),
  },
  basePath: '/restaurant',

  // Asset requests arrive at the shell's origin, so they must carry the prefix
  // that the shell rewrites back to this zone.
  assetPrefix: '/restaurant',

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
