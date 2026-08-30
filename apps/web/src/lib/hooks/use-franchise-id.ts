'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { franchiseApi, type FranchiseMe } from '@/lib/api/franchise';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * useFranchiseId — which franchise estate the signed-in operator manages.
 *
 * Every page under `/franchise` hardcoded `const franchiseId = 'FRAN-123'` with
 * the comment "Temporary hardcoded franchise ID". Nothing on the client could
 * fix that alone: there was no way to get from a user to their estate at all.
 *
 * `franchises.owner_id` always held the answer and simply had no reader, so the
 * fix is a resolver rather than a new column — `GET /franchise/me` takes the
 * owner from the verified token and returns that user's franchise, or null.
 *
 * Resolved per request rather than carried as a JWT claim. A franchise can be
 * created or transferred after sign-in, and a claim minted at login would stay
 * wrong until the user logged out and back in — for a value that decides which
 * estate's revenue you are looking at, that staleness is not acceptable.
 *
 * `resolved` distinguishes the three real states, which the hardcoded constant
 * collapsed into one:
 *   • still loading            → resolved false, loading true
 *   • signed in, owns nothing  → resolved false, franchiseId null  (show the gate)
 *   • signed in, owns an estate→ resolved true
 */
export interface FranchiseIdentity {
  franchiseId: string | null;
  businessName: string | null;
  /** True only when an actual franchise came back for this user. */
  resolved: boolean;
  loading: boolean;
  error: string | null;
}

export function useFranchiseId(): FranchiseIdentity {
  const { isAuthenticated } = useAuth();

  // Gated on `isAuthenticated` and kept in the deps array: AuthProvider hydrates
  // the token in an effect, so a fetch fired on first render goes out without an
  // Authorization header and comes back 401.
  // `api.get` already unwraps the gateway envelope and throws `ApiError` on a
  // non-2xx, which `useAsyncData` turns into `error` — so a franchise-service
  // outage surfaces as an error rather than as "you own no franchise".
  const { data, loading, error } = useAsyncData<FranchiseMe | null>(
    async () => (await franchiseApi.getMine()) ?? null,
    [isAuthenticated],
    { enabled: isAuthenticated },
  );

  return {
    franchiseId: data?.id ?? null,
    businessName: data?.businessName ?? null,
    resolved: !!data?.id,
    loading: isAuthenticated ? loading : false,
    error,
  };
}
