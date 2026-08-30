'use client';

import React, { useState } from 'react';
import { ArrowLeft, Store, Upload, Save, CheckCircle, User, Phone, Mail, MapPin, FileText, CreditCard, Camera, Info } from 'lucide-react';
import Link from 'next/link';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
export default function OnboardVendorPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    // Step 1: Business Info
    businessName: '',
    ownerName: '',
    category: '',
    phone: '',
    email: '',
    address: '',
    city: 'Mumbai',
    pincode: '',
    zone: '',
    // Step 2: Documents
    gstNumber: '',
    panNumber: '',
    fssaiNumber: '',
    drugLicense: '',
    businessLicenseUploaded: false,
    gstCertUploaded: false,
    // Step 3: Bank & Commission
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    commissionRate: '12',
    payoutCycle: 'weekly',
  });

  const handleChange = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Vendor Onboarded!</h2>
          <p className="text-slate-500 mb-1 font-medium">{form.businessName}</p>
          <p className="text-sm text-slate-400 mb-2">{form.category} • {form.zone || form.city}</p>
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold mb-6">
            KYC Verification Pending
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link href="/franchise/vendors" className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors">
              View All Vendors
            </Link>
            <button onClick={() => { setSubmitted(false); setStep(1); setForm(prev => ({ ...prev, businessName: '', ownerName: '', phone: '', email: '' })); }}
              className="bg-white hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold border border-slate-200 transition-colors">
              Onboard Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalSteps = 3;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/franchise/vendors" className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Onboard New Vendor</h1>
          <p className="text-slate-500 text-sm">Register a new local vendor to your franchise network.</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Business Info', icon: Store },
            { num: 2, label: 'Documents', icon: FileText },
            { num: 3, label: 'Bank & Commission', icon: CreditCard },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <button onClick={() => setStep(s.num)}
                className={`flex items-center gap-3 ${step >= s.num ? 'text-teal-600' : 'text-slate-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-colors ${
                  step > s.num ? 'bg-teal-600 text-white' : step === s.num ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                </div>
                <span className="hidden md:block text-sm font-bold">{s.label}</span>
              </button>
              {i < 2 && <div className={`flex-1 h-0.5 mx-4 rounded ${step > s.num ? 'bg-teal-500' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Step 1: Business Info */}
        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Store className="w-4 h-4 text-teal-600" /> Business Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="business-name">Business Name *</label>
                <input id="business-name" type="text" required placeholder="e.g. FreshMart Supermarket" value={form.businessName} onChange={e => handleChange('businessName', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="category">Category *</label>
                <select id="category" required value={form.category} onChange={e => handleChange('category', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="">Select category</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Marketplace">Marketplace</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="owner-manager-name">Owner / Manager Name *</label>
                <input id="owner-manager-name" type="text" required placeholder="Full name" value={form.ownerName} onChange={e => handleChange('ownerName', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="phone-number">Phone Number *</label>
                <input id="phone-number" type="tel" required placeholder="+91 98765 43210" value={form.phone} onChange={e => handleChange('phone', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="email-address">Email Address *</label>
                <input id="email-address" type="email" required placeholder="vendor@business.com" value={form.email} onChange={e => handleChange('email', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="delivery-zone">Delivery Zone</label>
                <select id="delivery-zone" value={form.zone} onChange={e => handleChange('zone', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="">Select zone</option>
                  <option>Colaba & Cuffe Parade</option>
                  <option>Bandra West & Khar</option>
                  <option>Andheri East & West</option>
                  <option>Worli & Lower Parel</option>
                  <option>Dadar & Matunga</option>
                  <option>Juhu & Versova</option>
                  <option>Fort & Churchgate</option>
                  <option>Powai & Hiranandani</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="business-address">Business Address *</label>
              <textarea id="business-address" required placeholder="Full store address with landmark" value={form.address} onChange={e => handleChange('address', e.target.value)} rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="city">City</label>
                <input id="city" type="text" value={form.city} onChange={e => handleChange('city', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="pin-code">PIN Code</label>
                <input id="pin-code" type="text" placeholder="400001" value={form.pincode} onChange={e => handleChange('pincode', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setStep(2)} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors">
                Next: Documents →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Documents */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><FileText className="w-4 h-4 text-teal-600" /> KYC Documents</h3>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">Documents will be verified by the KARTSEEK admin team. Vendor will be activated once KYC is approved (typically 24-48 hours).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="gst-number">GST Number</label>
                <input id="gst-number" type="text" placeholder="22ABCDE1234F1Z5" value={form.gstNumber} onChange={e => handleChange('gstNumber', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="pan-number">PAN Number *</label>
                <input id="pan-number" type="text" required placeholder="ABCDE1234F" value={form.panNumber} onChange={e => handleChange('panNumber', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              {(form.category === 'Restaurant' || form.category === 'Grocery') && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="fssai-license-number">FSSAI License Number</label>
                  <input id="fssai-license-number" type="text" placeholder="12345678901234" value={form.fssaiNumber} onChange={e => handleChange('fssaiNumber', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              )}
              {form.category === 'Pharmacy' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="drug-license-number">Drug License Number *</label>
                  <input id="drug-license-number" type="text" required placeholder="MH-MUM-123456" value={form.drugLicense} onChange={e => handleChange('drugLicense', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-teal-400 transition-colors cursor-pointer"
                onClick={() => handleChange('businessLicenseUploaded', true)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => handleChange('businessLicenseUploaded', true))}>
                {form.businessLicenseUploaded ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                    <p className="text-sm font-bold text-emerald-700">Business License Uploaded</p>
                    <p className="text-xs text-slate-400">business_license.pdf</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">Upload Business License</p>
                    <p className="text-xs text-slate-400">PDF, JPG or PNG (max 5MB)</p>
                  </div>
                )}
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-teal-400 transition-colors cursor-pointer"
                onClick={() => handleChange('gstCertUploaded', true)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => handleChange('gstCertUploaded', true))}>
                {form.gstCertUploaded ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                    <p className="text-sm font-bold text-emerald-700">GST Certificate Uploaded</p>
                    <p className="text-xs text-slate-400">gst_certificate.pdf</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">Upload GST Certificate</p>
                    <p className="text-xs text-slate-400">PDF, JPG or PNG (max 5MB)</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700 font-medium">← Back</button>
              <button type="button" onClick={() => setStep(3)} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors">
                Next: Bank Details →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Bank & Commission */}
        {step === 3 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><CreditCard className="w-4 h-4 text-teal-600" /> Bank & Commission Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="bank-name">Bank Name *</label>
                <input id="bank-name" type="text" required placeholder="e.g. HDFC Bank" value={form.bankName} onChange={e => handleChange('bankName', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="account-holder-name">Account Holder Name *</label>
                <input id="account-holder-name" type="text" required placeholder="Name as per bank account" value={form.accountHolderName} onChange={e => handleChange('accountHolderName', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="account-number">Account Number *</label>
                <input id="account-number" type="text" required placeholder="1234567890123456" value={form.accountNumber} onChange={e => handleChange('accountNumber', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="ifsc-code">IFSC Code *</label>
                <input id="ifsc-code" type="text" required placeholder="HDFC0001234" value={form.ifscCode} onChange={e => handleChange('ifscCode', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <h4 className="font-bold text-slate-900 mb-4">Commission Structure</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="commission-rate">Commission Rate (%)</label>
                  <select id="commission-rate" value={form.commissionRate} onChange={e => handleChange('commissionRate', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    <option value="8">8% — Promotional</option>
                    <option value="10">10% — Pharmacy Standard</option>
                    <option value="12">12% — Grocery Standard</option>
                    <option value="15">15% — Marketplace Standard</option>
                    <option value="18">18% — Restaurant Standard</option>
                    <option value="22">22% — Premium Restaurant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="payout-cycle">Payout Cycle</label>
                  <select id="payout-cycle" value={form.payoutCycle} onChange={e => handleChange('payoutCycle', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly (Every Monday)</option>
                    <option value="biweekly">Bi-Weekly (1st & 16th)</option>
                    <option value="monthly">Monthly (1st of month)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Summary Preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3 text-sm">Onboarding Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-xs text-slate-400 mb-0.5">Business</p><p className="font-bold text-slate-700">{form.businessName || '—'}</p></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Category</p><p className="font-bold text-slate-700">{form.category || '—'}</p></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Commission</p><p className="font-bold text-teal-600">{form.commissionRate}%</p></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Payout Cycle</p><p className="font-bold text-slate-700 capitalize">{form.payoutCycle}</p></div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setStep(2)} className="text-sm text-slate-500 hover:text-slate-700 font-medium">← Back</button>
              <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm">
                <Save className="w-4 h-4" /> Complete Onboarding
              </button>
            </div>
          </div>
        )}

      </form>
    </div>
  );
}
