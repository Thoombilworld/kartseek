'use client';
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus, Calendar } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Simulated nightly rates for 90 days
function generatePrices(base: number): Record<string, number> {
  const prices: Record<string, number> = {};
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const randomFactor = 0.85 + Math.random() * 0.45;
    const weekendMultiplier = isWeekend ? 1.25 : 1;
    prices[key] = Math.round(base * randomFactor * weekendMultiplier);
  }
  return prices;
}

const ROOM_TYPES = [
  { id: 'rm-001', name: 'Deluxe King Room', basePrice: 450 },
  { id: 'rm-002', name: 'Premium Twin Room', basePrice: 520 },
  { id: 'rm-003', name: 'Executive Suite', basePrice: 850 },
];

const priceTier = (price: number, base: number): string => {
  const ratio = price / base;
  if (ratio <= 0.9) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (ratio <= 1.1) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (ratio <= 1.25) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
};

export default function HotelPriceCalendarPage() {
  const [selectedRoom, setSelectedRoom] = useState(ROOM_TYPES[0]);
  const [monthOffset, setMonthOffset] = useState(0);
  const [checkin, setCheckin] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<string | null>(null);

  const prices = useMemo(() => generatePrices(selectedRoom.basePrice), [selectedRoom.id]);

  const today = new Date();
  const viewMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: Array<{ date: string; day: number; price: number | null; isPast: boolean }> = [];
    for (let i = 0; i < firstDay; i++) days.push({ date: '', day: 0, price: null, isPast: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = new Date(dateStr) < new Date(today.toISOString().split('T')[0]);
      days.push({ date: dateStr, day: d, price: prices[dateStr] || null, isPast });
    }
    return days;
  }, [month, year, prices, firstDay, daysInMonth]);

  const handleDateClick = (date: string) => {
    if (!checkin || (checkin && checkout)) {
      setCheckin(date);
      setCheckout(null);
    } else if (date > checkin) {
      setCheckout(date);
    } else {
      setCheckin(date);
      setCheckout(null);
    }
  };

  const isInRange = (date: string) => {
    if (!checkin || !checkout) return false;
    return date >= checkin && date <= checkout;
  };

  const selectedNights = useMemo(() => {
    if (!checkin || !checkout) return [];
    const nights: Array<{ date: string; price: number }> = [];
    let d = new Date(checkin);
    const end = new Date(checkout);
    while (d < end) {
      const key = d.toISOString().split('T')[0];
      nights.push({ date: key, price: prices[key] || selectedRoom.basePrice });
      d.setDate(d.getDate() + 1);
    }
    return nights;
  }, [checkin, checkout, prices]);

  const totalPrice = selectedNights.reduce((s, n) => s + n.price, 0);
  const avgPrice = selectedNights.length ? Math.round(totalPrice / selectedNights.length) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Price Calendar</h1>
        <p className="text-sm text-slate-500 mt-1">View nightly rates and find the best dates for your stay</p>
      </div>

      {/* Room Type Selector */}
      <div className="flex gap-3 flex-wrap">
        {ROOM_TYPES.map(r => (
          <button key={r.id} onClick={() => { setSelectedRoom(r); setCheckin(null); setCheckout(null); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              selectedRoom.id === r.id
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-200'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-rose-300'
            }`}>
            {r.name} · <span className="font-bold">AED {r.basePrice}</span>/night
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 items-center">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" /> Low
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" /> Average
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> High
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Peak
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setMonthOffset(Math.max(0, monthOffset - 1))} disabled={monthOffset === 0}
              className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-lg font-bold text-slate-900">{MONTHS[month]} {year}</h2>
            <button onClick={() => setMonthOffset(Math.min(2, monthOffset + 1))} disabled={monthOffset >= 2}
              className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, i) => (
              <div key={i}>
                {cell.day === 0 ? <div className="h-16" /> : (
                  <button
                    disabled={cell.isPast || !cell.price}
                    onClick={() => !cell.isPast && cell.price && handleDateClick(cell.date)}
                    className={`w-full h-16 rounded-xl text-center flex flex-col items-center justify-center gap-0.5 border transition-all ${
                      cell.isPast ? 'opacity-30 cursor-not-allowed bg-slate-50 border-transparent' :
                      cell.date === checkin ? 'bg-rose-600 text-white border-rose-600 shadow-lg' :
                      cell.date === checkout ? 'bg-rose-600 text-white border-rose-600 shadow-lg' :
                      isInRange(cell.date) ? 'bg-rose-100 border-rose-200 text-rose-700' :
                      cell.price ? `${priceTier(cell.price, selectedRoom.basePrice)} cursor-pointer hover:scale-105` :
                      'bg-slate-50 border-transparent'
                    }`}>
                    <span className={`text-xs font-bold ${cell.date === checkin || cell.date === checkout ? 'text-white' : ''}`}>{cell.day}</span>
                    {cell.price && !cell.isPast && (
                      <span className={`text-[10px] font-bold ${cell.date === checkin || cell.date === checkout ? 'text-white/80' : ''}`}>
                        {cell.price}
                      </span>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selection Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-600" /> Your Selection
            </h3>
            {checkin && checkout ? (
              <>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Check-in</span>
                  <span className="font-bold text-slate-900">{checkin}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Check-out</span>
                  <span className="font-bold text-slate-900">{checkout}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Nights</span>
                  <span className="font-bold text-slate-900">{selectedNights.length}</span>
                </div>
                <hr className="my-3 border-slate-100" />
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Avg/night</span>
                  <span className="font-bold text-slate-900">AED {avgPrice}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-900">AED {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Taxes & Fees</span>
                  <span className="font-bold text-slate-900">AED {Math.round(totalPrice * 0.15).toLocaleString()}</span>
                </div>
                <hr className="my-3 border-slate-100" />
                <div className="flex justify-between text-base">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-black text-rose-600">AED {Math.round(totalPrice * 1.15).toLocaleString()}</span>
                </div>
                <button className="w-full mt-4 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">
                  Book Now
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">
                {checkin ? 'Select checkout date' : 'Select check-in and checkout dates on the calendar'}
              </p>
            )}
          </div>

          {/* Nightly Breakdown */}
          {selectedNights.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-3">Nightly Rates</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedNights.map(n => (
                  <div key={n.date} className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{new Date(n.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <div className="flex items-center gap-1.5">
                      {n.price < selectedRoom.basePrice && <TrendingDown className="w-3 h-3 text-emerald-500" />}
                      {n.price > selectedRoom.basePrice * 1.1 && <TrendingUp className="w-3 h-3 text-red-500" />}
                      {n.price >= selectedRoom.basePrice && n.price <= selectedRoom.basePrice * 1.1 && <Minus className="w-3 h-3 text-blue-400" />}
                      <span className="font-bold text-slate-900">AED {n.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
