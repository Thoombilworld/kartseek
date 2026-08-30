import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/**
 * Excluded from the index.
 *
 * `GET /marketplace/brands/feed` is `@UseGuards(JwtAuthGuard)` and scoped by
 * `userId` — this is the signed-in customer's feed of updates from brands they
 * follow, not a public brand-news page. A crawler gets a 401 and an empty
 * screen. (`sitemap.ts` already reasoned this out for its own list; the head
 * needs to agree.)
 *
 * It still needs its own canonical: inheriting `marketplace/layout.tsx` pointed
 * it at `/marketplace`.
 */
export const metadata: Metadata = buildMeta({
  title: 'Brand Updates',
  description: 'The latest launches, drops and announcements from brands you follow.',
  path: '/marketplace/brands/feed',
  noIndex: true,
});

export default function BrandsFeedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
