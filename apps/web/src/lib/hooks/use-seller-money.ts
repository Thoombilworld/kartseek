'use client';

import { useCallback } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { useRegion } from '@/lib/contexts/region-context';
import { formatMoney, getCountry } from '@/lib/localization';

/**
 * Money formatter bound to the market the seller is *registered* in.
 *
 * Nearly every page in this portal carried its own
 * `function fmt(n) { return '₹' + n.toLocaleString('en-IN'); }`, so a Qatari
 * seller — under a header that correctly read "Qatar Seller Central", with a
 * "Bank Transfer" payout label and a Commercial Registration badge — had every
 * figure on every screen rendered in rupees with Indian digit grouping. See
 * [[localization-architecture]]: currency belongs to the registry, never to a
 * literal in a page.
 *
 * The seller's own region wins over the one they are browsing from, matching the
 * portal shell: a Qatari seller travelling through India is still paid in QAR.
 */
export function useSellerMoney() {
  const { seller } = useSeller();
  const { country: browsingCountry } = useRegion();

  const countryCode = seller.regionCode ?? browsingCountry.code;

  const format = useCallback(
    (amount: number | string | null | undefined, opts?: { decimals?: number }) => {
      // A missing figure is shown as missing. Rendering `null` as a formatted
      // zero is what let a failed wallet lookup read as an empty wallet.
      if (amount === null || amount === undefined || amount === '') return '—';
      return formatMoney(amount, { country: countryCode, ...opts });
    },
    [countryCode],
  );

  return {
    /** Format an amount in the seller's own currency. Returns "—" for null. */
    format,
    countryCode,
    currency: getCountry(countryCode).currency,
  };
}
