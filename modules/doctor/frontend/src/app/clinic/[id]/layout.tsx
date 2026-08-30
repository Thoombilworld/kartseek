import type { Metadata } from 'next';

/**
 * Clinic pages are not indexed yet.
 *
 * The page reads a hardcoded `CLINICS` record, so an unknown id still renders
 * a complete clinic with an address, opening hours and a doctor roster.
 *
 * Structured data and a descriptive title are withheld for the same reason:
 * markup that names a business, a practitioner or a product Google cannot
 * verify on the page is treated as spam, and it is a claim this route cannot
 * currently back up. `follow` is kept so the real links on the page are still
 * crawled. Delete this file once the route is wired to the clinic directory
 * API.
 */
export const metadata: Metadata = {
  title: 'Clinic',
  description: 'Find clinics and book appointments on KARTSEEK.',
  robots: { index: false, follow: true },
};

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
