import { redirect } from 'next/navigation';
import { isSellerCountryCode } from '@/lib/seller/registration';

/**
 * Restaurant seller onboarding.
 *
 * Same fabrication as the grocery page it mirrored: uncontrolled inputs, no API
 * call, a 1500ms `setTimeout` and then a push to the dashboard. Nothing was
 * registered. It now hands over to the one registration wizard with the module
 * already chosen, so a restaurant is asked for its market's food-safety licence
 * and lands in the restaurant approval queue.
 */
export default async function RestaurantOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country } = await searchParams;
  const target = new URLSearchParams({ module: 'restaurant' });

  const code = country?.toUpperCase();
  if (isSellerCountryCode(code)) target.set('country', code);

  redirect(`/seller/register?${target.toString()}`);
}
