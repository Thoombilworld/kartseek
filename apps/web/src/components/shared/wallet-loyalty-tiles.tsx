'use client';

/**
 * The wallet and reward-points tiles at the top of the home screen.
 *
 * Both figures were literals in `app/(home)/page.tsx`:
 * `{region.currency} 4,250` and `1,420 pts` with an "≈ 142 value" line under it.
 * Every visitor saw the same balance, signed in or not, and it contradicted the
 * account pages the moment the customer opened one — the profile reports the real
 * balance, which for this account is nothing.
 *
 * Both are now read from the services that own them, and a signed-out visitor is
 * asked to sign in rather than shown somebody's balance.
 */

import React from 'react';
import Link from 'next/link';
import { Wallet, Gift } from 'lucide-react';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { walletApi } from '@/lib/api-endpoints';
import { loadLoyalty, type LoyaltySnapshot } from '@/lib/modules/profile-data';

export function WalletLoyaltyTiles() {
  const { user, isAuthenticated } = useAuth();
  const { formatCurrencyValue } = useRegion();

  const { data: wallet, error: walletError } = useAsyncData<{ balance: number }>(
    async () => {
      const res: any = await walletApi.getBalance(user!.id);
      return { balance: Number(res?.balance ?? 0) };
    },
    [user?.id],
    { enabled: !!user?.id },
  );

  const { data: loyalty, error: loyaltyError } = useAsyncData<LoyaltySnapshot>(
    () => loadLoyalty(),
    [user?.id],
    { enabled: !!user?.id },
  );

  return (
    <section className="grid grid-cols-2 gap-3">
      <Link
        href={isAuthenticated ? '/wallet' : '/auth/login'}
        id="wallet-card"
        className="bg-brand-gradient text-white rounded-2xl p-4 shadow-glow flex items-center justify-between group hover:scale-[1.02] transition-transform"
      >
        <div className="min-w-0">
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-0.5">Wallet</p>
          <TileValue
            authenticated={isAuthenticated}
            value={wallet ? formatCurrencyValue(wallet.balance) : null}
            failed={!!walletError}
          />
          <p className="text-blue-200 text-[10px] mt-0.5">
            {isAuthenticated ? 'Tap to top up' : 'Sign in to view'}
          </p>
        </div>
        <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
          <Wallet className="w-5 h-5" aria-hidden="true" />
        </span>
      </Link>

      <Link
        href={isAuthenticated ? '/loyalty' : '/auth/login'}
        id="loyalty-card"
        className="bg-warm-gradient text-white rounded-2xl p-4 shadow-md flex items-center justify-between group hover:scale-[1.02] transition-transform"
      >
        <div className="min-w-0">
          <p className="text-amber-100 text-xs font-semibold uppercase tracking-wider mb-0.5">Loyalty</p>
          <TileValue
            authenticated={isAuthenticated}
            value={loyalty ? `${loyalty.points.toLocaleString()} pts` : null}
            failed={!!loyaltyError}
          />
          <p className="text-amber-100 text-[10px] mt-0.5">
            {/* The old subtitle asserted a cash value — "≈ QAR 142" — for points
                nobody held. The tier is a fact the service actually reports. */}
            {isAuthenticated ? (loyalty ? loyalty.tier : ' ') : 'Sign in to view'}
          </p>
        </div>
        <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
          <Gift className="w-5 h-5" aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
}

function TileValue({
  authenticated, value, failed,
}: {
  authenticated: boolean;
  value: string | null;
  failed: boolean;
}) {
  if (!authenticated) return <p className="font-black text-xl">Sign in</p>;
  // A balance that could not be loaded reads as unavailable, never as zero:
  // "0" is a statement about the customer's money, and a wrong one.
  if (failed) return <p className="font-bold text-base opacity-80">Unavailable</p>;
  if (value === null) return <span className="block h-7 w-24 rounded bg-white/25 animate-pulse" />;
  return <p className="font-black text-xl">{value}</p>;
}
