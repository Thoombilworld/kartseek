import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/**
 * Excluded from the index.
 *
 * The comparison list lives in `localStorage`, so a crawler — which has none —
 * always sees an empty page. There is nothing here to index.
 *
 * It also needs its own canonical either way: inheriting
 * `marketplace/layout.tsx` pointed it at `/marketplace`.
 */
export const metadata: Metadata = buildMeta({
  title: 'Compare Products',
  description: 'Put products side by side and compare specifications, prices and ratings.',
  path: '/marketplace/compare',
  noIndex: true,
});

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
