import type { Metadata } from 'next';

/**
 * Pharmacy product pages are not indexed yet.
 *
 * The page reads a hardcoded `ALL_PRODUCTS` record, so an unknown id still
 * renders a medicine with a price and a composition.
 *
 * Structured data and a descriptive title are withheld for the same reason:
 * markup that names a business, a practitioner or a product Google cannot
 * verify on the page is treated as spam, and it is a claim this route cannot
 * currently back up. `follow` is kept so the real links on the page are still
 * crawled. Delete this file once the route is wired to the pharmacy catalogue
 * API.
 */
export const metadata: Metadata = {
  title: 'Medicine',
  description: 'Order prescription and over-the-counter medicines on KARTSEEK.',
  robots: { index: false, follow: true },
};

export default function PharmacyProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
