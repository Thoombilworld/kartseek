'use client';
import React, { useState } from 'react';
import { X, Star, MapPin, Wifi, Car, Waves, Utensils, Dumbbell, ChevronDown, Plus, CheckCircle2 } from 'lucide-react';

const HOTELS = [
  { id: 'htl-001', name: 'The Grand Palace Hotel', city: 'Dubai', stars: 5, rating: 4.8, reviews: 1240, price: 450, currency: 'AED', image: '🏨', amenities: ['Pool', 'Spa', 'Gym', 'Restaurant', 'WiFi', 'Parking', 'Room Service', 'Concierge'], distance: '2.3 km', checkIn: '14:00', checkOut: '12:00', cancellation: 'Free up to 24h', breakfast: 'Included', roomSize: '35 sqm' },
  { id: 'htl-002', name: 'KARTSEEK Business Suites', city: 'Dubai', stars: 4, rating: 4.6, reviews: 890, price: 280, currency: 'AED', image: '🏢', amenities: ['WiFi', 'Business Center', 'Gym', 'Restaurant', 'Parking'], distance: '0.8 km', checkIn: '15:00', checkOut: '11:00', cancellation: 'Free up to 48h', breakfast: 'AED 45/person', roomSize: '28 sqm' },
  { id: 'htl-005', name: 'Heritage Boutique Hotel', city: 'Dubai', stars: 5, rating: 4.9, reviews: 430, price: 650, currency: 'AED', image: '🏰', amenities: ['Pool', 'Spa', 'Fine Dining', 'Concierge', 'WiFi', 'Butler Service', 'Room Service', 'Valet'], distance: '1.5 km', checkIn: '14:00', checkOut: '12:00', cancellation: 'Non-refundable', breakfast: 'Included', roomSize: '52 sqm' },
];

const COMPARE_FIELDS = ['Price / Night', 'Star Rating', 'Guest Rating', 'Reviews', 'Distance', 'Room Size', 'Check-in', 'Check-out', 'Cancellation', 'Breakfast', 'Amenities'];

export default function HotelComparePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>(['htl-001', 'htl-002']);

  const selected = HOTELS.filter(h => selectedIds.includes(h.id));
  const unselected = HOTELS.filter(h => !selectedIds.includes(h.id));

  const addHotel = (id: string) => {
    if (selectedIds.length < 3) setSelectedIds([...selectedIds, id]);
  };
  const removeHotel = (id: string) => {
    setSelectedIds(selectedIds.filter(i => i !== id));
  };

  const getBestValue = (field: string): string | null => {
    if (selected.length < 2) return null;
    switch (field) {
      case 'Price / Night': return selected.reduce((a, b) => a.price < b.price ? a : b).id;
      case 'Guest Rating': return selected.reduce((a, b) => a.rating > b.rating ? a : b).id;
      case 'Reviews': return selected.reduce((a, b) => a.reviews > b.reviews ? a : b).id;
      default: return null;
    }
  };

  const getFieldValue = (hotel: typeof HOTELS[0], field: string): string => {
    switch (field) {
      case 'Price / Night': return `${hotel.currency} ${hotel.price}`;
      case 'Star Rating': return '★'.repeat(hotel.stars);
      case 'Guest Rating': return `${hotel.rating} / 5`;
      case 'Reviews': return hotel.reviews.toLocaleString();
      case 'Distance': return hotel.distance;
      case 'Room Size': return hotel.roomSize;
      case 'Check-in': return hotel.checkIn;
      case 'Check-out': return hotel.checkOut;
      case 'Cancellation': return hotel.cancellation;
      case 'Breakfast': return hotel.breakfast;
      case 'Amenities': return hotel.amenities.join(', ');
      default: return '-';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Compare Hotels</h1>
        <p className="text-sm text-slate-500 mt-1">Side-by-side comparison to help you choose the best stay</p>
      </div>

      {/* Add Hotel */}
      {unselected.length > 0 && selectedIds.length < 3 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-500 font-semibold">Add to compare:</span>
          {unselected.map(h => (
            <button key={h.id} onClick={() => addHotel(h.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-rose-300 text-sm font-semibold text-slate-700 transition-colors">
              <Plus className="w-3 h-3" /> {h.name}
            </button>
          ))}
        </div>
      )}

      {/* Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Hotel Headers */}
            <thead>
              <tr className="border-b border-slate-100">
                <th className="p-4 text-left text-sm font-bold text-slate-400 w-40">Feature</th>
                {selected.map(h => (
                  <th key={h.id} className="p-4 text-center min-w-[200px]">
                    <div className="relative">
                      <button onClick={() => removeHotel(h.id)}
                        className="absolute -top-1 right-0 p-1 hover:bg-slate-100 rounded-full">
                        <X className="w-3 h-3 text-slate-400" />
                      </button>
                      <div className="text-4xl mb-2">{h.image}</div>
                      <p className="font-bold text-slate-900 text-sm">{h.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{h.city}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {COMPARE_FIELDS.map((field, i) => {
                const bestId = getBestValue(field);
                return (
                  <tr key={field} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-slate-50/30' : ''}`}>
                    <td className="p-4 text-sm font-semibold text-slate-500">{field}</td>
                    {selected.map(h => (
                      <td key={h.id} className="p-4 text-center">
                        <span className={`text-sm font-semibold ${
                          bestId === h.id ? 'text-emerald-600' : 'text-slate-800'
                        }`}>
                          {bestId === h.id && <CheckCircle2 className="w-3 h-3 inline-block mr-1 mb-0.5" />}
                          {getFieldValue(h, field)}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>

            {/* Book Now Row */}
            <tfoot>
              <tr className="bg-slate-50">
                <td className="p-4" />
                {selected.map(h => (
                  <td key={h.id} className="p-4 text-center">
                    <button className="px-6 py-2.5 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">
                      Book · {h.currency} {h.price}/night
                    </button>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
