import { redirect } from 'next/navigation';
import { isSellerCountryCode } from '@/lib/seller/registration';

/**
 * Grocery seller onboarding.
 *
 * This used to be its own sign-up form, and it did not register anything: the
 * inputs were uncontrolled, nothing was read out of them, and `handleSubmit`
 * waited 1500ms on a `setTimeout` and then pushed the applicant to
 * `/seller/grocery/dashboard`. It called no API. Every "account" created here
 * existed only as the illusion of one, and the phone field was placeholdered
 * `+91 7XX XXX XXX` for all nine markets.
 *
 * Registration lives in one wizard now, which asks for the market's own
 * registration numbers, bank fields and documents. This route keeps working as
 * the grocery module's entry point and hands over with the module already
 * chosen, so a grocer never lands in the marketplace queue.
 */
export default async function GroceryOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country } = await searchParams;
  const target = new URLSearchParams({ module: 'grocery' });

  // Only forward a market the registration form can actually configure itself
  // for; anything else falls through to the country step rather than
  // preselecting a market with no compliance profile.
  const code = country?.toUpperCase();
  if (isSellerCountryCode(code)) target.set('country', code);

  redirect(`/seller/register?${target.toString()}`);
}
