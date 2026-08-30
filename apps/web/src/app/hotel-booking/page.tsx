'use client'; // hotel-booking-home
import { useModuleTitle } from '@/hooks/useModuleTitle';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, MapPin, Calendar, Users, Star, ArrowRight, Clock, Heart,
  Shield, TrendingUp, Sparkles, Hotel, Compass, Map, Tag,
  FileText, Headphones, HelpCircle,
  Zap, Globe, Building2, RefreshCw
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { useRecommendations } from '@/lib/hooks/use-recommendations';
import { RecommendationCarousel, CrossModulePicks } from '@/components/recommendations';
import { API_BASE_URL } from '@/lib/config/api-base';

/* ── Data ─────────────────────────────────────────────────────────────────── */

const POPULAR_HOTELS = [
  { id: 'htl-001', name: 'The Grand Palace Hotel', city: 'Dubai, UAE', rating: 4.8, reviewCount: 1240, starRating: 5, type: 'Luxury', pricePerNight: 450, currency: 'AED', imageEmoji: '🏰', amenities: ['Pool', 'Spa', 'WiFi'], offer: '20% OFF', gradient: 'from-rose-100 to-amber-50' },
  { id: 'htl-002', name: 'KARTSEEK Business Suites', city: 'Doha, Qatar', rating: 4.6, reviewCount: 890, starRating: 4, type: 'Business', pricePerNight: 280, currency: 'QAR', imageEmoji: '🏢', amenities: ['WiFi', 'Gym', 'Restaurant'], offer: null, gradient: 'from-blue-100 to-indigo-50' },
  { id: 'htl-003', name: 'Seaside Family Resort', city: 'Mumbai, India', rating: 4.7, reviewCount: 2100, starRating: 5, type: 'Resort', pricePerNight: 8500, currency: '₹', imageEmoji: '🏖️', amenities: ['Beach', 'Pool', 'Kids Club'], offer: 'Free Breakfast', gradient: 'from-cyan-100 to-teal-50' },
  { id: 'htl-004', name: 'Heritage Boutique Hotel', city: 'London, UK', rating: 4.9, reviewCount: 430, starRating: 5, type: 'Boutique', pricePerNight: 320, currency: '£', imageEmoji: '🏛️', amenities: ['Spa', 'Fine Dining', 'Concierge'], offer: 'Suite Upgrade', gradient: 'from-purple-100 to-violet-50' },
  { id: 'htl-005', name: 'Budget Inn Express', city: 'Riyadh, Saudi Arabia', rating: 4.1, reviewCount: 560, starRating: 3, type: 'Budget', pricePerNight: 120, currency: 'SAR', imageEmoji: '🏨', amenities: ['WiFi', 'AC', 'Parking'], offer: null, gradient: 'from-emerald-100 to-green-50' },
  { id: 'htl-006', name: 'Royal Palm Resort', city: 'Muscat, Oman', rating: 4.5, reviewCount: 780, starRating: 5, type: 'Resort', pricePerNight: 45, currency: 'OMR', imageEmoji: '🌴', amenities: ['Pool', 'Spa', 'Beach'], offer: '15% OFF', gradient: 'from-amber-100 to-orange-50' },
];

const TRENDING_HOTELS = [
  { id: 'htl-007', name: 'Desert Oasis Villa', city: 'Dubai, UAE', rating: 4.9, reviewCount: 312, starRating: 5, type: 'Villa', pricePerNight: 1200, currency: 'AED', imageEmoji: '🏡', amenities: ['Private Pool', 'Kitchen', 'Desert View'], offer: 'Trending', gradient: 'from-orange-100 to-amber-50' },
  { id: 'htl-008', name: 'Central City Apartments', city: 'London, UK', rating: 4.5, reviewCount: 845, starRating: 4, type: 'Apartment', pricePerNight: 180, currency: '£', imageEmoji: '🏢', amenities: ['Kitchen', 'WiFi', 'City Center'], offer: null, gradient: 'from-blue-100 to-cyan-50' },
  { id: 'htl-009', name: 'Marina Bay Suites', city: 'Doha, Qatar', rating: 4.7, reviewCount: 520, starRating: 5, type: 'Luxury', pricePerNight: 550, currency: 'QAR', imageEmoji: '🛥️', amenities: ['Sea View', 'Spa', 'Pool'], offer: 'Hot Deal', gradient: 'from-cyan-100 to-blue-50' },
];

const NEARBY_HOTELS = [
  { id: 'htl-010', name: 'Downtown Express', city: 'Current City', rating: 4.2, reviewCount: 156, starRating: 3, type: 'Budget', pricePerNight: 85, currency: '$', imageEmoji: '🏨', amenities: ['WiFi', 'Breakfast', 'Parking'], offer: null, gradient: 'from-emerald-100 to-teal-50' },
  { id: 'htl-011', name: 'Riverside Boutique', city: 'Current City', rating: 4.6, reviewCount: 289, starRating: 4, type: 'Boutique', pricePerNight: 150, currency: '$', imageEmoji: '🏛️', amenities: ['River View', 'Restaurant', 'Bar'], offer: '10% OFF', gradient: 'from-purple-100 to-fuchsia-50' },
  { id: 'htl-012', name: 'Airport Transit Hotel', city: 'Current City', rating: 4.0, reviewCount: 1102, starRating: 4, type: 'Business', pricePerNight: 120, currency: '$', imageEmoji: '✈️', amenities: ['24h Check-in', 'Shuttle', 'Gym'], offer: null, gradient: 'from-slate-100 to-gray-50' },
];

const CITIES = [
  { name: 'Dubai', country: 'UAE', countryCode: 'AE', emoji: '🇦🇪', hotels: 45, gradient: 'from-rose-500 to-orange-400' },
  { name: 'Mumbai', country: 'India', countryCode: 'IN', emoji: '🇮🇳', hotels: 32, gradient: 'from-amber-500 to-yellow-400' },
  { name: 'Doha', country: 'Qatar', countryCode: 'QA', emoji: '🇶🇦', hotels: 18, gradient: 'from-purple-500 to-blue-400' },
  { name: 'London', country: 'UK', countryCode: 'GB', emoji: '🇬🇧', hotels: 12, gradient: 'from-blue-500 to-cyan-400' },
  { name: 'Riyadh', country: 'Saudi Arabia', countryCode: 'SA', emoji: '🇸🇦', hotels: 22, gradient: 'from-emerald-500 to-teal-400' },
  { name: 'Muscat', country: 'Oman', countryCode: 'OM', emoji: '🇴🇲', hotels: 8, gradient: 'from-teal-500 to-green-400' },
];

const COLLECTIONS = [
  { slug: 'luxury-hotels',      label: 'Luxury Hotels',       emoji: '✨', desc: '5-star experiences',       gradient: 'from-amber-500 to-orange-500' },
  { slug: 'budget-hotels',      label: 'Budget Stays',        emoji: '💰', desc: 'Great value deals',        gradient: 'from-emerald-500 to-teal-500' },
  { slug: 'business-hotels',    label: 'Business Hotels',     emoji: '💼', desc: 'Work-ready suites',        gradient: 'from-blue-500 to-indigo-500' },
  { slug: 'family-hotels',      label: 'Family Friendly',     emoji: '👨‍👩‍👧‍👦', desc: 'Kids love it',            gradient: 'from-pink-500 to-rose-500' },
  { slug: 'resorts',            label: 'Resorts',             emoji: '🏝️', desc: 'Beachside paradise',       gradient: 'from-cyan-500 to-blue-500' },
  { slug: 'serviced-apartments', label: 'Serviced Apartments', emoji: '🏠', desc: 'Home away from home',     gradient: 'from-violet-500 to-purple-500' },
  { slug: 'apartments',         label: 'Apartments',          emoji: '🏢', desc: 'City living spaces',       gradient: 'from-fuchsia-500 to-pink-500' },
  { slug: 'villas',             label: 'Villas',              emoji: '🏡', desc: 'Private retreats',         gradient: 'from-lime-500 to-green-500' },
];

const DEALS = [
  { title: 'Dubai Weekend Escape', discount: '30% OFF', hotel: 'The Grand Palace Hotel', price: 315, originalPrice: 450, currency: 'AED', emoji: '🏰', expires: '2 days left' },
  { title: 'Mumbai Monsoon Magic', discount: 'FREE Breakfast', hotel: 'Seaside Family Resort', price: 8500, originalPrice: 8500, currency: '₹', emoji: '🏖️', expires: '5 days left' },
  { title: 'London Staycation', discount: '25% OFF', hotel: 'Heritage Boutique Hotel', price: 240, originalPrice: 320, currency: '£', emoji: '🏛️', expires: '3 days left' },
];

const QUICK_LINKS = [
  { href: '/hotel-booking/faq',                 label: 'FAQ',                icon: <HelpCircle className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
  { href: '/hotel-booking/terms',               label: 'Terms & Conditions', icon: <FileText className="w-4 h-4" />,   color: 'text-slate-600 bg-slate-50' },
  { href: '/hotel-booking/cancellation-policy',  label: 'Cancellation Policy', icon: <Shield className="w-4 h-4" />,   color: 'text-amber-600 bg-amber-50' },
  { href: '/support/hotel-booking',              label: 'Customer Support',   icon: <Headphones className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50' },
  { href: '/hotel-owner',                        label: 'List Your Property', icon: <Building2 className="w-4 h-4" />,  color: 'text-rose-600 bg-rose-50' },
];

/* ── Component ────────────────────────────────────────────────────────────── */

// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const API_BASE = API_BASE_URL;

function useHotelHome() {
  const [layout, setLayout] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);

  const fetchHome = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/layouts/hotel/homepage`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data ? json.data : json;
        if (data && data.sections) {
          setLayout(data);
          setIsLive(true);
          return;
        }
      }
    } catch {
      // Fallback
    }
    setIsLive(false);
  }, []);

  React.useEffect(() => {
    fetchHome();
    const interval = setInterval(fetchHome, 5000);
    return () => clearInterval(interval);
  }, [fetchHome]);

  return { layout, isLive, refresh: fetchHome };
}

export default function HotelBookingPage() {
  useModuleTitle('hotel-booking');
  const { currentRegionConfig, selectedRegion } = useRegion();
  const defaultCity = currentRegionConfig?.defaultCity || '';
  const [city, setCity] = useState(defaultCity);

  // ── Recommendation Engine ──
  const { forYou, crossModule, isLoading: recoLoading, trackClick } = useRecommendations('hotel', null);
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);

  useEffect(() => {
    if (defaultCity && !city) setCity(defaultCity);
  }, [defaultCity]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedCities = useMemo(() => {
    if (selectedRegion === 'ALL') return CITIES;
    return [...CITIES].sort((a, b) => {
      if (a.countryCode === selectedRegion) return -1;
      if (b.countryCode === selectedRegion) return 1;
      return 0;
    });
  }, [selectedRegion]);

  const { layout, isLive, refresh } = useHotelHome();

  const renderSection = (section: any) => {
    switch (section.type) {
      case 'hero_slider':
        return null; // Hero is hardcoded at the top
      case 'category_grid':
        return (
          <section key={section.id}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" /> {section.title || 'Popular Destinations'}
              </h2>
              <Link href="/hotel-booking/destinations" className="text-xs font-semibold text-rose-600 flex items-center gap-1 hover:gap-2 transition-all">
                Explore all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {sortedCities.map(c => (
                <Link key={c.name} href={`/hotel-booking/search?city=${encodeURIComponent(c.name)}`}
                  className="group relative overflow-hidden rounded-2xl h-32 md:h-36 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`absolute inset-0 bg-linear-to-br ${c.gradient}`} />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all" />
                  <div className="relative z-10 p-4 flex flex-col justify-end h-full text-white">
                    <span className="text-2xl mb-1">{c.emoji}</span>
                    <h3 className="font-black text-lg leading-tight">{c.name}</h3>
                    <p className="text-white/80 text-xs font-medium">{c.hotels} hotels</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      case 'product_carousel':
        return (
          <section key={section.id}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-500" /> {section.title || 'Featured Hotels'}
              </h2>
              <Link href="/hotel-booking/search" className="text-xs font-semibold text-rose-600 flex items-center gap-1 hover:gap-2 transition-all">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="scroll-x md:grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {POPULAR_HOTELS.map(h => (
                <Link key={h.id} href={`/hotel-booking/hotel/${h.id}`}
                  className="snap-card md:snap-card-none bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className={`relative h-44 bg-linear-to-br ${h.gradient} flex items-center justify-center overflow-hidden`}>
                    <span className="text-6xl opacity-60 group-hover:scale-110 transition-transform duration-500">{h.imageEmoji}</span>
                    {h.offer && (
                      <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm">{h.offer}</span>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-900 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {h.rating}
                    </div>
                    <button title="Add to favorites" className="absolute bottom-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm">
                      <Heart className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors">{h.name}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{h.city}</p>
                      </div>
                      <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded">{h.type}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 my-3">
                      {h.amenities.map(a => (
                        <span key={a} className="bg-slate-50 text-slate-500 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-100">{a}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-lg font-black text-slate-900">{h.currency} {h.pricePerNight.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 ml-1">/ night</span>
                      </div>
                      <span className="text-xs text-slate-400">{h.reviewCount.toLocaleString()} reviews</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      case 'trending_hotels':
        return (
          <section key={section.id}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-rose-500" /> {section.title || 'Trending Properties'}
              </h2>
              <Link href="/hotel-booking/search?sort=trending" className="text-xs font-semibold text-rose-600 flex items-center gap-1 hover:gap-2 transition-all">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="scroll-x md:grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {TRENDING_HOTELS.map(h => (
                <Link key={h.id} href={`/hotel-booking/hotel/${h.id}`}
                  className="snap-card md:snap-card-none bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className={`relative h-44 bg-linear-to-br ${h.gradient} flex items-center justify-center overflow-hidden`}>
                    <span className="text-6xl opacity-60 group-hover:scale-110 transition-transform duration-500">{h.imageEmoji}</span>
                    {h.offer && (
                      <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm">{h.offer}</span>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-900 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {h.rating}
                    </div>
                    <button title="Add to favorites" className="absolute bottom-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm">
                      <Heart className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors">{h.name}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{h.city}</p>
                      </div>
                      <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded">{h.type}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 my-3">
                      {h.amenities.map(a => (
                        <span key={a} className="bg-slate-50 text-slate-500 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-100">{a}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-lg font-black text-slate-900">{h.currency} {h.pricePerNight.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 ml-1">/ night</span>
                      </div>
                      <span className="text-xs text-slate-400">{h.reviewCount.toLocaleString()} reviews</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      case 'nearby_hotels':
        return (
          <section key={section.id}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" /> {section.title || 'Nearby Stays'}
              </h2>
              <Link href="/hotel-booking/search?nearby=true" className="text-xs font-semibold text-rose-600 flex items-center gap-1 hover:gap-2 transition-all">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="scroll-x md:grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {NEARBY_HOTELS.map(h => (
                <Link key={h.id} href={`/hotel-booking/hotel/${h.id}`}
                  className="snap-card md:snap-card-none bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className={`relative h-44 bg-linear-to-br ${h.gradient} flex items-center justify-center overflow-hidden`}>
                    <span className="text-6xl opacity-60 group-hover:scale-110 transition-transform duration-500">{h.imageEmoji}</span>
                    {h.offer && (
                      <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm">{h.offer}</span>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-900 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {h.rating}
                    </div>
                    <button title="Add to favorites" className="absolute bottom-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm">
                      <Heart className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors">{h.name}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{h.city}</p>
                      </div>
                      <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded">{h.type}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 my-3">
                      {h.amenities.map(a => (
                        <span key={a} className="bg-slate-50 text-slate-500 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-100">{a}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-lg font-black text-slate-900">{h.currency} {h.pricePerNight.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 ml-1">/ night</span>
                      </div>
                      <span className="text-xs text-slate-400">{h.reviewCount.toLocaleString()} reviews</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      default:
        return (
          <section key={section.id}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-rose-500" /> Browse by Collection
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {COLLECTIONS.map(col => (
                <Link key={col.slug} href={`/hotel-booking/${col.slug}`}
                  className="group relative overflow-hidden rounded-2xl h-28 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className={`absolute inset-0 bg-linear-to-br ${col.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative z-10 p-4 flex flex-col justify-between h-full text-white">
                    <span className="text-2xl">{col.emoji}</span>
                    <div>
                      <h3 className="font-black text-sm leading-tight">{col.label}</h3>
                      <p className="text-white/70 text-[10px] font-medium">{col.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
    }
  };

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto">
      {/* ───────────────────── HERO + SEARCH ───────────────────── */}
      <section className="relative overflow-hidden">
        <div className="bg-linear-to-br from-rose-600 via-rose-500 to-pink-600 px-6 md:px-12 py-12 md:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-10%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_110%,rgba(0,0,0,0.15),transparent_50%)]" />
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">🏨 Hotel Booking</span>
            </div>
            <h1 className="hero-title text-white leading-tight mb-3">
              Find Your Perfect<br />Stay Anywhere
            </h1>
            <p className="hero-subtitle text-white/70 mb-6">
              Book premium hotels across UAE, India, Qatar, Saudi Arabia, UK &amp; more. Best prices guaranteed.
            </p>

            {/* Search Card */}
            <div className="bg-white rounded-2xl p-4 shadow-2xl" role="search" aria-label="Search hotels">
              <div className="hotel-search-grid">
                <div className="col-span-1 relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text" value={city} onChange={e => setCity(e.target.value)}
                    placeholder="City, area or hotel name" aria-label="City, area or hotel name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                  />
                </div>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input type="date" value={checkin} onChange={e => setCheckin(e.target.value)} aria-label="Check-in date" className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all" />
                </div>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input type="date" value={checkout} onChange={e => setCheckout(e.target.value)} aria-label="Check-out date" className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all" />
                </div>
                <Link
                  href={`/hotel-booking/search?city=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&guests=${guests}&rooms=${rooms}`}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <Search className="w-4 h-4" /> Search
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="w-4 h-4 text-slate-400" />
                  <select aria-label="Number of guests" value={guests} onChange={e => setGuests(Number(e.target.value))} className="bg-transparent outline-none font-medium">
                    {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Guest{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div className="w-px h-5 bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Hotel className="w-4 h-4 text-slate-400" />
                  <select aria-label="Number of rooms" value={rooms} onChange={e => setRooms(Number(e.target.value))} className="bg-transparent outline-none font-medium">
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Room{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="px-3 xs:px-4 md:px-8 3xl:px-12 py-6 3xl:py-10 space-y-8 pb-mobile-nav">

        {isLive && (
          <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-3 flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-rose-700">
              <Sparkles className="w-4 h-4" />
              <span className="font-bold">Live sync active</span>
              <span className="text-rose-500">— Data updates in real time</span>
            </div>
            <button onClick={refresh} className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        )}

        {/* ───────────────────── QUICK ACTIONS BAR ───────────────────── */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            {[
              { href: '/hotel-booking/destinations', icon: <Compass className="w-5 h-5" />, label: 'Explore Destinations', color: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' },
              { href: '/hotel-booking/map',          icon: <Map className="w-5 h-5" />,     label: 'Map Search',           color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' },
              { href: '/hotel-booking/deals',        icon: <Tag className="w-5 h-5" />,     label: 'Deals & Offers',       color: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' },
            ].map(action => (
              <Link key={action.href} href={action.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${action.color}`}
              >
                {action.icon}
                <span className="text-[10px] sm:text-xs font-bold text-center leading-tight">{action.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {layout?.sections ? (
          layout.sections.map((section: any) => renderSection(section))
        ) : (
          [
            { id: 'cat', type: 'category_grid' },
            { id: 'trend', type: 'trending_hotels' },
            { id: 'near', type: 'nearby_hotels' },
            { id: 'col', type: 'default' },
            { id: 'prod', type: 'product_carousel' }
          ].map(section => renderSection(section))
        )}

        {/* ══ 🧠 RECOMMENDED HOTELS (recommendation engine) ══ */}
        <RecommendationCarousel
          title="Hotels You Might Like"
          icon="🏨"
          recommendations={forYou}
          module="hotel"
          isLoading={recoLoading}
          onCardClick={trackClick}
        />

        {/* ══ ✨ EXPLORE OTHER SERVICES ══ */}
        <CrossModulePicks
          recommendations={crossModule}
          currentModule="hotel"
          onCardClick={trackClick}
        />

        {/* ───────────────────── WHY KARTSEEK HOTELS ───────────────────── */}
        <section className="bg-linear-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-white">
          <h2 className="text-2xl font-black mb-8 text-center">Why Book with KARTSEEK Hotels?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Shield className="w-6 h-6" />, title: 'Best Price Guarantee', desc: 'We match any lower price you find' },
              { icon: <TrendingUp className="w-6 h-6" />, title: 'Earn Loyalty Points', desc: 'Get KARTSEEK points on every stay' },
              { icon: <Clock className="w-6 h-6" />, title: 'Free Cancellation', desc: 'Cancel up to 24h before check-in' },
              { icon: <Star className="w-6 h-6" />, title: 'Verified Reviews', desc: 'Real reviews from verified guests' },
            ].map(f => (
              <div key={f.title} className="text-center">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-rose-400">
                  {f.icon}
                </div>
                <h3 className="font-bold text-sm mb-1">{f.title}</h3>
                <p className="text-white/50 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───────────────────── QUICK LINKS FOOTER ───────────────────── */}
        <section>
          <h2 className="text-lg font-black text-slate-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {QUICK_LINKS.map(link => (
              <Link key={link.href} href={link.href}
                className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5 transition-all group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${link.color}`}>{link.icon}</div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-rose-600 transition-colors">{link.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
