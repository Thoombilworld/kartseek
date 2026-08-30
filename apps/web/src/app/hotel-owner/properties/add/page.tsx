'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Save, ArrowLeft } from 'lucide-react';

export default function AddPropertyPage() {
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
            <PlusCircle className="w-7 h-7 text-blue-600" />Add Property
          </h1>
          <p className="text-sm text-slate-500 mt-1">Register a new hotel property</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="property-name">Property Name</label>
          <input id="property-name" type="text" placeholder="e.g. Grand Hotel Mumbai"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="property-type">Property Type</label>
          <select id="property-type" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select Property Type...</option>
            <option>Hotel</option>
            <option>Resort</option>
            <option>Boutique Hotel</option>
            <option>Guest House</option>
            <option>Lodge</option>
            <option>Apartment</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="address">Address</label>
          <textarea id="address" rows={3} placeholder="Full address..." className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="star-rating">Star Rating</label>
          <select id="star-rating" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select Star Rating...</option>
            <option>1 Star</option>
            <option>2 Star</option>
            <option>3 Star</option>
            <option>4 Star</option>
            <option>5 Star</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="total-rooms">Total Rooms</label>
          <input id="total-rooms" type="number" placeholder="0"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="description">Description</label>
          <textarea id="description" rows={3} placeholder="Property description..." className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500" />
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
