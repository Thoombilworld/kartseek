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
  title: 'Coupons & Promo Codes',
  description: 'Current coupon codes and promotional discounts on KARTSEEK Marketplace, with the terms that apply to each.',
  path: '/marketplace/coupons',
  keywords: ['coupons', 'promo codes', 'discount codes', 'vouchers'],
});

export default function CouponsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
