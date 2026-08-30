import type { Metadata } from 'next';
import { ModuleProfile } from '@/components/profile/module-profile';

/**
 * Grocery — the customer's own profile section for this module.
 *
 * Private to the signed-in customer, so it must never be indexed: the page
 * carries their name, their order history and their saved addresses.
 */
export const metadata: Metadata = {
  title: 'Grocery profile | KARTSEEK',
  description: 'Your grocery activity, order history, saved items and preferences.',
  robots: { index: false, follow: false },
};

export default function GroceryProfilePage() {
  return <ModuleProfile module="grocery" />;
}
