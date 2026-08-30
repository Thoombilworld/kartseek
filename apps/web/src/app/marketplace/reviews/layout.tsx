import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/**
 * Excluded from the index.
 *
 * This lists the *signed-in customer's own* reviews (`getCustomerReviews(user.id)`),
 * not public product reviews — those live on each product page. Indexing it
 * would publish one person's account screen and rank it for nothing.
 *
 * It also needs its own canonical either way: inheriting
 * `marketplace/layout.tsx` pointed it at `/marketplace`.
 */
export const metadata: Metadata = buildMeta({
  title: 'Your Reviews',
  description: 'The reviews you have written on KARTSEEK Marketplace.',
  path: '/marketplace/reviews',
  noIndex: true,
});

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
