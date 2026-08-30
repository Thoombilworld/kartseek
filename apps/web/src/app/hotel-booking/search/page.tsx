'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MapPin, Star, Heart, ArrowRight, SlidersHorizontal, ChevronDown, X, ArrowUpDown, Wifi, Car, UtensilsCrossed, Dumbbell, Waves, Sparkles } from 'lucide-react';

const RESULTS = [
  { id: 'htl-001', name: 'The Grand Palace Hotel', city: 'Dubai, UAE', rating: 4.8, reviewCount: 1240, starRating: 5, type: 'Luxury', pricePerNight: 450, currency: 'AED', taxesAndFees: 67, totalPrice: 517, emoji: '🏰', amenities: ['Pool', 'Spa', 'Gym', 'Restaurant', 'WiFi', 'Parking'], distance: 2.3, distanceLabel: '2.3 km from center', offer: '20% OFF', gradient: 'from-rose-100 to-amber-50', freeCancellation: true, breakfastIncluded: false, guestRating: 'Exceptional' },
  { id: 'htl-002', name: 'KARTSEEK Business Suites', city: 'Doha, Qatar', rating: 4.6, reviewCount: 890, starRating: 4, type: 'Business', pricePerNight: 280, currency: 'QAR', taxesAndFees: 42, totalPrice: 322, emoji: '🏢', amenities: ['WiFi', 'Business Center', 'Gym', 'Restaurant', 'Parking'], distance: 0.8, distanceLabel: '0.8 km from center', offer: null, gradient: 'from-blue-100 to-indigo-50', freeCancellation: true, breakfastIncluded: true, guestRating: 'Excellent' },
  { id: 'htl-003', name: 'Seaside Family Resort', city: 'Mumbai, India', rating: 4.7, reviewCount: 2100, starRating: 5, type: 'Resort', pricePerNight: 8500, currency: '₹', taxesAndFees: 1530, totalPrice: 10030, emoji: '🏖️', amenities: ['Pool', 'Kids Club', 'Beach', 'Restaurant', 'WiFi', 'Spa'], distance: 5.1, distanceLabel: '5.1 km from center', offer: 'Free Breakfast', gradient: 'from-cyan-100 to-teal-50', freeCancellation: true, breakfastIncluded: true, guestRating: 'Excellent' },
  { id: 'htl-004', name: 'Budget Inn Express', city: 'Riyadh, Saudi Arabia', rating: 4.1, reviewCount: 560, starRating: 3, type: 'Budget', pricePerNight: 120, currency: 'SAR', taxesAndFees: 18, totalPrice: 138, emoji: '🏨', amenities: ['WiFi', 'AC', 'Parking'], distance: 3.2, distanceLabel: '3.2 km from center', offer: null, gradient: 'from-emerald-100 to-green-50', freeCancellation: false, breakfastIncluded: false, guestRating: 'Very Good' },
  { id: 'htl-005', name: 'Heritage Boutique Hotel', city: 'London, UK', rating: 4.9, reviewCount: 430, starRating: 5, type: 'Boutique', pricePerNight: 320, currency: '£', taxesAndFees: 48, totalPrice: 368, emoji: '🏛️', amenities: ['Spa', 'Fine Dining', 'Concierge', 'WiFi', 'Room Service', 'Butler'], distance: 1.5, distanceLabel: '1.5 km from center', offer: 'Suite Upgrade', gradient: 'from-purple-100 to-violet-50', freeCancellation: true, breakfastIncluded: true, guestRating: 'Exceptional' },
  { id: 'htl-006', name: 'Royal Palm Resort', city: 'Muscat, Oman', rating: 4.5, reviewCount: 780, starRating: 5, type: 'Resort', pricePerNight: 45, currency: 'OMR', taxesAndFees: 7, totalPrice: 52, emoji: '🌴', amenities: ['Pool', 'Spa', 'Beach', 'WiFi', 'Restaurant', 'Gym'], distance: 8.0, distanceLabel: '8 km from center', offer: '15% OFF', gradient: 'from-amber-100 to-orange-50', freeCancellation: false, breakfastIncluded: false, guestRating: 'Excellent' },
  { id: 'htl-007', name: 'Marina Bay Suites', city: 'Dubai, UAE', rating: 4.4, reviewCount: 640, starRating: 4, type: 'Business', pricePerNight: 350, currency: 'AED', taxesAndFees: 52, totalPrice: 402, emoji: '🌊', amenities: ['Pool', 'Gym', 'WiFi', 'Restaurant', 'Parking', 'Spa'], distance: 1.1, distanceLabel: '1.1 km from center', offer: null, gradient: 'from-sky-100 to-blue-50', freeCancellation: true, breakfastIncluded: false, guestRating: 'Excellent' },
  { id: 'htl-008', name: 'Desert Oasis Hotel', city: 'Abu Dhabi, UAE', rating: 4.3, reviewCount: 320, starRating: 3, type: 'Budget', pricePerNight: 180, currency: 'AED', taxesAndFees: 27, totalPrice: 207, emoji: '🏜️', amenities: ['WiFi', 'Pool', 'Parking', 'Restaurant'], distance: 4.5, distanceLabel: '4.5 km from center', offer: '10% OFF', gradient: 'from-yellow-100 to-amber-50', freeCancellation: false, breakfastIncluded: true, guestRating: 'Very Good' },
];

const TYPE_FILTERS = ['All', 'Luxury', 'Business', 'Resort', 'Budget', 'Boutique'];
const STAR_OPTIONS = [5, 4, 3, 2, 1];
const AMENITY_OPTIONS = [
  { key: 'WiFi', icon: Wifi, label: 'Free WiFi' },
  { key: 'Pool', icon: Waves, label: 'Swimming Pool' },
  { key: 'Gym', icon: Dumbbell, label: 'Gym / Fitness' },
  { key: 'Restaurant', icon: UtensilsCrossed, label: 'Restaurant' },
  { key: 'Spa', icon: Sparkles, label: 'Spa & Wellness' },
  { key: 'Parking', icon: Car, label: 'Parking' },
];
const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'rating-desc', label: 'Guest Rating' },
  { value: 'stars-desc', label: 'Star Rating' },
  { value: 'distance-asc', label: 'Distance from Center' },
  { value: 'reviews-desc', label: 'Most Reviewed' },
];
const GUEST_RATING_OPTIONS = [
  { value: 4.5, label: 'Exceptional (4.5+)' },
  { value: 4.0, label: 'Excellent (4.0+)' },
  { value: 3.5, label: 'Very Good (3.5+)' },
  { value: 0, label: 'Any' },
];

export default function HotelSearchPage() {
  const params = useSearchParams();
  const cityQuery = params.get('city') || '';
  const [search, setSearch] = useState(cityQuery);
  const [typeFilter, setTypeFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [showSort, setShowSort] = useState(false);

  // Advanced filters
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [minGuestRating, setMinGuestRating] = useState(0);
  const [freeCancellation, setFreeCancellation] = useState(false);
  const [breakfastIncluded, setBreakfastIncluded] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  const toggleStar = (star: number) =>
    setSelectedStars(prev => prev.includes(star) ? prev.filter(s => s !== star) : [...prev, star]);
  const toggleAmenity = (key: string) =>
    setSelectedAmenities(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);

  const activeFilterCount = [
    selectedStars.length > 0,
    selectedAmenities.length > 0,
    minGuestRating > 0,
    freeCancellation,
    breakfastIncluded,
    priceRange[0] > 0 || priceRange[1] < 10000,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedStars([]);
    setSelectedAmenities([]);
    setMinGuestRating(0);
    setFreeCancellation(false);
    setBreakfastIncluded(false);
    setPriceRange([0, 10000]);
    setTypeFilter('All');
  };

  const filtered = useMemo(() => {
    let results = RESULTS.filter(h => {
      const matchSearch = !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.city.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'All' || h.type === typeFilter;
      const matchStars = selectedStars.length === 0 || selectedStars.includes(h.starRating);
      const matchAmenities = selectedAmenities.length === 0 || selectedAmenities.every(a => h.amenities.includes(a));
      const matchGuestRating = h.rating >= minGuestRating;
      const matchCancellation = !freeCancellation || h.freeCancellation;
      const matchBreakfast = !breakfastIncluded || h.breakfastIncluded;
      const matchPrice = h.pricePerNight >= priceRange[0] && h.pricePerNight <= priceRange[1];
      return matchSearch && matchType && matchStars && matchAmenities && matchGuestRating && matchCancellation && matchBreakfast && matchPrice;
    });

    // Sort
    switch (sortBy) {
      case 'price-asc': results.sort((a, b) => a.pricePerNight - b.pricePerNight); break;
      case 'price-desc': results.sort((a, b) => b.pricePerNight - a.pricePerNight); break;
      case 'rating-desc': results.sort((a, b) => b.rating - a.rating); break;
      case 'stars-desc': results.sort((a, b) => b.starRating - a.starRating); break;
      case 'distance-asc': results.sort((a, b) => a.distance - b.distance); break;
      case 'reviews-desc': results.sort((a, b) => b.reviewCount - a.reviewCount); break;
      default: results.sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount); break;
    }
    return results;
  }, [search, typeFilter, selectedStars, selectedAmenities, minGuestRating, freeCancellation, breakfastIncluded, priceRange, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-3 xs:px-4 md:px-8 py-6">
      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search city, hotel name or landmark..."
              aria-label="Search city, hotel name or landmark"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
              showFilters || activeFilterCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            <SlidersHorizontal className="w-4 h-4" /> Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Advanced Filters Panel ──────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900">Filters</h3>
            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="text-xs text-rose-600 font-semibold hover:underline">Clear All</button>
              )}
              <button onClick={() => setShowFilters(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Star Rating */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Star Rating</p>
              <div className="flex flex-wrap gap-2">
                {STAR_OPTIONS.map(s => (
                  <button key={s} onClick={() => toggleStar(s)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      selectedStars.includes(s) ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}>
                    {s} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Guest Rating */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Guest Rating</p>
              <div className="flex flex-wrap gap-2">
                {GUEST_RATING_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setMinGuestRating(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      minGuestRating === opt.value ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Filters */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Popular Filters</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" checked={freeCancellation} onChange={e => setFreeCancellation(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">Free Cancellation</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" checked={breakfastIncluded} onChange={e => setBreakfastIncluded(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">Breakfast Included</span>
                </label>
              </div>
            </div>

            {/* Amenities */}
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map(({ key, icon: Icon, label }) => (
                  <button key={key} onClick={() => toggleAmenity(key)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                      selectedAmenities.includes(key) ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}>
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Type Pills + Sort ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1" role="tablist" aria-label="Filter by hotel type">
          {TYPE_FILTERS.map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              role="tab"
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                typeFilter === f ? 'bg-rose-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="relative shrink-0">
          <button onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors bg-white">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{SORT_OPTIONS.find(s => s.value === sortBy)?.label || 'Sort'}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showSort ? 'rotate-180' : ''}`} />
          </button>
          {showSort && (
            <div className="absolute right-0 top-11 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
              {SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSort(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    sortBy === opt.value ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-slate-500 mb-4 font-medium">
        {filtered.length} hotel{filtered.length !== 1 ? 's' : ''} found{search ? ` for "${search}"` : ''}
        {activeFilterCount > 0 && <span className="text-rose-600"> · {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>}
      </p>

      {/* ── Results List ───────────────────────────────────────────────── */}
      <div className="space-y-4" role="group" aria-label="Hotel search results">
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🏨</p>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No hotels match your filters</h3>
            <p className="text-sm text-slate-500 mb-4">Try adjusting your filters or search query.</p>
            <button onClick={clearAllFilters} className="text-sm font-bold text-rose-600 hover:underline">Clear all filters</button>
          </div>
        )}

        {filtered.map(h => (
          <Link key={h.id} href={`/hotel-booking/hotel/${h.id}`}
            className="flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group">
            {/* Image */}
            <div className={`relative w-full md:w-72 h-48 md:h-auto bg-linear-to-br ${h.gradient} flex items-center justify-center shrink-0 overflow-hidden`}>
              <span className="text-7xl opacity-50 group-hover:scale-110 transition-transform duration-500">{h.emoji}</span>
              {h.offer && (
                <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm">{h.offer}</span>
              )}
              <button aria-label="Add to favorites" title="Add to favorites" className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm" onClick={(e) => e.preventDefault()}>
                <Heart className="w-4 h-4 text-slate-400" />
              </button>
              {h.freeCancellation && (
                <span className="absolute bottom-3 left-3 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">Free cancellation</span>
              )}
            </div>
            {/* Content */}
            <div className="flex-1 p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-rose-600 transition-colors">{h.name}</h3>
                    <span className="text-xs text-amber-500">{'⭐'.repeat(h.starRating)}</span>
                  </div>
                  <p className="text-sm text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{h.city} · {h.distanceLabel}</p>
                </div>
                <div className="text-right">
                  <div className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm">
                    <Star className="w-3.5 h-3.5 fill-current" /> {h.rating}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">{h.guestRating}</p>
                  <p className="text-[10px] text-slate-400">{h.reviewCount.toLocaleString()} reviews</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {h.amenities.slice(0, 5).map(a => (
                  <span key={a} className="bg-slate-50 text-slate-500 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-100">{a}</span>
                ))}
                {h.amenities.length > 5 && <span className="text-[10px] text-slate-400 font-medium">+{h.amenities.length - 5} more</span>}
              </div>
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {h.breakfastIncluded && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">🍳 Breakfast included</span>}
                {h.type && <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{h.type}</span>}
              </div>
              <div className="flex items-end justify-between pt-3 border-t border-slate-100">
                <div>
                  <span className="text-2xl font-black text-slate-900">{h.currency} {h.pricePerNight.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 ml-1">/ night</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">+{h.currency} {h.taxesAndFees} taxes & fees</p>
                </div>
                <span className="bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold group-hover:bg-rose-700 transition-colors flex items-center gap-1">
                  View Rooms <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
