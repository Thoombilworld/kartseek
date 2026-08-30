'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Plus, Edit2, Trash2, Check, Home, Briefcase, Star, X, AlertTriangle } from 'lucide-react';
import { AuthGate } from '@/components/shared/auth-gate';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { usePincodeSearchLog } from '@/lib/contexts/pincode-search-log';
import { useSavedAddresses, type SavedAddress } from '@/lib/hooks/use-saved-addresses';
import { hasPostalCode } from '@/lib/localization';

/**
 * Delivery address book.
 *
 * Previously two addresses in `useState`: "Add New" appended to an array nobody
 * persisted, editing and deleting lasted until the next navigation, and the
 * checkout could not see any of it because it carried its own separate pair. Every
 * operation now goes through `/users/:userId/addresses`, which has existed on the
 * gateway the whole time.
 *
 * Field labels come from the country registry — "PIN Code"/"State" is India's
 * wording, and the same form is used in Doha and London.
 */
export default function AddressesPage() {
  return (
    <AuthGate reason="Sign in to manage your saved delivery addresses.">
      <AddressesPageContent />
    </AuthGate>
  );
}

const LABEL_ICONS: Record<string, typeof Home> = { Home, Office: Briefcase };

const EMPTY_FORM = { label: 'Home', name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };

function AddressesPageContent() {
  const { config, tr } = useGroceryLocale();
  const { addresses, loading, error, add, update, remove, setDefault } = useSavedAddresses();
  const { logPincodeSearch } = usePincodeSearchLog();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Close the modal on Escape — it was a focus trap with only a mouse exit.
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowForm(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showForm]);

  const openEdit = (addr: SavedAddress) => {
    setForm({
      label: addr.label, name: addr.name ?? '', phone: addr.phone ?? '',
      line1: addr.line1, line2: addr.line2 ?? '', city: addr.city,
      state: addr.state ?? '', pincode: addr.pincode,
    });
    setEditId(addr.id);
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    // The postal field is required only where the country issues one.
    //
    // It used to be unconditionally required, so a shopper in Doha could not
    // save a delivery address at all: Qatar has no postal code — the field is
    // labelled "P.O. Box" there, which most residents do not have — and the
    // form refused to submit without it. The platform's own address registry
    // has always had `hasPostalCode: false` for Qatar and marks P.O. Box
    // optional; this form was simply not consulting it.
    const postalRequired = hasPostalCode(config.code);
    const missing: string[] = [];
    if (!form.line1.trim()) missing.push('address line 1');
    if (!form.city.trim()) missing.push('city');
    if (postalRequired && !form.pincode.trim()) {
      missing.push(config.address.postalLabel.toLowerCase());
    }
    if (missing.length > 0) {
      const list = missing.length === 1
        ? missing[0]
        : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;
      setFormError(`${list.charAt(0).toUpperCase()}${list.slice(1)} ${missing.length === 1 ? 'is' : 'are'} required.`);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editId) await update(editId, form);
      else await add(form);

      if (form.pincode.trim().length >= 4) {
        try {
          logPincodeSearch({
            pincode: form.pincode.trim(), source: 'address_form', serviceable: true,
            city: form.city, state: form.state, regionCode: config.code, module: 'grocery',
          });
        } catch { /* analytics only */ }
      }

      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
    } catch (e) {
      // Stay open with the entered values so nothing typed is lost.
      setFormError(e instanceof Error ? e.message : 'Could not save this address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const runOn = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try { await fn(); } catch { /* the list refreshes; a failed action simply does not apply */ }
    finally { setBusyId(null); }
  };

  const FIELDS = [
    { key: 'name',    label: 'Full Name',        placeholder: 'Your name' },
    { key: 'phone',   label: 'Phone',            placeholder: config.address.phonePrefix + ' ' + config.address.phoneFormat },
    { key: 'line1',   label: 'Address Line 1',   placeholder: 'House / flat no., building', required: true },
    { key: 'line2',   label: 'Address Line 2',   placeholder: 'Street, locality' },
    { key: 'city',    label: 'City',             placeholder: 'City', required: true },
    { key: 'state',   label: config.address.zoneLabel,   placeholder: config.address.zoneLabel },
    { key: 'pincode', label: config.address.postalLabel, placeholder: config.address.postalLabel, required: hasPostalCode(config.code) },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/grocery" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />{tr('Back to Grocery')}</Link>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 text-blue-600" /></div>
              <div className="min-w-0">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{tr('Delivery Addresses')}</h1>
                <p className="text-sm text-slate-500">
                  {loading ? 'Loading…' : `${addresses.length} saved ${addresses.length === 1 ? 'address' : 'addresses'}`}
                </p>
              </div>
            </div>
            <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setFormError(null); setShowForm(true); }} className="shrink-0 flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
              <Plus className="w-4 h-4" />{tr('Add New')}</button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {error && (
          <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {loading && addresses.length === 0 && (
          <div className="space-y-3" aria-busy="true">
            <div className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
            <div className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
          </div>
        )}

        {!loading && addresses.length === 0 && !error && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h2 className="font-bold text-slate-800 mb-1">{tr('No addresses yet')}</h2>
            <p className="text-sm text-slate-500">{tr('Add one so we know where to deliver your groceries.')}</p>
          </div>
        )}

        {addresses.map((addr) => {
          const Icon = LABEL_ICONS[addr.label] ?? MapPin;
          const busy = busyId === addr.id;
          return (
            <div key={addr.id} className={`bg-white rounded-xl border-2 p-4 transition-all ${addr.isDefault ? 'border-green-400 shadow-sm' : 'border-slate-200'} ${busy ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${addr.isDefault ? 'bg-green-100' : 'bg-slate-100'}`}>
                  <Icon className={`w-5 h-5 ${addr.isDefault ? 'text-green-600' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-900">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-green-600" />{tr('Default')}</span>
                    )}
                  </div>
                  {addr.name && <p className="text-sm text-slate-700 font-medium">{addr.name}</p>}
                  <p className="text-xs text-slate-500 mt-0.5">{addr.formatted}</p>
                  {addr.phone && <p className="text-xs text-slate-500 mt-1">📞 {addr.phone}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {!addr.isDefault && (
                    <button onClick={() => runOn(addr.id, () => setDefault(addr.id))} disabled={busy} className="px-3 py-1.5 text-[11px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-50">{tr('Set Default')}</button>
                  )}
                  <button onClick={() => openEdit(addr)} disabled={busy} className="w-8 h-8 bg-slate-100 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50" aria-label={`Edit ${addr.label} address`}>
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button onClick={() => runOn(addr.id, () => remove(addr.id))} disabled={busy} className="w-8 h-8 bg-slate-100 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50" aria-label={`Delete ${addr.label} address`}>
                    <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={editId ? 'Edit address' : 'Add address'}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-black text-slate-900">{editId ? 'Edit Address' : 'Add New Address'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200" aria-label={tr('Close')}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                {['Home', 'Office', 'Other'].map((l) => (
                  <button key={l} type="button" onClick={() => setForm((f) => ({ ...f, label: l }))} aria-pressed={form.label === l} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${form.label === l ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>
                ))}
              </div>
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label htmlFor={`addr-${f.key}`} className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                    {f.label}{'required' in f && f.required ? ' *' : ''}
                  </label>
                  <input
                    id={`addr-${f.key}`}
                    type="text"
                    placeholder={f.placeholder}
                    value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400"
                  />
                </div>
              ))}
              {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}
              <button onClick={handleSave} disabled={saving} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center gap-2">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{tr('Saving…')}</>
                  : <><Check className="w-4 h-4" /> {editId ? 'Update Address' : 'Save Address'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
