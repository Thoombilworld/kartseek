import type { Metadata } from 'next';
import { ModuleProfile } from '@/components/profile/module-profile';

/**
 * Pharmacy — the customer's own profile section for this module.
 *
 * Private to the signed-in customer, so it must never be indexed: the page
 * carries their name, their order history and their saved addresses.
 */
export const metadata: Metadata = {
  title: 'Pharmacy profile | KARTSEEK',
  description: 'Your pharmacy activity, order history, saved items and preferences.',
  robots: { index: false, follow: false },
};

export default function PharmacyProfilePage() {
  return <ModuleProfile module="pharmacy" />;
}
