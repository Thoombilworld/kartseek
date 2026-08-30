'use client';
import React, { useState } from 'react';
import { Plus, X, MapPin, Calendar, ArrowRight, Plane, GripVertical, Star, DollarSign, Clock } from 'lucide-react';

interface TripStop { id: string; city: string; hotel: string; checkin: string; checkout: string; price: number; nights: number; rating: number }

const INITIAL_STOPS: TripStop[] = [
  { id: 's1', city: 'Dubai', hotel: 'The Grand Palace Hotel', checkin: '2026-08-01', checkout: '2026-08-04', price: 1350, nights: 3, rating: 4.8 },
  { id: 's2', city: 'Abu Dhabi', hotel: 'Emirates Palace', checkin: '2026-08-04', checkout: '2026-08-06', price: 1200, nights: 2, rating: 4.9 },
];

export default function TripPlannerPage() {
  const [stops, setStops] = useState<TripStop[]>(INITIAL_STOPS);
  const [showAdd, setShowAdd] = useState(false);

  const totalNights = stops.reduce((s, st) => s + st.nights, 0);
  const totalCost = stops.reduce((s, st) => s + st.price, 0);
  const startDate = stops.length > 0 ? stops[0].checkin : '-';
  const endDate = stops.length > 0 ? stops[stops.length - 1].checkout : '-';

  const removeStop = (id: string) => setStops(stops.filter(s => s.id !== id));
  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const newStops = [...stops];
    [newStops[idx - 1], newStops[idx]] = [newStops[idx], newStops[idx - 1]];
    setStops(newStops);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Trip Planner</h1>
        <p className="text-sm text-slate-500 mt-1">Build your multi-city itinerary and see total costs at a glance</p>
      </div>

      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-rose-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-white/60 font-semibold">Cities</p>
              <p className="text-2xl font-black">{stops.length}</p>
            </div>
            <div>
              <p className="text-xs text-white/60 font-semibold">Total Nights</p>
              <p className="text-2xl font-black">{totalNights}</p>
            </div>
            <div>
              <p className="text-xs text-white/60 font-semibold">Total Cost</p>
              <p className="text-2xl font-black">AED {totalCost.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="w-4 h-4" />
            {startDate} <ArrowRight className="w-3 h-3" /> {endDate}
          </div>
        </div>
      </div>

      {/* Trip Timeline */}
      <div className="space-y-0">
        {stops.map((stop, idx) => (
          <div key={stop.id}>
            {/* Stop Card */}
            <div className="flex gap-4">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-rose-600 text-white rounded-full flex items-center justify-center text-sm font-black shadow-lg shadow-rose-200">{idx + 1}</div>
                {idx < stops.length - 1 && <div className="w-0.5 h-full bg-slate-200 min-h-[20px]" />}
              </div>

              {/* Card */}
              <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-rose-600" />
                      <h3 className="font-black text-lg text-slate-900">{stop.city}</h3>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mb-3">{stop.hotel}</p>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {stop.checkin} → {stop.checkout}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {stop.nights} nights</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {stop.rating}</span>
                      <span className="flex items-center gap-1 font-bold text-rose-600"><DollarSign className="w-3 h-3" /> AED {stop.price.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0}
                      className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={() => removeStop(stop.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Transit Connector */}
            {idx < stops.length - 1 && (
              <div className="flex gap-4 mb-0">
                <div className="flex flex-col items-center w-10">
                  <div className="w-0.5 h-6 bg-slate-200" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 pb-2">
                  <Plane className="w-3 h-3" />
                  <span>Travel to {stops[idx + 1].city}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Stop */}
      {showAdd ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900">Add Destination</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="city">City</label>
              <input id="city" type="text" placeholder="e.g. Muscat" className="w-full px-3 py-2.5 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="hotel">Hotel</label>
              <input id="hotel" type="text" placeholder="Search hotels..." className="w-full px-3 py-2.5 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="check-in">Check-in</label>
              <input id="check-in" type="date" className="w-full px-3 py-2.5 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="check-out">Check-out</label>
              <input id="check-out" type="date" className="w-full px-3 py-2.5 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700">Add to Trip</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:border-rose-300 hover:text-rose-600 transition-colors">
          <Plus className="w-4 h-4" /> Add Destination
        </button>
      )}

      {/* Book All */}
      {stops.length > 0 && (
        <button className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-colors shadow-xl shadow-rose-200 text-lg flex items-center justify-center gap-2">
          Book Entire Trip · AED {Math.round(totalCost * 1.15).toLocaleString()} <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
