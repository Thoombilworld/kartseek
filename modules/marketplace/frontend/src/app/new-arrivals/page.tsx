'use client';

import { Sparkles } from 'lucide-react';
import { CatalogFeedPage } from '../components/catalog-feed-page';

export default function NewArrivalsPage() {
  return (
    <CatalogFeedPage
      path="/marketplace/new-arrivals"
      title="New Arrivals"
      subtitle="The latest products added to the marketplace."
      heroClass="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600"
      icon={Sparkles}
      countLabel={(n) => `${n} newly listed products`}
      rankBadge={(i) => (i < 3 ? 'Just In' : null)}
    />
  );
}
