import type { Metadata } from 'next';
import { ModuleProfile } from '@/components/profile/module-profile';

/**
 * Health — the customer's own profile section for this module.
 *
 * Private to the signed-in customer, so it must never be indexed: the page
 * carries their name, their appointments and their saved addresses.
 */
export const metadata: Metadata = {
  title: 'Health profile | KARTSEEK',
  description: 'Your consultation activity, appointments, saved items and preferences.',
  robots: { index: false, follow: false },
};

export default function DoctorProfilePage() {
  return <ModuleProfile module="doctor" />;
}
