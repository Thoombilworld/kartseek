import { redirect } from 'next/navigation';
import { isSellerCountryCode } from '@/lib/seller/registration';

/**
 * Taxi vendor registration.
 *
 * This was a standalone sign-up form that registered nothing: the inputs were
 * uncontrolled, none of their values were read, and `handleSubmit` waited
 * 1500ms on a `setTimeout` before pushing the applicant to
 * `/seller/taxi`. It called no API, so the account it appeared to
 * create never existed — and its phone field was placeholdered
 * `+91 7XX XXX XXX` in all nine markets.
 *
 * Registration is one wizard now, which asks for the chosen market's own
 * registration numbers, bank fields and documents. This route stays as the
 * taxi module's entry point and hands over with the module already
 * selected.
 */
export default async function TaxiRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country } = await searchParams;
  const target = new URLSearchParams({ module: 'taxi' });

  // Only forward a market the form can configure itself for.
  const code = country?.toUpperCase();
  if (isSellerCountryCode(code)) target.set('country', code);

  redirect(`/seller/register?${target.toString()}`);
}
