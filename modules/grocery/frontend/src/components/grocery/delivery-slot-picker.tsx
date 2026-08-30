'use client';

import React, { useState } from 'react';
import { Clock, Zap, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useGroceryLocale } from '@/i18n/grocery-locale';

// Surcharges are bare numbers rendered through the active currency
// formatter. They used to be printed with a literal rupee sign — "+₹49",
// "+₹{slot.surcharge}" — so a Doha shopper choosing an evening slot was
// quoted a rupee amount on a riyal basket.
const EXPRESS_SURCHARGE = 5;

const DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return {
    key: d.toISOString().split('T')[0],
    day: d.toLocaleDateString('en', { weekday: 'short' }),
    date: d.getDate(),
    month: d.toLocaleDateString('en', { month: 'short' }),
    isToday: i === 0,
  };
});

const SLOTS = [
  { id: 's1', label: '6:00 AM - 8:00 AM', available: true, surcharge: 0 },
  { id: 's2', label: '8:00 AM - 10:00 AM', available: true, surcharge: 0 },
  { id: 's3', label: '10:00 AM - 12:00 PM', available: true, surcharge: 0 },
  { id: 's4', label: '12:00 PM - 2:00 PM', available: false, surcharge: 0 },
  { id: 's5', label: '2:00 PM - 4:00 PM', available: true, surcharge: 0 },
  { id: 's6', label: '4:00 PM - 6:00 PM', available: true, surcharge: 0 },
  { id: 's7', label: '6:00 PM - 8:00 PM', available: true, surcharge: 10 },
  { id: 's8', label: '8:00 PM - 10:00 PM', available: true, surcharge: 20 },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (day: string, slot: string) => void;
}

export default function DeliverySlotPicker({ isOpen, onClose, onSelect }: Props) {
  const { formatPrice, tr } = useGroceryLocale();
  const [selectedDay, setSelectedDay] = useState(DAYS[0].key);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [expressDelivery, setExpressDelivery] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (expressDelivery) {
      onSelect(selectedDay, 'Express (30 min)');
    } else if (selectedSlot) {
      const slot = SLOTS.find(s => s.id === selectedSlot);
      onSelect(selectedDay, slot?.label || '');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-2 xs:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-[calc(100vw-1rem)] sm:max-w-md max-h-[85vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-black text-slate-900">{tr('Choose Delivery Slot')}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Express Delivery Toggle */}
        <div className="p-4 border-b border-slate-100">
          <button
            onClick={() => setExpressDelivery(!expressDelivery)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
              expressDelivery ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${expressDelivery ? 'bg-orange-100' : 'bg-slate-100'}`}>
              <Zap className={`w-5 h-5 ${expressDelivery ? 'text-orange-600' : 'text-slate-400'}`} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">{tr('Express Delivery')}</p>
              <p className="text-xs text-slate-500">Get it in 30 minutes • +{formatPrice(EXPRESS_SURCHARGE)}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              expressDelivery ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
            }`}>
              {expressDelivery && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>
        </div>

        {/* Day Selector */}
        {!expressDelivery && (
          <>
            <div className="p-4 pb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{tr('Select Date')}</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {DAYS.map(d => (
                  <button
                    key={d.key}
                    onClick={() => setSelectedDay(d.key)}
                    className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[60px] transition-all ${
                      selectedDay === d.key
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase">{d.isToday ? 'Today' : d.day}</span>
                    <span className="text-lg font-black">{d.date}</span>
                    <span className="text-[10px] font-medium">{d.month}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            <div className="p-4 pt-2 overflow-y-auto max-h-[300px]">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{tr('Select Time Slot')}</p>
              <div className="grid grid-cols-2 gap-2">
                {SLOTS.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => slot.available && setSelectedSlot(slot.id)}
                    disabled={!slot.available}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      !slot.available
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : selectedSlot === slot.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className={`text-xs font-bold ${selectedSlot === slot.id ? 'text-green-700' : 'text-slate-700'}`}>
                      {slot.label}
                    </p>
                    {slot.surcharge > 0 && (
                      <p className="text-[10px] text-orange-600 font-semibold mt-0.5">+{formatPrice(slot.surcharge)} surcharge</p>
                    )}
                    {!slot.available && (
                      <p className="text-[10px] text-red-500 font-semibold mt-0.5">{tr('Fully booked')}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleConfirm}
            disabled={!expressDelivery && !selectedSlot}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              !expressDelivery && !selectedSlot
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >{tr('Confirm Slot')}</button>
        </div>
      </div>
    </div>
  );
}
