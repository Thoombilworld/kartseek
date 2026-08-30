'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Save, ArrowLeft } from 'lucide-react';
import { vendorPharmacyApi } from '@/lib/api/vendor-pharmacy';

export default function PharmacySettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => setSaving(false), 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="./" className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-blue-600" />Pharmacy Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure your pharmacy</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="pharmacy-name">Pharmacy Name</label>
          <input id="pharmacy-name" type="text" placeholder="Your Pharmacy Name"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="license-number">License Number</label>
          <input id="license-number" type="text" placeholder="PHB/XXXX/XXXX"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="chief-pharmacist">Chief Pharmacist</label>
          <input id="chief-pharmacist" type="text" placeholder="Full name"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-semibold text-slate-700">24-Hour Pharmacy</span>
          <button type="button" className="w-11 h-6 bg-slate-200 rounded-full relative transition-colors focus:outline-none" onClick={e => { const btn = e.currentTarget; btn.classList.toggle('bg-blue-600'); btn.classList.toggle('bg-slate-200'); }}>
            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
          </button>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-semibold text-slate-700">Home Delivery</span>
          <button type="button" className="w-11 h-6 bg-slate-200 rounded-full relative transition-colors focus:outline-none" onClick={e => { const btn = e.currentTarget; btn.classList.toggle('bg-blue-600'); btn.classList.toggle('bg-slate-200'); }}>
            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
          </button>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="opening-time">Opening Time</label>
          <input id="opening-time" type="text" placeholder="08:00"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="closing-time">Closing Time</label>
          <input id="closing-time" type="text" placeholder="22:00"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}
          </button>
          <Link href="./" className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
