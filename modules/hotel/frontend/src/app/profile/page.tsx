import type { Metadata } from 'next';
import { ModuleProfile } from '@/components/profile/module-profile';

/**
 * Hotels — the customer's own profile section for this module.
 *
 * Private to the signed-in customer, so it must never be indexed: the page
 * carries their name, their bookings and their saved addresses.
 */
export const metadata: Metadata = {
  title: 'Hotels profile | KARTSEEK',
  description: 'Your travel activity, bookings, saved items and preferences.',
  robots: { index: false, follow: false },
};

export default function HotelProfilePage() {
  return <ModuleProfile module="hotel" />;
}
