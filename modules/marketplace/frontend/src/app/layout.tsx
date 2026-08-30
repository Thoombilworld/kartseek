import type { ReactNode } from 'react';

/**
 * Root layout for the marketplace zone.
 *
 * A zone is a whole Next.js application, so it needs its own <html>/<body>
 * even though the shell also has one — the two never render together. The
 * browser loads exactly one of them per navigation; crossing a zone boundary
 * is a full document request, not a client-side transition.
 */
export const metadata = {
  title: 'Marketplace · KARTSEEK',
  description: 'Shop the KARTSEEK marketplace.',
};

export default function MarketplaceZoneLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
