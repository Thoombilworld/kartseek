/// KARTSEEK — Module Page Titles Configuration
/// Centralized, admin-configurable page titles for all 7 customer-facing modules.
/// Used by module layouts for dynamic <title> tags and by the admin settings panel.

export type ModuleKey = 'marketplace' | 'grocery' | 'restaurant' | 'pharmacy' | 'doctor' | 'hotel-booking' | 'taxi';

export interface ModuleTitleConfig {
  key: ModuleKey;
  label: string;
  icon: string;
  pageTitle: string;
  metaDescription: string;
  ogTitle: string;
  titleTemplate: string;
  keywords: string[];
}

// ── Default Titles ──────────────────────────────────────────────────────────
// These are used as fallback when no admin override exists.

const DEFAULT_MODULE_TITLES: Record<ModuleKey, ModuleTitleConfig> = {
  marketplace: {
    key: 'marketplace',
    label: 'Marketplace',
    icon: '🛒',
    pageTitle: 'Online Marketplace — Shop Electronics, Fashion, Home & More',
    metaDescription: 'Shop from thousands of verified sellers on KARTSEEK Marketplace. Electronics, fashion, home & kitchen, beauty, and more with fast delivery and secure payments.',
    ogTitle: 'KARTSEEK Marketplace — Shop Online',
    titleTemplate: '%s | KARTSEEK Marketplace',
    keywords: ['online shopping', 'marketplace', 'buy online', 'best prices', 'KARTSEEK'],
  },
  grocery: {
    key: 'grocery',
    label: 'Grocery',
    icon: '🥬',
    pageTitle: 'Fresh Groceries Delivered in Minutes',
    metaDescription: 'Order fresh groceries, fruits, vegetables, meat, dairy, and household essentials from local stores. Same-day delivery with live order tracking.',
    ogTitle: 'KARTSEEK Grocery — Fresh Groceries Delivered',
    titleTemplate: '%s | KARTSEEK Grocery',
    keywords: ['grocery delivery', 'online grocery', 'fresh vegetables', 'fruit delivery', 'KARTSEEK'],
  },
  restaurant: {
    key: 'restaurant',
    label: 'Food Delivery',
    icon: '🍽️',
    pageTitle: 'Food Delivery & Restaurant Ordering',
    metaDescription: 'Order food from the best restaurants near you. Delivery, takeaway, and dine-in options. Browse menus, read reviews, and track your order in real-time.',
    ogTitle: 'KARTSEEK Food — Order from Top Restaurants',
    titleTemplate: '%s | KARTSEEK Food',
    keywords: ['food delivery', 'restaurant', 'order food', 'dine-in', 'takeaway', 'KARTSEEK'],
  },
  pharmacy: {
    key: 'pharmacy',
    label: 'Pharmacy',
    icon: '💊',
    pageTitle: 'Online Pharmacy — Medicine Delivery & Prescriptions',
    metaDescription: 'Order medicines online with prescription upload. Verified pharmacies, fast delivery, OTC medicines, health products, and wellness essentials.',
    ogTitle: 'KARTSEEK Pharmacy — Medicine Delivery',
    titleTemplate: '%s | KARTSEEK Pharmacy',
    keywords: ['online pharmacy', 'medicine delivery', 'prescription upload', 'health products', 'KARTSEEK'],
  },
  doctor: {
    key: 'doctor',
    label: 'Doctor Appointments',
    icon: '🩺',
    pageTitle: 'Book Doctor Appointments — Online Consultations',
    metaDescription: 'Book doctor appointments online. Browse specialists, read patient reviews, and schedule in-person or video consultations across 30+ specialities.',
    ogTitle: 'KARTSEEK Health — Book Doctor Appointments',
    titleTemplate: '%s | KARTSEEK Health',
    keywords: ['doctor appointment', 'online consultation', 'specialist', 'book doctor', 'KARTSEEK'],
  },
  'hotel-booking': {
    key: 'hotel-booking',
    label: 'Hotel Booking',
    icon: '🏨',
    pageTitle: 'Hotel Booking — Find & Book the Best Stays',
    metaDescription: 'Discover and book hotels, resorts, and vacation stays at the best prices. Compare rooms, read reviews, and enjoy exclusive deals on KARTSEEK.',
    ogTitle: 'KARTSEEK Hotels — Book Your Stay',
    titleTemplate: '%s | KARTSEEK Hotels',
    keywords: ['hotel booking', 'book hotel', 'resort', 'vacation stay', 'best hotel deals', 'KARTSEEK'],
  },
  taxi: {
    key: 'taxi',
    label: 'Taxi Booking',
    icon: '🚕',
    pageTitle: 'Taxi Booking — Book a Ride Instantly',
    metaDescription: 'Book a taxi with transparent pricing, verified drivers, and real-time tracking. Economy, premium, SUV, and bike rides available 24/7.',
    ogTitle: 'KARTSEEK Rides — Book a Taxi',
    titleTemplate: '%s | KARTSEEK Rides',
    keywords: ['taxi booking', 'ride booking', 'cab', 'airport transfer', 'KARTSEEK'],
  },
};

// ── localStorage key for admin overrides ─────────────────────────────────

const STORAGE_KEY = 'kartseek_module_titles';

// ── Get/Set Functions ───────────────────────────────────────────────────────

export function getModuleTitleConfig(moduleKey: ModuleKey): ModuleTitleConfig {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const overrides: Record<string, Partial<ModuleTitleConfig>> = JSON.parse(stored);
        if (overrides[moduleKey]) {
          return { ...DEFAULT_MODULE_TITLES[moduleKey], ...overrides[moduleKey] };
        }
      }
    } catch {
      // Fallback to defaults
    }
  }
  return DEFAULT_MODULE_TITLES[moduleKey];
}

export function getAllModuleTitleConfigs(): ModuleTitleConfig[] {
  const modules = Object.values(DEFAULT_MODULE_TITLES);
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const overrides: Record<string, Partial<ModuleTitleConfig>> = JSON.parse(stored);
        return modules.map(m => overrides[m.key] ? { ...m, ...overrides[m.key] } : m);
      }
    } catch {
      // Fallback
    }
  }
  return modules;
}

export function saveModuleTitleConfig(moduleKey: ModuleKey, config: Partial<ModuleTitleConfig>): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const overrides: Record<string, Partial<ModuleTitleConfig>> = stored ? JSON.parse(stored) : {};
    overrides[moduleKey] = { ...overrides[moduleKey], ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore
  }
}

export function saveAllModuleTitleConfigs(configs: ModuleTitleConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    const overrides: Record<string, Partial<ModuleTitleConfig>> = {};
    configs.forEach(c => { overrides[c.key] = c; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore
  }
}

export function resetModuleTitleConfig(moduleKey: ModuleKey): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const overrides: Record<string, Partial<ModuleTitleConfig>> = JSON.parse(stored);
      delete overrides[moduleKey];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch {
    // Ignore
  }
}

export function getDefaultConfig(moduleKey: ModuleKey): ModuleTitleConfig {
  return DEFAULT_MODULE_TITLES[moduleKey];
}

export const MODULE_KEYS: ModuleKey[] = ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'hotel-booking', 'taxi'];
