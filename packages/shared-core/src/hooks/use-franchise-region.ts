'use client';

import { useMemo } from 'react';
import { useFranchiseId } from './use-franchise-id';
import { franchiseApi, type FranchiseRegion } from '../api/franchise';
import { useAsyncData } from './use-async-data';
import { formatMoney } from '../localization/currency';

/**
 * useFranchiseRegion — the market a franchise operates in, and how to render it.
 *
 * The console formats money in the **franchise's** currency, not the viewer's.
 * That distinction is the whole point: `useRegion()` follows whoever is looking
 * at the screen, so a Doha operator checking their revenue from a hotel in
 * London would have watched their riyals turn into pounds. A franchise settles
 * in one country and its ledger is denominated there regardless of where the
 * person reading it happens to be.
 *
 * Everything comes from `franchises.country_code` through REGION_CONFIGS —
 * currency and its minor units, tax, timezone, and which verticals the market
 * runs. Nothing is stored twice, so a region correction reaches every console
 * without a migration.
 */
export interface FranchiseRegionState {
  region: FranchiseRegion | null;
  /** Format an amount in the franchise's currency. */
  formatCurrency: (amount: number | string | null | undefined) => string;
  /** `QR 1.2K` for dashboard tiles. */
  formatCompact: (amount: number | string | null | undefined) => string;
  /** Whether this vertical is offered in the franchise's market. */
  isModuleEnabled: (module: string) => boolean;
  loading: boolean;
  error: string | null;
}

export function useFranchiseRegion(): FranchiseRegionState {
  const { franchiseId, resolved } = useFranchiseId();

  const { data, loading, error } = useAsyncData<FranchiseRegion | null>(
    async () => (franchiseId ? await franchiseApi.getRegion(franchiseId) : null),
    [franchiseId],
    { enabled: !!franchiseId },
  );

  const region = data?.supported ? data : null;

  return useMemo(() => {
    // Until the market is known, render a plain number rather than a symbol.
    // Showing an amount under the wrong currency sign is worse than showing it
    // under none — one is unreadable, the other is quietly wrong.
    const bare = (amount: number | string | null | undefined) => {
      const n = Number(amount ?? 0);
      return Number.isFinite(n) ? n.toLocaleString('en-US') : '0';
    };

    if (!region) {
      return {
        region: null,
        formatCurrency: bare,
        formatCompact: bare,
        // With no resolved market, claiming a module is unavailable would hide
        // working pages. Nothing is filtered until the answer is known.
        isModuleEnabled: () => true,
        loading: resolved ? loading : false,
        error,
      };
    }

    const country = region.countryCode;
    const enabled = new Set(region.enabledModules ?? []);

    return {
      region,
      formatCurrency: (amount) => formatMoney(amount ?? 0, { country }),
      formatCompact: (amount) => formatMoney(amount ?? 0, { country, compact: true }),
      isModuleEnabled: (module: string) => enabled.has(module),
      loading,
      error,
    };
  }, [region, loading, error, resolved]);
}
