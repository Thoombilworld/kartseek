'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Store, Clock, Truck, Save, AlertTriangle, Check } from 'lucide-react';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';
import { StoreGate } from '@/components/seller/grocery/store-gate';
import type { GrocerySellerStore } from '@/lib/hooks/use-grocery-seller-store';

/**
 * Store settings.
 *
 * Two separate reasons nothing here saved:
 *
 *  1. `updateStoreSettings('current-store', …)` — not a store id, so the request
 *     404'd, and `catch { /* best effort *\/ }` swallowed it before the page showed
 *     "Saved!" regardless.
 *  2. The payload was `{ operatingHours, section }`. The service whitelists
 *     `openingHours` (different key) and has no `section` field, so both were
 *     dropped — even against a real store the save was a no-op.
 *
 * The form is now the ten fields the service actually accepts, and the save
 * reports what happened.
 */
export default function StoreSettingsPage() {
  return <StoreGate>{(store) => <SettingsContent store={store} />}</StoreGate>;
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

type Hours = Record<string, { open: string; close: string }>;

function SettingsContent({ store }: { store: GrocerySellerStore }) {
  const { config, formatPrice } = useGroceryLocale();
  const [activeSection, setActiveSection] = useState('profile');

  const [form, setForm] = useState({
    name: store.name ?? '',
    address: store.address ?? '',
    phone: store.phone ?? '',
    logoUrl: store.logoUrl ?? '',
    bannerUrl: store.bannerUrl ?? '',
    deliveryRadius: String(store.deliveryRadius ?? 10),
    minOrderAmount: String(store.minOrderAmount ?? 0),
    deliveryFee: String(store.deliveryFee ?? 0),
    tags: (store.tags ?? []).join(', '),
  });
  const [hours, setHours] = useState<Hours>(
    store.openingHours ?? Object.fromEntries(DAYS.map((d) => [d, { open: '08:00', close: '22:00' }])),
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await groceryApi.updateStoreSettings(store.id, {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        logoUrl: form.logoUrl.trim() || undefined,
        bannerUrl: form.bannerUrl.trim() || undefined,
        deliveryRadius: Number(form.deliveryRadius) || 0,
        minOrderAmount: Number(form.minOrderAmount) || 0,
        deliveryFee: Number(form.deliveryFee) || 0,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        // The entity's column is `openingHours`; the old payload used
        // `operatingHours`, which the whitelist silently dropped.
        openingHours: hours,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your settings');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'profile',  label: 'Store Profile',    icon: Store },
    { id: 'hours',    label: 'Operating Hours',  icon: Clock },
    { id: 'delivery', label: 'Delivery Settings', icon: Truck },
  ];

  const field = (key: keyof typeof form, label: string, opts: { type?: string; placeholder?: string; help?: string } = {}) => (
    <div key={key}>
      <label htmlFor={`store-${key}`} className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">{label}</label>
      <input
        id={`store-${key}`}
        type={opts.type ?? 'text'}
        placeholder={opts.placeholder}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
      />
      {opts.help && <p className="text-xs text-slate-400 mt-1">{opts.help}</p>}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Store Settings</h1>
          <p className="text-sm text-slate-500">{store.name}</p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white'}`}
        >
          {saved ? <><Check className="w-4 h-4" /> Saved</> : saving ? 'Saving…' : <><Save className="w-4 h-4" /> Save changes</>}
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <nav className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 space-y-0.5 lg:sticky lg:top-24 h-fit" aria-label="Settings sections">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                aria-current={activeSection === s.id ? 'true' : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeSection === s.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Icon className={`w-4 h-4 ${activeSection === s.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="lg:col-span-3 space-y-5">
          {activeSection === 'profile' && (
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Store className="w-4 h-4 text-emerald-600" /> Store Profile</h2>
              {field('name', 'Store name')}
              {field('address', 'Address', { placeholder: config.address.format })}
              {field('phone', 'Phone', { placeholder: `${config.address.phonePrefix} ${config.address.phoneFormat}` })}
              {field('tags', 'Tags', { placeholder: 'Featured, Organic, 24/7', help: 'Comma separated. Shown as badges on your storefront.' })}
              {field('logoUrl', 'Logo URL', { placeholder: 'https://…' })}
              {field('bannerUrl', 'Banner URL', { placeholder: 'https://…' })}
            </section>
          )}

          {activeSection === 'hours' && (
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" /> Operating Hours</h2>
              {DAYS.map((day) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-slate-700 shrink-0">{DAY_LABELS[day]}</span>
                  <input
                    type="time"
                    aria-label={`${DAY_LABELS[day]} opening time`}
                    value={hours[day]?.open ?? ''}
                    onChange={(e) => setHours((h) => ({ ...h, [day]: { ...(h[day] ?? { open: '', close: '' }), open: e.target.value } }))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <span className="text-slate-400 text-sm">to</span>
                  <input
                    type="time"
                    aria-label={`${DAY_LABELS[day]} closing time`}
                    value={hours[day]?.close ?? ''}
                    onChange={(e) => setHours((h) => ({ ...h, [day]: { ...(h[day] ?? { open: '', close: '' }), close: e.target.value } }))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              ))}
            </section>
          )}

          {activeSection === 'delivery' && (
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Truck className="w-4 h-4 text-purple-600" /> Delivery Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {field('deliveryRadius', `Delivery radius (${config.delivery.radiusUnit})`, { type: 'number' })}
                {field('minOrderAmount', 'Minimum order', { type: 'number' })}
                {field('deliveryFee', 'Delivery fee', { type: 'number' })}
              </div>
              <p className="text-xs text-slate-400">
                Currently: orders under {formatPrice(Number(form.minOrderAmount) || 0)} are not accepted, and delivery costs {formatPrice(Number(form.deliveryFee) || 0)}.
              </p>
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <Settings className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Serviceable zones and platform-wide delivery limits are set by the platform, not per store.</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
