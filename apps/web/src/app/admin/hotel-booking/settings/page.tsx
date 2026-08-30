'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { Settings, Save, Globe, Bell, CreditCard, Shield } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';
export default function HotelSettingsPage(){
  const { regionLabel, isFiltered, formatPrice } = useHotelRegionFilter([]);
  const [autoApprove,setAutoApprove]=useState(false);const [maxRooms,setMaxRooms]=useState('500');const [defaultCommission,setDefaultCommission]=useState('15');const [cancellationWindow,setCancellationWindow]=useState('24');
  return(<div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Hotel Module Settings</h1><p className="text-slate-500 text-sm">Configure global hotel booking settings, notifications, and policies.</p></div>

    <div className="grid md:grid-cols-2 gap-6">
      {/* General Settings */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Settings className="w-4 h-4 text-rose-500"/>General</h3>
        <div className="space-y-4">
          <div><label className="text-xs font-medium text-slate-500 block mb-1" htmlFor="defaultCommission">Default Commission Rate (%)</label><input id="defaultCommission" type="number" value={defaultCommission} onChange={e=>setDefaultCommission(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"/></div>
          <div><label className="text-xs font-medium text-slate-500 block mb-1" htmlFor="maxRooms">Max Rooms per Hotel</label><input id="maxRooms" type="number" value={maxRooms} onChange={e=>setMaxRooms(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"/></div>
          <div><label className="text-xs font-medium text-slate-500 block mb-1" htmlFor="cancelWindow">Free Cancellation Window (hours)</label><input id="cancelWindow" type="number" value={cancellationWindow} onChange={e=>setCancellationWindow(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"/></div>
          <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-900">Auto-Approve Hotels</p><p className="text-xs text-slate-400">Skip manual review for new registrations</p></div><button title="Toggle auto-approve" onClick={()=>setAutoApprove(!autoApprove)} className={`w-12 h-6 rounded-full transition-colors ${autoApprove?'bg-rose-500':'bg-slate-300'}`}><div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${autoApprove?'translate-x-6':'translate-x-0.5'}`}/></button></div>
        </div>
      </div>

      {/* Country Settings */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500"/>Enabled Countries</h3>
        <div className="space-y-2">
          {[{code:'AE',name:'UAE',enabled:true},{code:'QA',name:'Qatar',enabled:true},{code:'SA',name:'Saudi Arabia',enabled:true},{code:'IN',name:'India',enabled:true},{code:'GB',name:'United Kingdom',enabled:true},{code:'OM',name:'Oman',enabled:true},{code:'KW',name:'Kuwait',enabled:false},{code:'BH',name:'Bahrain',enabled:false},{code:'US',name:'United States',enabled:false}].map(c=>(
            <div key={c.code} className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{c.code}</span><span className="text-sm text-slate-700">{c.name}</span></div>
              <span className={`w-3 h-3 rounded-full ${c.enabled?'bg-emerald-500':'bg-slate-300'}`}/>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500"/>Notifications</h3>
        <div className="space-y-3">
          {['New Booking Confirmation','Check-in Reminder (24h before)','Checkout Reminder','Review Request (post-checkout)','Cancellation Alert','Low Inventory Alert','Payout Processed'].map(n=>(
            <div key={n} className="flex items-center justify-between py-2"><span className="text-sm text-slate-700">{n}</span><span className="w-3 h-3 rounded-full bg-emerald-500"/></div>
          ))}
        </div>
      </div>

      {/* Payment Settings */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-purple-500"/>Payment</h3>
        <div className="space-y-3">
          {['Pay at Hotel','Online Payment (Card)','KARTSEEK Wallet','Apple Pay / Google Pay','Bank Transfer'].map(p=>(
            <div key={p} className="flex items-center justify-between py-2"><span className="text-sm text-slate-700">{p}</span><span className="w-3 h-3 rounded-full bg-emerald-500"/></div>
          ))}
        </div>
      </div>
    </div>

    <div className="flex justify-end"><button className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md"><Save className="w-4 h-4"/>Save Settings</button></div>
  </div>);
}
