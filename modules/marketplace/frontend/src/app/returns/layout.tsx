import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/**
 * Signed-in-only screen — excluded from the index.
 *
 * This inherited `marketplace/layout.tsx`, which declares `robots: index,
 * follow` and a canonical of `/marketplace`. That asked search engines to crawl
 * a personal account page and, when they did, told them it was really the
 * section root. Neither is wanted: the page has nothing to rank for and its
 * content belongs to one customer.
 */
export const metadata: Metadata = buildMeta({
  title: 'Returns & Refunds',
  description: 'Your KARTSEEK Marketplace return requests and refunds.',
  path: '/marketplace/returns',
  noIndex: true,
});

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
