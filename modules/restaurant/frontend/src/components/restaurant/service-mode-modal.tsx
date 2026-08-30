'use client';

import React, { useState, useMemo } from 'react';
import { X, Star, Clock, MapPin, ChevronRight, Bike, ShoppingBag, Utensils, CalendarDays, Search, BadgePercent, ChefHat, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { MOCK_RESTAURANTS, type Restaurant } from '@/lib/demo-data/restaurant';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type ServiceMode = 'delivery' | 'takeaway' | 'dine-in' | 'table-booking';

interface ServiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ServiceMode;
}

const SERVICE_CONFIG: Record<ServiceMode, {
  label: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  ctaLabel: string;
  ctaRoute: (id: string) => string;
  badgeText: string;
}> = {
  delivery: {
    label: 'Delivery',
    subtitle: 'Get food delivered to your doorstep',
    icon: Bike,
    gradient: 'from-orange-500 to-red-500',
    accentColor: 'text-orange-600',
    accentBg: 'bg-orange-50',
    accentBorder: 'border-orange-200',
    ctaLabel: 'Order Delivery',
    ctaRoute: (id) => `/${id}?mode=delivery`,
    badgeText: '🚴 Fast Delivery',
  },
  takeaway: {
    label: 'Takeaway',
    subtitle: 'Pick up your order & save on delivery fees',
    icon: ShoppingBag,
    gradient: 'from-purple-500 to-violet-600',
    accentColor: 'text-purple-600',
    accentBg: 'bg-purple-50',
    accentBorder: 'border-purple-200',
    ctaLabel: 'Order Takeaway',
    ctaRoute: (id) => `/${id}?mode=takeaway`,
    badgeText: '🛍️ No Delivery Fee',
  },
  'dine-in': {
    label: 'Dine-in',
    subtitle: 'Eat fresh at the restaurant — order from your table',
    icon: Utensils,
    gradient: 'from-emerald-500 to-green-600',
    accentColor: 'text-emerald-600',
    accentBg: 'bg-emerald-50',
    accentBorder: 'border-emerald-200',
    ctaLabel: 'Dine-in Menu',
    ctaRoute: (id) => `/${id}?mode=dine-in`,
    badgeText: '🍽️ Dine-in Available',
  },
  'table-booking': {
    label: 'Book a Table',
    subtitle: 'Reserve your seat for a perfect dining experience',
    icon: CalendarDays,
    gradient: 'from-blue-500 to-indigo-600',
    accentColor: 'text-blue-600',
    accentBg: 'bg-blue-50',
    accentBorder: 'border-blue-200',
    ctaLabel: 'Book Table',
    ctaRoute: (id) => `/table-booking/${id}`,
    badgeText: '📅 Table Booking',
  },
};

function RestaurantModalCard({ restaurant, config }: { restaurant: Restaurant; config: typeof SERVICE_CONFIG[ServiceMode] }) {
  return (
    <Link
      href={config.ctaRoute(restaurant.id)}
      id={`modal-card-${restaurant.id}`}
      className="group flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 hover:shadow-lg transition-all duration-300"
    >
      {/* Restaurant Image */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 group-hover:shadow-inner">
        {restaurant.imageUrl ? (
          <Image
            src={restaurant.imageUrl}
            alt={restaurant.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="96px"
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-orange-50 to-red-50 flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-orange-200 opacity-50" />
          </div>
        )}
        {/* Rating Badge */}
        <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm">
          <span>{restaurant.rating}</span>
          <Star className="w-2.5 h-2.5 fill-current" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate group-hover:text-orange-600 transition-colors">
              {restaurant.name}
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {restaurant.cuisines.join(', ')}
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <Clock className="w-3 h-3 text-slate-400" /> {restaurant.deliveryTime}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <MapPin className="w-3 h-3 text-slate-400" /> {restaurant.distance}
          </span>
          <span className="text-xs text-slate-400 font-medium">{restaurant.costForTwo} for two</span>
        </div>

        {/* Offer + CTA */}
        <div className="flex items-center justify-between mt-3 gap-2">
          {restaurant.offer ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 truncate">
              <BadgePercent className="w-3 h-3 shrink-0" /> {restaurant.offer}
            </span>
          ) : (
            <span />
          )}
          <span className={`shrink-0 flex items-center gap-1 text-xs font-bold ${config.accentColor} ${config.accentBg} px-3 py-1.5 rounded-lg border ${config.accentBorder} group-hover:shadow-sm transition-shadow`}>
            {config.ctaLabel} <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ServiceModeModal({ isOpen, onClose, mode }: ServiceModeModalProps) {
  const [search, setSearch] = useState('');
  const config = SERVICE_CONFIG[mode];
  const Icon = config.icon;

  const filteredRestaurants = useMemo(() => {
    return MOCK_RESTAURANTS.filter(r => {
      if (!r.isOpen) return false;
      if (!r.services.includes(mode)) return false;
      if (search === '') return true;
      return (
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.cuisines.some(c => c.toLowerCase().includes(search.toLowerCase()))
      );
    });
  }, [mode, search]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      ><DismissOnEscape onDismiss={onClose} /></div>

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-end md:items-center justify-center p-0 md:p-6">
        <div
          className="w-full md:max-w-lg bg-white md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden animate-slide-up md:animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={`${config.label} restaurants`}
        >
          {/* Header with Gradient */}
          <div className={`relative bg-linear-to-br ${config.gradient} px-6 pt-8 pb-6 text-white shrink-0`}>
            {/* Close Button */}
            <button
              onClick={onClose}
              id="btn-close-service-modal"
              className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur rounded-full flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Decorative sparkles */}
            <div className="absolute top-4 left-6 opacity-30">
              <Sparkles className="w-5 h-5" />
            </div>

            {/* Icon + Title */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg">
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">{config.label}</h2>
                <p className="text-white/80 text-sm font-medium mt-0.5">{config.subtitle}</p>
              </div>
            </div>

            {/* Result Count Badge */}
            <div className="mt-4 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold">
              <Sparkles className="w-3 h-3" />
              {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''} available
            </div>
          </div>

          {/* Search within modal */}
          <div className="px-5 pt-4 pb-2 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${config.label.toLowerCase()} restaurants...`}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100 text-sm transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Restaurant List (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 hide-scrollbar">
            {filteredRestaurants.length > 0 ? (
              filteredRestaurants.map(r => (
                <RestaurantModalCard key={r.id} restaurant={r} config={config} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">😔</div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No restaurants found</h3>
                <p className="text-slate-500 text-sm">
                  {search ? 'Try a different search term' : `No restaurants offer ${config.label.toLowerCase()} right now`}
                </p>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="mt-3 text-sm font-bold text-orange-600 hover:text-orange-700"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-4 bg-slate-50 border-t border-slate-100">
            <p className="text-center text-[11px] text-slate-400 font-medium">
              {config.badgeText} • Select a restaurant to proceed
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
