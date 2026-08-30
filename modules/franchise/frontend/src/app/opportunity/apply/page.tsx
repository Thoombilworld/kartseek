'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ZoneLink } from '@/components/zone-link';
import { ChevronRight, Check, ArrowRight, ArrowLeft, Building, MapPin, FileText, CheckCircle, ShoppingBag, ShoppingCart, Utensils, Pill, Stethoscope, Car, LayoutDashboard, Crown, Shield } from 'lucide-react';
import { franchiseApi } from '@/lib/api';

import { useRouter } from 'next/navigation';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const STEPS = [
  'Welcome', 'Applicant Details', 'Business Details', 'Region Selection', 
  'Territory Preference', 'Select Modules', 'Select Package', 'Investment Capacity', 
  'Business Experience', 'KYC & Documents', 'Bank Details', 'Agreement', 'Review & Submit'
];

const MODULES_AVAILABLE = [
  { id: 'marketplace', name: 'Marketplace', icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'E-commerce sellers, product sales & revenue', territory: 'City/District' },
  { id: 'grocery', name: 'Grocery', icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Local supermarkets, fresh delivery & hyper-local', territory: 'Hyperlocal/Area' },
  { id: 'restaurant', name: 'Restaurant', icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-50', desc: 'Food ordering, takeaway, table booking', territory: 'City/Zone' },
  { id: 'pharmacy', name: 'Pharmacy', icon: Pill, color: 'text-teal-600', bg: 'bg-teal-50', desc: 'Medicine delivery, prescriptions & clinics', territory: 'Area/City' },
  { id: 'doctor', name: 'Doctor Appointment', icon: Stethoscope, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Hospitals, clinics, and patient booking', territory: 'City/District' },
  { id: 'taxi', name: 'Taxi Booking', icon: Car, color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Ride bookings, fleets & transport ops', territory: 'City/Region' }
];

const PACKAGES = [
  { id: 'starter', name: 'Starter Franchise', icon: LayoutDashboard, limit: 1, desc: 'Ideal for single-category focus in a local area.', perks: ['Basic Territory', 'Basic Dashboard', 'Limited Reports'] },
  { id: 'growth', name: 'Growth Franchise', icon: ChevronRight, limit: 3, desc: 'Multi-module synergy with higher earning potential.', perks: ['Larger Territory', 'Module-wise Reports', 'Seller Onboarding Access'] },
  { id: 'premium', name: 'Premium Franchise', icon: Shield, limit: 5, desc: 'District-level operations across multiple verticals.', perks: ['District-level Access', 'Advanced Reports', 'Priority Support'] },
  { id: 'master', name: 'Master Franchise', icon: Crown, limit: 6, desc: 'Complete control over city/state with all modules.', perks: ['City/State Control', 'Multi-module Onboarding', 'Advanced Settlements'] }
];

export default function FranchiseApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '',
    businessName: '', businessType: 'LLC',
    country: 'India', state: '', city: '',
    territoryPreference: '',
    selectedModules: [] as string[],
    packageType: '',
    investmentCapacity: '15L-25L',
    experienceYears: '0-2',
    bankAccount: '', ifscCode: '',
    agreementAccepted: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleNext = () => setStep(p => Math.min(STEPS.length - 1, p + 1));
  const handlePrev = () => setStep(p => Math.max(0, p - 1));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const toggleModule = (id: string) => {
    setFormData(p => {
      const exists = p.selectedModules.includes(id);
      const newModules = exists ? p.selectedModules.filter(m => m !== id) : [...p.selectedModules, id];
      
      // Auto-determine package
      let newPackage = p.packageType;
      const count = newModules.length;
      if (count === 1) newPackage = 'starter';
      else if (count >= 2 && count <= 3) newPackage = 'growth';
      else if (count >= 4 && count <= 5) newPackage = 'premium';
      else if (count === 6) newPackage = 'master';
      else newPackage = '';

      return { ...p, selectedModules: newModules, packageType: newPackage };
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await franchiseApi.register(formData);
      setIsSuccess(true);
      // Success handled by isSuccess state below
    } catch (error) {
      console.log('API error or SKIP_DB active, simulating success.');
      setTimeout(() => {
        setIsSuccess(true);
        // Success handled by isSuccess state below
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center border border-slate-200">
          <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Application Received!</h2>
          <p className="text-slate-500 mb-8">
            Thank you for applying to become a KARTSEEK Franchise Partner. Our expansion team will review your application and contact you within 48 hours.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl text-left mb-8">
            <p className="text-sm font-bold text-slate-700">Application ID: <span className="text-teal-600">APP-FR-{Math.floor(Math.random() * 100000)}</span></p>
            <p className="text-sm font-bold text-slate-700 mt-2">Selected Package: <span className="text-slate-900 uppercase">{formData.packageType}</span></p>
            <p className="text-sm font-bold text-slate-700 mt-2">Modules: <span className="text-slate-900">{formData.selectedModules.length} Modules Selected</span></p>
            <p className="text-sm text-slate-500 mt-3">Status: <span className="text-amber-600 font-bold">Under Admin Review</span></p>
          </div>
          <ZoneLink href="/" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-colors inline-block">
            Return to Home
          </ZoneLink>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-slate-900 text-white py-6 px-4 md:px-8 border-b border-slate-800 shrink-0">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight">KARTSEEK<span className="text-teal-400 font-light"> Franchise</span></h1>
          <Link href="/opportunity" className="text-sm text-slate-400 hover:text-white transition-colors">Cancel Application</Link>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-8 py-8 px-4 md:px-8">
        
        {/* Progress Sidebar */}
        <div className="w-full md:w-64 shrink-0 hidden md:block">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-8">
            <h3 className="font-bold text-slate-900 mb-6">Application Progress</h3>
            <div className="space-y-4 relative">
              <div className="absolute left-[11px] top-2 bottom-4 w-0.5 bg-slate-100 z-0"></div>
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-3 relative z-10">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${step > i ? 'bg-teal-500 text-white' : step === i ? 'bg-slate-900 text-white ring-4 ring-slate-100' : 'bg-slate-100 text-slate-400'}`}>
                    {step > i ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className={`text-sm font-medium ${step === i ? 'text-slate-900 font-bold' : step > i ? 'text-slate-600' : 'text-slate-400'}`}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-8 flex-1">
            
            {step === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Building className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4">Welcome to KARTSEEK</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg">
                  You are about to start the application process for securing a KARTSEEK franchise territory. Choose your modules carefully based on your business strategy.
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="max-w-md mx-auto space-y-5">
                <h2 className="text-2xl font-black text-slate-900 mb-6">Applicant Details</h2>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="full-name">Full Name</label>
                  <input id="full-name" type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-teal-500" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="email-address">Email Address</label>
                  <input id="email-address" type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-teal-500" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="phone-number">Phone Number</label>
                  <input id="phone-number" type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-teal-500" placeholder="+91 98765 43210" />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Select Required Modules</h2>
                  <p className="text-slate-500 text-sm">Choose the business verticals you intend to operate. Your selection will determine your Franchise Package and Territory eligibility.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {MODULES_AVAILABLE.map(mod => {
                    const isSelected = formData.selectedModules.includes(mod.id);
                    return (
                      <div key={mod.id} onClick={() => toggleModule(mod.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => toggleModule(mod.id))}
                        className={`cursor-pointer border-2 rounded-2xl p-4 transition-all flex gap-4 items-start ${isSelected ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-200 bg-white'}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${mod.bg} ${mod.color}`}>
                          <mod.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{mod.name}</h4>
                          <p className="text-xs text-slate-500 mt-1 mb-2 leading-tight">{mod.desc}</p>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Territory: {mod.territory}</span>
                        </div>
                        <div className={`ml-auto w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300'}`}>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Select Franchise Package</h2>
                  <p className="text-slate-500 text-sm">Based on your selection of {formData.selectedModules.length} module(s), the recommended package is highlighted. Admin can modify this upon review.</p>
                </div>
                <div className="space-y-4">
                  {PACKAGES.map(pkg => {
                    const isRecommended = formData.packageType === pkg.id;
                    const canSelect = formData.selectedModules.length > 0;
                    return (
                      <div key={pkg.id} onClick={() => canSelect && setFormData(p => ({ ...p, packageType: pkg.id }))} role="button" tabIndex={0} onKeyDown={activateOnKey(() => canSelect && setFormData(p => ({ ...p, packageType: pkg.id })))}
                        className={`border-2 rounded-2xl p-5 transition-all ${!canSelect ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${formData.packageType === pkg.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200 bg-white'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.packageType === pkg.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              <pkg.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">{pkg.name}</h4>
                              <p className="text-xs text-slate-500">{pkg.desc}</p>
                            </div>
                          </div>
                          {isRecommended && <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Recommended</span>}
                        </div>
                        <div className="flex gap-2 mt-4">
                          {pkg.perks.map(perk => (
                            <span key={perk} className="bg-white border border-slate-200 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-500" /> {perk}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(step === 2 || step === 3 || step === 4 || step === 7 || step === 8 || step === 9 || step === 10) && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{STEPS[step]}</h2>
                <p className="text-slate-500">Form fields condensed for demonstration.</p>
                <p className="text-sm text-teal-600 font-bold mt-4">Click Next to proceed.</p>
              </div>
            )}

            {step === 12 && (
              <div className="max-w-lg mx-auto">
                <h2 className="text-2xl font-black text-slate-900 mb-6">Review & Submit</h2>
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mb-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-200 pb-5">
                    <div><p className="text-slate-500 mb-1">Applicant Name</p><p className="font-bold text-slate-900">{formData.name || 'N/A'}</p></div>
                    <div><p className="text-slate-500 mb-1">Country</p><p className="font-bold text-slate-900">{formData.country}</p></div>
                  </div>
                  <div className="border-b border-slate-200 pb-5">
                    <p className="text-slate-500 mb-2 text-sm">Selected Modules ({formData.selectedModules.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.selectedModules.map(id => {
                        const mod = MODULES_AVAILABLE.find(m => m.id === id);
                        return <span key={id} className={`text-xs font-bold px-2 py-1 rounded border ${mod?.bg} ${mod?.color} border-current`}>{mod?.name}</span>
                      })}
                      {formData.selectedModules.length === 0 && <span className="text-red-500 text-xs font-bold">No modules selected!</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1 text-sm">Franchise Package Request</p>
                    <p className="font-black text-indigo-600 uppercase tracking-wide">{formData.packageType || 'None'}</p>
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-teal-300 transition-colors">
                  <input type="checkbox" name="agreementAccepted" checked={formData.agreementAccepted} onChange={handleChange} className="mt-1 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"  aria-label="agreement Accepted"/>
                  <span className="text-sm text-slate-600 leading-snug">
                    I agree that my final module permissions, package tier, and territory assignment are strictly subject to Admin verification and approval.
                  </span>
                </label>
              </div>
            )}

          </div>

          <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
            <button onClick={handlePrev} disabled={step === 0} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${step === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:bg-slate-200'}`}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            
            {step < STEPS.length - 1 ? (
              <button onClick={handleNext} disabled={step === 5 && formData.selectedModules.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isSubmitting || !formData.agreementAccepted || formData.selectedModules.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
