'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState, useEffect } from 'react';
import { Settings, Save, Clock, Truck, Shield, Globe, FileCheck, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { CountryFlag } from '@/components/shared/country-flag';
import { adminPharmacyApi } from '@/lib/api/admin-pharmacy';

interface CountryCompliance {
  code: string; name: string; flag: string; enabled: boolean;
  requireHSN: boolean; requireRegCode: boolean; regCodeLabel: string;
  taxType: string; taxRate: number; rxVerification: 'manual'|'ai'|'skip';
  requireLicense: boolean; restrictedMedicineControl: boolean;
  prescriptionCategories: string[];
  manualApprovalRequired: boolean;
  canVerifyPrescriptions: boolean;
}

const INIT_COUNTRIES: CountryCompliance[] = [
  { code:'IN',name:'India',flag:'🇮🇳',enabled:true,requireHSN:true,requireRegCode:false,regCodeLabel:'FSSAI Code',taxType:'GST',taxRate:5,rxVerification:'manual',requireLicense:true,restrictedMedicineControl:true,prescriptionCategories:['Schedule H','Schedule H1','Schedule X'],manualApprovalRequired:true,canVerifyPrescriptions:true },
  { code:'QA',name:'Qatar',flag:'🇶🇦',enabled:true,requireHSN:false,requireRegCode:true,regCodeLabel:'MOPH Registration',taxType:'VAT',taxRate:5,rxVerification:'manual',requireLicense:true,restrictedMedicineControl:true,prescriptionCategories:['Prescription Only'],manualApprovalRequired:true,canVerifyPrescriptions:true },
  { code:'AE',name:'UAE',flag:'🇦🇪',enabled:true,requireHSN:false,requireRegCode:true,regCodeLabel:'DHA/DOH Code',taxType:'VAT',taxRate:5,rxVerification:'manual',requireLicense:true,restrictedMedicineControl:true,prescriptionCategories:['Prescription Only'],manualApprovalRequired:true,canVerifyPrescriptions:true },
  { code:'GB',name:'United Kingdom',flag:'🇬🇧',enabled:true,requireHSN:false,requireRegCode:true,regCodeLabel:'MHRA License',taxType:'VAT',taxRate:0,rxVerification:'manual',requireLicense:true,restrictedMedicineControl:true,prescriptionCategories:['POM','P'],manualApprovalRequired:true,canVerifyPrescriptions:true },
  { code:'US',name:'United States',flag:'🇺🇸',enabled:true,requireHSN:false,requireRegCode:true,regCodeLabel:'FDA/NDA Code',taxType:'State Sales Tax',taxRate:0,rxVerification:'manual',requireLicense:true,restrictedMedicineControl:true,prescriptionCategories:['DEA Schedule II-V','Rx Only'],manualApprovalRequired:true,canVerifyPrescriptions:true },
  { code:'IN',name:'India',flag:'🇮🇳',enabled:true,requireHSN:false,requireRegCode:true,regCodeLabel:'Drug License',taxType:'VAT',taxRate:16,rxVerification:'manual',requireLicense:true,restrictedMedicineControl:true,prescriptionCategories:['Prescription Only'],manualApprovalRequired:true,canVerifyPrescriptions:true },
  { code:'SA',name:'Saudi Arabia',flag:'🇸🇦',enabled:false,requireHSN:false,requireRegCode:true,regCodeLabel:'SFDA Code',taxType:'VAT',taxRate:15,rxVerification:'manual',requireLicense:true,restrictedMedicineControl:true,prescriptionCategories:['Prescription Only'],manualApprovalRequired:true,canVerifyPrescriptions:false },
  { code:'BH',name:'Bahrain',flag:'🇧🇭',enabled:false,requireHSN:false,requireRegCode:true,regCodeLabel:'NHRA Code',taxType:'VAT',taxRate:10,rxVerification:'manual',requireLicense:true,restrictedMedicineControl:true,prescriptionCategories:['Prescription Only'],manualApprovalRequired:true,canVerifyPrescriptions:false },
];

export default function PharmacySettingsPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [saved,setSaved]=useState(false);
  const [settings,setSettings]=useState({
    defaultDeliveryFee:50, freeDeliveryThreshold:499, maxDeliveryRadius:10,
    autoApproveOTC:true, autoApproveRx:false, requireLicenseVerification:true,
    defaultOrderTimeout:30, maxOrdersPerStore:50,
    taxRate:18, returnWindowDays:7, enableCOD:true,
    prescriptionVerification:'manual' as string,
    minStoreRating:3.0,
  });
  const [countries, setCountries] = useState(INIT_COUNTRIES);
  const [expandedCountry, setExpandedCountry] = useState<string | null>('IN');

  const save=()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const updateCountry = (code: string, updates: Partial<CountryCompliance>) => {
    setCountries(prev => prev.map(c => c.code === code ? { ...c, ...updates } : c));
  };

  return(<div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Pharmacy Settings</h1><p className="text-slate-500 text-sm">Configure pharmacy rules, delivery, compliance, and country-wise legal settings.</p></div>
      <button onClick={save} className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${saved?'bg-emerald-600 text-white':'bg-cyan-600 hover:bg-cyan-700 text-white'}`} aria-label="Save"><Save className="w-4 h-4"/>{saved?'Saved ✓':'Save All Settings'}</button>
    </div>

    {/* Delivery Settings */}
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Truck className="w-5 h-5 text-cyan-600"/>Delivery Settings</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div><label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="default-delivery-fee">Default Delivery Fee</label><input id="default-delivery-fee" type="number" value={settings.defaultDeliveryFee} onChange={e =>setSettings({...settings,defaultDeliveryFee:+e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"/></div>
        <div><label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="free-delivery-threshold">Free Delivery Threshold</label><input id="free-delivery-threshold" type="number" value={settings.freeDeliveryThreshold} onChange={e =>setSettings({...settings,freeDeliveryThreshold:+e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"/></div>
        <div><label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="max-delivery-radius-km">Max Delivery Radius (km)</label><input id="max-delivery-radius-km" type="number" value={settings.maxDeliveryRadius} onChange={e =>setSettings({...settings,maxDeliveryRadius:+e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"/></div>
      </div>
    </div>

    {/* Compliance & Approval */}
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Shield className="w-5 h-5 text-cyan-600"/>Compliance & Approval</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"><input type="checkbox" checked={settings.autoApproveOTC} onChange={e =>setSettings({...settings,autoApproveOTC:e.target.checked})} className="w-4 h-4 rounded accent-cyan-600"/><div><p className="text-sm font-bold text-slate-900">Auto-approve OTC products</p><p className="text-xs text-slate-500">Automatically approve non-prescription products</p></div></label>
        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"><input type="checkbox" checked={settings.autoApproveRx} onChange={e =>setSettings({...settings,autoApproveRx:e.target.checked})} className="w-4 h-4 rounded accent-cyan-600"/><div><p className="text-sm font-bold text-slate-900">Auto-approve Rx products</p><p className="text-xs text-slate-500">⚠️ Not recommended — requires manual review</p></div></label>
        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"><input type="checkbox" checked={settings.requireLicenseVerification} onChange={e =>setSettings({...settings,requireLicenseVerification:e.target.checked})} className="w-4 h-4 rounded accent-cyan-600"/><div><p className="text-sm font-bold text-slate-900">Require license verification</p><p className="text-xs text-slate-500">Block stores without verified licenses</p></div></label>
        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"><input type="checkbox" checked={settings.enableCOD} onChange={e =>setSettings({...settings,enableCOD:e.target.checked})} className="w-4 h-4 rounded accent-cyan-600"/><div><p className="text-sm font-bold text-slate-900">Enable Cash on Delivery</p><p className="text-xs text-slate-500">Allow COD payment for pharmacy orders</p></div></label>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="prescription-verification-mode">Prescription Verification Mode</label><select id="prescription-verification-mode" value={settings.prescriptionVerification} onChange={e=>setSettings({...settings,prescriptionVerification:e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"><option value="manual">Manual Review</option><option value="ai">AI-Assisted</option><option value="skip">Skip (Not Recommended)</option></select></div>
        <div><label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="min-store-rating">Min Store Rating</label><input id="min-store-rating" type="number" step={0.1} min={0} max={5} value={settings.minStoreRating} onChange={e =>setSettings({...settings,minStoreRating:+e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"/></div>
      </div>
    </div>

    {/* ═══════════════════════════════════════════════════════════
       COUNTRY-WISE COMPLIANCE SETTINGS
       ═══════════════════════════════════════════════════════════ */}
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Globe className="w-5 h-5 text-cyan-600"/>Country-Wise Pharmacy Compliance</h2>
        <p className="text-xs text-slate-500 mt-1">Configure which compliance codes, tax rules, and prescription requirements apply per country.</p>
      </div>

      <div className="divide-y divide-slate-100">
        {countries.map(country => {
          const isOpen = expandedCountry === country.code;
          return (
            <div key={country.code} className={`${!country.enabled ? 'opacity-60' : ''}`}>
              {/* Country Header */}
              <button onClick={() => setExpandedCountry(isOpen ? null : country.code)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <CountryFlag code={country.code} size="xl" />
                  <div>
                    <p className="font-bold text-slate-900">{country.name}</p>
                    <p className="text-xs text-slate-500">{country.taxType} {country.taxRate}% • {country.requireHSN ? 'HSN Required' : country.regCodeLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div role="switch" aria-checked={country.enabled} tabIndex={0} onClick={e => { e.stopPropagation(); updateCountry(country.code, { enabled: !country.enabled }); }}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${country.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${country.enabled ? 'left-5' : 'left-0.5'}`} />
                  </div>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {/* Country Settings Panel */}
              {isOpen && (
                <div className="px-6 pb-6 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tax */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="tax-type">Tax Type</label>
                      <select id="tax-type" value={country.taxType} onChange={e => updateCountry(country.code, { taxType: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold bg-white focus:ring-2 focus:ring-cyan-500 outline-none">
                        <option value="GST">GST</option><option value="VAT">VAT</option><option value="State Sales Tax">State Sales Tax</option><option value="None">None</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="default-tax-rate">Default Tax Rate (%)</label>
                      <input id="default-tax-rate" type="number" value={country.taxRate} onChange={e => updateCountry(country.code, { taxRate: +e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-cyan-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="rx-verification">Rx Verification</label>
                      <select id="rx-verification" value={country.rxVerification} onChange={e => updateCountry(country.code, { rxVerification: e.target.value as 'manual'|'ai'|'skip' })}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold bg-white focus:ring-2 focus:ring-cyan-500 outline-none">
                        <option value="manual">Manual</option><option value="ai">AI-Assisted</option><option value="skip">Skip</option>
                      </select>
                    </div>
                  </div>

                  {/* Compliance Code Config */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer">
                      <input type="checkbox" checked={country.requireHSN} onChange={e => updateCountry(country.code, { requireHSN: e.target.checked })} className="w-4 h-4 rounded accent-cyan-600" />
                      <div><p className="text-sm font-bold text-slate-900">Require HSN Code</p><p className="text-xs text-slate-500">Mandatory HSN code for product listing</p></div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer">
                      <input type="checkbox" checked={country.requireRegCode} onChange={e => updateCountry(country.code, { requireRegCode: e.target.checked })} className="w-4 h-4 rounded accent-cyan-600" />
                      <div><p className="text-sm font-bold text-slate-900">Require Regional Code</p><p className="text-xs text-slate-500">{country.regCodeLabel}</p></div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer">
                      <input type="checkbox" checked={country.requireLicense} onChange={e => updateCountry(country.code, { requireLicense: e.target.checked })} className="w-4 h-4 rounded accent-cyan-600" />
                      <div><p className="text-sm font-bold text-slate-900">Require Pharmacy License</p><p className="text-xs text-slate-500">Block stores without verified licenses</p></div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer">
                      <input type="checkbox" checked={country.restrictedMedicineControl} onChange={e => updateCountry(country.code, { restrictedMedicineControl: e.target.checked })} className="w-4 h-4 rounded accent-cyan-600" />
                      <div><p className="text-sm font-bold text-slate-900">Restricted Medicine Controls</p><p className="text-xs text-slate-500">Additional verification for controlled substances</p></div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer">
                      <input type="checkbox" checked={country.manualApprovalRequired} onChange={e => updateCountry(country.code, { manualApprovalRequired: e.target.checked })} className="w-4 h-4 rounded accent-cyan-600" />
                      <div><p className="text-sm font-bold text-slate-900">Manual Product Approval</p><p className="text-xs text-slate-500">Products require admin approval before going live</p></div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer">
                      <input type="checkbox" checked={country.canVerifyPrescriptions} onChange={e => updateCountry(country.code, { canVerifyPrescriptions: e.target.checked })} className="w-4 h-4 rounded accent-cyan-600" />
                      <div><p className="text-sm font-bold text-slate-900">Pharmacy Rx Verification</p><p className="text-xs text-slate-500">Allow pharmacy stores to verify prescriptions</p></div>
                    </label>
                  </div>

                  {/* Prescription Categories */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Prescription-Required Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {country.prescriptionCategories.map(cat => (
                        <span key={cat} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-xs font-bold">{cat}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    {/* Operational Settings */}
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Clock className="w-5 h-5 text-cyan-600"/>Operational Settings</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div><label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="order-timeout-min">Order Timeout (min)</label><input id="order-timeout-min" type="number" value={settings.defaultOrderTimeout} onChange={e =>setSettings({...settings,defaultOrderTimeout:+e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"/></div>
        <div><label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="tax-rate">Tax Rate (%)</label><input id="tax-rate" type="number" value={settings.taxRate} onChange={e =>setSettings({...settings,taxRate:+e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"/></div>
        <div><label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="return-window-days">Return Window (days)</label><input id="return-window-days" type="number" value={settings.returnWindowDays} onChange={e =>setSettings({...settings,returnWindowDays:+e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"/></div>
      </div>
    </div>
  </div>);
}
