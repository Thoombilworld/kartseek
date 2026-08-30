'use client';

import React, { useState } from 'react';
import { Globe, DollarSign, Truck, MapPin, Phone, Shield, Info, Check } from 'lucide-react';
import Link from 'next/link';
import { GROCERY_COUNTRIES, GROCERY_COUNTRY_LIST, type GroceryCountryCode } from '@/i18n/grocery-locale';
import { CountryFlag } from '@/components/shared/country-flag';

/**
 * Country settings — read-only.
 *
 * The Save button called `updateStoreSettings('admin-global', { countryConfig })`:
 * a *store settings* endpoint addressed to a store whose id is the literal string
 * "admin-global", carrying a key the service's whitelist drops, wrapped in
 * `catch { /* best effort *\/ }`. It reported "Saved!" every time and wrote
 * nothing, ever.
 *
 * It could not have worked, because there is nothing to write to. Currency, tax,
 * delivery units, address format and phone conventions all come from
 * `GROCERY_COUNTRIES` in `i18n/grocery-locale.ts` — a compiled-in registry the
 * clients read directly, not a database table. Editing a market means changing
 * that file and shipping it, which is deliberate: these values must be identical
 * across web, both mobile apps and the gateway, and a per-environment override
 * would let them drift.
 *
 * So this screen shows what is in force, and says where to change it.
 */
export default function AdminCountriesPage() {
  const [selected, setSelected] = useState<GroceryCountryCode>('IN');
  const config = GROCERY_COUNTRIES[selected];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Country Settings</h1>
        <p className="text-sm text-slate-500">The market configuration currently in force across every KARTSEEK client</p>
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-800 mb-6">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          These values are compiled into the apps from <code className="font-mono">i18n/grocery-locale.ts</code> so that
          web, the mobile apps and the gateway cannot disagree about what a customer is charged. They are changed
          by shipping a release, not from this console. Platform-wide policy that <em>is</em> editable — commission,
          delivery fees, order minimums — lives in{' '}
          <Link href="/admin/grocery/settings" className="font-bold underline">Grocery Settings</Link>.
        </p>
      </div>

      {/* Country Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
        {GROCERY_COUNTRY_LIST.map(c => (
          <button key={c.code} onClick={() => setSelected(c.code)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shrink-0 transition-colors ${selected === c.code ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <CountryFlag code={c.code} size="md" /> {c.name}
          </button>
        ))}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Currency */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-3"><DollarSign className="w-4 h-4 text-green-600" /> Currency</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-xs text-slate-500">Code</span><span className="text-xs font-bold text-slate-900">{config.currency.code}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Symbol</span><span className="text-xs font-bold text-slate-900">{config.currency.symbol}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Position</span><span className="text-xs font-bold text-slate-900">{config.currency.position}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Decimals</span><span className="text-xs font-bold text-slate-900">{config.currency.decimals}</span></div>
          </div>
        </div>

        {/* Tax */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-3"><Shield className="w-4 h-4 text-blue-600" /> Tax</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-xs text-slate-500">Tax Name</span><span className="text-xs font-bold text-slate-900">{config.tax.name}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Rate</span><span className="text-xs font-bold text-slate-900">{config.tax.rate}%</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Display</span><span className="text-xs font-bold text-slate-900">{config.tax.label}</span></div>
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-3"><Truck className="w-4 h-4 text-amber-600" /> Delivery</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-xs text-slate-500">Radius Unit</span><span className="text-xs font-bold text-slate-900">{config.delivery.radiusUnit}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Max Radius</span><span className="text-xs font-bold text-slate-900">{config.delivery.maxRadius} {config.delivery.radiusUnit}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Free Threshold</span><span className="text-xs font-bold text-slate-900">{config.currency.symbol}{config.delivery.freeThreshold}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Base Fee</span><span className="text-xs font-bold text-slate-900">{config.currency.symbol}{config.delivery.baseFee}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Express</span><span className="text-xs font-bold text-green-600">{config.delivery.expressTime}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Standard</span><span className="text-xs font-bold text-slate-900">{config.delivery.standardTime}</span></div>
          </div>
        </div>

        {/* Address Format */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-3"><MapPin className="w-4 h-4 text-red-600" /> Address</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-xs text-slate-500">Format</span><span className="text-xs font-bold text-slate-900 text-right max-w-[200px]">{config.address.format}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Zone Label</span><span className="text-xs font-bold text-slate-900">{config.address.zoneLabel}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Postal Label</span><span className="text-xs font-bold text-slate-900">{config.address.postalLabel}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Phone Prefix</span><span className="text-xs font-bold text-slate-900">{config.address.phonePrefix}</span></div>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-3"><Globe className="w-4 h-4 text-purple-600" /> Language</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-xs text-slate-500">Primary</span><span className="text-xs font-bold text-slate-900">{config.language.primary.toUpperCase()}</span></div>
            {config.language.secondary && <div className="flex justify-between"><span className="text-xs text-slate-500">Secondary</span><span className="text-xs font-bold text-slate-900">{config.language.secondary.toUpperCase()}</span></div>}
            <div className="flex justify-between"><span className="text-xs text-slate-500">RTL Support</span><span className={`text-xs font-bold ${config.language.rtl ? 'text-green-600' : 'text-slate-400'}`}>{config.language.rtl ? '✓ Enabled' : 'Disabled'}</span></div>
          </div>
        </div>

        {/* Store Types */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Store Types</h3>
          <div className="flex flex-wrap gap-1.5">
            {config.storeTypes.map(t => <span key={t} className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded font-medium">{t}</span>)}
          </div>
        </div>

        {/* Compliance */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 md:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Compliance Requirements</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {config.compliance.map(c => (
              <div key={c} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                <span className="text-xs font-medium text-slate-700">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
