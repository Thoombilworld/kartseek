'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Star,
  Phone,
  ArrowLeft,
  X,
  Home,
  Briefcase,
  Building2,
} from 'lucide-react';
import { usePincodeSearchLog } from '@/lib/contexts/pincode-search-log';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { validateAddress, validatePhone } from '@/lib/localization/address';
import { getCountry } from '@/lib/localization';
import { normaliseSavedAddress } from './normalise';
import type { AddressFieldKey } from '@/lib/localization/types';
import {
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
} from '@/lib/api/user';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
import { LoadFailed } from '@/components/shared/load-failed';
type Address = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  type: 'home' | 'work' | 'other';
  isDefault: boolean;
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  home: { label: 'Home', icon: Home, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  work: { label: 'Work', icon: Briefcase, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  other: { label: 'Other', icon: Building2, color: 'bg-slate-50 text-slate-600 border-slate-200' },
};

/**
 * One address input.
 *
 * Extracted because the seven fields below repeated the same markup with the
 * same two faults: `outline-none` with no `focus:` replacement, which erased the
 * keyboard focus ring entirely (WCAG 2.4.7), and no place to render an error, so
 * the asterisk in every label promised a rule nothing enforced.
 */
function AddressField({
  id,
  label,
  value,
  onChange,
  error,
  required,
  placeholder,
  inputMode,
  maxLength,
  mono,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'tel';
  maxLength?: number;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor={id}>
        {label}
        {required && ' *'}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          'w-full border rounded-lg px-3 py-2.5 text-sm transition-colors',
          'outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
          error ? 'border-red-400 bg-red-50/40' : 'border-slate-200',
          mono ? 'font-mono' : '',
        ].join(' ')}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AddressBookPage() {
  const { user, isHydrated } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  // Distinguishes "the request failed" from "you have no addresses".
  // The catch below emptied the list and recorded nothing, so an
  // unreachable service rendered the empty state and told the customer
  // something untrue about their account.
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    type: 'home' as 'home' | 'work' | 'other',
  });
  /** Per-field messages from the region's address spec. Keyed as the spec keys them. */
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AddressFieldKey, string>>>({});
  /** One message for a write that failed, shown where the action was taken. */
  const [actionError, setActionError] = useState<string | null>(null);
  const { logPincodeSearch } = usePincodeSearchLog();
  const { country } = useRegion();

  const loadAddresses = useCallback(async () => {
    // AuthProvider hydrates from storage in an effect, so `user` is empty on the
    // first render even for a signed-in customer. Marking that as a failure
    // painted "could not load your addresses" over a list that then loaded fine.
    if (!isHydrated) return;
    if (!user?.id) {
      setAddresses([]);
      setLoadFailed(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res: any = await getUserAddresses(user.id);
      const list = res?.addresses ?? res?.data ?? [];
      setAddresses(Array.isArray(list) ? list : []);
      setLoadFailed(false);
    } catch {
      setAddresses([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isHydrated]);

  /**
   * Rows as the cards render them. user-service stores `label` rather than
   * `type` and whichever fields the address's own market uses, so the raw row
   * is normalised before anything indexes into it — see ./normalise.ts.
   */
  const rows = useMemo(
    () =>
      addresses.map((a) =>
        normaliseSavedAddress(a as unknown as Record<string, unknown>, country.code),
      ),
    [addresses, country.code],
  );

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  /**
   * Turn a failed write into something the customer can read.
   *
   * Every mutation on this page used to end in a bare `catch {}`. Deleting an
   * address that the API refused did nothing at all — no row removed, no
   * message — and a failed save left the dialog open with the spinner stopped
   * and no explanation, because `setShowAdd(false)` sits inside the `try`.
   */
  const describeFailure = (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback;

  const setDefault = async (id: string) => {
    if (!user?.id) return;
    setActionError(null);
    try {
      await updateUserAddress(user.id, id, { isDefault: true });
      await loadAddresses();
    } catch (err) {
      setActionError(
        describeFailure(err, 'We could not set that as your default address. Please try again.'),
      );
    }
  };

  const removeAddress = async (id: string) => {
    if (!user?.id) return;
    setActionError(null);
    try {
      await deleteUserAddress(user.id, id);
      await loadAddresses();
    } catch (err) {
      setActionError(describeFailure(err, 'We could not delete that address. Please try again.'));
    }
  };

  /**
   * Validate against the region's own address spec, not a hard-coded Indian one.
   *
   * Nothing was validated here at all: every field was marked with an asterisk
   * and an entirely empty address saved cleanly, which then travelled to
   * checkout and to the courier. `validateAddress` and `validatePhone` already
   * knew each country's required fields, postal-code pattern and phone length —
   * a Qatari address is not failed for a missing PIN code, an Indian one is not
   * failed for a missing zone number — this page simply never called them.
   */
  const validateForm = (): boolean => {
    const { errors } = validateAddress(
      {
        fullName: form.name,
        phone: form.phone,
        line1: form.line1,
        line2: form.line2,
        city: form.city,
        state: form.state,
        postalCode: form.pincode,
      },
      country.code,
    );

    const phoneCheck = validatePhone(form.phone, country.code);
    if (!phoneCheck.valid && phoneCheck.message) errors.phone = phoneCheck.message;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveAddress = async () => {
    if (!user?.id) return;
    setActionError(null);
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editId) await updateUserAddress(user.id, editId, form);
      else await addUserAddress(user.id, { ...form, isDefault: addresses.length === 0 });
      if (form.pincode.length >= 5) {
        try {
          logPincodeSearch({
            pincode: form.pincode,
            source: 'address_form',
            serviceable: true,
            city: form.city,
            state: form.state,
            regionCode: country.code,
            module: 'marketplace',
          });
        } catch {}
      }
      setShowAdd(false);
      setFieldErrors({});
      await loadAddresses();
    } catch (err) {
      setActionError(
        describeFailure(
          err,
          'We could not save this address. Please check the details and try again.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (addr: Address) => {
    setForm({
      name: addr.name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      type: addr.type,
    });
    setEditId(addr.id);
    setShowAdd(true);
  };

  const openNew = () => {
    setForm({
      name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      type: 'home',
    });
    setEditId(null);
    setShowAdd(true);
  };

  if (loadFailed) {
    return (
      <LoadFailed
        title="We could not load your addresses"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-3 xs:px-4 py-6 space-y-5 pb-mobile-nav">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900">My Addresses</h1>
          <p className="text-sm text-slate-500">Manage your delivery addresses</p>
        </div>
        <button
          onClick={openNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New
        </button>
      </div>

      {/* Delete and set-default are triggered from the list, with the dialog
          closed — so their failures need somewhere to land out here too. */}
      {actionError && !showAdd && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {actionError}
        </div>
      )}

      <div className="space-y-3">
        {loading &&
          [0, 1].map((i) => (
            <div
              key={`sk-${i}`}
              className="bg-white border border-slate-200 rounded-xl p-5 h-32 animate-pulse"
            />
          ))}
        {!loading && addresses.length === 0 && (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
            <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-bold">No saved addresses</p>
            <p className="text-xs text-slate-400 mt-1">
              Add a delivery address to speed up checkout
            </p>
          </div>
        )}
        {!loading &&
          rows.map((addr) => {
            const cfg = TYPE_CONFIG[addr.type];
            return (
              <div
                key={addr.id}
                className={`bg-white border rounded-xl p-5 relative ${addr.isDefault ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="font-bold text-slate-900">{addr.name || '—'}</p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color} flex items-center gap-1`}
                      >
                        <cfg.icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-emerald-500" />
                          Default
                        </span>
                      )}
                      {addr.foreign && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Delivers in {getCountry(addr.country).name}
                        </span>
                      )}
                    </div>
                    {addr.lines.length === 0 && (
                      <p className="text-sm text-slate-400">No address details saved</p>
                    )}
                    {addr.lines.map((line, i) => (
                      <p key={i} className="text-sm text-slate-600">
                        {line}
                      </p>
                    ))}
                    {addr.phone && (
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {addr.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* The edit form is shaped for the market being browsed; a row
                      from another market cannot round-trip through it. */}
                    {!addr.foreign && (
                      <button
                        onClick={() =>
                          openEdit({
                            ...(addr.raw as Record<string, unknown>),
                            name: addr.name,
                            type: addr.type,
                          } as unknown as Address)
                        }
                        aria-label={`Edit ${addr.name || 'address'}`}
                        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeAddress(addr.id)}
                      aria-label={`Delete ${addr.name || 'address'}`}
                      className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {!addr.isDefault && (
                  <button
                    onClick={() => setDefault(addr.id)}
                    className="mt-3 text-xs text-blue-600 font-bold hover:underline"
                  >
                    Set as Default
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAdd(false)}
          >
            <DismissOnEscape onDismiss={() => setShowAdd(false)} />
          </div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-900">
                {editId ? 'Edit Address' : 'Add New Address'}
              </h3>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Address Type
                </label>
                <div className="flex gap-2">
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setForm((f) => ({ ...f, type: key as any }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 ${form.type === key ? cfg.color + ' ring-2 ring-blue-200' : 'border-slate-200 text-slate-500'}`}
                    >
                      <cfg.icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <AddressField
                  id="full-name"
                  label="Full Name"
                  required
                  value={form.name}
                  error={fieldErrors.fullName}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                />
                <AddressField
                  id="phone"
                  label="Phone"
                  required
                  inputMode="tel"
                  value={form.phone}
                  error={fieldErrors.phone}
                  onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                />
              </div>
              <AddressField
                id="address-line-1"
                label="Address Line 1"
                required
                value={form.line1}
                error={fieldErrors.line1}
                placeholder="House/Flat No., Building Name"
                onChange={(v) => setForm((f) => ({ ...f, line1: v }))}
              />
              <AddressField
                id="address-line-2"
                label="Address Line 2"
                value={form.line2}
                error={fieldErrors.line2}
                placeholder="Street, Area, Landmark"
                onChange={(v) => setForm((f) => ({ ...f, line2: v }))}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AddressField
                  id="city"
                  label="City"
                  required
                  value={form.city}
                  error={fieldErrors.city}
                  onChange={(v) => setForm((f) => ({ ...f, city: v }))}
                />
                <AddressField
                  id="state"
                  label="State"
                  required
                  value={form.state}
                  error={fieldErrors.state}
                  onChange={(v) => setForm((f) => ({ ...f, state: v }))}
                />
                <AddressField
                  id="pincode"
                  label={country.address.hasPostalCode ? 'Postal Code' : 'Postal Code (optional)'}
                  required={country.address.hasPostalCode}
                  inputMode="numeric"
                  mono
                  value={form.pincode}
                  error={fieldErrors.postalCode}
                  onChange={(v) => setForm((f) => ({ ...f, pincode: v }))}
                />
              </div>
            </div>
            {actionError && (
              <div
                role="alert"
                className="mx-5 mb-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
              >
                {actionError}
              </div>
            )}
            <div className="flex gap-3 p-5 border-t border-slate-200">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveAddress}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {saving ? 'Saving…' : editId ? 'Update' : 'Save Address'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
