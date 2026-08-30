'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Tag, Copy, Check, Ticket, ArrowRight } from 'lucide-react';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { GROCERY_COUPONS } from '@/lib/grocery-coupons';
import { useGroceryCart } from '@/lib/contexts/grocery-cart-context';

/**
 * Available coupons.
 *
 * This page advertised five codes — FRESH50, DAIRY20, FREEDEL, MEAT100, WELCOME —
 * each with a copy button, an expiry date and a minimum order. The basket accepted
 * two entirely different codes. Every code a customer copied from here was
 * rejected at checkout, which is worse than having no coupons page at all.
 *
 * Both screens now read `lib/grocery-coupons.ts`, so what is listed is exactly
 * what the basket honours, and the thresholds are stated in the local currency
 * rather than the ₹ amounts that were written into the old constants.
 */
export default function GroceryCouponsPage() {
  const { formatPrice, config, tr } = useGroceryLocale();
  const { subtotal } = useGroceryCart();
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard is blocked in some embedded browsers; the code is on screen
      // and selectable either way, so this is not worth an error banner.
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="touch-target -ml-2 text-slate-500 hover:text-green-600 transition-colors" aria-label={tr('Back')}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tr('Coupons')}</h1>
          <p className="text-sm text-slate-500">{tr('Apply any of these at checkout')}</p>
        </div>
      </div>

      <ul className="space-y-3">
        {GROCERY_COUPONS.map((coupon) => {
          const minimum = Math.round(coupon.minOrderFactor * config.delivery.freeThreshold * 100) / 100;
          // Says whether it applies to the basket the customer has right now,
          // rather than showing a static "min order" they have to work out.
          const eligible = subtotal >= minimum;
          const value = coupon.discount(subtotal, config);

          return (
            <li key={coupon.code} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0 text-2xl" aria-hidden="true">
                {coupon.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-slate-900 text-sm">{coupon.title}</h2>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{coupon.category}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{coupon.describe(config)}</p>

                {subtotal > 0 && (
                  <p className={`text-xs font-semibold mt-1 ${eligible ? 'text-green-600' : 'text-amber-600'}`}>
                    {eligible
                      ? coupon.freeDelivery
                        ? 'Applies to your basket — delivery is free'
                        : `Saves ${formatPrice(value)} on your basket`
                      : `Add ${formatPrice(minimum - subtotal)} more to use this`}
                  </p>
                )}

                <button
                  onClick={() => void copyCode(coupon.code)}
                  className="mt-2 inline-flex items-center gap-1.5 border-2 border-dashed border-green-300 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-black tracking-wider hover:bg-green-100 transition-colors"
                  aria-label={`Copy coupon code ${coupon.code}`}
                >
                  {coupon.code}
                  {copied === coupon.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {copied === coupon.code && (
                  <span role="status" className="ml-2 text-xs text-green-600 font-semibold">{tr('Copied')}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <Ticket className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          One coupon per order. Enter the code in the basket to apply it —{' '}
          <Link href="/cart" className="text-green-600 font-semibold hover:underline inline-flex items-center gap-0.5">
            go to your basket <ArrowRight className="w-3 h-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}
