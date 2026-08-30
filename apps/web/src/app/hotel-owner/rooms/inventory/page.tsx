'use client';
import React, { useState } from 'react';
import { BedDouble, Calendar, ChevronLeft, ChevronRight, Edit, Check, X, AlertCircle, Lock, Unlock } from 'lucide-react';

type RoomType = { id: string; name: string; total: number; emoji: string };
type DateCell = { date: number; available: number; blocked: number; booked: number };

const ROOM_TYPES: RoomType[] = [
  { id: 'RT-001', name: 'Deluxe King', total: 30, emoji: '🛏️' },
  { id: 'RT-002', name: 'Executive Suite', total: 8, emoji: '👔' },
  { id: 'RT-003', name: 'Premium Twin', total: 15, emoji: '🛏️🛏️' },
  { id: 'RT-004', name: 'Family Suite', total: 5, emoji: '👨‍👩‍👧‍👦' },
  { id: 'RT-005', name: 'Standard Room', total: 42, emoji: '🏨' },
];

export default function RoomInventoryPage() {
  const [selectedRoom, setSelectedRoom] = useState(ROOM_TYPES[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 6));
  const [editingDate, setEditingDate] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [toast, setToast] = useState('');

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Mock inventory data
  const getInventory = (day: number): DateCell => {
    const booked = Math.floor(Math.random() * (selectedRoom.total * 0.6));
    const blocked = day === 4 || day === 5 ? 3 : 0;
    return { date: day, available: selectedRoom.total - booked - blocked, blocked, booked };
  };

  const inventory: DateCell[] = Array.from({ length: daysInMonth }, (_, i) => getInventory(i + 1));

  const handleSave = (day: number) => {
    setToast(`Inventory for ${monthNames[month]} ${day} updated to ${editValue} rooms`);
    setTimeout(() => setToast(''), 3000);
    setEditingDate(null);
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Room Inventory</h1><p className="text-slate-500 text-sm">Manage daily room availability and blocking.</p></div>

      {/* Room Type Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ROOM_TYPES.map(rt => (
          <button key={rt.id} onClick={() => setSelectedRoom(rt)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${selectedRoom.id === rt.id ? 'bg-rose-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <span>{rt.emoji}</span> {rt.name} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedRoom.id === rt.id ? 'bg-white/20' : 'bg-slate-100'}`}>{rt.total}</span>
          </button>
        ))}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <button onClick={() => setCurrentMonth(new Date(year, month - 1))} aria-label="Previous month" className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
        <h2 className="text-lg font-bold text-slate-900">{monthNames[month]} {year} — {selectedRoom.name}</h2>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1))} aria-label="Next month" className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* Inventory Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-slate-500 w-20">Date</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-500">Total</th>
                <th className="px-3 py-3 text-center font-semibold text-emerald-600">Available</th>
                <th className="px-3 py-3 text-center font-semibold text-blue-600">Booked</th>
                <th className="px-3 py-3 text-center font-semibold text-red-600">Blocked</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {inventory.map(day => (
                <tr key={day.date} className="hover:bg-slate-50/50">
                  <td className="px-3 py-3 font-bold text-slate-900">{monthNames[month].slice(0, 3)} {day.date}</td>
                  <td className="px-3 py-3 text-center text-slate-600">{selectedRoom.total}</td>
                  <td className="px-3 py-3 text-center">
                    {editingDate === day.date ? (
                      <div className="flex items-center justify-center gap-1">
                        <input type="number" aria-label="Available rooms" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-14 bg-slate-50 border border-rose-300 rounded-lg px-2 py-1 text-xs text-center outline-none focus:ring-2 focus:ring-rose-500" />
                        <button onClick={() => handleSave(day.date)} aria-label="Save" className="w-6 h-6 bg-emerald-500 text-white rounded-md flex items-center justify-center"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setEditingDate(null)} aria-label="Cancel" className="w-6 h-6 bg-slate-200 text-slate-600 rounded-md flex items-center justify-center"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <span className={`font-bold ${day.available > 5 ? 'text-emerald-600' : day.available > 0 ? 'text-amber-600' : 'text-red-600'}`}>{day.available}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-blue-600 font-medium">{day.booked}</td>
                  <td className="px-3 py-3 text-center">
                    {day.blocked > 0 ? (
                      <span className="text-red-600 font-medium flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> {day.blocked}</span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => { setEditingDate(day.date); setEditValue(String(day.available)); }} className="text-xs text-rose-600 font-medium hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-slate-500 justify-center">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-100 rounded" /> Available (6+)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-100 rounded" /> Low (1-5)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded" /> Sold Out</span>
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> {toast}</div>}
    </div>
  );
}
