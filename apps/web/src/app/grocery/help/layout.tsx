import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/**
 * A public listing. It names no specific shop or product — it is a view over a
 * live query — so the description can be stated plainly, and no structured data
 * is emitted that the page would have to back up.
 */
export const metadata: Metadata = buildMeta({
  title: 'Grocery Help & Support',
  description: 'Answers on delivery times, returns, refunds and payment for KARTSEEK grocery orders.',
  path: '/grocery/help',
  keywords: ['grocery help', 'delivery support', 'returns', 'refunds', 'KARTSEEK'],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
