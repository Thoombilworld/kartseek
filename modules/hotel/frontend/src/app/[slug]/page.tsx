'use client';
/* cSpell:words Rayyan */
import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Star, MapPin, ArrowRight, Filter, SortAsc,
  ChevronDown, Heart, Wifi, Car, Dumbbell, UtensilsCrossed,
  Waves, Coffee, Sparkles, Shield,
} from 'lucide-react';

interface CollectionConfig {
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
  accentColor: string;
  description: string;
  stats: { label: string; value: string }[];
  hotels: {
    id: string; name: string; city: string; country: string;
    rating: number; reviews: number; stars: number;
    price: number; originalPrice: number | null; currency: string;
    type: string; amenities: string[]; image: string;
    offer: string | null; distance: string;
  }[];
}

const COLLECTIONS: Record<string, CollectionConfig> = {
  'luxury-hotels': {
    title: 'Luxury Hotels', subtitle: 'Five-star excellence', emoji: '👑',
    gradient: 'from-amber-600 via-amber-700 to-orange-800',
    accentColor: 'text-amber-600',
    description: 'Discover the world\'s finest luxury hotels with unparalleled service, exquisite dining, and premium amenities.',
    stats: [{ label: 'Hotels', value: '245' }, { label: 'Avg Rating', value: '4.8' }, { label: 'Countries', value: '18' }],
    hotels: [
      { id: 'htl-001', name: 'The Grand Palace Hotel', city: 'Dubai', country: 'UAE', rating: 4.8, reviews: 1240, stars: 5, price: 450, originalPrice: 520, currency: 'AED', type: 'Palace', amenities: ['Spa', 'Pool', 'Fine Dining'], image: '🏰', offer: '20% OFF', distance: '2.3 km' },
      { id: 'htl-005', name: 'Heritage Boutique Hotel', city: 'London', country: 'UK', rating: 4.9, reviews: 430, stars: 5, price: 320, originalPrice: null, currency: '£', type: 'Boutique', amenities: ['Butler', 'Spa', 'Concierge'], image: '🏛️', offer: 'Suite Upgrade', distance: '1.5 km' },
      { id: 'htl-010', name: 'Royal Orchid Suites', city: 'Mumbai', country: 'India', rating: 4.7, reviews: 890, stars: 5, price: 15000, originalPrice: 18000, currency: '₹', type: 'Heritage', amenities: ['Pool', 'Spa', 'Yoga'], image: '🌺', offer: '15% OFF', distance: '3.1 km' },
      { id: 'htl-011', name: 'Al Rayyan Luxury Resort', city: 'Doha', country: 'Qatar', rating: 4.8, reviews: 560, stars: 5, price: 680, originalPrice: null, currency: 'QAR', type: 'Resort', amenities: ['Beach', 'Spa', 'Golf'], image: '🌴', offer: null, distance: '5.2 km' },
      { id: 'htl-012', name: 'Skyline Penthouse Hotel', city: 'Riyadh', country: 'Saudi Arabia', rating: 4.6, reviews: 340, stars: 5, price: 520, originalPrice: 600, currency: 'SAR', type: 'Modern', amenities: ['Rooftop', 'Spa', 'Gym'], image: '🏙️', offer: 'Free Dinner', distance: '0.8 km' },
      { id: 'htl-013', name: 'Safari Grande Lodge', city: 'Mumbai', country: 'India', rating: 4.9, reviews: 210, stars: 5, price: 42000, originalPrice: 50000, currency: '₹', type: 'Safari', amenities: ['Safari', 'Pool', 'Fine Dining'], image: '🦁', offer: '16% OFF', distance: '15 km' },
    ],
  },
  'budget-hotels': {
    title: 'Budget Hotels', subtitle: 'Smart stays, great value', emoji: '💰',
    gradient: 'from-emerald-600 via-emerald-700 to-teal-800',
    accentColor: 'text-emerald-600',
    description: 'Quality stays that won\'t break the bank. Clean, comfortable, and well-located hotels at the best prices.',
    stats: [{ label: 'Hotels', value: '890' }, { label: 'From', value: 'AED 80' }, { label: 'Cities', value: '35' }],
    hotels: [
      { id: 'htl-004', name: 'Budget Inn Express', city: 'Dubai', country: 'UAE', rating: 4.1, reviews: 560, stars: 3, price: 120, originalPrice: 150, currency: 'AED', type: 'Express', amenities: ['WiFi', 'AC', 'Parking'], image: '🏨', offer: '20% OFF', distance: '3.2 km' },
      { id: 'htl-020', name: 'CityStop Hotel', city: 'Mumbai', country: 'India', rating: 4.0, reviews: 1200, stars: 3, price: 2500, originalPrice: 3000, currency: '₹', type: 'City', amenities: ['WiFi', 'AC', 'Restaurant'], image: '🏢', offer: null, distance: '1.5 km' },
      { id: 'htl-021', name: 'Easy Stay Suites', city: 'Mumbai', country: 'India', rating: 4.2, reviews: 380, stars: 3, price: 5500, originalPrice: null, currency: '₹', type: 'Suite', amenities: ['WiFi', 'Kitchen', 'Laundry'], image: '🛏️', offer: 'Free WiFi', distance: '2.1 km' },
      { id: 'htl-022', name: 'Smart Lodge Doha', city: 'Doha', country: 'Qatar', rating: 3.9, reviews: 280, stars: 3, price: 180, originalPrice: 220, currency: 'QAR', type: 'Lodge', amenities: ['WiFi', 'AC', 'TV'], image: '📺', offer: '18% OFF', distance: '4.5 km' },
    ],
  },
  'business-hotels': {
    title: 'Business Hotels', subtitle: 'Work-ready stays', emoji: '💼',
    gradient: 'from-blue-600 via-blue-700 to-indigo-800',
    accentColor: 'text-blue-600',
    description: 'Hotels designed for business travelers with high-speed internet, meeting rooms, and convenient locations.',
    stats: [{ label: 'Hotels', value: '320' }, { label: 'Avg Rating', value: '4.5' }, { label: 'Meeting Rooms', value: '1400+' }],
    hotels: [
      { id: 'htl-002', name: 'KARTSEEK Business Suites', city: 'Doha', country: 'Qatar', rating: 4.6, reviews: 890, stars: 4, price: 280, originalPrice: null, currency: 'QAR', type: 'Business', amenities: ['Business Center', 'WiFi', 'Gym'], image: '🏢', offer: null, distance: '0.8 km' },
      { id: 'htl-030', name: 'Executive Tower Hotel', city: 'Dubai', country: 'UAE', rating: 4.5, reviews: 720, stars: 4, price: 320, originalPrice: 380, currency: 'AED', type: 'Tower', amenities: ['Meeting Rooms', 'WiFi', 'Lounge'], image: '🗼', offer: '15% OFF', distance: '1.2 km' },
      { id: 'htl-031', name: 'Corporate Suites Mumbai', city: 'Mumbai', country: 'India', rating: 4.4, reviews: 540, stars: 4, price: 6800, originalPrice: null, currency: '₹', type: 'Suite', amenities: ['WiFi', 'Desk', 'Conference'], image: '💻', offer: null, distance: '0.5 km' },
    ],
  },
  'family-hotels': {
    title: 'Family Hotels', subtitle: 'Fun for all ages', emoji: '👨‍👩‍👧‍👦',
    gradient: 'from-pink-500 via-pink-600 to-rose-700',
    accentColor: 'text-pink-600',
    description: 'Family-friendly hotels with kids clubs, pools, and activities for children of all ages.',
    stats: [{ label: 'Hotels', value: '180' }, { label: 'Kids Clubs', value: '120' }, { label: 'Family Suites', value: '850+' }],
    hotels: [
      { id: 'htl-003', name: 'Seaside Family Resort', city: 'Dubai', country: 'UAE', rating: 4.7, reviews: 2100, stars: 5, price: 380, originalPrice: 450, currency: 'AED', type: 'Resort', amenities: ['Kids Club', 'Pool', 'Beach'], image: '🏖️', offer: 'Free Breakfast', distance: '5.1 km' },
      { id: 'htl-040', name: 'Happy Family Hotel', city: 'Mumbai', country: 'India', rating: 4.5, reviews: 980, stars: 4, price: 7500, originalPrice: null, currency: '₹', type: 'Family', amenities: ['Playground', 'Pool', 'Games'], image: '🎠', offer: 'Kids Eat Free', distance: '3.8 km' },
    ],
  },
  'resorts': {
    title: 'Resorts & Villas', subtitle: 'Escape & unwind', emoji: '🏖️',
    gradient: 'from-cyan-500 via-cyan-600 to-blue-700',
    accentColor: 'text-cyan-600',
    description: 'Beach resorts, mountain retreats, and private villas for the ultimate getaway.',
    stats: [{ label: 'Resorts', value: '150' }, { label: 'Beachfront', value: '85' }, { label: 'Private Villas', value: '65' }],
    hotels: [
      { id: 'htl-050', name: 'Azure Beach Resort', city: 'Dubai', country: 'UAE', rating: 4.8, reviews: 1500, stars: 5, price: 580, originalPrice: 680, currency: 'AED', type: 'Beach', amenities: ['Beach', 'Spa', 'Water Sports'], image: '🌊', offer: '15% OFF', distance: '8.2 km' },
      { id: 'htl-051', name: 'Mountain View Lodge', city: 'Mumbai', country: 'India', rating: 4.7, reviews: 320, stars: 4, price: 28000, originalPrice: null, currency: '₹', type: 'Mountain', amenities: ['Hiking', 'Spa', 'Safari'], image: '🏔️', offer: null, distance: '45 km' },
    ],
  },
  'serviced-apartments': {
    title: 'Serviced Apartments', subtitle: 'Home away from home', emoji: '🏠',
    gradient: 'from-violet-500 via-violet-600 to-purple-700',
    accentColor: 'text-violet-600',
    description: 'Fully furnished apartments with kitchen, laundry, and living space — ideal for extended stays.',
    stats: [{ label: 'Apartments', value: '210' }, { label: 'Avg Stay', value: '7 nights' }, { label: 'With Kitchen', value: '100%' }],
    hotels: [
      { id: 'htl-060', name: 'KARTSEEK Living Suites', city: 'Dubai', country: 'UAE', rating: 4.6, reviews: 680, stars: 4, price: 220, originalPrice: 280, currency: 'AED', type: 'Apartment', amenities: ['Kitchen', 'Washer', 'WiFi'], image: '🏠', offer: '21% OFF', distance: '1.5 km' },
      { id: 'htl-061', name: 'HomeStar Residences', city: 'Doha', country: 'Qatar', rating: 4.5, reviews: 420, stars: 4, price: 350, originalPrice: null, currency: 'QAR', type: 'Residence', amenities: ['Kitchen', 'Pool', 'Gym'], image: '🏡', offer: null, distance: '2.8 km' },
    ],
  },
};

export default function HotelCollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  /* cSpell:words htl */
  const { slug: rawSlug } = React.use(params);
  const slug = rawSlug || 'luxury-hotels';
  const config = COLLECTIONS[slug] || COLLECTIONS['luxury-hotels'];
  const [sortBy, setSortBy] = useState('Recommended');
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <header className={`bg-gradient-to-br ${config.gradient} text-white`}>
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/hotel-booking/destinations" className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-sm font-medium text-white/70">Collections</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{config.emoji}</span>
            <div>
              <h1 className="text-2xl md:text-3xl font-black">{config.title}</h1>
              <p className="text-white/70 text-sm">{config.subtitle}</p>
            </div>
          </div>
          <p className="text-white/60 text-sm mt-3 max-w-xl">{config.description}</p>
          <div className="flex gap-4 mt-5">
            {config.stats.map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl px-4 py-2">
                <p className="text-white font-bold text-lg">{s.value}</p>
                <p className="text-white/60 text-[10px]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-6">
        {/* Sort Bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-500">{config.hotels.length} properties</p>
          <div className="flex items-center gap-2">
            {['Recommended', 'Price: Low', 'Price: High', 'Rating'].map(opt => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortBy === opt ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Hotel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {config.hotels.map(hotel => (
            <Link
              key={hotel.id}
              href={`/hotel-booking/hotel/${hotel.id}`}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="relative h-40 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{hotel.image}</span>
                {hotel.offer && (
                  <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">{hotel.offer}</span>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 rounded-lg px-2 py-0.5">
                  <Star className="w-3 h-3 text-amber-400 fill-current" />
                  <span className="text-xs font-bold text-slate-900">{hotel.rating}</span>
                </div>
                <button
                  onClick={e => { e.preventDefault(); setLiked(prev => ({ ...prev, [hotel.id]: !prev[hotel.id] })); }}
                  className="absolute bottom-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                  aria-label="Save to favorites"
                >
                  <Heart className={`w-4 h-4 ${liked[hotel.id] ? 'text-rose-500 fill-current' : 'text-slate-400'}`} />
                </button>
                <div className="absolute bottom-3 left-3">
                  <div className="flex gap-0.5">
                    {[...Array(hotel.stars)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-amber-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-sm text-slate-900 mb-1 group-hover:text-rose-600 transition-colors">{hotel.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" /> {hotel.city}, {hotel.country} · {hotel.distance}
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {hotel.amenities.map(a => (
                    <span key={a} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">{a}</span>
                  ))}
                </div>
                <div className="flex items-baseline justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-slate-900">{hotel.currency} {hotel.price}</span>
                    {hotel.originalPrice && (
                      <span className="text-xs text-slate-400 line-through">{hotel.currency} {hotel.originalPrice}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">/ night</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{hotel.reviews.toLocaleString()} reviews</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
