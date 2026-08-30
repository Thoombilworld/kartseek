'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, UserPlus, UserCheck, Users } from 'lucide-react';
import { followBrand, unfollowBrand, isFollowingBrand, getFollowerCount } from '@/lib/api/brand-follow';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRequireAuth } from '@/lib/contexts/login-prompt';

/**
 * Brand ids reach this component straight off a product (`product.brand?.id ||
 * 'unknown'`), so a product with no brand relation would otherwise send the
 * literal string `unknown` to an endpoint whose column is a uuid — which comes
 * back as a 500, not a 404. Only call the API for something that can be one.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface BrandFollowButtonProps {
  /** Brand ID for API calls */
  brandId: string;
  /** Brand name for UI labels */
  brandName?: string;
  /** Display variant: 'full' (brand page hero), 'compact' (product page inline) */
  variant?: 'full' | 'compact';
  /** Show follower count badge */
  showCount?: boolean;
  /** Optional class overrides */
  className?: string;
}

/**
 * Amazon/Flipkart-style Brand Follow button with optimistic toggle.
 *
 * - `full` variant: Large button for brand page hero section
 * - `compact` variant: Inline button for product detail pages
 */
export function BrandFollowButton({
  brandId,
  brandName = 'this brand',
  variant = 'full',
  showCount = true,
  className = '',
}: BrandFollowButtonProps) {
  const { isAuthenticated, isHydrated } = useAuth();
  const requireAuth = useRequireAuth();

  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState(false);

  const validBrand = UUID_RE.test(brandId);

  // Restore follow status and count from the server.
  //
  // `isAuthenticated` has to stay in the dependency list: AuthProvider hydrates
  // the session inside an effect, so the first render of this component is
  // always signed-out. Reading the status only once would ask the server "does
  // nobody follow this brand?" and then latch that answer — which is what made
  // the button forget an existing follow on every page load.
  useEffect(() => {
    if (!validBrand || !isHydrated) return;
    let cancelled = false;

    async function fetchStatus() {
      // The count is public; the follow status is per-user and 401s when signed
      // out, so only ask for what the current session can actually answer.
      const [followRes, countRes] = await Promise.allSettled([
        isAuthenticated ? isFollowingBrand(brandId) : Promise.resolve({ isFollowing: false }),
        getFollowerCount(brandId),
      ]);

      if (cancelled) return;

      // `api.get` unwraps the gateway's `{ success, data }` envelope, so these
      // read the payload directly. Reading `.isFollowing` off the envelope was
      // always `undefined`, which the `?? false` below quietly turned into "not
      // following" no matter what the server said.
      if (followRes.status === 'fulfilled') {
        setIsFollowing(followRes.value?.isFollowing ?? false);
      }
      if (countRes.status === 'fulfilled') {
        setFollowerCount(Number(countRes.value?.count ?? 0) || 0);
      }
      setLoading(false);
    }

    fetchStatus();
    return () => { cancelled = true; };
  }, [brandId, validBrand, isAuthenticated, isHydrated]);

  const toggleFollow = useCallback(async () => {
    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount(c => wasFollowing ? Math.max(0, c - 1) : c + 1);
    setAnimating(true);

    try {
      // The typed client throws on a non-2xx response. The raw `fetch` this
      // replaced resolved on 401/500 alike, so a rejected follow still left the
      // button reading "Following" until the next reload contradicted it.
      if (wasFollowing) await unfollowBrand(brandId);
      else await followBrand(brandId);
    } catch {
      // Revert on failure
      setIsFollowing(wasFollowing);
      setFollowerCount(c => wasFollowing ? c + 1 : Math.max(0, c - 1));
    }
  }, [brandId, isFollowing]);

  const handleToggle = useCallback(() => {
    if (!validBrand) return;
    // Following is stored against the signed-in account, so an anonymous click
    // would be dropped on the floor. Prompt in place and resume the toggle.
    requireAuth({
      reason: `to follow ${brandName} and get their updates`,
      onAuthenticated: () => { void toggleFollow(); },
    });
  }, [validBrand, requireAuth, brandName, toggleFollow]);

  // Drop the press animation without leaving a timer to fire into an unmounted
  // component when the customer navigates away mid-animation.
  useEffect(() => {
    if (!animating) return;
    const t = setTimeout(() => setAnimating(false), 600);
    return () => clearTimeout(t);
  }, [animating]);

  const formattedCount = followerCount >= 1000
    ? `${(followerCount / 1000).toFixed(1).replace(/\.0$/, '')}k`
    : `${followerCount}`;

  // Nothing to follow — a product with no brand relation. Rendering a dead
  // button that can only ever error is worse than rendering nothing.
  if (!validBrand) return null;

  // ── Full variant (brand page hero) ──────────────────────────────────────────
  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`
            group relative flex items-center gap-2 font-bold py-3 px-6 rounded-xl text-sm
            transition-all duration-300 shadow-lg
            ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            ${isFollowing
              ? 'bg-white/10 text-white border border-white/30 hover:bg-red-500/20 hover:border-red-400/50 hover:text-red-300 backdrop-blur-sm'
              : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/25'
            }
            ${animating ? 'scale-95' : 'scale-100'}
          `}
          title={isFollowing ? `Unfollow ${brandName}` : `Follow ${brandName} for updates`}
        >
          {isFollowing ? (
            <>
              <BellRing className={`w-4 h-4 ${animating ? 'animate-bounce' : ''}`} />
              <span className="group-hover:hidden">Following</span>
              <span className="hidden group-hover:inline">Unfollow</span>
            </>
          ) : (
            <>
              <UserPlus className={`w-4 h-4 ${animating ? 'animate-bounce' : ''}`} />
              <span>Follow Brand</span>
            </>
          )}
        </button>

        {showCount && (
          <div className="flex items-center gap-1.5 text-sm text-slate-300">
            <Users className="w-4 h-4" />
            <span>{formattedCount} followers</span>
          </div>
        )}
      </div>
    );
  }

  // ── Compact variant (product page inline) ───────────────────────────────────
  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`
        inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
        transition-all duration-300 border
        ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        ${isFollowing
          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
        }
        ${animating ? 'scale-95' : 'scale-100'}
        ${className}
      `}
      title={isFollowing ? `Unfollow ${brandName}` : `Follow ${brandName}`}
    >
      {isFollowing ? (
        <>
          <UserCheck className={`w-3.5 h-3.5 ${animating ? 'animate-bounce' : ''}`} />
          <span>Following</span>
        </>
      ) : (
        <>
          <Bell className={`w-3.5 h-3.5 ${animating ? 'animate-bounce' : ''}`} />
          <span>Follow</span>
        </>
      )}
      {showCount && followerCount > 0 && (
        <span className="text-[10px] opacity-60 ml-0.5">({formattedCount})</span>
      )}
    </button>
  );
}
