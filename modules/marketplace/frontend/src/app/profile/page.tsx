import type { Metadata } from 'next';
import { ModuleProfile } from '@/components/profile/module-profile';

/**
 * Marketplace — the customer's own profile section for this module.
 *
 * Private to the signed-in customer, so it must never be indexed: the page
 * carries their name, their order history and their saved addresses.
 */
export const metadata: Metadata = {
  title: 'Marketplace profile | KARTSEEK',
  description: 'Your marketplace activity, order history, saved items and preferences.',
  robots: { index: false, follow: false },
};

export default function MarketplaceProfilePage() {
  return <ModuleProfile module="marketplace" />;
}
