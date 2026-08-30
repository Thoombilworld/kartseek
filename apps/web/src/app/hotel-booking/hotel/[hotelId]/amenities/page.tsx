'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Wifi, Car, Dumbbell, UtensilsCrossed, Waves, Coffee,
  Tv, Wind, ShieldCheck, Baby, Accessibility, Leaf, Sparkles,
  Bath, BedDouble, Phone, Briefcase, Music, Globe,
  ChevronDown, ChevronUp, Check,
} from 'lucide-react';

interface AmenityCategory {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: string[];
}

const AMENITY_CATEGORIES: AmenityCategory[] = [
  {
    title: 'General Facilities',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'bg-rose-50 text-rose-600',
    items: ['24-hour Front Desk', 'Concierge Service', 'Luggage Storage', 'Express Check-in/out', 'Currency Exchange', 'ATM on Site', 'Gift Shop', 'Valet Parking', 'Doorman', 'Multilingual Staff'],
  },
  {
    title: 'Room Amenities',
    icon: <BedDouble className="w-5 h-5" />,
    color: 'bg-blue-50 text-blue-600',
    items: ['Air Conditioning', 'Minibar', 'Safe', 'Flat-screen TV', 'Premium Bedding', 'Blackout Curtains', 'Coffee Machine', 'Iron & Ironing Board', 'Desk', 'Wardrobe', 'Complimentary Water', 'Bathrobe & Slippers'],
  },
  {
    title: 'Bathroom',
    icon: <Bath className="w-5 h-5" />,
    color: 'bg-cyan-50 text-cyan-600',
    items: ['Rain Shower', 'Bathtub', 'Hair Dryer', 'Premium Toiletries', 'Heated Towel Rack', 'Magnifying Mirror', 'Bidet'],
  },
  {
    title: 'Food & Dining',
    icon: <UtensilsCrossed className="w-5 h-5" />,
    color: 'bg-orange-50 text-orange-600',
    items: ['Restaurant', 'Bar & Lounge', 'Room Service 24/7', 'Breakfast Buffet', 'Special Diet Menus', 'Poolside Bar', 'Afternoon Tea', 'Fine Dining', 'Coffee Shop'],
  },
  {
    title: 'Wellness & Spa',
    icon: <Waves className="w-5 h-5" />,
    color: 'bg-purple-50 text-purple-600',
    items: ['Full-Service Spa', 'Massage Treatments', 'Sauna', 'Steam Room', 'Hot Tub', 'Yoga Classes', 'Meditation Room'],
  },
  {
    title: 'Fitness & Recreation',
    icon: <Dumbbell className="w-5 h-5" />,
    color: 'bg-emerald-50 text-emerald-600',
    items: ['Fitness Center', 'Swimming Pool', 'Outdoor Pool', 'Tennis Court', 'Water Sports', 'Bicycle Rental'],
  },
  {
    title: 'Business Facilities',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'bg-slate-100 text-slate-600',
    items: ['Business Center', 'Meeting Rooms', 'Conference Hall', 'Printing Service', 'Video Conferencing', 'Secretarial Service'],
  },
  {
    title: 'Family Friendly',
    icon: <Baby className="w-5 h-5" />,
    color: 'bg-pink-50 text-pink-600',
    items: ['Kids Club', 'Playground', 'Baby Cot', 'High Chair', 'Babysitting Service', 'Family Rooms', 'Kids Pool', 'Game Room'],
  },
  {
    title: 'Internet',
    icon: <Wifi className="w-5 h-5" />,
    color: 'bg-indigo-50 text-indigo-600',
    items: ['Free Wi-Fi in All Areas', 'High-Speed Internet', 'Wired Internet', 'Wi-Fi in Lobby'],
  },
  {
    title: 'Parking & Transport',
    icon: <Car className="w-5 h-5" />,
    color: 'bg-amber-50 text-amber-600',
    items: ['Free Parking', 'Valet Parking', 'Electric Vehicle Charging', 'Airport Shuttle', 'Car Rental Desk', 'Limousine Service', 'Taxi Service'],
  },
  {
    title: 'Accessibility',
    icon: <Accessibility className="w-5 h-5" />,
    color: 'bg-teal-50 text-teal-600',
    items: ['Wheelchair Accessible', 'Accessible Parking', 'Elevator', 'Accessible Bathroom', 'Braille Signage', 'Hearing Accessible Rooms'],
  },
  {
    title: 'Safety & Security',
    icon: <ShieldCheck className="w-5 h-5" />,
    color: 'bg-red-50 text-red-600',
    items: ['24-hour Security', 'CCTV', 'Smoke Detectors', 'Fire Extinguishers', 'Electronic Key Cards', 'In-room Safe', 'First Aid Kit', 'Emergency Exits'],
  },
  {
    title: 'Entertainment',
    icon: <Music className="w-5 h-5" />,
    color: 'bg-violet-50 text-violet-600',
    items: ['Live Entertainment', 'Nightclub', 'Karaoke', 'Cinema Room', 'Library', 'Board Games'],
  },
  {
    title: 'Sustainability',
    icon: <Leaf className="w-5 h-5" />,
    color: 'bg-lime-50 text-lime-600',
    items: ['Solar Powered', 'Water Recycling', 'No Single-Use Plastic', 'Local Sourcing', 'Energy Efficient Lighting', 'Green Certified'],
  },
  {
    title: 'Languages Spoken',
    icon: <Globe className="w-5 h-5" />,
    color: 'bg-sky-50 text-sky-600',
    items: ['English', 'Arabic', 'Hindi', 'French', 'Spanish', 'German', 'Mandarin', 'Russian'],
  },
];

export default function AmenitiesPage() {
  const { hotelId } = useParams();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(AMENITY_CATEGORIES.map(c => [c.title, true]))
  );

  const toggleCategory = (title: string) => {
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const totalAmenities = AMENITY_CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href={`/hotel-booking/hotel/${hotelId}`} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Hotel Amenities</h1>
            <p className="text-xs text-slate-500">{AMENITY_CATEGORIES.length} categories · {totalAmenities} amenities</p>
          </div>
        </div>
      </header>

      {/* Quick stats */}
      <div className="max-w-4xl mx-auto px-4 py-5">
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { emoji: '🏊', label: 'Pool & Spa', count: 13 },
            { emoji: '🍽️', label: 'Dining', count: 9 },
            { emoji: '🏋️', label: 'Fitness', count: 6 },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 text-center border border-slate-100 shadow-sm">
              <span className="text-2xl">{s.emoji}</span>
              <p className="text-sm font-bold text-slate-900 mt-1">{s.label}</p>
              <p className="text-xs text-slate-400">{s.count} amenities</p>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="space-y-3">
          {AMENITY_CATEGORIES.map(cat => (
            <div key={cat.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.title)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>
                    {cat.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900 text-sm">{cat.title}</p>
                    <p className="text-xs text-slate-400">{cat.items.length} items</p>
                  </div>
                </div>
                {expanded[cat.title]
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />
                }
              </button>
              {expanded[cat.title] && (
                <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-50 pt-3">
                  {cat.items.map(item => (
                    <div key={item} className="flex items-center gap-2.5 py-1.5">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
