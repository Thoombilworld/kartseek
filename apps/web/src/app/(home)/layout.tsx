import type { Metadata } from 'next';
import { generateMetadata as buildMeta, SITE_URL } from '@/lib/seo/metadata';

/**
 * A route group purely so the storefront homepage can own its metadata.
 *
 * `app/page.tsx` is a client component and a client component cannot export
 * `metadata`, so the homepage had none of its own: it inherited the root
 * layout's defaults, including — until that was removed — a canonical URL the
 * root declared on behalf of all ~770 routes. The group changes no URL; `/`
 * still resolves here.
 *
 * This is the one page that genuinely needs the site-wide hreflang set, because
 * it is the one page every country subdomain publishes at the same path.
 */
const homeMeta = buildMeta({
  title: 'KARTSEEK — The Ultimate Super App',
  description:
    'Shop the marketplace, order groceries and food, refill prescriptions, book a doctor and hail a ride — in one app, across Africa, Asia and the Middle East.',
  path: '',
  // The branded card, not the generated one. `/api/og` renders a title onto a
  // gradient, which is right for a product or a category page and wrong for the
  // homepage, whose share card is the one most people see first.
  image: `${SITE_URL}/og-image.png`,
  imageAlt: 'KARTSEEK — marketplace, groceries, food, pharmacy, doctors and rides in one app',
  keywords: [
    'super app', 'online shopping', 'grocery delivery', 'food delivery',
    'online pharmacy', 'doctor appointment', 'taxi booking', 'KARTSEEK',
  ],
});

export const metadata: Metadata = {
  ...homeMeta,
  // The root layout's `%s | KARTSEEK` template made this read
  // "KARTSEEK — The Ultimate Super App | KARTSEEK". `absolute` opts the one page
  // whose title already carries the brand out of the template.
  title: { absolute: 'KARTSEEK — The Ultimate Super App' },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
