import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/**
 * Own head for a client page.
 *
 * Without this the route inherited `marketplace/layout.tsx`'s metadata, whose
 * canonical is `/marketplace` — so this page told search engines it was a
 * duplicate of the section root while asking to be indexed.
 */
export const metadata: Metadata = buildMeta({
  title: 'All Categories',
  description: 'Browse every category on KARTSEEK Marketplace — electronics, fashion, home and kitchen, beauty, grocery and more, from verified sellers.',
  path: '/marketplace/category-list',
  keywords: ['shop by category', 'product categories', 'online categories'],
});

export default function CategoryListLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
