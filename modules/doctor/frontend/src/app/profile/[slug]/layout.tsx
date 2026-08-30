import type { Metadata } from 'next';

/**
 * Doctor profiles are not indexed yet.
 *
 * The page holds a `DOCTORS` record of a few fixtures and a
 * `FALLBACK_DOCTOR`, so every unrecognised slug renders "Dr. Rahul Sharma,
 * Senior Cardiologist at Apollo Hospital" with a fee and a 4.9 rating.
 * Indexing that would publish a named practitioner, at a named hospital, at
 * every URL under this route.
 *
 * Structured data and a descriptive title are withheld for the same reason:
 * markup that names a business, a practitioner or a product Google cannot
 * verify on the page is treated as spam, and it is a claim this route cannot
 * currently back up. `follow` is kept so the real links on the page are still
 * crawled.
 *
 * This route cannot use the resolve-and-index pattern that the restaurant,
 * pharmacy and hotel layouts use, because the endpoint behind it fabricates
 * too: `GET /doctor/doctors/:id` answers 200 for any id, echoing it back as
 * "Dr. Amara Okonkwo, General Physician, 4.8". There is no id it says no to, so
 * an existence check against it would confirm every slug. Fix the endpoint to
 * 404 on an unknown doctor first; the layout change after that is the same
 * three lines as `pharmacy/stores/[id]/layout.tsx`.
 */
export const metadata: Metadata = {
  title: 'Doctor profile',
  description: 'Book appointments with verified doctors on KARTSEEK.',
  robots: { index: false, follow: true },
};

export default function DoctorProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
