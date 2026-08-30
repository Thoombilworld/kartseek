'use client';
import React, { useState, useEffect } from 'react';
import { Bike, ShoppingBag, Utensils, CalendarDays, Clock, MapPin, Globe, Phone, Mail, Save, CheckCircle } from 'lucide-react';
import { vendorRestaurantApi } from '@/lib/api/vendor-restaurant';

type ServiceKey = 'delivery' | 'takeaway' | 'dineIn' | 'tableBooking';

interface ServiceConfig {
  enabled: boolean;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export default function ServiceSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [services, setServices] = useState<Record<ServiceKey, ServiceConfig>>({
    delivery: {
      enabled: true, label: 'Delivery', icon: Bike, color: 'text-orange-600', bgColor: 'bg-orange-50',
      description: 'Allow customers to order food delivered to their address.'
    },
    takeaway: {
      enabled: true, label: 'Takeaway / Pickup', icon: ShoppingBag, color: 'text-purple-600', bgColor: 'bg-purple-50',
      description: 'Allow customers to place orders and pick up from the restaurant.'
    },
    dineIn: {
      enabled: true, label: 'Dine-in', icon: Utensils, color: 'text-emerald-600', bgColor: 'bg-emerald-50',
      description: 'Accept walk-in or pre-ordered dine-in guests.'
    },
    tableBooking: {
      enabled: true, label: 'Table Booking', icon: CalendarDays, color: 'text-rose-600', bgColor: 'bg-rose-50',
      description: 'Allow customers to book a table in advance with date, time, and guest count.'
    },
  });

  const [deliverySettings, setDeliverySettings] = useState({
    minOrder: '100', deliveryRadius: '5', deliveryFee: '30', freeDeliveryAbove: '500', estimatedTime: '35',
  });
  const [takeawaySettings, setTakeawaySettings] = useState({ prepTime: '15', pickupInstructions: 'Collect from the main entrance counter.', contactRequired: true });
  const [dineInSettings, setDineInSettings] = useState({ capacity: '80', waitTime: '10', walkInEnabled: true, preOrderEnabled: true });
  const [tableSettings, setTableSettings] = useState({
    maxGuests: '12', advanceBookingDays: '7', slotDuration: '90', requireDeposit: false, depositAmount: '500',
    slots: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'],
  });

  const toggleService = (key: ServiceKey) => {
    setServices(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Control which order modes customers can use at your restaurant.</p>
        </div>
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}`} aria-label="Action">{saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}</button>
      </div>

      {/* Service Toggle Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(Object.entries(services) as [ServiceKey, ServiceConfig][]).map(([key, svc]) => (
          <div key={key} className={`bg-white border-2 rounded-2xl p-5 transition-all ${svc.enabled ? 'border-emerald-300 shadow-sm' : 'border-slate-200 opacity-60'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${svc.bgColor} rounded-xl flex items-center justify-center`}>
                  <svc.icon className={`w-5 h-5 ${svc.color}`} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{svc.label}</p>
                  <p className={`text-xs font-bold ${svc.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>{svc.enabled ? '✓ Enabled' : '✕ Disabled'}</p>
                </div>
              </div>
              <button onClick={() => toggleService(key)}
                className={`relative w-12 h-6 rounded-full transition-colors ${svc.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform shadow-sm ${svc.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-xs text-slate-500">{svc.description}</p>
          </div>
        ))}
      </div>

      {/* Delivery Settings */}
      {services.delivery.enabled && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center"><Bike className="w-4 h-4 text-orange-600" /></div>
            <h2 className="font-bold text-slate-900">Delivery Configuration</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Min Order (₹)', key: 'minOrder' as const },
              { label: 'Delivery Radius (km)', key: 'deliveryRadius' as const },
              { label: 'Delivery Fee (₹)', key: 'deliveryFee' as const },
              { label: 'Free Delivery Above (₹)', key: 'freeDeliveryAbove' as const },
              { label: 'Estimated Time (min)', key: 'estimatedTime' as const },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{f.label}</label>
                <input type="number" value={deliverySettings[f.key]}
                  onChange={e => setDeliverySettings(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Takeaway Settings */}
      {services.takeaway.enabled && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-purple-600" /></div>
            <h2 className="font-bold text-slate-900">Takeaway Configuration</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5" htmlFor="prep-time-min">Prep Time (min)</label>
              <input id="prep-time-min" type="number" value={takeawaySettings.prepTime}
                onChange={e => setTakeawaySettings(p => ({ ...p, prepTime: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-400 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5" htmlFor="pickup-instructions">Pickup Instructions</label>
              <input id="pickup-instructions" value={takeawaySettings.pickupInstructions}
                onChange={e => setTakeawaySettings(p => ({ ...p, pickupInstructions: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-400 outline-none" />
            </div>
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
              <div>
                <p className="text-sm font-bold text-slate-800">Require Customer Phone</p>
                <p className="text-xs text-slate-500">Confirm pickup via SMS</p>
              </div>
              <button onClick={() => setTakeawaySettings(p => ({ ...p, contactRequired: !p.contactRequired }))}
                className={`relative w-10 h-5 rounded-full ${takeawaySettings.contactRequired ? 'bg-purple-500' : 'bg-slate-300'}`}>
                <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-transform shadow ${takeawaySettings.contactRequired ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dine-in Settings */}
      {services.dineIn.enabled && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center"><Utensils className="w-4 h-4 text-emerald-600" /></div>
            <h2 className="font-bold text-slate-900">Dine-in Configuration</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5" htmlFor="seating-capacity">Seating Capacity</label>
              <input id="seating-capacity" type="number" value={dineInSettings.capacity}
                onChange={e => setDineInSettings(p => ({ ...p, capacity: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-400 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5" htmlFor="avg-wait-time-min">Avg Wait Time (min)</label>
              <input id="avg-wait-time-min" type="number" value={dineInSettings.waitTime}
                onChange={e => setDineInSettings(p => ({ ...p, waitTime: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-400 outline-none" />
            </div>
            {[
              { label: 'Allow Walk-ins', key: 'walkInEnabled' as const },
              { label: 'Allow Pre-ordering Food', key: 'preOrderEnabled' as const },
            ].map(toggle => (
              <div key={toggle.key} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                <p className="text-sm font-bold text-slate-800">{toggle.label}</p>
                <button onClick={() => setDineInSettings(p => ({ ...p, [toggle.key]: !p[toggle.key] }))}
                  className={`relative w-10 h-5 rounded-full ${dineInSettings[toggle.key] ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-transform shadow ${dineInSettings[toggle.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Booking Settings */}
      {services.tableBooking.enabled && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center"><CalendarDays className="w-4 h-4 text-rose-600" /></div>
            <h2 className="font-bold text-slate-900">Table Booking Configuration</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5" htmlFor="max-guests-booking">Max Guests/Booking</label>
              <input id="max-guests-booking" type="number" value={tableSettings.maxGuests}
                onChange={e => setTableSettings(p => ({ ...p, maxGuests: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-rose-400 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5" htmlFor="advance-booking-days">Advance Booking (days)</label>
              <input id="advance-booking-days" type="number" value={tableSettings.advanceBookingDays}
                onChange={e => setTableSettings(p => ({ ...p, advanceBookingDays: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-rose-400 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5" htmlFor="slot-duration-min">Slot Duration (min)</label>
              <input id="slot-duration-min" type="number" value={tableSettings.slotDuration}
                onChange={e => setTableSettings(p => ({ ...p, slotDuration: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-rose-400 outline-none" />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2.5">Available Time Slots</label>
            <div className="flex flex-wrap gap-2">
              {tableSettings.slots.map(slot => (
                <span key={slot} className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold">{slot}</span>
              ))}
              <button className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">+ Add Slot</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}`} aria-label="Action">{saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save All Settings</>}</button>
      </div>
    </div>
  );
}
