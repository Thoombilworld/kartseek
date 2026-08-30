import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/**
 * Excluded from the index.
 *
 * Recommendations are personalised per customer. To a signed-out crawler this
 * is a generic feed duplicating `/marketplace/trending` and friends, so it
 * competes with them for the same terms while ranking for none of its own.
 *
 * It also needs its own canonical either way: inheriting
 * `marketplace/layout.tsx` pointed it at `/marketplace`.
 */
export const metadata: Metadata = buildMeta({
  title: 'Recommended For You',
  description: 'Products picked for you from across KARTSEEK Marketplace.',
  path: '/marketplace/recommended',
  noIndex: true,
});

export default function RecommendedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
