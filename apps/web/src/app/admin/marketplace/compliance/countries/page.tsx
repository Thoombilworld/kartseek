'use client';
import React, { useState } from 'react';
import { CountryFlag } from '@/components/shared/country-flag';
import { useRegion, REGIONS } from '@/components/admin/region-context';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import {
  Globe, Shield, Plus, Edit2, Trash2, ChevronDown, ChevronUp, CheckCircle,
  FileText, CreditCard, Building2, AlertTriangle, Save,
} from 'lucide-react';

const COUNTRIES_CONFIG = [
  {
    code: 'IN', name: 'India', flag: '🇮🇳', status: 'Active', taxSystem: 'GST',
    eligibility: { minAge: 18, allowedBusinessTypes: ['Proprietorship', 'Partnership', 'LLP', 'Pvt Ltd', 'Public Ltd', 'HUF'], prohibitedCategories: [] },
    requiredSellerFields: ['Legal Business Name', 'GSTIN', 'PAN', 'Business Type', 'State', 'Place of Supply'],
    requiredTaxIds: ['GSTIN', 'PAN'],
    requiredKyc: ['GSTIN Certificate', 'PAN Card', 'Aadhaar (Proprietor)', 'Address Proof', 'Cancelled Cheque'],
    requiredBankFields: ['Account Number', 'IFSC Code', 'Bank Name', 'Account Holder Name'],
    productTaxFields: ['HSN Code', 'GST Rate', 'CGST %', 'SGST %', 'IGST %', 'Place of Supply'],
    invoiceLabels: { tax1: 'CGST', tax2: 'SGST', tax3: 'IGST', taxId: 'GSTIN', invoiceTitle: 'Tax Invoice' },
    approvalRequired: true, autoApprovalEnabled: false,
  },
  {
    code: 'AE', name: 'UAE', flag: '🇦🇪', status: 'Active', taxSystem: 'VAT',
    eligibility: { minAge: 21, allowedBusinessTypes: ['LLC', 'FZE', 'FZCO', 'Sole Proprietorship'], prohibitedCategories: ['Alcohol', 'Gambling'] },
    requiredSellerFields: ['Legal Business Name', 'Trade License Number', 'Emirate', 'Business Activity'],
    requiredTaxIds: ['Trade License', 'TRN (if VAT registered)'],
    requiredKyc: ['Trade License', 'Passport Copy (Owner)', 'Emirates ID', 'Bank Letter'],
    requiredBankFields: ['IBAN', 'Bank Name', 'Account Holder Name', 'Swift Code'],
    productTaxFields: ['HS Code', 'VAT Category', 'VAT Rate %'],
    invoiceLabels: { tax1: 'VAT', tax2: '', tax3: '', taxId: 'TRN', invoiceTitle: 'Tax Invoice (VAT)' },
    approvalRequired: true, autoApprovalEnabled: false,
  },
  {
    code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', status: 'Active', taxSystem: 'VAT',
    eligibility: { minAge: 18, allowedBusinessTypes: ['LLC', 'JSC', 'Sole Proprietorship'], prohibitedCategories: ['Alcohol', 'Pork Products'] },
    requiredSellerFields: ['Legal Business Name', 'Commercial Registration Number', 'VAT Registration Number'],
    requiredTaxIds: ['CR Number', 'VAT Certificate'],
    requiredKyc: ['Commercial Registration', 'VAT Certificate', 'IBAN Details', 'Authorized Signatory ID'],
    requiredBankFields: ['IBAN', 'Bank Name', 'Account Holder Name (Arabic)', 'Swift Code'],
    productTaxFields: ['HS Code', 'VAT Rate %', 'VAT Category'],
    invoiceLabels: { tax1: 'VAT', tax2: '', tax3: '', taxId: 'VAT Number', invoiceTitle: 'فاتورة ضريبية (Tax Invoice)' },
    approvalRequired: true, autoApprovalEnabled: false,
  },
];

export default function CountryCompliancePage() {
  const { selectedRegion } = useRegion();
  const isRegionFiltered = selectedRegion !== 'ALL';
  const regionLabel = isRegionFiltered ? REGIONS[selectedRegion]?.name ?? selectedRegion : 'All Regions';

  const [expanded, setExpanded] = useState<string | null>('IN');
  const [editMode, setEditMode] = useState<string | null>(null);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getComplianceCountries(),
    []
  );
  const { execute } = useAdminAction(showToast);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Country Compliance Engine</h1>
          <p className="text-slate-500 text-sm mt-1">{isRegionFiltered ? `${regionLabel} — ` : ""}Configure required seller fields, tax IDs, KYC documents, and approval rules by country. Seller registration forms adapt automatically.</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <p className="text-xs font-bold text-amber-700">Changes here directly affect seller registration forms and product upload fields</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><p className="text-2xl font-black text-slate-900">{COUNTRIES_CONFIG.length}</p><p className="text-xs text-slate-500 mt-1">Configured Countries</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><p className="text-2xl font-black text-emerald-600">{COUNTRIES_CONFIG.filter(c => c.status === 'Active').length}</p><p className="text-xs text-slate-500 mt-1">Active Marketplaces</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><p className="text-2xl font-black text-blue-600">{COUNTRIES_CONFIG.filter(c => c.approvalRequired).length}</p><p className="text-xs text-slate-500 mt-1">Require Admin Approval</p></div>
      </div>

      {/* Country Config Cards */}
      <div className="space-y-4">
        {COUNTRIES_CONFIG.map(country => (
          <div key={country.code} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div onClick={() => setExpanded(expanded === country.code ? null : country.code)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(expanded === country.code ? null : country.code); } }} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors text-left cursor-pointer">
              <CountryFlag code={country.code} size="xl" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-black text-slate-900">{country.name}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${country.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{country.status}</span>
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{country.taxSystem}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {country.requiredSellerFields.length} seller fields · {country.requiredKyc.length} KYC docs · {country.productTaxFields.length} product tax fields
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); setEditMode(editMode === country.code ? null : country.code); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Edit">
                  <Edit2 className="w-4 h-4 text-slate-500" />
                </button>
                {expanded === country.code ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>
            </div>

            {/* Expanded Detail */}
            {expanded === country.code && (
              <div className="px-6 pb-6 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-5">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black mb-3 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Required Seller Fields</p>
                    <div className="space-y-1.5">
                      {country.requiredSellerFields.map(f => (
                        <div key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-slate-700 font-medium">{f}</span>
                          <span className="text-[10px] text-red-500 font-bold">REQUIRED</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Required KYC Documents</p>
                    <div className="space-y-1.5">
                      {country.requiredKyc.map(doc => (
                        <div key={doc} className="flex items-center gap-2 text-sm">
                          <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="text-slate-700 font-medium">{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black mb-3 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Product Tax Fields</p>
                    <div className="space-y-1.5">
                      {country.productTaxFields.map(f => (
                        <div key={f} className="flex items-center gap-2 text-sm">
                          <span className="w-3.5 h-3.5 text-center text-amber-500 font-black text-xs">%</span>
                          <span className="text-slate-700 font-medium">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black mb-3">Bank Account Fields</p>
                    <div className="space-y-1.5">
                      {country.requiredBankFields.map(f => (
                        <div key={f} className="flex items-center gap-2 text-sm">
                          <span className="w-3.5 h-3.5 text-center text-purple-500 font-black text-xs">$</span>
                          <span className="text-slate-700 font-medium">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black mb-3">Invoice Labels</p>
                    <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Invoice Title</span><span className="font-bold text-slate-800">{country.invoiceLabels.invoiceTitle}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Tax ID Label</span><span className="font-bold text-slate-800">{country.invoiceLabels.taxId}</span></div>
                      {country.invoiceLabels.tax1 && <div className="flex justify-between"><span className="text-slate-500">Tax 1 Label</span><span className="font-bold text-slate-800">{country.invoiceLabels.tax1}</span></div>}
                      {country.invoiceLabels.tax2 && <div className="flex justify-between"><span className="text-slate-500">Tax 2 Label</span><span className="font-bold text-slate-800">{country.invoiceLabels.tax2}</span></div>}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black mb-3">Approval Rules</p>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`w-11 h-6 rounded-full relative transition-colors ${country.approvalRequired ? 'bg-blue-600' : 'bg-slate-300'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${country.approvalRequired ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                        <span className="text-sm font-medium text-slate-700">Seller approval required</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`w-11 h-6 rounded-full relative transition-colors ${country.autoApprovalEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${country.autoApprovalEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                        <span className="text-sm font-medium text-slate-700">Auto-approval enabled</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100">
                  <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"><Save className="w-4 h-4" /> Save Changes</button>
                  <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"><Plus className="w-4 h-4" /> Add Field</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
