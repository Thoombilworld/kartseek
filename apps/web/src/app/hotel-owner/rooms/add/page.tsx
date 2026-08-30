'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Save, ArrowLeft } from 'lucide-react';

export default function AddRoomPage() {
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
            <PlusCircle className="w-7 h-7 text-blue-600" />Add Room
          </h1>
          <p className="text-sm text-slate-500 mt-1">Add a new room to your property</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="room-number">Room Number</label>
          <input id="room-number" type="text" placeholder="e.g. 101"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="room-type">Room Type</label>
          <select id="room-type" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select Room Type...</option>
            <option>Standard</option>
            <option>Deluxe</option>
            <option>Suite</option>
            <option>Executive</option>
            <option>Presidential</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="floor">Floor</label>
          <input id="floor" type="text" placeholder="e.g. 1st"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="rate-per-night">Rate per Night </label>
          <input id="rate-per-night" type="number" placeholder="5000"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="max-guests">Max Guests</label>
          <input id="max-guests" type="number" placeholder="2"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="amenities">Amenities</label>
          <input id="amenities" type="text" placeholder="WiFi, AC, TV, Mini Bar..."  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="description">Description</label>
          <textarea id="description" rows={3} placeholder="Room description..." className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500" />
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
