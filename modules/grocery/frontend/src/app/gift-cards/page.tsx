'use client';

import React from 'react';
import { GroceryFeatureUnavailable } from '@/components/grocery/feature-unavailable';

/**
 * Gift cards.
 *
 * The page sold gift cards in four denominations and listed the customer's own
 * cards with balances and redeemable codes, all from two constants. Neither the
 * purchase button nor the redeem field reached any endpoint — there is no gift
 * card entity, no balance ledger and no redemption path anywhere in the platform.
 *
 * Showing someone a gift card balance they do not have is a money-shaped lie, so
 * the screen states the position instead.
 */
export default function GroceryGiftCardsPage() {
  return (
    <GroceryFeatureUnavailable
      emoji="🎁"
      title="Gift cards aren't available yet"
      description={
        'Buying and redeeming grocery gift cards is not supported yet — there is no balance to hold them against. Coupon codes are the discount mechanism currently available at checkout.'
      }
      alternative={{ href: '/coupons', label: 'See available coupons' }}
    />
  );
}
