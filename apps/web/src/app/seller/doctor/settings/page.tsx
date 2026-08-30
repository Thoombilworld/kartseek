'use client';
import React, { useState, useEffect } from 'react';
import { Settings, Bell, Shield, Globe, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { vendorDoctorApi } from '@/lib/api/vendor-doctor';

export default function SettingsPage() {
  const [notifs, setNotifs] = useState({ newBooking: true, cancellation: true, reminder: true, review: true, payout: true, marketing: false });
  const toggle = (k: string) => setNotifs(n => ({ ...n, [k]: !(n as any)[k] }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Settings className="w-6 h-6 text-violet-600" /> Settings</h1><p className="text-sm text-slate-500 mt-1">Manage your notification preferences and account settings</p></div>
      {/* Notifications */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-violet-600" /> Notifications</h3>
        <div className="space-y-4">
          {[
            { key: 'newBooking', label: 'New Booking', desc: 'Get notified when a patient books an appointment' },
            { key: 'cancellation', label: 'Cancellations', desc: 'Get notified when a patient cancels an appointment' },
            { key: 'reminder', label: 'Appointment Reminders', desc: 'Receive reminders before upcoming appointments' },
            { key: 'review', label: 'New Reviews', desc: 'Get notified when a patient leaves a review' },
            { key: 'payout', label: 'Payout Updates', desc: 'Get notified about earnings and payout status' },
            { key: 'marketing', label: 'Marketing & Promotions', desc: 'Receive tips and promotional opportunities' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between py-2">
              <div><p className="text-sm font-semibold text-slate-900">{n.label}</p><p className="text-xs text-slate-500">{n.desc}</p></div>
              <button onClick={() => toggle(n.key)}>{(notifs as any)[n.key] ? <ToggleRight className="w-8 h-8 text-violet-600" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}</button>
            </div>
          ))}
        </div>
      </div>
      {/* Security */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-violet-600" /> Security</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2"><div><p className="text-sm font-semibold text-slate-900">Change Password</p><p className="text-xs text-slate-500">Last changed 30 days ago</p></div><button className="bg-white border border-slate-200 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-50 transition-colors">Change</button></div>
          <div className="flex items-center justify-between py-2"><div><p className="text-sm font-semibold text-slate-900">Two-Factor Authentication</p><p className="text-xs text-slate-500">Add an extra layer of security</p></div><button className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-violet-700 transition-colors">Enable</button></div>
        </div>
      </div>
      {/* Language */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-violet-600" /> Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-slate-500 mb-1.5 block" htmlFor="language">Language</label><select id="language" defaultValue="en" aria-label="Language" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:border-violet-400 outline-none"><option value="en">English</option><option value="sw">Swahili</option><option value="hi">Hindi</option><option value="ar">Arabic</option></select></div>
          <div><label className="text-xs font-bold text-slate-500 mb-1.5 block" htmlFor="timezone">Timezone</label><select id="timezone" defaultValue="eat" aria-label="Timezone" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:border-violet-400 outline-none"><option value="eat">East Africa Time (UTC+3)</option><option value="ist">India Standard Time (UTC+5:30)</option><option value="gmt">GMT (UTC+0)</option></select></div>
        </div>
      </div>
      <div className="flex justify-end"><button className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-lg shadow-violet-200/50"><Save className="w-4 h-4" /> Save Settings</button></div>
    </div>
  );
}
