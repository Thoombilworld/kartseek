'use client';
import React, { useState } from 'react';
import { Settings, Bell, Percent, Truck, Clock, Shield, ToggleLeft, Save } from 'lucide-react';

export default function FranchisePharmacySettingsPage() {
  const [autoApprove, setAutoApprove] = useState(false);
  const [rxVerification, setRxVerification] = useState(true);
  const [coldChainAlerts, setColdChainAlerts] = useState(true);
  const [stockAlerts, setStockAlerts] = useState(true);
  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [commission, setCommission] = useState('10');
  const [minOrder, setMinOrder] = useState('199');
  const [maxDelivery, setMaxDelivery] = useState('45');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pharmacy Settings</h1>
        <p className="text-sm text-slate-500">Configure pharmacy module settings for your franchise zone.</p>
      </div>

      {/* Order Management */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Settings className="w-4 h-4 text-teal-600" /> Order Management</h2>
        <Toggle label="Auto-approve new pharmacy stores" value={autoApprove} onChange={setAutoApprove} desc="New pharmacies will be immediately active without manual review." />
        <Toggle label="Mandatory Rx verification" value={rxVerification} onChange={setRxVerification} desc="Require prescription verification before dispatching Rx orders." />
      </div>

      {/* Notifications */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Bell className="w-4 h-4 text-blue-600" /> Notifications</h2>
        <Toggle label="Cold chain alerts" value={coldChainAlerts} onChange={setColdChainAlerts} desc="Alert when temperature-sensitive medicines are in transit." />
        <Toggle label="Low stock alerts" value={stockAlerts} onChange={setStockAlerts} desc="Notify when any store has critically low stock." />
        <Toggle label="Expiry alerts" value={expiryAlerts} onChange={setExpiryAlerts} desc="Alert when medicines are approaching expiry date." />
      </div>

      {/* Business Rules */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Percent className="w-4 h-4 text-green-600" /> Business Rules</h2>
        <Field label="Commission Rate (%)" value={commission} onChange={setCommission} hint="Applied to all pharmacy orders in your zone." />
        <Field label="Minimum Order Amount (₹)" value={minOrder} onChange={setMinOrder} hint="Orders below this amount will not be accepted." />
        <Field label="Max Delivery Time (min)" value={maxDelivery} onChange={setMaxDelivery} hint="SLA threshold for pharmacy delivery." />
      </div>

      {/* Save */}
      <button className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
        <Save className="w-4 h-4" /> Save Settings
      </button>
    </div>
  );
}

function Toggle({ label, value, onChange, desc }: { label:string, value:boolean, onChange:(v:boolean)=>void, desc:string }) {
  return (
    <div className="flex items-start gap-4 py-2 border-b border-slate-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      <button onClick={()=>onChange(!value)} aria-label={label} title={label}
        className={`relative w-12 h-7 rounded-full transition-colors ${value ? 'bg-teal-500' : 'bg-slate-200'}`}>
        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function Field({ label, value, onChange, hint }: { label:string, value:string, onChange:(v:string)=>void, hint:string }) {
  return (
    <div className="py-2 border-b border-slate-100 last:border-0">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <p className="text-xs text-slate-400 mt-0.5 mb-2">{hint}</p>
      <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={label}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
    </div>
  );
}
