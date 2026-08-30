'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Settings, Save, ArrowLeft } from 'lucide-react';

export default function HotelSettingsPage() {
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
            <Settings className="w-7 h-7 text-blue-600" />Hotel Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure your hotel</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="hotel-name">Hotel Name</label>
          <input id="hotel-name" type="text" placeholder="Your Hotel Name"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="contact-email">Contact Email</label>
          <input id="contact-email" type="email" placeholder="info@hotel.com"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="phone">Phone</label>
          <input id="phone" type="tel" placeholder="+91 7XX XXX XXX"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="check-in-time">Check-in Time</label>
          <input id="check-in-time" type="text" placeholder="14:00"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="check-out-time">Check-out Time</label>
          <input id="check-out-time" type="text" placeholder="11:00"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="currency">Currency</label>
          <select id="currency" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select Currency...</option>
            <option></option>
            <option>USD</option>
            <option>EUR</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="cancellation-policy">Cancellation Policy</label>
          <textarea id="cancellation-policy" rows={3} placeholder="Your cancellation policy..." className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500" />
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
