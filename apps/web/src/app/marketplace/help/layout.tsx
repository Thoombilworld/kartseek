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
  title: 'Marketplace Help Centre',
  description: 'Answers on orders, delivery, returns, refunds and payments, plus how to reach KARTSEEK support.',
  path: '/marketplace/help',
  keywords: ['help centre', 'customer support', 'order help', 'returns help'],
});

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
