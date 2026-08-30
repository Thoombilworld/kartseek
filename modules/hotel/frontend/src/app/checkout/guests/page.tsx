'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  ArrowLeft, User, Mail, Phone, Globe, Plus, Minus,
  Shield, Check, ArrowRight, AlertCircle, MessageSquare,
} from 'lucide-react';

export default function CheckoutGuestsPage() {
  const [primaryGuest, setPrimaryGuest] = useState({ firstName: '', lastName: '', email: '', phone: '', country: 'UAE' });
  const [specialRequests, setSpecialRequests] = useState('');
  const [addons, setAddons] = useState({ earlyCheckIn: false, lateCheckOut: false, airportTransfer: false, extraBed: false });

  const countries = [
    { code: 'UAE', name: 'United Arab Emirates', flag: '🇦🇪', phoneCode: '+971' },
    { code: 'IN', name: 'India', flag: '🇮🇳', phoneCode: '+91' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦', phoneCode: '+974' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', phoneCode: '+966' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', phoneCode: '+44' },
    { code: 'IN', name: 'India', flag: '🇮🇳', phoneCode: '+91' },
  ];

  const selectedCountry = countries.find(c => c.code === primaryGuest.country) || countries[0];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/checkout/summary" className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-bold text-slate-900">Guest Details</h1>
          </div>
          <div className="flex items-center gap-2">
            {['Summary', 'Guest Details', 'Offers', 'Payment'].map((step, idx) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 ${idx <= 1 ? 'text-rose-600' : 'text-slate-300'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 1 ? 'bg-emerald-500 text-white' : idx === 1 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {idx < 1 ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:inline ${idx <= 1 ? 'text-rose-600' : 'text-slate-400'}`}>{step}</span>
                </div>
                {idx < 3 && <div className={`flex-1 h-0.5 ${idx < 1 ? 'bg-emerald-300' : idx === 1 ? 'bg-rose-200' : 'bg-slate-100'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Primary Guest */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-rose-500" />
                <h2 className="font-bold text-slate-900">Primary Guest</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4">This name must match the guest ID presented at check-in.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="first-name">First Name *</label>
                  <input id="first-name"
                    type="text" value={primaryGuest.firstName}
                    onChange={e => setPrimaryGuest(p => ({ ...p, firstName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                    placeholder="e.g. Ahmed"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="last-name">Last Name *</label>
                  <input id="last-name"
                    type="text" value={primaryGuest.lastName}
                    onChange={e => setPrimaryGuest(p => ({ ...p, lastName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                    placeholder="e.g. Al Maktoum"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Email *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="email" value={primaryGuest.email}
                      onChange={e => setPrimaryGuest(p => ({ ...p, email: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      placeholder="ahmed@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Phone *</label>
                  <div className="flex gap-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm flex items-center gap-1 shrink-0">
                      <CountryFlag code={selectedCountry.code} size="sm" />
                      <span className="text-slate-500">{selectedCountry.phoneCode}</span>
                    </div>
                    <input
                      type="tel" value={primaryGuest.phone}
                      onChange={e => setPrimaryGuest(p => ({ ...p, phone: e.target.value }))}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      placeholder="50 123 4567"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Country / Nationality *</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <select
                      aria-label="Country / Nationality"
                      value={primaryGuest.country}
                      onChange={e => setPrimaryGuest(p => ({ ...p, country: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all appearance-none"
                    >
                      {countries.map(c => (
                        <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Requests */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold text-slate-900">Special Requests</h2>
                <span className="text-[10px] text-slate-400">(Optional)</span>
              </div>
              <textarea
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none transition-all"
                placeholder="e.g. High floor room, extra pillows, late check-out..."
              />
              <p className="text-[10px] text-slate-400 mt-1">Special requests are subject to availability. The hotel will do its best to accommodate.</p>
            </div>

            {/* Add-ons */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-900 mb-4">Add-on Services</h2>
              <div className="space-y-3">
                {[
                  { key: 'earlyCheckIn', label: 'Early Check-in (10 AM)', price: 'AED 100', icon: '🕐' },
                  { key: 'lateCheckOut', label: 'Late Check-out (4 PM)', price: 'AED 120', icon: '🕓' },
                  { key: 'airportTransfer', label: 'Airport Transfer', price: 'AED 150', icon: '🚗' },
                  { key: 'extraBed', label: 'Extra Bed / Cot', price: 'AED 120/night', icon: '🛏️' },
                ].map(addon => (
                  <label key={addon.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    addons[addon.key as keyof typeof addons] ? 'border-rose-500 bg-rose-50' : 'border-slate-100 hover:border-slate-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={addons[addon.key as keyof typeof addons]}
                      onChange={e => setAddons(prev => ({ ...prev, [addon.key]: e.target.checked }))}
                      className="hidden"
                    />
                    <span className="text-xl">{addon.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{addon.label}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-700">{addon.price}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                      addons[addon.key as keyof typeof addons] ? 'bg-rose-600 border-rose-600' : 'border-slate-300'
                    }`}>
                      {addons[addon.key as keyof typeof addons] && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-4">
              <h3 className="font-bold text-slate-900 mb-3">Booking Summary</h3>
              <div className="text-sm space-y-2 text-slate-600">
                <p className="font-medium text-slate-900">The Grand Palace Hotel</p>
                <p>Jul 1–3, 2026 · 2 nights</p>
                <p>Deluxe King Room · 2 Guests</p>
                <p className="text-emerald-600 font-medium text-xs">Breakfast Included</p>
              </div>
              <div className="border-t border-slate-100 mt-4 pt-4 flex justify-between">
                <span className="font-bold text-slate-900">Total</span>
                <span className="text-lg font-black text-slate-900">AED 1,196</span>
              </div>

              <Link
                href="/checkout/offers"
                className="w-full bg-rose-600 text-white text-center font-bold py-4 rounded-xl mt-4 hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue to Offers <ArrowRight className="w-4 h-4" />
              </Link>

              <p className="text-center text-[10px] text-slate-400 mt-2 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Your information is encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
