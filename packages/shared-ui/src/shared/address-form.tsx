'use client';

import React, { useMemo } from 'react';
import { Info } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getAddressRows, getAddressGuidance, getFieldLabel, type AddressValue } from '@/lib/localization';
import type { AddressFieldKey } from '@/lib/localization';

interface AddressFormProps {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  /** Field key → message. Produced by `useRegion().validateAddressValue`. */
  errors?: Partial<Record<AddressFieldKey, string>>;
  /** Override the region whose format to use (admin editing another market). */
  country?: string;
  className?: string;
}

/**
 * Address form generated from the active region's address specification.
 *
 * The shape of an address is not universal. Qatar has no postal code at all —
 * a location is identified by Building / Street / Zone numbers issued by the
 * Ministry of Municipality — while India routes on a 6-digit PIN and the UK on
 * a postcode. A single hard-coded form with "Address Line 1 / State / Pincode"
 * cannot express a Qatari address, so the customer either invents a postcode or
 * abandons checkout, and the courier gets an address they cannot navigate to.
 *
 * Fields, labels, ordering, validation patterns and row grouping all come from
 * `COUNTRIES[code].address`, so adding a market adds its form.
 */
export function AddressForm({ value, onChange, errors = {}, country, className = '' }: AddressFormProps) {
  const { country: activeCountry, currentLanguage, dir } = useRegion();
  const code = country ?? activeCountry.code;

  const rows = useMemo(() => getAddressRows(code), [code]);
  const guidance = useMemo(() => getAddressGuidance(code), [code]);

  const set = (key: AddressFieldKey, next: string) => onChange({ ...value, [key]: next });

  return (
    <div className={`space-y-4 ${className}`} dir={dir}>
      {guidance && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">{guidance}</p>
        </div>
      )}

      {rows.map((fields, rowIndex) => (
        <div
          key={rowIndex}
          className={`grid grid-cols-1 gap-4 ${
            fields.length === 2 ? 'sm:grid-cols-2' : fields.length >= 3 ? 'sm:grid-cols-3' : ''
          }`}
        >
          {fields.map((field) => {
            const error = errors[field.key];
            const label = getFieldLabel(field, currentLanguage);
            const inputId = `address-${field.key}`;

            return (
              <div key={field.key}>
                <label htmlFor={inputId} className="block text-sm font-bold text-slate-700 mb-1.5">
                  {label}
                  {field.required && <span className="text-red-500 ms-0.5">*</span>}
                </label>
                <input
                  id={inputId}
                  value={(value[field.key] ?? '') as string}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  inputMode={field.inputMode}
                  maxLength={field.maxLength}
                  aria-invalid={!!error}
                  aria-describedby={error ? `${inputId}-error` : field.helper ? `${inputId}-help` : undefined}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none transition-colors focus:ring-1 ${
                    error
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'
                  }`}
                />
                {error ? (
                  <p id={`${inputId}-error`} className="text-xs text-red-600 mt-1">{error}</p>
                ) : field.helper ? (
                  <p id={`${inputId}-help`} className="text-xs text-slate-400 mt-1">{field.helper}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * Read-only rendering of a stored address, in its region's conventions.
 *
 * Bare numbers are prefixed ("Zone 63", not "63") — a Qatari address is three
 * unlabelled integers otherwise, which is unreadable on a delivery label.
 */
export function AddressDisplay({
  value, country, className = '', showCountry = true,
}: { value: AddressValue; country?: string; className?: string; showCountry?: boolean }) {
  const { formatAddressValue, dir } = useRegion();

  const text = country
    ? formatAddressValue({ ...value, country })
    : formatAddressValue(value);

  const lines = text.split(', ');
  const rendered = showCountry ? lines : lines.slice(0, -1);

  return (
    <address className={`not-italic text-sm text-slate-600 leading-relaxed ${className}`} dir={dir}>
      {rendered.join(', ')}
    </address>
  );
}

export default AddressForm;
