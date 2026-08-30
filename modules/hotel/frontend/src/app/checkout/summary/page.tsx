'use client';
import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, MapPin, CalendarDays, BedDouble, Users, Star,
  Shield, Clock, ArrowRight, Check, CreditCard, Tag,
} from 'lucide-react';

export default function CheckoutSummaryPage() {
  const searchParams = useSearchParams();

  const booking = {
    hotel: { id: 'htl-001', name: 'The Grand Palace Hotel', city: 'Dubai, UAE', stars: 5, rating: 4.8, reviews: 1240, address: 'Sheikh Zayed Road, Downtown Dubai' },
    room: { name: 'Deluxe King Room', type: 'Deluxe', bedType: 'King Bed', area: '35 sqm', view: 'City View' },
    ratePlan: { name: 'Breakfast Included', meal: 'Breakfast buffet', cancellation: 'Free cancellation until Jun 30, 2026' },
    checkIn: 'Tue, Jul 1, 2026', checkInTime: '2:00 PM',
    checkOut: 'Thu, Jul 3, 2026', checkOutTime: '12:00 PM',
    nights: 2, rooms: 1, guests: 2,
    pricePerNight: 520, currency: 'AED',
    subtotal: 1040, taxes: 156, serviceFee: 0, grandTotal: 1196,
    loyaltyPoints: 119,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link href={`/hotel/${booking.hotel.id}`} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-bold text-slate-900">Checkout</h1>
          </div>
          <div className="flex items-center gap-2">
            {['Summary', 'Guest Details', 'Offers', 'Payment'].map((step, idx) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 ${idx === 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {idx === 0 ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:inline ${idx === 0 ? 'text-rose-600' : 'text-slate-400'}`}>{step}</span>
                </div>
                {idx < 3 && <div className={`flex-1 h-0.5 ${idx === 0 ? 'bg-rose-200' : 'bg-slate-100'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hotel Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center text-3xl shrink-0">🏰</div>
                <div className="flex-1">
                  <h2 className="font-bold text-slate-900">{booking.hotel.name}</h2>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {booking.hotel.address}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-0.5">
                      {[...Array(booking.hotel.stars)].map((_, i) => <Star key={i} className="w-3 h-3 text-amber-400 fill-current" />)}
                    </div>
                    <span className="text-xs text-slate-500">{booking.hotel.rating} ({booking.hotel.reviews.toLocaleString()} reviews)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stay Details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-4">Stay Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="w-4 h-4 text-rose-500" />
                    <span className="text-[10px] text-slate-400 font-medium uppercase">Check-in</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{booking.checkIn}</p>
                  <p className="text-xs text-slate-500">From {booking.checkInTime}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] text-slate-400 font-medium uppercase">Check-out</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{booking.checkOut}</p>
                  <p className="text-xs text-slate-500">Until {booking.checkOutTime}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-6 text-sm text-slate-600">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> {booking.nights} nights</span>
                <span className="flex items-center gap-1.5"><BedDouble className="w-4 h-4 text-slate-400" /> {booking.rooms} room</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-400" /> {booking.guests} guests</span>
              </div>
            </div>

            {/* Room & Rate */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-3">Room & Rate Plan</h3>
              <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-slate-900">{booking.room.name}</p>
                  <p className="text-xs text-slate-500">{booking.room.bedType} · {booking.room.area} · {booking.room.view}</p>
                </div>
                <Link href={`/hotel/${booking.hotel.id}`} className="text-xs text-rose-600 font-medium hover:underline">Change</Link>
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{booking.ratePlan.name}</p>
                    <p className="text-xs text-slate-500">{booking.ratePlan.meal}</p>
                  </div>
                  <Tag className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> {booking.ratePlan.cancellation}
                </p>
              </div>
            </div>
          </div>

          {/* Price Sidebar */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-4">
              <h3 className="font-bold text-slate-900 mb-4">Price Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{booking.currency} {booking.pricePerNight} × {booking.nights} nights</span>
                  <span className="font-medium text-slate-900">{booking.currency} {booking.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxes & Fees</span>
                  <span className="font-medium text-slate-900">{booking.currency} {booking.taxes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Service Fee</span>
                  <span className="font-medium text-emerald-600">FREE</span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-xl font-black text-slate-900">{booking.currency} {booking.grandTotal}</span>
                </div>
              </div>

              <div className="mt-4 bg-amber-50 rounded-xl p-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-700 font-medium">Earn {booking.loyaltyPoints} loyalty points</span>
              </div>

              <Link
                href="/checkout/guests"
                className="block w-full bg-rose-600 text-white text-center font-bold py-4 rounded-xl mt-4 hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
              >
                Continue to Guest Details
              </Link>

              <p className="text-center text-[10px] text-slate-400 mt-2 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Secure checkout · SSL encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
