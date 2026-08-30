import type { Metadata } from 'next';
import { ModuleProfile } from '@/components/profile/module-profile';

/**
 * Rides — the customer's own profile section for this module.
 *
 * Private to the signed-in customer, so it must never be indexed: the page
 * carries their name, their ride history and their saved addresses.
 */
export const metadata: Metadata = {
  title: 'Rides profile | KARTSEEK',
  description: 'Your ride activity, ride history, saved items and preferences.',
  robots: { index: false, follow: false },
};

export default function TaxiProfilePage() {
  return <ModuleProfile module="taxi" />;
}
