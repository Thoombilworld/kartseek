'use client';

import React, { useState, useCallback } from 'react';
import { MapPin, CheckCircle2, XCircle, Loader2, ChevronRight, Truck, Zap } from 'lucide-react';
import { usePinCode, validateIndianPin, type PinCodeResult } from '@/lib/india/pincode';
import { usePincodeSearchLog } from '@/lib/contexts/pincode-search-log';

interface PinCodeInputProps {
  /** Called when a valid PIN is resolved */
  onPinResolved?: (result: PinCodeResult) => void;
  /** Called when PIN is cleared */
  onPinCleared?: () => void;
  /** Show delivery estimate badge */
  showDeliveryEstimate?: boolean;
  /** Show serviceability label */
  showServiceability?: boolean;
  /** Initial value */
  defaultPin?: string;
  /** Input ID for forms */
  id?: string;
  /** Compact mode for inline usage */
  compact?: boolean;
  /** Custom class */
  className?: string;
  /** Label text */
  label?: string;
  /** Required field */
  required?: boolean;
}

/**
 * PinCodeInput — Amazon India / Flipkart style PIN code input
 *
 * Features:
 * - 6-digit PIN code input with real-time validation
 * - Auto-fill city and state from PIN
 * - Delivery estimate display (Same Day / 2–3 Days / 5–7 Days)
 * - Serviceability status (✓ Serviceable / ✗ Not Serviceable)
 * - Local lookup for 80+ known PIN codes (instant, no API)
 * - Debounced API fallback for unknown PIN codes
 *
 * Usage:
 *   <PinCodeInput onPinResolved={(r) => setAddress({ state: r.stateName, district: r.district })} />
 */
export default function PinCodeInput({
  onPinResolved,
  onPinCleared,
  showDeliveryEstimate = true,
  showServiceability = true,
  defaultPin = '',
  id = 'pin-code-input',
  compact = false,
  className = '',
  label = 'Delivery PIN Code',
  required = false,
}: PinCodeInputProps) {
  const [pin, setPin] = useState(defaultPin);
  const { result, isLoading, error, lookup, reset } = usePinCode();
  const { logPincodeSearch } = usePincodeSearchLog();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(val);
    if (val.length === 0) {
      reset();
      onPinCleared?.();
      return;
    }
    if (val.length === 6) {
      lookup(val);
    } else {
      reset();
    }
  }, [lookup, reset, onPinCleared]);

  // Notify parent and log when result arrives
  React.useEffect(() => {
    if (result) {
      onPinResolved?.(result);
      logPincodeSearch({
        pincode: result.pinCode,
        source: 'pincode_input',
        serviceable: result.deliverable,
        city: result.city,
        state: result.stateName,
        regionCode: 'IN',
        module: 'pincode_input',
      });
    }
  }, [result, onPinResolved, logPincodeSearch]);

  // Log unserviceable results from error
  React.useEffect(() => {
    if (error && pin.length === 6) {
      logPincodeSearch({
        pincode: pin,
        source: 'pincode_input',
        serviceable: false,
        regionCode: 'IN',
        module: 'pincode_input',
      });
    }
  }, [error, pin, logPincodeSearch]);

  const tierBadge = result ? {
    1: { label: 'Same Day / Next Day', icon: <Zap className="w-3 h-3" />, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    2: { label: '2–3 Days Delivery', icon: <Truck className="w-3 h-3" />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    3: { label: '5–7 Days Delivery', icon: <Truck className="w-3 h-3" />, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  }[result.tier] : null;

  const isValid = pin.length === 6 && validateIndianPin(pin).valid;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`} id={`${id}-compact`}>
        <div className="relative">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-500" />
          <input
            id={id}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={handleChange}
            placeholder="PIN code"
            aria-label="Enter delivery PIN code"
            className="pl-8 pr-3 py-2 w-32 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
          />
        </div>
        {isLoading && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
        {result && (
          <span className="text-xs text-slate-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {result.city}, {result.stateName}
          </span>
        )}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`} id={`${id}-wrapper`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          <span className="ml-2 text-xs font-normal text-slate-400">(6-digit code)</span>
        </label>
      )}

      {/* Input field */}
      <div className="relative">
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
        <input
          id={id}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={handleChange}
          placeholder="e.g. 400001"
          aria-label={label}
          required={required}
          className={`w-full pl-10 pr-12 py-3 border rounded-xl font-mono text-base tracking-widest transition-all outline-none focus:ring-2 ${
            result
              ? 'border-emerald-400 ring-2 ring-emerald-100 bg-emerald-50/30'
              : error
              ? 'border-red-400 ring-2 ring-red-100'
              : isValid && isLoading
              ? 'border-orange-400 ring-2 ring-orange-100'
              : 'border-slate-300 focus:ring-orange-400 focus:border-orange-400'
          }`}
        />

        {/* Status icon */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {isLoading && <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />}
          {!isLoading && result && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          {!isLoading && error && <XCircle className="w-5 h-5 text-red-400" />}
        </div>
      </div>

      {/* Character counter */}
      {pin.length > 0 && pin.length < 6 && (
        <div className="flex gap-1.5 px-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={`h-0.5 flex-1 rounded-full transition-colors ${i < pin.length ? 'bg-orange-400' : 'bg-slate-200'}`} />
          ))}
        </div>
      )}

      {/* Result card */}
      {result && showServiceability && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
          <div className="flex items-center gap-3 p-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-800 flex items-center gap-1.5 flex-wrap">
                📍 {result.city}
                <ChevronRight className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-600">{result.district}</span>
                <ChevronRight className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-600">{result.stateName}</span>
                {result.isUT && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 rounded-full border border-emerald-200 font-bold">UT</span>}
              </p>
            </div>
          </div>
          {showDeliveryEstimate && tierBadge && (
            <div className={`border-t border-emerald-200 px-3 py-2 flex items-center gap-2 ${tierBadge.cls}`}>
              {tierBadge.icon}
              <span className="text-xs font-bold">{tierBadge.label}</span>
              <span className="text-[10px] opacity-70 ml-auto">Estimated delivery</span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Helper text */}
      {!result && !error && (
        <p className="text-xs text-slate-400 px-1">
          Enter your 6-digit postal PIN code to check delivery availability and estimated timeline.
        </p>
      )}
    </div>
  );
}
