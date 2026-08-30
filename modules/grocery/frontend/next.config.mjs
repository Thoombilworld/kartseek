/**
 * Grocery micro-frontend zone.
 *
 * This is an independently built and deployed Next.js application that serves
 * every /grocery/* route. The shell (apps/web, port 3000) rewrites those
 * paths here; nothing links to port 3002 directly.
 *
 * `basePath` is what makes that work. With it set, this app expects to be
 * mounted at /grocery and emits every internal link, router push and — the
 * part that silently breaks without it — every /_next/* asset URL under that
 * prefix. A zone without basePath renders once and then 404s on its own
 * JavaScript, because the shell has no /_next route pointing here.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,

  // Absolute path to the monorepo root so Turbopack resolves next/package.json
  // from the hoisted root node_modules. Same reason apps/web sets it; without
  // it Next 16 refuses to start when a custom webpack() config is also present.
  turbopack: {
    root: path.resolve(__dirname, '../../..'),
  },
  basePath: '/grocery',

  // Asset requests arrive at the shell's origin, so they must carry the prefix
  // that the shell rewrites back to this zone.
  assetPrefix: '/grocery',

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

export default nextConfig;
