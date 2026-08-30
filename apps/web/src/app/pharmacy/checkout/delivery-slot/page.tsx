'use client';
import React, { useState } from 'react';
import { ArrowLeft, Clock, Zap, Calendar, Sun, Moon, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const timeSlots = [
  { id: '1', label: 'Express', time: '30-45 min', icon: <Zap className="w-4 h-4" />, fee: 29, available: true },
  { id: '2', label: 'Morning', time: '9:00 AM - 12:00 PM', icon: <Sun className="w-4 h-4" />, fee: 0, available: true },
  { id: '3', label: 'Afternoon', time: '12:00 PM - 4:00 PM', icon: <Clock className="w-4 h-4" />, fee: 0, available: true },
  { id: '4', label: 'Evening', time: '4:00 PM - 8:00 PM', icon: <Moon className="w-4 h-4" />, fee: 0, available: true },
  { id: '5', label: 'Night', time: '8:00 PM - 11:00 PM', icon: <Moon className="w-4 h-4" />, fee: 15, available: false },
];

const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() + i);
  return { date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), dayNum: d.getDate(), dayName: d.toLocaleDateString('en-US', { weekday: 'short' }), isToday: i === 0 };
});

export default function DeliverySlotPage() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>('1');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/pharmacy/checkout" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <h1 className="text-lg font-bold">Choose Delivery Slot</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Date selector */}
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-teal-600" /> Select Date</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {days.map((day, i) => (
              <button key={i} onClick={() => setSelectedDay(i)} className={`flex-shrink-0 w-20 py-3 rounded-xl text-center transition-all ${selectedDay === i ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}>
                <p className="text-xs font-medium opacity-80">{day.dayName}</p>
                <p className="text-xl font-black">{day.dayNum}</p>
                {day.isToday && <p className="text-[10px] font-bold">Today</p>}
              </button>
            ))}
          </div>
        </div>

        {/* Time slots */}
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-teal-600" /> Select Time Slot</h3>
          <div className="space-y-3">
            {timeSlots.map(slot => {
              const sel = selectedSlot === slot.id;
              return (
                <button key={slot.id} disabled={!slot.available} onClick={() => setSelectedSlot(slot.id)} className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${sel ? 'border-teal-500 bg-teal-50' : slot.available ? 'border-gray-200 hover:border-gray-300' : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sel ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{slot.icon}</div>
                  <div className="flex-1 text-left">
                    <p className={`font-bold ${sel ? 'text-teal-700' : 'text-gray-900'}`}>{slot.label}</p>
                    <p className="text-sm text-gray-500">{slot.time}</p>
                  </div>
                  {slot.fee > 0 && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">+₹{slot.fee}</span>}
                  {slot.fee === 0 && slot.available && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">FREE</span>}
                  {!slot.available && <span className="text-xs font-medium text-gray-400">Unavailable</span>}
                  {sel && <CheckCircle className="w-5 h-5 text-teal-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm */}
        <Link href="/pharmacy/checkout" className="block w-full bg-teal-600 text-white text-center font-bold py-4 rounded-xl hover:bg-teal-700 transition-colors text-lg">
          Confirm Delivery Slot
        </Link>
      </div>
    </div>
  );
}
