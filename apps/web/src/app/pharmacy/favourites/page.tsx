'use client';
import React, { useState } from 'react';
import { ArrowLeft, Heart, Star, MapPin, Clock, Pill, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const pharmacies = [
  { id: 'PH-001', name: 'MedPlus Pharmacy', area: 'Banjara Hills, Hyderabad', rating: 4.7, reviews: 1234, is24hr: true, distance: '1.2 km', deliveryTime: '25 min', image: '🏥' },
  { id: 'PH-002', name: 'Apollo Pharmacy', area: 'T. Nagar, Chennai', rating: 4.8, reviews: 2100, is24hr: false, distance: '2.5 km', deliveryTime: '35 min', image: '💊' },
  { id: 'PH-003', name: 'Netmeds Express', area: 'Andheri, Mumbai', rating: 4.5, reviews: 890, is24hr: true, distance: '0.8 km', deliveryTime: '20 min', image: '🏪' },
  { id: 'PH-004', name: 'Life Pharmacy', area: 'Downtown Dubai', rating: 4.9, reviews: 3200, is24hr: true, distance: '3.1 km', deliveryTime: '40 min', image: '⚕️' },
];

export default function FavouritesPage() {
  const [items, setItems] = useState(pharmacies);

  const remove = (id: string) => setItems(prev => prev.filter(p => p.id !== id));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/pharmacy" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <h1 className="text-lg font-bold flex-1">Favourite Pharmacies</h1>
          <span className="text-sm text-gray-500">{items.length} saved</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No favourite pharmacies yet</p>
            <Link href="/pharmacy/stores" className="inline-block mt-4 text-teal-600 font-bold hover:underline">Browse pharmacies</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center text-2xl">{p.image}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
                        <button onClick={() => remove(p.id)} className="p-1.5 hover:bg-red-50 rounded-full transition-colors"><Heart className="w-5 h-5 text-red-500 fill-red-500" /></button>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" /> {p.area}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <span className="flex items-center gap-1 text-sm"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /><span className="font-bold">{p.rating}</span><span className="text-gray-400">({p.reviews})</span></span>
                    <span className="text-sm text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {p.deliveryTime}</span>
                    {p.is24hr && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">24hr</span>}
                  </div>
                </div>
                <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between">
                  <span className="text-xs text-gray-500">{p.distance} away</span>
                  <Link href={`/pharmacy/stores/${p.id}`} className="text-sm font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1">Visit <ExternalLink className="w-3.5 h-3.5" /></Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
