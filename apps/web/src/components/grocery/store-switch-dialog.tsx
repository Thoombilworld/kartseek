'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
import { useGroceryLocale } from '@/i18n/grocery-locale';
/**
 * Asks before replacing a basket that belongs to a different store.
 *
 * A near-identical dialog was written inside `/grocery/cart/page.tsx` and never
 * rendered — the cart had no way to add anything, so the conflict it described
 * could not arise. The rule it enforces is real: `POST /grocery/orders` takes one
 * `storeId`, so a mixed basket cannot be ordered at all.
 *
 * Lives in `components/grocery` because the store page, the product page and the
 * search results all need it.
 */
export function StoreSwitchDialog({
  currentStoreName,
  newStoreName,
  onReplace,
  onCancel,
}: {
  currentStoreName: string;
  newStoreName: string;
  onReplace: () => void;
  onCancel: () => void;
}) {
  const { tr } = useGroceryLocale();
  const replaceRef = useRef<HTMLButtonElement>(null);

  // Escape closes, and focus lands on the dialog rather than staying behind it on
  // the product grid.
  useEffect(() => {
    replaceRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-switch-title"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    ><DismissOnEscape onDismiss={onCancel} />
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 id="store-switch-title" className="font-bold text-slate-900">{tr('Replace cart items?')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{tr('You can only order from one store at a time')}</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-sm text-slate-700 leading-relaxed">{tr('Your cart contains items from')}<span className="font-bold text-slate-900">{currentStoreName}</span>.
            Adding items from <span className="font-bold text-slate-900">{newStoreName}</span> will replace your current cart.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Each order is delivered by a single store, so items cannot be mixed.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 min-h-[44px] rounded-xl text-sm font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >{tr('Keep Current Cart')}</button>
          <button
            ref={replaceRef}
            onClick={onReplace}
            className="flex-1 py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors"
          >{tr('Replace Cart')}</button>
        </div>
      </div>
    </div>
  );
}

export default StoreSwitchDialog;
