'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Save, Settings, Truck, CreditCard, Shield, Zap, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { adminGroceryApi } from '@/lib/api/admin-grocery';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Grocery module settings.
 *
 * Every field on this page was an uncontrolled `defaultValue` input and the Save
 * button did `setSaved(true); setTimeout(() => setSaved(false), 2000)` — it showed
 * "✓ Saved!" and wrote nothing, because `admin.grocery.updateSettings` had no
 * handler and there was no table behind it either. The form also offered a lot of
 * settings that nothing in the platform reads: a per-module currency (currency is
 * per country, from the localization registry), express/standard delivery windows
 * (same), a payment-gateway picker (payment-service owns that), and a "supported
 * countries" list (also the registry).
 *
 * It now shows exactly the keys `GROCERY_SETTING_DEFAULTS` defines and that
 * `grocery_settings` stores — nothing that cannot be saved is presented as
 * editable.
 */

type SettingValue = number | boolean;

interface FieldSpec {
  key: string;
  label: string;
  help?: string;
  type: 'number' | 'boolean';
  min?: number;
  max?: number;
  suffix?: string;
}

const SECTIONS: Array<{ title: string; icon: typeof Settings; iconClass: string; fields: FieldSpec[] }> = [
  {
    title: 'Orders & Fees',
    icon: CreditCard,
    iconClass: 'text-purple-500',
    fields: [
      { key: 'commissionPercent', label: 'Platform commission', type: 'number', min: 0, max: 100, suffix: '%', help: 'Charged to the store when an order is delivered.' },
      { key: 'minOrderAmount', label: 'Minimum order amount', type: 'number', min: 0, help: 'Floor applied when a store has not set its own.' },
    ],
  },
  {
    title: 'Delivery',
    icon: Truck,
    iconClass: 'text-green-500',
    fields: [
      { key: 'defaultDeliveryFee', label: 'Default delivery fee', type: 'number', min: 0 },
      { key: 'freeDeliveryThreshold', label: 'Free delivery above', type: 'number', min: 0 },
      { key: 'maxDeliveryRadiusKm', label: 'Maximum delivery radius', type: 'number', min: 1, max: 100, suffix: 'km' },
    ],
  },
  {
    title: 'Catalogue & Deals',
    icon: Zap,
    iconClass: 'text-amber-500',
    fields: [
      { key: 'flashDealMinDiscountPercent', label: 'Flash deal minimum discount', type: 'number', min: 0, max: 100, suffix: '%' },
      { key: 'lowStockThreshold', label: 'Low-stock alert threshold', type: 'number', min: 0, suffix: 'units', help: 'Sellers are alerted when a variant falls to this level.' },
    ],
  },
  {
    title: 'Onboarding & Moderation',
    icon: Shield,
    iconClass: 'text-blue-500',
    fields: [
      { key: 'acceptingNewSellers', label: 'Accepting new grocery sellers', type: 'boolean' },
      { key: 'autoApproveStores', label: 'Auto-approve new stores', type: 'boolean', help: 'Skips manual KYC review. Off by default.' },
      { key: 'autoApproveProducts', label: 'Auto-approve new products', type: 'boolean' },
    ],
  },
];

export default function AdminGrocerySettingsPage() {
  const [values, setValues] = useState<Record<string, SettingValue>>({});
  const [initial, setInitial] = useState<Record<string, SettingValue>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: loaded, loading, error, reload: load } = useAsyncData<{
    settings: Record<string, SettingValue>;
    overridden: string[];
  }>(
    async () => {
      const res = await adminGroceryApi.getSettings();
      if (!res.success || !res.data) throw new Error(res.error ?? 'Could not load grocery settings');
      return {
        settings: (res.data.settings ?? {}) as Record<string, SettingValue>,
        overridden: res.data.overridden ?? [],
      };
    },
    [],
  );
  const overridden = loaded?.overridden ?? [];

  // `values` is what the admin is editing and `initial` is what the server last
  // confirmed; both are seeded from the same response, and the diff between them
  // is what gets saved. Synced during render rather than in an effect so the
  // form is never briefly editable against empty values.
  const [syncedFrom, setSyncedFrom] = useState<typeof loaded>(null);
  if (loaded && loaded !== syncedFrom) {
    setSyncedFrom(loaded);
    setValues(loaded.settings);
    setInitial(loaded.settings);
  }

  // Only changed keys are sent — the endpoint rejects unknown keys and type
  // mismatches, so a no-op save should be a no-op request.
  const changed = Object.keys(values).filter((k) => values[k] !== initial[k]);

  const handleSave = async () => {
    if (!changed.length) return;
    setSaving(true);
    setSaveError(null);
    const payload = Object.fromEntries(changed.map((k) => [k, values[k]]));
    const res = await adminGroceryApi.updateSettings(payload);
    setSaving(false);
    if (!res.success) {
      setSaveError(res.error ?? 'Could not save these settings');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await load();
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Grocery Module Settings</h1>
          <p className="text-sm text-slate-500">Platform-wide policy for the grocery vertical</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            disabled={loading || saving}
            className="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Reload
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={!changed.length || saving || loading}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white'}`}
          >
            {saved
              ? <><span aria-hidden="true">✓</span> Saved</>
              : saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save{changed.length ? ` (${changed.length})` : ''}</>}
          </button>
        </div>
      </div>

      {/* Load and save failures are separate: a rejected save must not read as
          "settings could not be loaded", which would imply the form on screen is
          not the current configuration. */}
      {error && (
        <div role="alert" className="flex items-start justify-between gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={() => void load()} className="font-bold shrink-0">Retry</button>
        </div>
      )}
      {saveError && (
        <div role="alert" className="flex items-start justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{saveError}</span>
          <button onClick={() => setSaveError(null)} className="font-bold shrink-0">Dismiss</button>
        </div>
      )}

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Currency, tax rates, delivery windows and the country list are per-market and come from the
          localization registry — they are not overridden here.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-40 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-40 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      ) : (
        SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.title} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Icon className={`w-4 h-4 ${section.iconClass}`} /> {section.title}
              </h2>

              <div className={section.fields[0].type === 'boolean' ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                {section.fields.map((field) => {
                  const value = values[field.key];
                  const isOverridden = overridden.includes(field.key);
                  const isDirty = values[field.key] !== initial[field.key];

                  if (field.type === 'boolean') {
                    return (
                      <label key={field.key} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!value}
                          onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.checked }))}
                          className="accent-green-600 mt-0.5"
                        />
                        <span>
                          <span className="text-sm font-medium text-slate-700">
                            {field.label}
                            {isDirty && <span className="ml-2 text-[10px] font-bold text-amber-600 uppercase">unsaved</span>}
                            {!isDirty && isOverridden && <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">custom</span>}
                          </span>
                          {field.help && <span className="block text-xs text-slate-400">{field.help}</span>}
                        </span>
                      </label>
                    );
                  }

                  return (
                    <div key={field.key}>
                      <label htmlFor={field.key} className="text-xs font-semibold text-slate-600 block mb-1">
                        {field.label}
                        {isDirty && <span className="ml-2 text-[10px] font-bold text-amber-600 uppercase">unsaved</span>}
                        {!isDirty && isOverridden && <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">custom</span>}
                      </label>
                      <div className="relative">
                        <input
                          id={field.key}
                          type="number"
                          min={field.min}
                          max={field.max}
                          value={typeof value === 'number' ? value : ''}
                          onChange={(e) => setValues((v) => ({ ...v, [field.key]: Number(e.target.value) }))}
                          className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500/20 ${isDirty ? 'border-amber-300' : 'border-slate-200'} ${field.suffix ? 'pr-14' : ''}`}
                        />
                        {field.suffix && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">{field.suffix}</span>
                        )}
                      </div>
                      {field.help && <p className="text-xs text-slate-400 mt-1">{field.help}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
