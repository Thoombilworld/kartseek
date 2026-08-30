'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type SellerSettings } from '@/lib/modules/seller-api';
import { useSellerData } from '@/lib/hooks/use-seller-data';
import { SellerDataState } from '@/components/seller/marketplace/data-state';
import { Settings, Save, Bell, Shield, Building2, CreditCard, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getCountry, getSellerRules } from '@/lib/localization';

/**
 * Region-aware field labels.
 *
 * The settings page hard-coded India's tax and banking vocabulary (GSTIN, PAN,
 * IFSC, UPI) regardless of the seller's market, so a Qatari seller saw "GSTIN"
 * and "UPI ID" fields that had no meaning in their jurisdiction. These helpers
 * resolve the right labels from the same localization layer that already powers
 * the nav, the compliance strip and the payout section.
 */
function useRegionLabels() {
  const { seller } = useSeller();
  const { country: browsingCountry } = useRegion();
  const country = seller.regionCode ? getCountry(seller.regionCode) : browsingCountry;
  const rules = getSellerRules(country.code);

  return {
    taxIdLabel: rules.taxIdLabel ?? 'Tax Registration Number',
    taxFilingLabel: rules.taxFilingLabel,
    bankIdentifierLabel: rules.bankIdentifierLabel,
    // Not every market has a second tax ID (India has both GSTIN and PAN).
    // Show the second field only for India.
    showSecondaryTaxId: country.code === 'IN',
    // Not every market uses UPI-style instant transfer IDs.
    showPaymentId: country.code === 'IN',
    postalCodeLabel: country.code === 'IN' ? 'Pincode' : 'Postal Code',
    regionLabel: country.code === 'IN' ? 'State' : 'Region',
  };
}

export default function SettingsPage() {
  const { seller } = useSeller();
  const labels = useRegionLabels();

  const settingsRes = useSellerData<{ data: SellerSettings }>(
    (sellerId) => sellerApi.getSettings(sellerId),
  );
  const initialSettings = settingsRes.data?.data ?? null;

  // Local editable copy — only created once settings load successfully.
  const [edited, setEdited] = useState<SellerSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync the editable copy when the initial load completes for the first time.
  React.useEffect(() => {
    if (initialSettings && !edited) setEdited(initialSettings);
  }, [initialSettings, edited]);

  const settings = edited ?? initialSettings;

  const handleSave = async () => {
    if (!settings || !seller.sellerId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await sellerApi.updateSettings(seller.sellerId, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Your changes could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const update = (section: keyof SellerSettings, field: string, value: any) => {
    setEdited(prev => {
      if (!prev) return prev;
      return { ...prev, [section]: { ...prev[section], [field]: value } };
    });
  };

  // Build store info fields dynamically based on region
  const storeInfoFields = [
    { l: 'Store Name', k: 'name' },
    { l: labels.taxIdLabel, k: 'gstin' },
    ...(labels.showSecondaryTaxId ? [{ l: 'PAN', k: 'pan' }] : []),
    { l: 'Address', k: 'address' },
    { l: 'City', k: 'city' },
    { l: labels.regionLabel, k: 'state' },
    { l: labels.postalCodeLabel, k: 'pincode' },
  ];

  // Build bank detail fields dynamically based on region
  const bankFields = [
    { l: 'Account Name', k: 'accountName' },
    { l: 'Account Number', k: 'accountNumber' },
    { l: labels.bankIdentifierLabel, k: 'ifsc' },
    { l: 'Bank Name', k: 'bankName' },
    { l: 'Branch', k: 'branch' },
    ...(labels.showPaymentId ? [{ l: 'UPI ID', k: 'upiId' }] : []),
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* `flex` with no wrap put the header and both action links on one line,
          which overflowed a 390px screen by 15px and dragged the page sideways. */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Settings className="w-7 h-7 text-blue-600" />Settings</h1><p className="text-sm text-slate-500 mt-1">Manage your store and account settings</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href="/seller/marketplace/settings/security" className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50"><Shield className="w-4 h-4" />Security</Link>
          <Link href="/seller/marketplace/settings/notifications" className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50"><Bell className="w-4 h-4" />Notifications</Link>
        </div>
      </div>

      <SellerDataState
        loading={settingsRes.loading}
        error={settingsRes.error}
        unavailable={settingsRes.unavailable}
        isEmpty={!settings}
        feature="Settings"
        onRetry={settingsRes.reload}
        emptyTitle="No settings found"
        emptyDescription="Your store settings will appear here once your seller account is set up."
      >
        {/* Save error banner */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {saveError}
          </div>
        )}

        {/* Store Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-blue-600" />Store Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {storeInfoFields.map(f => (
              <div key={f.k} className={f.k === 'address' ? 'sm:col-span-2' : ''}>
                <label className="text-xs font-bold text-slate-500 mb-1 block">{f.l}</label>
                <input
                  value={settings ? (settings.storeInfo as any)[f.k] ?? '' : ''}
                  onChange={e => update('storeInfo', f.k, e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-4"><CreditCard className="w-5 h-5 text-blue-600" />Bank Details (for Payouts)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bankFields.map(f => (
              <div key={f.k}>
                <label className="text-xs font-bold text-slate-500 mb-1 block">{f.l}</label>
                <input
                  value={settings ? (settings.bankDetails as any)[f.k] ?? '' : ''}
                  onChange={e => update('bankDetails', f.k, e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !settings}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            {saved
              ? <><Check className="w-4 h-4" />Saved!</>
              : saving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                : <><Save className="w-4 h-4" />Save Changes</>}
          </button>
        </div>
      </SellerDataState>
    </div>
  );
}
