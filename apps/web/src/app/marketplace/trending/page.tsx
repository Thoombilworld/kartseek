'use client';

import { TrendingUp } from 'lucide-react';
import { CatalogFeedPage } from '../components/catalog-feed-page';

/**
 * The marketplace home page has carried a "View All →" link to
 * `/marketplace/trending` all along, but no page existed at that path. The
 * request fell through to the `[city]/[service]` catch-all instead, so the link
 * rendered a location landing page titled "trending in Marketplace" — not a
 * 404, which is why it never showed up as a broken link.
 */
export default function TrendingPage() {
  return (
    <CatalogFeedPage
      path="/marketplace/trending"
      title="Trending Now"
      subtitle="Recently listed products picking up momentum."
      heroClass="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600"
      icon={TrendingUp}
      countLabel={(n) => `${n} products trending now`}
      rankBadge={(i) => (i < 3 ? 'Trending' : null)}
    />
  );
}
