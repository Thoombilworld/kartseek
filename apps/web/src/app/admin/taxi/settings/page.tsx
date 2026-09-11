'use client';

import React, { useState } from 'react';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  Globe,
  Save,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Car,
  CreditCard,
  FileText,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Settings2,
  Zap,
} from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';
import type { TaxiCountryConfig, TaxiCountryConfigInput } from '@/lib/api/admin-taxi';
import { useAdminData } from '@/hooks/useAdminData';
import {
  AdminForbidden,
  AdminLoading,
  AdminNotConnected,
  classifyApiFailure,
  type ApiFailureKind,
} from '@/components/admin/api-states';

/**
 * Per-country taxi configuration — the `taxi_country_configs` row, read and
 * written through the authenticated client.
 *
 * Three things were wrong here and each has a fix below.
 *
 * 1. The reads were bare `fetch()` calls with no `Authorization` header, so in
 *    production they were 401 and the screen kept its `defaultConfig` — a
 *    complete invented configuration — while looking like it had loaded one.
 * 2. `res.json()` is not the row. The gateway wraps every response
 *    (`{ success, data, timestamp }`), and the page merged *that* into state,
 *    so it never applied the fetched configuration at all and then PUT the
 *    envelope keys back: `property success should not exist` (400) while
 *    rendering "Saved!". Unwrapping alone is not enough either — the row then
 *    carries `createdAt`/`updatedAt`, which `TaxiConfigUpsertDto` also refuses.
 *    `toConfigInput` whitelists the writable columns, so only they are sent.
 * 3. `COUNTRY_OPTIONS` held two `code: 'IN'` rows and `.find()` returned the
 *    first, whose currency was the symbol `₹` — posted into an ISO-4217 column
 *    and now refused by the DTO. The list no longer carries a currency at all:
 *    the configuration's own `currency` is the only one that means anything.
 */

// ─── Data ─────────────────────────────────────────────────────────────────────

export const TAXI_CONFIG_ROUTE = 'GET /admin/taxi/config/:countryCode';

/** One row per market, and only one. */
export const COUNTRY_OPTIONS = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AE', label: 'UAE' },
  { code: 'QA', label: 'Qatar' },
] as const;

const ALL_PAYMENT_GATEWAYS = [
  'cash',
  'card',
  'wallet',
  'upi',
  'bank_transfer',
  'paypal',
  'apple_pay',
  'google_pay',
];
const ALL_VEHICLE_TYPES = [
  'economy',
  'comfort',
  'premium',
  'bike',
  'suv',
  'delivery',
  'rickshaw',
  'luxury',
];
const ALL_VENDOR_DOCS = [
  'business_license',
  'tax_certificate',
  'insurance_certificate',
  'fleet_registration',
  'address_proof',
];
const ALL_DRIVER_DOCS = [
  'driving_license',
  'vehicle_registration',
  'vehicle_insurance',
  'identity_proof',
  'background_check',
  'profile_photo',
  'vehicle_photo',
  'medical_certificate',
];

/** The decimal columns arrive from Postgres as strings ("0.1500"). */
const nz = (v: unknown, fallback: number): number => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};

/**
 * The fetched row, reduced to exactly what `TaxiConfigUpsertDto` declares.
 *
 * A whitelist rather than a delete-list: a column added to the entity but not
 * to the DTO would otherwise start arriving in the body and make every save a
 * 400 the moment the server shipped it. `countryCode` is left out too — the
 * path parameter and the caller's market decide it, and the controller
 * overwrites whatever the body claims.
 */
export function toConfigInput(row: Partial<TaxiCountryConfig>): TaxiCountryConfigInput {
  return {
    currency: row.currency,
    distanceUnit: row.distanceUnit === 'mi' ? 'mi' : 'km',
    otpRequired: !!row.otpRequired,
    scheduledRidesEnabled: !!row.scheduledRidesEnabled,
    cashEnabled: !!row.cashEnabled,
    tipsEnabled: !!row.tipsEnabled,
    rideShareEnabled: !!row.rideShareEnabled,
    vendorsEnabled: !!row.vendorsEnabled,
    maxStops: nz(row.maxStops, 0),
    enabledPaymentGateways: row.enabledPaymentGateways ?? [],
    enabledVehicleTypes: row.enabledVehicleTypes ?? [],
    requiredVendorDocuments: row.requiredVendorDocuments ?? [],
    requiredDriverDocuments: row.requiredDriverDocuments ?? [],
    platformCommissionRate: nz(row.platformCommissionRate, 0),
    defaultVendorCommissionRate: nz(row.defaultVendorCommissionRate, 0),
    taxRate: nz(row.taxRate, 0),
    surgeLimits: {
      minMultiplier: nz(row.surgeLimits?.minMultiplier, 1),
      maxMultiplier: nz(row.surgeLimits?.maxMultiplier, 1),
      autoEnabled: !!row.surgeLimits?.autoEnabled,
    },
    peakHourConfig: (row.peakHourConfig ?? []).map((p) => ({
      start: nz(p.start, 0),
      end: nz(p.end, 0),
      multiplier: nz(p.multiplier, 1),
      label: p.label ?? 'Peak',
    })),
    // `|| undefined`, not `?? ''`: the column is NOT NULL and the DTO's
    // `@Length(1, 20)` refuses an empty string, so clearing the field posted a
    // guaranteed 400. The upsert merges, so omitting the key leaves the stored
    // number alone — which is the only other thing "no value" can honestly mean.
    emergencyNumber: row.emergencyNumber || undefined,
    defaultLocale: row.defaultLocale ?? 'en',
    minimumDriverRating: nz(row.minimumDriverRating, 0),
    freeWaitingMinutes: nz(row.freeWaitingMinutes, 0),
    autoCancelTimeoutSeconds: nz(row.autoCancelTimeoutSeconds, 0),
  };
}

export type TaxiConfigResult =
  | { ok: true; config: TaxiCountryConfigInput }
  | { ok: false; kind: ApiFailureKind; message: string };

export async function loadTaxiConfig(countryCode: string): Promise<TaxiConfigResult> {
  const res = await adminTaxiApi.getConfig(countryCode);
  if (!res.success || !res.data) {
    const message = res.error || 'The taxi configuration did not answer';
    return { ok: false, kind: classifyApiFailure(message), message };
  }
  return { ok: true, config: toConfigInput(res.data) };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      title={`Toggle ${label}`}
      onClick={onToggle}
      className="flex items-center gap-3 group w-full"
      aria-label={`Toggle ${label}`}
    >
      {enabled ? (
        <ToggleRight className="w-6 h-6 text-emerald-500 shrink-0" />
      ) : (
        <ToggleLeft className="w-6 h-6 text-slate-300 shrink-0" />
      )}
      <span className={`text-sm font-medium ${enabled ? 'text-slate-800' : 'text-slate-400'}`}>
        {label}
      </span>
    </button>
  );
}

function CheckboxGroup({
  title,
  options,
  selected,
  onChange,
  icon: Icon,
}: {
  title: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  icon: React.ElementType;
}) {
  const toggle = (item: string) =>
    onChange(selected.includes(item) ? selected.filter((s) => s !== item) : [...selected, item]);
  const format = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-slate-500" />
        <h4 className="text-sm font-bold text-slate-700">{title}</h4>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
          {selected.length}/{options.length}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`text-left px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
              selected.includes(opt)
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  selected.includes(opt) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                }`}
              >
                {selected.includes(opt) && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              {format(opt)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TaxiSettingsPage() {
  const [country, setCountry] = useState('IN');
  const [draft, setDraft] = useState<TaxiCountryConfigInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAdminData<TaxiConfigResult>(
    () => loadTaxiConfig(country),
    [country],
  );

  /**
   * What is on screen is the fetched configuration until somebody edits it, and
   * their edits after that — never a default one. The screen used to open on a
   * complete invented configuration and keep it whenever the read failed, so an
   * unreachable service looked like a market configured like every other.
   */
  const loaded = data?.ok ? data.config : null;
  const config = draft ?? loaded;
  const dirty = draft !== null;

  const result = data ?? null;
  const failure = result?.ok
    ? null
    : result
      ? { kind: result.kind, message: result.message }
      : error
        ? { kind: classifyApiFailure(error), message: error }
        : null;

  const update = <K extends keyof TaxiCountryConfigInput>(
    key: K,
    value: TaxiCountryConfigInput[K],
  ) => {
    const base = draft ?? loaded;
    if (!base) return;
    setDraft({ ...base, [key]: value });
    setSavedAt(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaveError(null);
    const res = await adminTaxiApi.upsertConfig(country, config);
    setSaving(false);
    if (!res.success) {
      // "Saved!" used to appear whatever happened — including for the 400 the
      // page's own body caused.
      setSaveError(res.error || 'The configuration was not saved');
      setSavedAt(null);
      return;
    }
    setDraft(null);
    setSavedAt(new Date().toLocaleTimeString());
    await refetch();
  };

  const addPeakHour = () =>
    update('peakHourConfig', [
      ...(config?.peakHourConfig ?? []),
      { start: 12, end: 14, multiplier: 1.1, label: 'Custom Peak' },
    ]);

  const removePeakHour = (idx: number) =>
    update(
      'peakHourConfig',
      (config?.peakHourConfig ?? []).filter((_, i) => i !== idx),
    );

  const updatePeakHour = (
    idx: number,
    field: 'start' | 'end' | 'multiplier' | 'label',
    value: number | string,
  ) => {
    const updated = (config?.peakHourConfig ?? []).map((p, i) =>
      i === idx ? { ...p, [field]: value } : p,
    );
    update('peakHourConfig', updated);
  };

  const currentCountry = COUNTRY_OPTIONS.find((c) => c.code === country);

  const header = (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-emerald-600" />
          Taxi settings — per-country configuration
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Features, payment gateways, document requirements and commission rates, as
          `taxi_country_configs` records them.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {savedAt && (
          <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold">
            <CheckCircle className="w-4 h-4" /> Saved at {savedAt}
          </span>
        )}
        <button
          onClick={() => void handleSave()}
          disabled={!dirty || saving || !config}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md ${
            dirty && !saving
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
          id="save-config-btn"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save configuration'}
        </button>
      </div>
    </div>
  );

  const countryPicker = (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-emerald-600" />
        <h3 className="text-sm font-bold text-slate-700">Select country</h3>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {COUNTRY_OPTIONS.map((c) => (
          <button
            key={c.code}
            onClick={() => {
              setCountry(c.code);
              setDraft(null);
              setSavedAt(null);
              setSaveError(null);
            }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
              country === c.code
                ? 'border-emerald-500 bg-emerald-50 shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <CountryFlag code={c.code} size="xl" />
            <span
              className={`text-xs font-bold ${country === c.code ? 'text-emerald-700' : 'text-slate-600'}`}
            >
              {c.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  if (loading && !config) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {header}
        {countryPicker}
        <AdminLoading rows={6} />
      </div>
    );
  }

  if (failure) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {header}
        {countryPicker}
        {failure.kind === 'forbidden' ? (
          <AdminForbidden
            what="the taxi configuration"
            route={`GET /admin/taxi/config/${country}`}
            message={failure.message}
          />
        ) : (
          <AdminNotConnected
            what="The taxi configuration"
            route={`GET /admin/taxi/config/${country}`}
            error={failure.message}
            onRetry={() => void refetch()}
          />
        )}
      </div>
    );
  }

  // Not `return null` — a blank page is the one answer this console must never
  // give. Unreachable while `loadTaxiConfig` resolves a result rather than
  // throwing, which is why it names that rather than a service outage.
  if (!config) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {header}
        {countryPicker}
        <AdminNotConnected
          what="The taxi configuration"
          route={`GET /admin/taxi/config/${country}`}
          error="The page received no result and no error."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {header}
      {saveError && (
        <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {saveError}
        </p>
      )}
      {countryPicker}

      {/* Feature toggles */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> Feature toggles —{' '}
          <CountryFlag code={currentCountry?.code ?? ''} size="sm" /> {currentCountry?.label}
          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            {config.currency ?? 'no currency set'}
          </span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Toggle
            enabled={!!config.otpRequired}
            onToggle={() => update('otpRequired', !config.otpRequired)}
            label="OTP required"
          />
          <Toggle
            enabled={!!config.scheduledRidesEnabled}
            onToggle={() => update('scheduledRidesEnabled', !config.scheduledRidesEnabled)}
            label="Scheduled rides"
          />
          <Toggle
            enabled={!!config.cashEnabled}
            onToggle={() => update('cashEnabled', !config.cashEnabled)}
            label="Cash payments"
          />
          <Toggle
            enabled={!!config.tipsEnabled}
            onToggle={() => update('tipsEnabled', !config.tipsEnabled)}
            label="Tips enabled"
          />
          <Toggle
            enabled={!!config.rideShareEnabled}
            onToggle={() => update('rideShareEnabled', !config.rideShareEnabled)}
            label="Ride sharing"
          />
          <Toggle
            enabled={!!config.vendorsEnabled}
            onToggle={() => update('vendorsEnabled', !config.vendorsEnabled)}
            label="Vendor system"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
          <div>
            <label
              className="text-xs text-slate-500 font-medium mb-1 block"
              htmlFor="input-max-stops"
            >
              Max stops
            </label>
            <input
              type="number"
              value={config.maxStops ?? 0}
              onChange={(e) => update('maxStops', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
              id="input-max-stops"
            />
          </div>
          <div>
            <label
              className="text-xs text-slate-500 font-medium mb-1 block"
              htmlFor="input-emergency"
            >
              Emergency number
            </label>
            <input
              type="text"
              value={config.emergencyNumber ?? ''}
              onChange={(e) => update('emergencyNumber', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
              id="input-emergency"
            />
          </div>
          <div>
            <label
              className="text-xs text-slate-500 font-medium mb-1 block"
              htmlFor="input-free-waiting"
            >
              Free waiting (min)
            </label>
            <input
              type="number"
              value={config.freeWaitingMinutes ?? 0}
              onChange={(e) => update('freeWaitingMinutes', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
              id="input-free-waiting"
            />
          </div>
          <div>
            <label
              className="text-xs text-slate-500 font-medium mb-1 block"
              htmlFor="input-auto-cancel"
            >
              Auto-cancel (sec)
            </label>
            <input
              type="number"
              value={config.autoCancelTimeoutSeconds ?? 0}
              onChange={(e) => update('autoCancelTimeoutSeconds', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
              id="input-auto-cancel"
            />
          </div>
        </div>
      </div>

      {/* Gateways & vehicle types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <CheckboxGroup
            title="Payment gateways"
            icon={CreditCard}
            options={ALL_PAYMENT_GATEWAYS}
            selected={config.enabledPaymentGateways ?? []}
            onChange={(v) => update('enabledPaymentGateways', v)}
          />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <CheckboxGroup
            title="Vehicle types"
            icon={Car}
            options={ALL_VEHICLE_TYPES}
            selected={config.enabledVehicleTypes ?? []}
            onChange={(v) => update('enabledVehicleTypes', v)}
          />
        </div>
      </div>

      {/* Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <CheckboxGroup
            title="Required vendor documents"
            icon={FileText}
            options={ALL_VENDOR_DOCS}
            selected={config.requiredVendorDocuments ?? []}
            onChange={(v) => update('requiredVendorDocuments', v)}
          />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <CheckboxGroup
            title="Required driver documents"
            icon={FileText}
            options={ALL_DRIVER_DOCS}
            selected={config.requiredDriverDocuments ?? []}
            onChange={(v) => update('requiredDriverDocuments', v)}
          />
        </div>
      </div>

      {/* Financial */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-500" /> Financial configuration
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label
              className="text-xs text-slate-500 font-medium mb-1 block"
              htmlFor="input-platform-commission"
            >
              Platform commission (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={((config.platformCommissionRate ?? 0) * 100).toFixed(1)}
              onChange={(e) =>
                update('platformCommissionRate', (parseFloat(e.target.value) || 0) / 100)
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
              id="input-platform-commission"
            />
          </div>
          <div>
            <label
              className="text-xs text-slate-500 font-medium mb-1 block"
              htmlFor="input-vendor-commission"
            >
              Default vendor commission (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={((config.defaultVendorCommissionRate ?? 0) * 100).toFixed(1)}
              onChange={(e) =>
                update('defaultVendorCommissionRate', (parseFloat(e.target.value) || 0) / 100)
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
              id="input-vendor-commission"
            />
          </div>
          <div>
            <label
              className="text-xs text-slate-500 font-medium mb-1 block"
              htmlFor="input-tax-rate"
            >
              Tax rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={((config.taxRate ?? 0) * 100).toFixed(1)}
              onChange={(e) => update('taxRate', (parseFloat(e.target.value) || 0) / 100)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
              id="input-tax-rate"
            />
          </div>
          <div>
            <label
              className="text-xs text-slate-500 font-medium mb-1 block"
              htmlFor="input-min-rating"
            >
              Min driver rating
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={config.minimumDriverRating ?? 0}
              onChange={(e) => update('minimumDriverRating', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
              id="input-min-rating"
            />
          </div>
        </div>
      </div>

      {/* Surge & peak hours */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Surge pricing &amp; peak hours
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <label
              className="text-xs text-slate-500 font-medium mb-1 block"
              htmlFor="input-surge-min"
            >
              Min surge multiplier
            </label>
            <input
              type="number"
              step="0.1"
              value={config.surgeLimits?.minMultiplier ?? 1}
              onChange={(e) =>
                update('surgeLimits', {
                  minMultiplier: parseFloat(e.target.value) || 1,
                  maxMultiplier: config.surgeLimits?.maxMultiplier ?? 1,
                  autoEnabled: !!config.surgeLimits?.autoEnabled,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
              id="input-surge-min"
            />
          </div>
          <div>
            <label
              className="text-xs text-slate-500 font-medium mb-1 block"
              htmlFor="input-surge-max"
            >
              Max surge multiplier
            </label>
            <input
              type="number"
              step="0.1"
              value={config.surgeLimits?.maxMultiplier ?? 1}
              onChange={(e) =>
                update('surgeLimits', {
                  minMultiplier: config.surgeLimits?.minMultiplier ?? 1,
                  maxMultiplier: parseFloat(e.target.value) || 1,
                  autoEnabled: !!config.surgeLimits?.autoEnabled,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
              id="input-surge-max"
            />
          </div>
          <div className="flex items-end">
            <Toggle
              enabled={!!config.surgeLimits?.autoEnabled}
              onToggle={() =>
                update('surgeLimits', {
                  minMultiplier: config.surgeLimits?.minMultiplier ?? 1,
                  maxMultiplier: config.surgeLimits?.maxMultiplier ?? 1,
                  autoEnabled: !config.surgeLimits?.autoEnabled,
                })
              }
              label="Auto surge"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Peak hour windows
            </h4>
            <button
              onClick={addPeakHour}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors"
              id="add-peak-hour-btn"
            >
              <Plus className="w-3.5 h-3.5" /> Add window
            </button>
          </div>
          <div className="space-y-2">
            {(config.peakHourConfig ?? []).map((peak, idx) => (
              <div
                key={idx}
                className="grid grid-cols-5 gap-2 items-center bg-slate-50 p-3 rounded-lg"
              >
                <input
                  title="Peak label"
                  type="text"
                  value={peak.label}
                  onChange={(e) => updatePeakHour(idx, 'label', e.target.value)}
                  className="px-2 py-1.5 rounded border border-slate-200 text-xs font-medium"
                />
                <div className="flex items-center gap-1">
                  <input
                    title="Start hour"
                    type="number"
                    min="0"
                    max="23"
                    value={peak.start}
                    onChange={(e) => updatePeakHour(idx, 'start', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-bold text-center"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    title="End hour"
                    type="number"
                    min="0"
                    max="23"
                    value={peak.end}
                    onChange={(e) => updatePeakHour(idx, 'end', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-bold text-center"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">×</span>
                  <input
                    title="Multiplier"
                    type="number"
                    step="0.05"
                    value={peak.multiplier}
                    onChange={(e) =>
                      updatePeakHour(idx, 'multiplier', parseFloat(e.target.value) || 1)
                    }
                    className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-bold text-center"
                  />
                </div>
                <div className="text-center">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                    +{((peak.multiplier - 1) * 100).toFixed(0)}% surge
                  </span>
                </div>
                <div className="text-right">
                  <button
                    title="Remove peak hour"
                    onClick={() => removePeakHour(idx)}
                    className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                    id={`remove-peak-${idx}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
            {(config.peakHourConfig ?? []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">
                No peak hour windows are configured for this market.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
