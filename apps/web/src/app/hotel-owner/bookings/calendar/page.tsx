'use client';
import React, { useState } from 'react';
import { CalendarDays, Clock, Users, BedDouble, Eye, ArrowRight, CheckCircle, AlertCircle, ChevronDown, Plus, X } from 'lucide-react';

type CalendarDay = { date: number; bookings: { id: string; guest: string; room: string; status: string }[]; };

export default function OwnerBookingCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 6)); // July 2026
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Mock calendar data
  const bookingDays: Record<number, { id: string; guest: string; room: string; status: string }[]> = {
    1: [{ id: 'HBK-001', guest: 'Sarah K.', room: 'Deluxe King', status: 'confirmed' }],
    2: [{ id: 'HBK-001', guest: 'Sarah K.', room: 'Deluxe King', status: 'confirmed' }, { id: 'HBK-002', guest: 'Amit P.', room: 'Executive Suite', status: 'confirmed' }],
    3: [{ id: 'HBK-002', guest: 'Amit P.', room: 'Executive Suite', status: 'confirmed' }],
    4: [{ id: 'HBK-002', guest: 'Amit P.', room: 'Executive Suite', status: 'confirmed' }],
    5: [{ id: 'HBK-002', guest: 'Amit P.', room: 'Executive Suite', status: 'confirmed' }],
    10: [{ id: 'HBK-006', guest: 'Sarah K.', room: 'Deluxe King', status: 'confirmed' }],
    11: [{ id: 'HBK-006', guest: 'Sarah K.', room: 'Deluxe King', status: 'confirmed' }],
    12: [{ id: 'HBK-006', guest: 'Sarah K.', room: 'Deluxe King', status: 'confirmed' }],
    15: [{ id: 'HBK-007', guest: 'Tom J.', room: 'Family Suite', status: 'confirmed' }, { id: 'HBK-008', guest: 'Lisa M.', room: 'Premium Twin', status: 'confirmed' }],
    16: [{ id: 'HBK-007', guest: 'Tom J.', room: 'Family Suite', status: 'confirmed' }, { id: 'HBK-008', guest: 'Lisa M.', room: 'Premium Twin', status: 'confirmed' }],
    20: [{ id: 'HBK-009', guest: 'Omar R.', room: 'Standard Room', status: 'confirmed' }],
    25: [{ id: 'HBK-010', guest: 'Chen W.', room: 'Deluxe Twin', status: 'confirmed' }],
    26: [{ id: 'HBK-010', guest: 'Chen W.', room: 'Deluxe Twin', status: 'confirmed' }],
    27: [{ id: 'HBK-010', guest: 'Chen W.', room: 'Deluxe Twin', status: 'confirmed' }],
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (CalendarDay | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push({ date: d, bookings: bookingDays[d] || [] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Booking Calendar</h1>
        <p className="text-slate-500 text-sm">Visual overview of all bookings by date.</p>
      </div>

      {/* Month Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors">←</button>
          <h2 className="text-lg font-bold text-slate-900">{monthNames[month]} {year}</h2>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors">→</button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => (
            <button
              key={idx}
              disabled={!day}
              onClick={() => day && day.bookings.length > 0 && setSelectedDay(day)}
              className={`aspect-square rounded-lg text-sm font-medium flex flex-col items-center justify-center relative transition-all ${
                !day ? '' :
                day.bookings.length > 0
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer border border-rose-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {day && (
                <>
                  <span className="text-sm">{day.date}</span>
                  {day.bookings.length > 0 && (
                    <span className="text-[8px] font-bold text-rose-600 mt-0.5">{day.bookings.length} {day.bookings.length === 1 ? 'booking' : 'bookings'}</span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 justify-center text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-rose-100 border border-rose-200 rounded" /> Has Bookings</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-50 border border-slate-200 rounded" /> Available</span>
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">{monthNames[month]} {selectedDay.date} — {selectedDay.bookings.length} Booking{selectedDay.bookings.length !== 1 ? 's' : ''}</h3>
            <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-slate-600" aria-label="Close"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-2">
            {selectedDay.bookings.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <BedDouble className="w-5 h-5 text-rose-500" />
                <div className="flex-1"><p className="text-sm font-bold text-slate-900">{b.guest}</p><p className="text-xs text-slate-400">{b.room} · {b.id}</p></div>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{b.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
