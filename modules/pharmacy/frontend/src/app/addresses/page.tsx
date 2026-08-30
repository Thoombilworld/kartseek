'use client';
import React, { useState } from 'react';
import { ArrowLeft, MapPin, Home, Briefcase, Plus, Edit, Trash2, Star } from 'lucide-react';
import Link from 'next/link';

const initAddresses = [
  { id: 1, label: 'Home', type: 'home' as const, line1: 'Tower B, Prestige Heights', line2: 'Near Metro Station, Sector 12', city: 'Hyderabad', pin: '500032', phone: '+91 98765 43210', isDefault: true },
  { id: 2, label: 'Office', type: 'work' as const, line1: '4th Floor, Indiabulls Finance Centre', line2: 'Lower Parel', city: 'Mumbai', pin: '400013', phone: '+91 98765 43211', isDefault: false },
  { id: 3, label: 'Parents', type: 'other' as const, line1: '12, Gandhi Nagar', line2: 'Near City Centre Mall', city: 'Delhi', pin: '110034', phone: '+91 98765 43212', isDefault: false },
];

const typeIcons: Record<string, React.ReactNode> = { home: <Home className="w-5 h-5" />, work: <Briefcase className="w-5 h-5" />, other: <MapPin className="w-5 h-5" /> };

export default function AddressesPage() {
  const [addresses, setAddresses] = useState(initAddresses);

  const setDefault = (id: number) => setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
  const remove = (id: number) => setAddresses(prev => prev.filter(a => a.id !== id));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <h1 className="text-lg font-bold flex-1">Saved Addresses</h1>
          <button className="bg-teal-600 text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add New</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {addresses.map(a => (
          <div key={a.id} className={`bg-white rounded-2xl border p-5 ${a.isDefault ? 'border-teal-300 ring-1 ring-teal-100' : 'border-gray-200'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${a.isDefault ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-500'}`}>{typeIcons[a.type]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">{a.label}</h3>
                  {a.isDefault && <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">Default</span>}
                </div>
                <p className="text-sm text-gray-700">{a.line1}</p>
                <p className="text-sm text-gray-500">{a.line2}</p>
                <p className="text-sm text-gray-500">{a.city} - {a.pin}</p>
                <p className="text-sm text-gray-500 mt-1">📞 {a.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
              {!a.isDefault && <button onClick={() => setDefault(a.id)} className="text-sm font-medium text-teal-600 hover:text-teal-800 flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Set Default</button>}
              <button className="text-sm font-medium text-gray-600 hover:text-gray-800 flex items-center gap-1"><Edit className="w-3.5 h-3.5" /> Edit</button>
              {!a.isDefault && <button onClick={() => remove(a.id)} className="text-sm font-medium text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
