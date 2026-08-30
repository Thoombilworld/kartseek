'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UserPlus, Save, ArrowLeft } from 'lucide-react';

export default function AddStaffMemberPage() {
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
            <UserPlus className="w-7 h-7 text-blue-600" />Add Staff Member
          </h1>
          <p className="text-sm text-slate-500 mt-1">Add a new team member</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="full-name">Full Name</label>
          <input id="full-name" type="text" placeholder="Full name"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="email">Email</label>
          <input id="email" type="email" placeholder="email@hotel.com"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="phone">Phone</label>
          <input id="phone" type="tel" placeholder="+91 7XX XXX XXX"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="role">Role</label>
          <select id="role" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select Role...</option>
            <option>Manager</option>
            <option>Front Desk</option>
            <option>Housekeeper</option>
            <option>Chef</option>
            <option>Security</option>
            <option>Maintenance</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="department">Department</label>
          <select id="department" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select Department...</option>
            <option>Front Office</option>
            <option>Housekeeping</option>
            <option>Kitchen</option>
            <option>Security</option>
            <option>Maintenance</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="shift">Shift</label>
          <select id="shift" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select Shift...</option>
            <option>Day</option>
            <option>Night</option>
            <option>Morning</option>
            <option>Rotating</option>
          </select>
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
