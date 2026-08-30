'use client';

import React, { useState } from 'react';
import { MapPin, ArrowLeft, Save, Trash2, Plus, Minus, Info, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AddNewZonePage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    area: '',
    baseFare: '30',
    perKmRate: '12',
    surgeMultiplier: '1.0',
    maxDeliveryTime: '45',
    minPartners: '5',
    autoAssign: true,
    operatingHoursStart: '06:00',
    operatingHoursEnd: '23:00',
    boundaries: [
      { lat: '', lng: '', label: 'Northwest Corner' },
      { lat: '', lng: '', label: 'Northeast Corner' },
      { lat: '', lng: '', label: 'Southeast Corner' },
      { lat: '', lng: '', label: 'Southwest Corner' },
    ],
  });

  const handleChange = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleBoundaryChange = (index: number, field: 'lat' | 'lng', value: string) => {
    setForm(prev => {
      const boundaries = [...prev.boundaries];
      boundaries[index] = { ...boundaries[index], [field]: value };
      return { ...prev, boundaries };
    });
  };

  const addBoundary = () => {
    setForm(prev => ({
      ...prev,
      boundaries: [...prev.boundaries, { lat: '', lng: '', label: `Point ${prev.boundaries.length + 1}` }],
    }));
  };

  const removeBoundary = (index: number) => {
    if (form.boundaries.length <= 3) return;
    setForm(prev => ({
      ...prev,
      boundaries: prev.boundaries.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Zone Created Successfully!</h2>
          <p className="text-slate-500 mb-1 font-medium">{form.name || 'New Zone'}</p>
          <p className="text-sm text-slate-400 mb-6">{form.area ? `${form.area} sq km` : ''} • Min {form.minPartners} partners • Max {form.maxDeliveryTime} min delivery</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/zones" className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors">
              View All Zones
            </Link>
            <button onClick={() => { setSubmitted(false); setForm(prev => ({ ...prev, name: '', description: '', area: '' })); }}
              className="bg-white hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold border border-slate-200 transition-colors">
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/zones" className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add New Delivery Zone</h1>
          <p className="text-slate-500 text-sm">Define a new service area for your franchise region.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Info */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-600" /> Zone Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="zone-name">Zone Name *</label>
              <input id="zone-name" type="text" required placeholder="e.g. Malad & Kandivali" value={form.name} onChange={e => handleChange('name', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="area-sq-km">Area (sq km) *</label>
              <input id="area-sq-km" type="number" step="0.1" required placeholder="e.g. 15.2" value={form.area} onChange={e => handleChange('area', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="description">Description</label>
            <textarea id="description" placeholder="Brief description of the zone coverage and key landmarks..." value={form.description} onChange={e => handleChange('description', e.target.value)} rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none" />
          </div>
        </div>

        {/* Zone Boundaries */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Zone Boundary Coordinates</h3>
            <button type="button" onClick={addBoundary} className="text-teal-600 hover:text-teal-700 text-sm font-bold flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Point
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-500">Define the polygon boundary of this zone using latitude/longitude coordinates. Minimum 3 points required. In production, this will integrate with a map picker.</p>
          </div>

          {/* Map Placeholder */}
          <div className="w-full h-48 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center">
            <MapPin className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-400">Interactive Map Picker</p>
            <p className="text-xs text-slate-300">Click to draw zone boundaries on map</p>
          </div>

          <div className="space-y-3">
            {form.boundaries.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-8 h-8 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">{i + 1}</span>
                <input type="text" placeholder="Latitude" value={b.lat} onChange={e => handleBoundaryChange(i, 'lat', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <input type="text" placeholder="Longitude" value={b.lng} onChange={e => handleBoundaryChange(i, 'lng', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <span className="text-xs text-slate-400 w-28 truncate hidden md:block">{b.label}</span>
                <button type="button" onClick={() => removeBoundary(i)} disabled={form.boundaries.length <= 3}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Settings */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-slate-900">Delivery Configuration</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="base-fare">Base Fare (₹)</label>
              <input id="base-fare" type="number" value={form.baseFare} onChange={e => handleChange('baseFare', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="per-km-rate">Per Km Rate (₹)</label>
              <input id="per-km-rate" type="number" value={form.perKmRate} onChange={e => handleChange('perKmRate', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="surge-multiplier">Surge Multiplier</label>
              <select id="surge-multiplier" value={form.surgeMultiplier} onChange={e => handleChange('surgeMultiplier', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option>1.0</option><option>1.2</option><option>1.5</option><option>1.8</option><option>2.0</option><option>2.5</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="max-delivery-min">Max Delivery (min)</label>
              <input id="max-delivery-min" type="number" value={form.maxDeliveryTime} onChange={e => handleChange('maxDeliveryTime', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="min-partners-required">Min Partners Required</label>
              <input id="min-partners-required" type="number" value={form.minPartners} onChange={e => handleChange('minPartners', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="operating-start">Operating Start</label>
              <input id="operating-start" type="time" value={form.operatingHoursStart} onChange={e => handleChange('operatingHoursStart', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="operating-end">Operating End</label>
              <input id="operating-end" type="time" value={form.operatingHoursEnd} onChange={e => handleChange('operatingHoursEnd', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={() => handleChange('autoAssign', !form.autoAssign)}
              className={`relative w-12 h-7 rounded-full transition-colors ${form.autoAssign ? 'bg-teal-600' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${form.autoAssign ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
            <div>
              <p className="text-sm font-bold text-slate-700">Auto-Assign Partners</p>
              <p className="text-xs text-slate-400">Automatically assign nearest available delivery partner to orders in this zone</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/zones" className="text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</Link>
          <div className="flex items-center gap-3">
            <button type="button" className="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-bold border border-slate-200 transition-colors">
              Save as Draft
            </button>
            <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm">
              <Save className="w-4 h-4" /> Create Zone
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
