import type { Metadata } from 'next';

/**
 * Hospital pages are not indexed yet.
 *
 * The page reads a hardcoded `HOSPITALS` record, so an unknown id still
 * renders a complete hospital with departments and a doctor roster.
 *
 * Structured data and a descriptive title are withheld for the same reason:
 * markup that names a business, a practitioner or a product Google cannot
 * verify on the page is treated as spam, and it is a claim this route cannot
 * currently back up. `follow` is kept so the real links on the page are still
 * crawled. Delete this file once the route is wired to the hospital directory
 * API.
 */
export const metadata: Metadata = {
  title: 'Hospital',
  description: 'Find hospitals and book appointments on KARTSEEK.',
  robots: { index: false, follow: true },
};

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
