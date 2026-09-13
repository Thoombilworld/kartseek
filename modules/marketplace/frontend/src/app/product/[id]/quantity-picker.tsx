'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { useVariants } from './variant-context';

/**
 * How many to add to the cart.
 *
 * Bounded by the stock of the SKU being bought — the only order-quantity rule
 * the catalogue carries. The page had no quantity control at all; every Add to
 * Cart was one unit and a shopper wanting three had to add three times.
 */
export function QuantityPicker() {
  const variants = useVariants();
  if (!variants) return null;
  const { quantity, setQuantity, availableStock, blockedReason } = variants;
  const disabled = blockedReason !== null;
  const max = Math.max(1, availableStock);

  return (
    <div className="flex items-center gap-3 mt-5">
      <label htmlFor="pdp-quantity" className="text-sm font-bold text-slate-700">
        Quantity
      </label>
      <div
        className={`inline-flex items-center border rounded-sm overflow-hidden ${
          disabled ? 'border-slate-200 opacity-50' : 'border-slate-300'
        }`}
      >
        <button
          type="button"
          onClick={() => setQuantity(quantity - 1)}
          disabled={disabled || quantity <= 1}
          aria-label="Decrease quantity"
          className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          id="pdp-quantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={quantity}
          disabled={disabled}
          onChange={(e) => setQuantity(Number(e.target.value))}
          aria-describedby={availableStock > 0 ? 'pdp-quantity-hint' : undefined}
          className="w-14 h-10 text-center text-sm font-bold text-slate-900 outline-none border-x border-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => setQuantity(quantity + 1)}
          disabled={disabled || quantity >= max}
          aria-label="Increase quantity"
          className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {availableStock > 0 && quantity >= max && (
        <span id="pdp-quantity-hint" className="text-xs text-slate-500">
          Maximum {max} available
        </span>
      )}
    </div>
  );
}
