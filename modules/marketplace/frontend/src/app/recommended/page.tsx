'use client';

import { ThumbsUp } from 'lucide-react';
import { CatalogFeedPage } from '../components/catalog-feed-page';

/**
 * Counterpart to `/marketplace/trending` — the home page linked here too, and
 * this path also had no page, so it resolved through the `[city]/[service]`
 * catch-all to a location landing page instead.
 */
export default function RecommendedPage() {
  return (
    <CatalogFeedPage
      path="/marketplace/recommended"
      title="Recommended for You"
      subtitle="The highest-rated products available in your market."
      heroClass="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600"
      icon={ThumbsUp}
      countLabel={(n) => `${n} highly rated products`}
    />
  );
}
