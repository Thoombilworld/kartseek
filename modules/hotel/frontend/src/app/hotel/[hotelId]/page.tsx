'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Star, MapPin, Heart, Share2, Clock, Users, Shield, Wifi, Car,
  Waves, Dumbbell, Utensils, Coffee, Phone, Mail, ArrowRight,
  Check, ChevronDown, ChevronUp, CalendarCheck, BedDouble, Calendar, AlertCircle,
} from 'lucide-react';

const HOTEL = {
  id: 'htl-001', name: 'The Grand Palace Hotel', city: 'Dubai', country: 'UAE',
  address: 'Sheikh Zayed Road, Downtown Dubai', rating: 4.8, reviewCount: 1240, starRating: 5, type: 'Luxury',
  description: 'Experience unparalleled luxury at The Grand Palace Hotel, located in the heart of Downtown Dubai with stunning views of the Burj Khalifa. Our world-class amenities, award-winning restaurants, and impeccable service ensure an unforgettable stay.',
  images: ['🏰', '🏊', '🍽️', '🛏️'],
  gradient: 'from-rose-100 to-amber-50',
  amenities: [
    { icon: Waves, label: 'Swimming Pool' }, { icon: Dumbbell, label: 'Fitness Center' },
    { icon: Utensils, label: 'Restaurant' }, { icon: Coffee, label: 'Room Service 24/7' },
    { icon: Wifi, label: 'Free WiFi' }, { icon: Car, label: 'Valet Parking' },
    { icon: Shield, label: 'Concierge' }, { icon: Users, label: 'Business Center' },
  ],
  policies: {
    checkIn: '14:00', checkOut: '12:00',
    cancellation: 'Free cancellation up to 24 hours before check-in',
    children: 'Children of all ages are welcome',
    pets: 'Pets are not allowed', smoking: 'Non-smoking property',
  },
  rooms: [
    { id: 'rm-001', name: 'Deluxe King Room', bedType: 'King', maxGuests: 2, area: '35 sqm', price: 450, currency: 'AED', taxesAndFees: 67, available: 5, amenities: ['City View', 'Mini Bar', 'Safe', 'WiFi', 'Rain Shower'], emoji: '🛏️' },
    { id: 'rm-002', name: 'Premium Twin Room', bedType: 'Twin', maxGuests: 2, area: '40 sqm', price: 520, currency: 'AED', taxesAndFees: 78, available: 3, amenities: ['City View', 'Mini Bar', 'Safe', 'WiFi', 'Bathtub', 'Lounge Access'], emoji: '🛏️' },
    { id: 'rm-003', name: 'Executive Suite', bedType: 'King', maxGuests: 3, area: '65 sqm', price: 850, currency: 'AED', taxesAndFees: 127, available: 2, amenities: ['Panoramic View', 'Living Room', 'Mini Bar', 'Butler Service', 'Lounge Access'], emoji: '👑' },
    { id: 'rm-004', name: 'Family Suite', bedType: 'King + Twin', maxGuests: 4, area: '80 sqm', price: 980, currency: 'AED', taxesAndFees: 147, available: 1, amenities: ['Pool View', 'Living Room', 'Kitchenette', 'Kids Amenities'], emoji: '👨‍👩‍👧‍👦' },
  ],
  reviews: [
    { id: 'rev-1', name: 'Sarah K.', rating: 5, comment: 'Absolutely stunning hotel! The service was impeccable and the room was spotless. Will definitely return.', date: 'Jun 2026', stayType: 'Couple', avatar: '👩' },
    { id: 'rev-2', name: 'Amit P.', rating: 4, comment: 'Great location and clean rooms. The breakfast could use more variety but overall excellent.', date: 'May 2026', stayType: 'Business', avatar: '👨' },
    { id: 'rev-3', name: 'Maria L.', rating: 5, comment: 'The pool area is gorgeous and the spa was absolutely divine. A true five-star experience.', date: 'May 2026', stayType: 'Family', avatar: '👩‍🦰' },
  ],
  nearby: ['Burj Khalifa - 0.5 km', 'Dubai Mall - 0.8 km', 'Dubai Fountain - 0.6 km', 'Dubai Opera - 1.2 km'],
  phone: '+971 4 123 4567', email: 'reservations@grandpalace.ae',
};

export default function HotelDetailPage() {
  const { hotelId } = useParams();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showPolicies, setShowPolicies] = useState(false);

  /* ── Date & Guest selection ──────────────────────────────────────────────── */
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [dateError, setDateError] = useState('');

  const nightsCount = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0;

  const handleCheckInChange = (val: string) => {
    setCheckIn(val);
    setDateError('');
    // Auto-set checkout to next day if empty or before new check-in
    if (!checkOut || val >= checkOut) {
      const next = new Date(new Date(val).getTime() + 86400000);
      setCheckOut(next.toISOString().split('T')[0]);
    }
  };

  const handleCheckOutChange = (val: string) => {
    if (val <= checkIn) {
      setDateError('Check-out must be after check-in');
      return;
    }
    setCheckOut(val);
    setDateError('');
  };

  const datesReady = checkIn && checkOut && nightsCount > 0 && !dateError;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Image Gallery */}
      <div className="grid md:grid-cols-4 gap-1 h-64 md:h-80">
        <div className={`md:col-span-2 md:row-span-2 bg-gradient-to-br ${HOTEL.gradient} flex items-center justify-center relative overflow-hidden`}>
          <span className="text-8xl opacity-50">{HOTEL.images[0]}</span>
          <div className="absolute top-4 right-4 flex gap-2">
            <button aria-label="Add to favorites" title="Add to favorites" className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white shadow-sm"><Heart className="w-4 h-4 text-slate-500" /></button>
            <button aria-label="Share hotel" title="Share hotel" className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white shadow-sm"><Share2 className="w-4 h-4 text-slate-500" /></button>
          </div>
        </div>
        {HOTEL.images.slice(1).map((img, i) => (
          <div key={i} className={`hidden md:flex bg-gradient-to-br ${['from-blue-100 to-cyan-50', 'from-amber-100 to-yellow-50', 'from-purple-100 to-pink-50'][i]} items-center justify-center`}>
            <span className="text-5xl opacity-40">{img}</span>
          </div>
        ))}
      </div>

      <div className="px-4 md:px-8 py-6 space-y-8">
        {/* Hotel Info */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">{HOTEL.name}</h1>
              <span className="text-sm text-amber-500">{'⭐'.repeat(HOTEL.starRating)}</span>
            </div>
            <p className="text-slate-500 flex items-center gap-1 mb-2"><MapPin className="w-4 h-4" />{HOTEL.address}, {HOTEL.city}, {HOTEL.country}</p>
            <p className="text-slate-600 max-w-2xl">{HOTEL.description}</p>
          </div>
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl text-center shadow-lg shrink-0">
            <div className="flex items-center gap-1 mb-1"><Star className="w-5 h-5 fill-current" /><span className="text-2xl font-black">{HOTEL.rating}</span></div>
            <p className="text-xs font-medium text-white/80">{HOTEL.reviewCount.toLocaleString()} reviews</p>
          </div>
        </div>

        {/* Amenities */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Amenities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {HOTEL.amenities.map(a => (
              <div key={a.label} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center"><a.icon className="w-5 h-5 text-rose-500" /></div>
                <span className="text-sm font-semibold text-slate-700">{a.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Room Selection */}
        <section id="rooms">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><BedDouble className="w-5 h-5 text-rose-500" /> Select Your Room</h2>
          <div className="space-y-4" role="group" aria-label="Available rooms">
            {HOTEL.rooms.map(r => {
              const isSelected = selectedRoom === r.id;
              const roomMaxGuests = r.maxGuests;
              return (
              <div key={r.id} className={`bg-white rounded-2xl border-2 transition-all ${isSelected ? 'border-rose-400 ring-2 ring-rose-100 shadow-lg' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
                {/* Room Info */}
                <div className="p-5">
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="w-full md:w-40 h-28 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-4xl">{r.emoji}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-slate-900">{r.name}</h3>
                          <p className="text-xs text-slate-400">{r.bedType} · {r.area} · Max {r.maxGuests} guests</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.available <= 2 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.available} left</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {r.amenities.map(a => <span key={a} className="inline-flex items-center gap-0.5 bg-slate-50 text-slate-500 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-100"><Check className="w-2.5 h-2.5 text-emerald-500" />{a}</span>)}
                      </div>
                      <div className="flex items-end justify-between pt-3 border-t border-slate-100">
                        <div>
                          <span className="text-xl font-black text-slate-900">{r.currency} {r.price}</span>
                          <span className="text-xs text-slate-400 ml-1">/ night</span>
                          <p className="text-[10px] text-slate-400">+{r.currency} {r.taxesAndFees} taxes & fees</p>
                        </div>
                        <button onClick={() => setSelectedRoom(isSelected ? null : r.id)}
                          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5 ${
                            isSelected ? 'bg-rose-600 text-white shadow-lg' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          }`}>
                          {isSelected ? <><CalendarCheck className="w-4 h-4" /> Selected</> : 'Select Room'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Date & Guest Selection — appears inside this room card */}
                {isSelected && (
                  <div className="border-t-2 border-rose-200 bg-rose-50/30 rounded-b-2xl">
                    {/* Date & Guest Pickers */}
                    <div className="px-5 pt-5 pb-4">
                      <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-rose-500" /> Choose Your Dates & Guests
                      </h4>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <label htmlFor={`checkin-${r.id}`} className="block text-[11px] font-bold text-slate-500 mb-1">Check-in <span className="text-rose-500">*</span></label>
                          <input
                            id={`checkin-${r.id}`}
                            type="date"
                            min={todayStr}
                            value={checkIn}
                            onChange={e => handleCheckInChange(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all"
                          />
                        </div>
                        <div>
                          <label htmlFor={`checkout-${r.id}`} className="block text-[11px] font-bold text-slate-500 mb-1">Check-out <span className="text-rose-500">*</span></label>
                          <input
                            id={`checkout-${r.id}`}
                            type="date"
                            min={checkIn || tomorrowStr}
                            value={checkOut}
                            onChange={e => handleCheckOutChange(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all"
                          />
                        </div>
                        <div>
                          <label htmlFor={`guests-${r.id}`} className="block text-[11px] font-bold text-slate-500 mb-1">Guests</label>
                          <select
                            id={`guests-${r.id}`}
                            value={guests}
                            onChange={e => setGuests(Number(e.target.value))}
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all appearance-none"
                          >
                            {Array.from({ length: roomMaxGuests }, (_, i) => i + 1).map(n => (
                              <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {dateError && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{dateError}
                        </p>
                      )}
                    </div>

                    {/* Confirmation + Book Now */}
                    <div className={`px-5 pb-5 flex flex-col sm:flex-row items-center justify-between gap-3 ${datesReady ? '' : ''}`}>
                      {datesReady ? (
                        <>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                              <CalendarCheck className="w-4 h-4" />
                              {nightsCount} {nightsCount === 1 ? 'night' : 'nights'}
                            </div>
                            <span className="text-slate-500">
                              {new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-lg font-black text-slate-900 ml-auto sm:ml-2">
                              {r.currency} {r.price * nightsCount}
                              <span className="text-xs font-medium text-slate-400"> total + taxes</span>
                            </span>
                          </div>
                          <Link href={`/checkout/${hotelId}?room=${selectedRoom}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`}
                            className="bg-rose-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-lg shrink-0">
                            Book Now <ArrowRight className="w-4 h-4" />
                          </Link>
                        </>
                      ) : (
                        <p className="text-sm text-slate-400 font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Select your check-in and check-out dates to continue
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </section>

        {/* Policies */}
        <section>
          <button onClick={() => setShowPolicies(!showPolicies)} className="flex items-center justify-between w-full bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold text-slate-900">Hotel Policies</h2>
            {showPolicies ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          {showPolicies && (
            <div className="bg-white rounded-xl border border-slate-200 border-t-0 p-5 space-y-3">
              {Object.entries(HOTEL.policies).map(([k, v]) => (
                <div key={k} className="flex items-start gap-3"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><div><p className="text-sm font-bold text-slate-700 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p><p className="text-sm text-slate-500">{v}</p></div></div>
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /> Guest Reviews</h2>
          <div className="space-y-4">
            {HOTEL.reviews.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3"><span className="text-2xl">{r.avatar}</span><div><p className="font-bold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.stayType} · {r.date}</p></div></div>
                  <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}</div>
                </div>
                <p className="text-sm text-slate-600">{r.comment}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Nearby & Contact */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3">Nearby Attractions</h3>
            <div className="space-y-2">{HOTEL.nearby.map(n => <div key={n} className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="w-3.5 h-3.5 text-rose-400" />{n}</div>)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3">Contact Hotel</h3>
            <div className="space-y-3">
              <a href={`tel:${HOTEL.phone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-600 transition-colors" aria-label="Call"><Phone className="w-4 h-4 text-rose-400" />{HOTEL.phone}</a>
              <a href={`mailto:${HOTEL.email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-600 transition-colors" aria-label="Email"><Mail className="w-4 h-4 text-rose-400" />{HOTEL.email}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
