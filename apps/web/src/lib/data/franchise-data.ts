/**
 * Shared franchise data constants.
 *
 * Used by BOTH the Super Admin panel (/admin/franchise) and the
 * Franchise Owner dashboard (/franchise/*) to ensure data consistency.
 *
 * When a real API is wired up, these become the fallback / seed data.
 */

// ─── Module Registry ──────────────────────────────────────────────────────────

export const ALL_MODULES = [
  'Grocery',
  'Restaurant',
  'Pharmacy',
  'Marketplace',
  'Doctor',
  'Taxi',
  'Hotel Booking',
] as const;

export type FranchiseModule = (typeof ALL_MODULES)[number];

/** Lowercase version used by admin panel module toggles */
export const moduleToKey = (mod: FranchiseModule) => mod.toLowerCase();
export const keyToModule = (key: string) =>
  ALL_MODULES.find((m) => m.toLowerCase() === key.toLowerCase()) ?? key;

// ─── Package Tiers ────────────────────────────────────────────────────────────

export const PACKAGE_TIERS = ['starter', 'growth', 'premium', 'master'] as const;
export type PackageTier = (typeof PACKAGE_TIERS)[number];

export const PACKAGE_INFO: Record<PackageTier, { label: string; maxModules: number; color: string; badgeBg: string }> = {
  starter: { label: 'Starter Franchise', maxModules: 1, color: 'text-slate-700', badgeBg: 'bg-slate-100 text-slate-700' },
  growth:  { label: 'Growth Franchise',  maxModules: 3, color: 'text-teal-700',  badgeBg: 'bg-teal-100 text-teal-700' },
  premium: { label: 'Premium Franchise', maxModules: 5, color: 'text-purple-700', badgeBg: 'bg-purple-100 text-purple-700' },
  master:  { label: 'Master Franchise',  maxModules: 7, color: 'text-indigo-700', badgeBg: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
};

// ─── Demo Franchise Profile (FR-001) ──────────────────────────────────────────
// This is the franchise that the demo login creates.
// Admin panel row FR-001 must match these values.

export const DEMO_FRANCHISE = {
  id: 'FR-001',
  name: 'Mumbai South Franchise Pvt Ltd',
  owner: 'Aditya Iyer',
  email: 'franchise@kartseek.com',
  phone: '+91 98765 43210',
  region: 'Mumbai South',
  city: 'Mumbai',
  regionCode: 'IN',
  package: 'growth' as PackageTier,
  commission: '₹1.2L',
  modules: ['Grocery', 'Restaurant', 'Pharmacy'] as FranchiseModule[],
  vendors: 142,
  deliveryBoys: 85,
  zones: 8,
  joinDate: 'Jan 2025',
  bankDetails: {
    bankName: 'HDFC Bank',
    accountNumber: '****4523',
    ifsc: 'HDFC0001234',
    accountHolder: 'Aditya Iyer',
  },
};

// ─── Module Color Map ─────────────────────────────────────────────────────────

export const MODULE_COLORS: Record<string, string> = {
  Grocery:     'bg-green-100 text-green-700 border-green-200',
  Restaurant:  'bg-orange-100 text-orange-700 border-orange-200',
  Pharmacy:    'bg-cyan-100 text-cyan-700 border-cyan-200',
  Marketplace: 'bg-blue-100 text-blue-700 border-blue-200',
  Doctor:      'bg-purple-100 text-purple-700 border-purple-200',
  Taxi:           'bg-amber-100 text-amber-700 border-amber-200',
  'Hotel Booking': 'bg-rose-100 text-rose-700 border-rose-200',
};

// ─── Admin Franchise List (all franchise partners) ────────────────────────────

export type FranchiseEntry = {
  id: string;
  name: string;
  owner: string;
  phone: string;
  email: string;
  region: string;
  city: string;
  vendors: number;
  deliveryBoys: number;
  orders: number;
  revenue: string;
  commission: string;
  rating: number;
  status: 'active' | 'suspended' | 'blocked' | 'pending';
  zones: number;
  complaints: number;
  lastActive: string;
  joinDate: string;
  modules: string[];
  package: string;
};

export const FRANCHISE_LIST: FranchiseEntry[] = [
  {
    id: 'FR-001', name: 'Mumbai South Franchise Pvt Ltd', owner: 'Aditya Iyer',
    phone: '+91 98765 43210', email: 'franchise@kartseek.com', region: 'Mumbai South', city: 'Mumbai',
    vendors: 142, deliveryBoys: 85, orders: 6200, revenue: '₹31L', commission: '₹1.2L',
    rating: 4.7, status: 'active', zones: 8, complaints: 5, lastActive: 'Now', joinDate: 'Jan 2025',
    modules: ['Grocery', 'Restaurant', 'Pharmacy'], package: 'growth',
  },
  {
    id: 'FR-002', name: 'Delhi NCR Operations', owner: 'Rajan Gupta',
    phone: '+91 98765 43211', email: 'delhi@kartseek.com', region: 'Delhi NCR', city: 'Delhi',
    vendors: 310, deliveryBoys: 180, orders: 12400, revenue: '₹62L', commission: '₹3.8L',
    rating: 4.5, status: 'active', zones: 15, complaints: 12, lastActive: '5 min ago', joinDate: 'Nov 2024',
    modules: ['Marketplace', 'Grocery', 'Restaurant', 'Pharmacy', 'Taxi', 'Doctor'], package: 'master',
  },
  {
    id: 'FR-003', name: 'Bangalore Metro Group', owner: 'Sunita Rao',
    phone: '+91 98765 43212', email: 'bangalore@kartseek.com', region: 'Bangalore Metro', city: 'Bangalore',
    vendors: 220, deliveryBoys: 120, orders: 8800, revenue: '₹44L', commission: '₹2.4L',
    rating: 4.8, status: 'active', zones: 10, complaints: 3, lastActive: '10 min ago', joinDate: 'Dec 2024',
    modules: ['Grocery', 'Pharmacy'], package: 'growth',
  },
  {
    id: 'FR-004', name: 'Hyderabad City Ops', owner: 'Vikram Reddy',
    phone: '+91 98765 43213', email: 'hyderabad@kartseek.com', region: 'Hyderabad', city: 'Hyderabad',
    vendors: 95, deliveryBoys: 50, orders: 3200, revenue: '₹16L', commission: '₹0.8L',
    rating: 4.3, status: 'active', zones: 5, complaints: 8, lastActive: '1 hr ago', joinDate: 'Feb 2025',
    modules: ['Taxi'], package: 'starter',
  },
  {
    id: 'FR-005', name: 'Chennai Express Franchise', owner: 'Mohan K.',
    phone: '+91 98765 43214', email: 'chennai@kartseek.com', region: 'Chennai', city: 'Chennai',
    vendors: 110, deliveryBoys: 65, orders: 4100, revenue: '₹20L', commission: '₹1.1L',
    rating: 4.4, status: 'active', zones: 6, complaints: 6, lastActive: '30 min ago', joinDate: 'Mar 2025',
    modules: ['Restaurant', 'Grocery'], package: 'growth',
  },
  {
    id: 'FR-006', name: 'Pune West Division', owner: 'Meera Patil',
    phone: '+91 98765 43215', email: 'pune@kartseek.com', region: 'Pune West', city: 'Pune',
    vendors: 68, deliveryBoys: 35, orders: 2100, revenue: '₹10L', commission: '₹0.5L',
    rating: 3.8, status: 'suspended', zones: 4, complaints: 18, lastActive: '3 days ago', joinDate: 'Apr 2025',
    modules: ['Marketplace', 'Grocery', 'Pharmacy', 'Restaurant'], package: 'premium',
  },
  {
    id: 'FR-007', name: 'Ahmedabad Ops', owner: 'Deepak S.',
    phone: '+91 98765 43216', email: 'ahmedabad@kartseek.com', region: 'Ahmedabad', city: 'Ahmedabad',
    vendors: 0, deliveryBoys: 0, orders: 0, revenue: '₹0', commission: '₹0',
    rating: 0, status: 'pending', zones: 0, complaints: 0, lastActive: 'New', joinDate: 'May 2026',
    modules: ['Grocery'], package: 'starter',
  },
];
