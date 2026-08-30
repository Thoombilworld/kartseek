'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, BedDouble, Maximize2, Users, Eye, Wind,
  Wifi, Coffee, Bath, ShieldCheck, Star, Check, X,
  ChevronLeft, ChevronRight, Cigarette, Baby, Accessibility,
  CalendarDays, CreditCard, Tag,
} from 'lucide-react';

const ROOM_DATA: Record<string, {
  name: string; type: string; bedType: string; maxGuests: number; area: string;
  view: string; floor: string; smoking: boolean; accessible: boolean;
  description: string; amenities: string[]; bathroom: string[];
  images: string[];
  ratePlans: { id: string; name: string; meal: string; cancellation: string; prepayment: string; price: number; originalPrice: number | null; currency: string; taxesAndFees: number; payAt: string }[];
  extraBed: { available: boolean; price: number; currency: string };
  childPolicy: string; available: number;
}> = {
  'rm-001': {
    name: 'Deluxe King Room', type: 'Deluxe', bedType: 'King Bed', maxGuests: 2, area: '35 sqm',
    view: 'City View', floor: '10-15', smoking: false, accessible: true,
    description: 'Experience comfort in our spacious Deluxe King Room featuring panoramic city views, premium bedding, and a marble bathroom with rain shower. The perfect retreat after a day of exploration.',
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Mini Bar', 'Safe', 'Flat-screen TV', 'Rain Shower', 'Bathrobe & Slippers', 'Coffee Machine', 'Work Desk', 'Blackout Curtains', 'Iron & Board', 'Hair Dryer'],
    bathroom: ['Walk-in Rain Shower', 'Premium Toiletries', 'Heated Towel Rack', 'Magnifying Mirror', 'Separate WC'],
    images: [
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=90',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=90',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&q=90',
    ],
    ratePlans: [
      { id: 'rp-1', name: 'Room Only', meal: 'No meals', cancellation: 'Free cancellation until 24h before check-in', prepayment: 'No prepayment needed', price: 450, originalPrice: 520, currency: 'AED', taxesAndFees: 67, payAt: 'Pay at property' },
      { id: 'rp-2', name: 'Breakfast Included', meal: 'Breakfast buffet', cancellation: 'Free cancellation until 48h before check-in', prepayment: 'No prepayment needed', price: 520, originalPrice: 580, currency: 'AED', taxesAndFees: 78, payAt: 'Pay at property' },
      { id: 'rp-3', name: 'Half Board', meal: 'Breakfast + Dinner', cancellation: 'Free cancellation until 72h before check-in', prepayment: 'Pay 50% now', price: 680, originalPrice: null, currency: 'AED', taxesAndFees: 102, payAt: 'Partial payment' },
      { id: 'rp-4', name: 'Non-Refundable', meal: 'No meals', cancellation: 'Non-refundable', prepayment: 'Pay in full now', price: 380, originalPrice: 450, currency: 'AED', taxesAndFees: 57, payAt: 'Pay now — save 15%' },
    ],
    extraBed: { available: true, price: 120, currency: 'AED' },
    childPolicy: 'Children of all ages welcome. Children under 6 stay free in existing bedding.',
    available: 5,
  },
};

export default function RoomDetailPage() {
  const { hotelId, roomId } = useParams();
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const room = ROOM_DATA[roomId as string] || ROOM_DATA['rm-001'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href={`/hotel/${hotelId}`} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">{room.name}</h1>
            <p className="text-xs text-slate-500">{room.type} · {room.available} rooms left</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-200 aspect-[16/9]">
              <img src={room.images[imgIdx]} alt={room.name} className="w-full h-full object-cover" />
              {room.images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => Math.max(0, i - 1))} aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center transition-colors">
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button onClick={() => setImgIdx(i => Math.min(room.images.length - 1, i + 1))} aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center transition-colors">
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                    {imgIdx + 1} / {room.images.length}
                  </div>
                </>
              )}
            </div>

            {/* Room Details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Room Details</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">{room.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                {[
                  { icon: <Maximize2 className="w-4 h-4" />, label: 'Size', value: room.area },
                  { icon: <BedDouble className="w-4 h-4" />, label: 'Bed', value: room.bedType },
                  { icon: <Users className="w-4 h-4" />, label: 'Max Guests', value: `${room.maxGuests} adults` },
                  { icon: <Eye className="w-4 h-4" />, label: 'View', value: room.view },
                  { icon: <Cigarette className="w-4 h-4" />, label: 'Smoking', value: room.smoking ? 'Allowed' : 'Non-smoking' },
                  { icon: <Accessibility className="w-4 h-4" />, label: 'Accessible', value: room.accessible ? 'Yes' : 'No' },
                ].map(detail => (
                  <div key={detail.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-rose-500 shadow-sm">
                      {detail.icon}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">{detail.label}</p>
                      <p className="text-sm font-bold text-slate-900">{detail.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Room Amenities</h2>
              <div className="grid grid-cols-2 gap-2">
                {room.amenities.map(a => (
                  <div key={a} className="flex items-center gap-2 py-1.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{a}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-bold text-slate-900 mt-5 mb-3">Bathroom</h3>
              <div className="grid grid-cols-2 gap-2">
                {room.bathroom.map(b => (
                  <div key={b} className="flex items-center gap-2 py-1.5">
                    <Bath className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Policies */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Policies</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Baby className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Children</p>
                    <p className="text-sm text-slate-500">{room.childPolicy}</p>
                  </div>
                </div>
                {room.extraBed.available && (
                  <div className="flex items-start gap-3">
                    <BedDouble className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-700">Extra Bed</p>
                      <p className="text-sm text-slate-500">Available at {room.extraBed.currency} {room.extraBed.price} per night</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar — Rate Plans */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Choose Your Rate</h2>
            {room.ratePlans.map(plan => {
              const isSelected = selectedPlan === plan.id;
              const discount = plan.originalPrice ? Math.round((1 - plan.price / plan.originalPrice) * 100) : 0;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full text-left bg-white rounded-2xl border-2 p-5 transition-all ${
                    isSelected ? 'border-rose-500 shadow-lg ring-2 ring-rose-100' : 'border-slate-100 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-slate-900">{plan.name}</h3>
                    {discount > 0 && (
                      <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">-{discount}%</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                    <Coffee className="w-3 h-3" /> {plan.meal}
                  </p>
                  <div className="space-y-1 text-xs text-slate-500 mb-4">
                    <p className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 text-emerald-500" />
                      {plan.cancellation}
                    </p>
                    <p className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-blue-500" />
                      {plan.prepayment}
                    </p>
                    <p className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-500" />
                      {plan.payAt}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-slate-900">{plan.currency} {plan.price}</span>
                    {plan.originalPrice && (
                      <span className="text-sm text-slate-400 line-through">{plan.currency} {plan.originalPrice}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">+ {plan.currency} {plan.taxesAndFees} taxes & fees per night</p>
                </button>
              );
            })}

            {/* Book Button */}
            <Link
              href={`/checkout/${hotelId}?room=${roomId}&plan=${selectedPlan || 'rp-1'}`}
              className="block w-full bg-rose-600 text-white text-center font-bold py-4 rounded-2xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
            >
              Book This Room
            </Link>
            <p className="text-center text-[10px] text-slate-400">You will not be charged yet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
