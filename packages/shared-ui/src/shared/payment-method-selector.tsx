'use client';

import React from 'react';
import {
  CreditCard, Wallet, Banknote, Smartphone, Landmark, QrCode, Apple, BadgeCheck,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getPaymentLabel, getPaymentRestriction } from '@/lib/localization';
import type { PaymentMethodSpec } from '@/lib/localization';

const ICONS: Record<string, React.ElementType> = {
  card: CreditCard,
  debit: BadgeCheck,
  wallet: Wallet,
  cash: Banknote,
  phone: Smartphone,
  bank: Landmark,
  qr: QrCode,
  apple: Apple,
  google: CreditCard,
  samsung: CreditCard,
  upi: Smartphone,
};

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (methodType: string) => void;
  /** Order total, so methods outside their supported range are disabled. */
  amount?: number;
  /** Module placing the order — COD is not offered for consultations or rides. */
  module?: string;
  walletBalance?: number;
  className?: string;
}

/**
 * Payment methods for the active region.
 *
 * The list is not cosmetic. A method the customer's bank cannot clear fails at
 * the gateway, which means the order dies at the last step: offering UPI in
 * Doha or Himyan in Delhi produces a decline, not a fallback. Options come from
 * `COUNTRIES[code].payments`, and the region's domestic scheme — Himyan/NAPS in
 * Qatar, UPI in India, KNET in Kuwait — is marked and shown first.
 */
export function PaymentMethodSelector({
  value, onChange, amount, module, walletBalance, className = '',
}: PaymentMethodSelectorProps) {
  const { getPaymentMethodsFor, currentLanguage, country, formatCurrencyValue } = useRegion();

  const methods = getPaymentMethodsFor({ amount, module, walletBalance });

  return (
    <div className={`space-y-3 ${className}`} role="radiogroup" aria-label="Payment method">
      {methods.map((method: PaymentMethodSpec) => {
        const Icon = ICONS[method.icon ?? 'card'] ?? CreditCard;
        const restriction = getPaymentRestriction(method, {
          country: country.code, language: currentLanguage, amount, walletBalance,
        });
        const disabled = !!restriction;
        const selected = value === method.type;

        return (
          <label
            key={method.type}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              disabled
                ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                : selected
                  ? 'border-blue-500 bg-blue-50 cursor-pointer'
                  : 'border-slate-200 hover:border-slate-300 cursor-pointer'
            }`}
          >
            <input
              type="radio"
              name="payment-method"
              value={method.type}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(method.type)}
              className="accent-blue-600"
            />
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              selected ? 'bg-blue-100' : 'bg-slate-100'
            }`}>
              <Icon className={`w-5 h-5 ${selected ? 'text-blue-600' : 'text-slate-500'}`} />
            </span>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                {getPaymentLabel(method, currentLanguage)}
                {method.isLocal && (
                  <span className="text-[9px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                    {country.name}
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                {restriction ?? method.description ?? ''}
              </p>
            </div>

            {method.type === 'wallet' && walletBalance !== undefined && (
              <span className="text-xs font-bold text-blue-600 shrink-0">
                {formatCurrencyValue(walletBalance)}
              </span>
            )}
          </label>
        );
      })}

      {methods.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-6">
          No payment methods are configured for {country.name}. Please contact support.
        </p>
      )}
    </div>
  );
}

export default PaymentMethodSelector;
