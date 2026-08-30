'use client';

import { Trophy } from 'lucide-react';
import { CatalogFeedPage } from '../components/catalog-feed-page';

export default function BestSellersPage() {
  return (
    <CatalogFeedPage
      path="/marketplace/best-sellers"
      title="Best Sellers"
      subtitle="The products shoppers buy most, across the marketplace."
      heroClass="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600"
      icon={Trophy}
      countLabel={(n) => `${n} top-selling products`}
      rankBadge={(i) => (i < 3 ? `#${i + 1} Best Seller` : null)}
    />
  );
}
