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
  title: 'Gift Cards',
  description: 'Buy and redeem KARTSEEK gift cards. Choose an amount, send it instantly, and spend it across the marketplace.',
  path: '/marketplace/gift-cards',
  keywords: ['gift cards', 'e-gift voucher', 'buy gift card'],
});

export default function GiftCardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
