/**
 * KARTSEEK — Per-module profile configuration.
 *
 * This file used to be the profile *data* layer, and every number in it was
 * invented. `getModuleProfile('marketplace')` returned 47 orders, ₹1.2L spent,
 * 2,340 "Mall Points" at Gold tier, and four named orders — a Sony WH-1000XM5,
 * a pair of Nike Air Max — with amounts and delivery states. `/profile` rendered
 * that blob for whoever was signed in, so every customer on the platform saw the
 * same shopping history presented as their own, and `getAggregateStats()` summed
 * the fictions into a headline "278 orders".
 *
 * What is genuinely static about a module — its palette, its name, the shape of
 * its quick-action menu — stays here. Everything that varies per customer now
 * comes from `./profile-data`, which asks each module's own API.
 *
 * @see ./profile-data for the live counters, history and loyalty balance.
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ModuleKey = 'marketplace' | 'grocery' | 'restaurant' | 'pharmacy' | 'doctor' | 'taxi' | 'hotel';

export interface ModuleTheme {
  gradient: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  buttonBg: string;
  buttonHover: string;
  lightBg: string;
}

/**
 * Which live counter fills a quick action's badge.
 *
 * A quick action carries a number only when the module's own API can supply it.
 * The badges here were previously literals — "8" saved items, "2" auto-refills,
 * "14" favourite restaurants — that no request produced and no customer had.
 */
export type ProfileCountKey =
  | 'openOrders'
  | 'totalOrders'
  | 'prescriptions'
  | 'upcomingAppointments'
  | 'familyMembers'
  | 'upcomingStays'
  | 'completedRides';

export interface ModuleQuickAction {
  label: string;
  href: string;
  icon: string;
  /** Fill this action's badge from a live counter. Omitted = no badge. */
  countKey?: ProfileCountKey;
  badgeColor?: string;
}

export interface ModuleProfileConfig {
  key: ModuleKey;
  /** Short name, as used in navigation. */
  label: string;
  subtitle: string;
  /** The customer-facing brand for this vertical. */
  brandName: string;
  icon: string;
  theme: ModuleTheme;
  /** This module's own dedicated profile route. */
  profileHref: string;
  /** Where this module's history lives, and what that history is called. */
  historyHref: string;
  historyLabel: string;
  /** Singular/plural noun for a history row — "order", "booking", "ride". */
  recordNoun: [singular: string, plural: string];
  quickActions: ModuleQuickAction[];
  /** Shown when the customer has no history in this module yet. */
  emptyState: { headline: string; hint: string; ctaLabel: string; ctaHref: string };
}

// ─── Module Themes ──────────────────────────────────────────────────────────────

const THEMES: Record<ModuleKey, ModuleTheme> = {
  marketplace: {
    gradient: 'from-blue-600 via-indigo-600 to-blue-700',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-600',
    accentBorder: 'border-blue-200',
    iconBg: 'bg-blue-100',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
    lightBg: 'bg-blue-50/50',
  },
  grocery: {
    gradient: 'from-emerald-500 via-green-600 to-emerald-700',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-600',
    accentBorder: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    buttonBg: 'bg-emerald-600',
    buttonHover: 'hover:bg-emerald-700',
    lightBg: 'bg-emerald-50/50',
  },
  restaurant: {
    gradient: 'from-orange-500 via-red-500 to-orange-600',
    accentBg: 'bg-orange-50',
    accentText: 'text-orange-600',
    accentBorder: 'border-orange-200',
    iconBg: 'bg-orange-100',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    buttonBg: 'bg-orange-600',
    buttonHover: 'hover:bg-orange-700',
    lightBg: 'bg-orange-50/50',
  },
  pharmacy: {
    gradient: 'from-teal-500 via-teal-600 to-cyan-600',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-600',
    accentBorder: 'border-teal-200',
    iconBg: 'bg-teal-100',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-700',
    buttonBg: 'bg-teal-600',
    buttonHover: 'hover:bg-teal-700',
    lightBg: 'bg-teal-50/50',
  },
  doctor: {
    gradient: 'from-indigo-500 via-violet-600 to-indigo-700',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-600',
    accentBorder: 'border-indigo-200',
    iconBg: 'bg-indigo-100',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700',
    buttonBg: 'bg-indigo-600',
    buttonHover: 'hover:bg-indigo-700',
    lightBg: 'bg-indigo-50/50',
  },
  taxi: {
    gradient: 'from-yellow-500 via-amber-500 to-yellow-600',
    accentBg: 'bg-yellow-50',
    accentText: 'text-yellow-700',
    accentBorder: 'border-yellow-300',
    iconBg: 'bg-yellow-100',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-yellow-800',
    buttonBg: 'bg-yellow-500',
    buttonHover: 'hover:bg-yellow-600',
    lightBg: 'bg-yellow-50/50',
  },
  hotel: {
    gradient: 'from-rose-500 via-pink-600 to-rose-700',
    accentBg: 'bg-rose-50',
    accentText: 'text-rose-600',
    accentBorder: 'border-rose-200',
    iconBg: 'bg-rose-100',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    buttonBg: 'bg-rose-600',
    buttonHover: 'hover:bg-rose-700',
    lightBg: 'bg-rose-50/50',
  },
};

// ─── Per-module configuration ───────────────────────────────────────────────────

/**
 * Each vertical's quick actions are drawn from what that vertical actually does:
 * a pharmacy profile leads with prescriptions and refills, a hotel profile with
 * stays and saved properties, a clinic profile with appointments and the family
 * members a booking can be made for. Every `href` below resolves to a route that
 * exists — the hotel entries in particular used to point at `/account/...`,
 * which 404s, because `(account)` is a route group and contributes no segment.
 */
const MODULE_CONFIG: Record<ModuleKey, ModuleProfileConfig> = {
  marketplace: {
    key: 'marketplace',
    label: 'Marketplace',
    subtitle: 'Your shopping hub',
    brandName: 'KARTSEEK Marketplace',
    icon: '🛒',
    theme: THEMES.marketplace,
    profileHref: '/marketplace/profile',
    historyHref: '/marketplace/orders',
    historyLabel: 'Order history',
    recordNoun: ['order', 'orders'],
    quickActions: [
      { label: 'Track orders', href: '/marketplace/orders', icon: '📦', countKey: 'openOrders', badgeColor: 'bg-blue-500' },
      { label: 'Buy again', href: '/marketplace/buy-again', icon: '🔁' },
      { label: 'Returns & refunds', href: '/marketplace/returns', icon: '🔄' },
      { label: 'Wishlist', href: '/marketplace/wishlist', icon: '❤️' },
      { label: 'My reviews', href: '/marketplace/reviews', icon: '⭐' },
      { label: 'Delivery addresses', href: '/marketplace/addresses', icon: '📍' },
      { label: 'Payment methods', href: '/marketplace/payments', icon: '💳' },
    ],
    emptyState: {
      headline: 'No orders yet',
      hint: 'Anything you order from the marketplace shows up here, with tracking and invoices.',
      ctaLabel: 'Start shopping',
      ctaHref: '/marketplace',
    },
  },

  grocery: {
    key: 'grocery',
    label: 'Grocery',
    subtitle: 'Fresh groceries delivered',
    brandName: 'KARTSEEK Grocery',
    icon: '🥬',
    theme: THEMES.grocery,
    profileHref: '/grocery/profile',
    historyHref: '/grocery/orders',
    historyLabel: 'Order history',
    recordNoun: ['order', 'orders'],
    quickActions: [
      { label: 'Track orders', href: '/grocery/orders', icon: '🧺', countKey: 'openOrders', badgeColor: 'bg-emerald-500' },
      { label: 'Subscriptions', href: '/grocery/subscriptions', icon: '📅' },
      { label: 'Saved items', href: '/grocery/wishlist', icon: '🔖' },
      { label: 'Recently viewed', href: '/grocery/recently-viewed', icon: '👀' },
      { label: 'Coupons', href: '/grocery/coupons', icon: '🏷️' },
      { label: 'Delivery addresses', href: '/grocery/addresses', icon: '📍' },
    ],
    emptyState: {
      headline: 'No grocery orders yet',
      hint: 'Order from a store near you and your basket history, reorders and delivery slots collect here.',
      ctaLabel: 'Browse stores',
      ctaHref: '/grocery/stores',
    },
  },

  restaurant: {
    key: 'restaurant',
    label: 'Restaurant',
    subtitle: 'Food delivery & dining',
    brandName: 'KARTSEEK Food',
    icon: '🍔',
    theme: THEMES.restaurant,
    profileHref: '/restaurant/profile',
    historyHref: '/restaurant/orders',
    historyLabel: 'Order history',
    recordNoun: ['order', 'orders'],
    quickActions: [
      { label: 'Track orders', href: '/restaurant/orders', icon: '📋', countKey: 'openOrders', badgeColor: 'bg-orange-500' },
      { label: 'Favourite restaurants', href: '/restaurant/favorites', icon: '❤️' },
      { label: 'Table bookings', href: '/restaurant/table-booking', icon: '🪑' },
      { label: 'Offers for you', href: '/restaurant/offers', icon: '🎟️' },
      { label: 'Delivery addresses', href: '/restaurant/addresses', icon: '📍' },
    ],
    emptyState: {
      headline: 'No food orders yet',
      hint: 'Delivery, takeaway and dine-in orders all land here, with live tracking while they are on the way.',
      ctaLabel: 'Find a restaurant',
      ctaHref: '/restaurant/list',
    },
  },

  pharmacy: {
    key: 'pharmacy',
    label: 'Pharmacy',
    subtitle: 'Medicines & wellness',
    brandName: 'KARTSEEK Pharmacy',
    icon: '💊',
    theme: THEMES.pharmacy,
    profileHref: '/pharmacy/profile',
    historyHref: '/pharmacy/orders',
    historyLabel: 'Order history',
    recordNoun: ['order', 'orders'],
    quickActions: [
      { label: 'Track orders', href: '/pharmacy/orders', icon: '💊', countKey: 'openOrders', badgeColor: 'bg-teal-500' },
      { label: 'My prescriptions', href: '/pharmacy/prescriptions', icon: '📋', countKey: 'prescriptions' },
      { label: 'Upload a prescription', href: '/pharmacy/prescription-upload', icon: '📷' },
      { label: 'Saved medicines', href: '/pharmacy/wishlist', icon: '🔖' },
      { label: 'Favourite stores', href: '/pharmacy/favourites', icon: '❤️' },
      { label: 'Delivery addresses', href: '/pharmacy/addresses', icon: '📍' },
    ],
    emptyState: {
      headline: 'No pharmacy orders yet',
      hint: 'Order medicines or upload a prescription, and your orders and refills appear here.',
      ctaLabel: 'Find a pharmacy',
      ctaHref: '/pharmacy/stores',
    },
  },

  doctor: {
    key: 'doctor',
    label: 'Doctor',
    subtitle: 'Consultations & appointments',
    brandName: 'KARTSEEK Health',
    icon: '🩺',
    theme: THEMES.doctor,
    profileHref: '/doctor/my-profile',
    historyHref: '/doctor/my-appointments',
    historyLabel: 'Appointment history',
    recordNoun: ['appointment', 'appointments'],
    quickActions: [
      { label: 'My appointments', href: '/doctor/my-appointments', icon: '📅', countKey: 'upcomingAppointments', badgeColor: 'bg-indigo-500' },
      { label: 'My doctors', href: '/doctor/my-doctors', icon: '👨‍⚕️' },
      { label: 'Prescriptions', href: '/doctor/prescriptions', icon: '📄' },
      { label: 'Medical records', href: '/doctor/medical-records', icon: '📁' },
      { label: 'Family members', href: '/doctor/family-members', icon: '👨‍👩‍👧', countKey: 'familyMembers' },
    ],
    emptyState: {
      headline: 'No appointments yet',
      hint: 'Book a consultation and your visits, tokens and prescriptions collect here.',
      ctaLabel: 'Find a doctor',
      ctaHref: '/doctor/search',
    },
  },

  taxi: {
    key: 'taxi',
    label: 'Taxi',
    subtitle: 'Rides & rentals',
    brandName: 'KARTSEEK Rides',
    icon: '🚕',
    theme: THEMES.taxi,
    profileHref: '/taxi/profile',
    historyHref: '/taxi/rides',
    historyLabel: 'Ride history',
    recordNoun: ['ride', 'rides'],
    quickActions: [
      { label: 'Ride history', href: '/taxi/rides', icon: '🗺️', countKey: 'completedRides' },
      { label: 'Saved places', href: '/profile/addresses', icon: '📍' },
      { label: 'Rentals', href: '/taxi/rentals', icon: '🚙' },
      { label: 'Intercity trips', href: '/taxi/intercity', icon: '🛣️' },
    ],
    emptyState: {
      headline: 'No rides yet',
      hint: 'Book a ride and your trips, receipts and saved places appear here.',
      ctaLabel: 'Book a ride',
      ctaHref: '/taxi',
    },
  },

  hotel: {
    key: 'hotel',
    label: 'Hotels',
    subtitle: 'Stays & bookings',
    brandName: 'KARTSEEK Hotels',
    icon: '🏨',
    theme: THEMES.hotel,
    profileHref: '/hotel-booking/profile',
    historyHref: '/hotel-booking/my-bookings',
    historyLabel: 'Booking history',
    recordNoun: ['booking', 'bookings'],
    quickActions: [
      { label: 'My bookings', href: '/hotel-booking/my-bookings', icon: '📋', countKey: 'upcomingStays', badgeColor: 'bg-rose-500' },
      { label: 'Saved hotels', href: '/saved-hotels', icon: '❤️' },
      { label: 'Recently viewed', href: '/recent-hotels', icon: '👀' },
      { label: 'Price alerts', href: '/hotel-booking/price-alerts', icon: '🔔' },
      { label: 'Trip planner', href: '/hotel-booking/trip-planner', icon: '🧭' },
    ],
    emptyState: {
      headline: 'No stays booked yet',
      hint: 'Book a room and your reservations, vouchers and cancellation options appear here.',
      ctaLabel: 'Search hotels',
      ctaHref: '/hotel-booking',
    },
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

export const ALL_MODULES: ModuleKey[] = ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'hotel'];

export function isModuleKey(value: string | undefined | null): value is ModuleKey {
  return !!value && (ALL_MODULES as string[]).includes(value);
}

export function getModuleConfig(key: ModuleKey): ModuleProfileConfig {
  return MODULE_CONFIG[key];
}

export function getAllModuleConfigs(): ModuleProfileConfig[] {
  return ALL_MODULES.map(getModuleConfig);
}
