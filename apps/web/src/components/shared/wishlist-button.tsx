'use client';

import { Heart } from 'lucide-react';
import { useWishlist } from '@/lib/contexts/wishlist-context';
import { useRequireAuth } from '@/lib/contexts/login-prompt';
import { useToast } from '@/lib/contexts/toast-context';

/**
 * The heart on a product card.
 *
 * Exists so a card in a server component (the brand page, the seller page) can
 * still have a working control, and so the several copies of this markup across
 * the storefront stop drifting: some had a handler that only set local state,
 * one had no handler at all.
 */
export function WishlistButton({
  productId,
  className = '',
  size = 'md',
}: {
  productId: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const { has, toggle } = useWishlist();
  const requireAuth = useRequireAuth();
  const toast = useToast();

  const saved = has(productId);
  const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const onClick = (e: React.MouseEvent) => {
    // Cards are wrapped in a <Link>; without this the click navigates instead of
    // saving, which is what makes a heart inside a card feel broken.
    e.preventDefault();
    e.stopPropagation();

    requireAuth({
      reason: 'to save items to your wishlist',
      onAuthenticated: () => {
        void toggle(productId).then((ok) => {
          if (ok) toast.success(saved ? 'Removed from wishlist' : 'Saved to wishlist');
        });
      },
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={saved}
      title={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={className}
    >
      <Heart className={`${icon} transition-colors ${saved ? 'fill-red-500 text-red-500' : 'text-slate-300'}`} />
    </button>
  );
}
