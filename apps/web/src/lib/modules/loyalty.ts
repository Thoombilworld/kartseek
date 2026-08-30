/**
 * KARTSEEK Module-Aware Loyalty Engine
 *
 * Provides per-module loyalty configuration, points calculation,
 * earning rules, rewards, and mock data for every service module.
 *
 * Re-exports all types and helpers from restaurant-loyalty.ts for
 * backward compatibility and shares the same calculation engine.
 */

import {
  calculateOrderPoints,
  getTierForPoints,
  getNextTier,
  getTierProgress,
  LOYALTY_TIERS,
  type LoyaltyTier,
  type LoyaltyOrder,
  type PointsBreakdown,
  type LoyaltyProfile,
  type RedemptionEntry,
  type RedeemableReward,
} from './restaurant-loyalty';

// Re-export everything the original module exposed
export {
  calculateOrderPoints,
  getTierForPoints,
  getNextTier,
  getTierProgress,
  LOYALTY_TIERS,
  type LoyaltyTier,
  type LoyaltyOrder,
  type PointsBreakdown,
  type LoyaltyProfile,
  type RedemptionEntry,
  type RedeemableReward,
};

// ─── Module Loyalty Key ──────────────────────────────────────────────────────

export type LoyaltyModuleKey =
  | 'marketplace'
  | 'grocery'
  | 'restaurant'
  | 'pharmacy'
  | 'doctor'
  | 'taxi'
  | 'hotel';

// ─── Module Config Types ─────────────────────────────────────────────────────

export interface EarnRule {
  label: string;
  desc: string;
  icon: string;
  color: string;
}

export interface OrderTypeMeta {
  key: string;
  label: string;
  iconName: string;
  color: string;
}

export interface ModuleLoyaltyConfig {
  programName: string;
  brandName: string;
  pointsLabel: string;
  redeemTitle: string;
  gradient: string;
  accentColor: string;       // Tailwind color class stem e.g. 'rose', 'orange'
  earnRules: EarnRule[];
  orderTypes: OrderTypeMeta[];
  sellerRatingLabel: string;
  serviceRatingLabel: string;
  rewards: RedeemableReward[];
  mockOrders: LoyaltyOrder[];
  mockRedemptions: RedemptionEntry[];
}

// ─── Per-Module Configurations ───────────────────────────────────────────────

const MODULE_CONFIGS: Record<LoyaltyModuleKey, ModuleLoyaltyConfig> = {
  // ── Restaurant ──────────────────────────────────────────────────────────
  restaurant: {
    programName: 'Food Loyalty Program',
    brandName: 'KARTSEEK Food',
    pointsLabel: 'Food Points',
    redeemTitle: 'Redeem Food Rewards',
    gradient: 'from-orange-500 via-red-500 to-orange-600',
    accentColor: 'orange',
    sellerRatingLabel: 'Restaurant Rating',
    serviceRatingLabel: 'Delivery Rating',
    earnRules: [
      { label: 'Base Points', desc: '1 pt per ₹20 spent on food orders', icon: '💰', color: 'bg-amber-50 border-amber-200' },
      { label: 'Completion Bonus', desc: '+10 pts for every completed order', icon: '✅', color: 'bg-green-50 border-green-200' },
      { label: 'No-Cancellation Streak', desc: 'Milestones at 5, 10, 25, 50, 100 orders', icon: '🔥', color: 'bg-orange-50 border-orange-200' },
      { label: 'Restaurant Rating Bonus', desc: '+5–15 pts when restaurant rates you 4+ ★', icon: '⭐', color: 'bg-yellow-50 border-yellow-200' },
      { label: 'Delivery Rating Bonus', desc: '+5–10 pts when driver rates you 4+ ★', icon: '🚴', color: 'bg-blue-50 border-blue-200' },
    ],
    orderTypes: [
      { key: 'delivery', label: 'Delivery', iconName: 'Bike', color: 'text-orange-600 bg-orange-50' },
      { key: 'takeaway', label: 'Takeaway', iconName: 'ShoppingBag', color: 'text-purple-600 bg-purple-50' },
      { key: 'dine-in', label: 'Dine-in', iconName: 'Utensils', color: 'text-emerald-600 bg-emerald-50' },
      { key: 'table-booking', label: 'Table Booking', iconName: 'CalendarDays', color: 'text-blue-600 bg-blue-50' },
    ],
    rewards: [
      { id: 'rr1', title: 'Flat ₹100 Off', description: 'On any restaurant order above ₹300', pointsCost: 200, category: 'discount', icon: '🏷️', validDays: 30 },
      { id: 'rr2', title: 'Free Dessert', description: 'Add a free dessert to your next order', pointsCost: 150, category: 'freebie', icon: '🍰', validDays: 14 },
      { id: 'rr3', title: 'Free Delivery Pass', description: 'Free delivery on next 5 orders', pointsCost: 400, category: 'upgrade', icon: '🚴', validDays: 30 },
      { id: 'rr4', title: '₹50 Cashback', description: 'Instant wallet credit on next order', pointsCost: 100, category: 'cashback', icon: '💰', validDays: 7 },
      { id: 'rr5', title: 'Premium Table Upgrade', description: 'Upgrade to premium seating on dine-in', pointsCost: 300, category: 'upgrade', icon: '✨', validDays: 30 },
      { id: 'rr6', title: 'Flat ₹250 Off', description: 'On any order above ₹600', pointsCost: 500, category: 'discount', icon: '🎉', validDays: 30 },
    ],
    mockOrders: [
      { id: 'RO-4201', date: 'Today', restaurantName: 'Biryani Blues', orderTotal: 680, type: 'delivery', status: 'completed', sellerRating: 5, deliveryRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(680, 'completed', 48, 5, 5, 1.5) },
      { id: 'RO-4195', date: 'Yesterday', restaurantName: 'Burger King', orderTotal: 420, type: 'takeaway', status: 'completed', sellerRating: 4, customerRating: 4, pointsBreakdown: calculateOrderPoints(420, 'completed', 47, 4, undefined, 1.5) },
      { id: 'RO-4188', date: 'Jun 8', restaurantName: 'Sushi Kingdom', orderTotal: 1250, type: 'dine-in', status: 'completed', sellerRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(1250, 'completed', 46, 5, undefined, 1.5) },
      { id: 'RO-4170', date: 'Jun 7', restaurantName: 'Pizza Palace', orderTotal: 550, type: 'delivery', status: 'completed', sellerRating: 4, deliveryRating: 4, customerRating: 4, pointsBreakdown: calculateOrderPoints(550, 'completed', 45, 4, 4, 1.5) },
      { id: 'RO-4155', date: 'Jun 5', restaurantName: 'Arabia Bites', orderTotal: 380, type: 'delivery', status: 'completed', sellerRating: 5, deliveryRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(380, 'completed', 44, 5, 5, 1.5) },
      { id: 'RO-4140', date: 'Jun 3', restaurantName: 'The Grand Biryani House', orderTotal: 920, type: 'table-booking', status: 'completed', sellerRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(920, 'completed', 43, 5, undefined, 1.5) },
      { id: 'RO-4120', date: 'Jun 1', restaurantName: 'Healthy Cravings', orderTotal: 350, type: 'delivery', status: 'cancelled', pointsBreakdown: calculateOrderPoints(350, 'cancelled', 0) },
    ],
    mockRedemptions: [
      { id: 'RED-001', date: 'Jun 6', reward: 'Free Dessert', pointsUsed: 150, status: 'used' },
      { id: 'RED-002', date: 'May 28', reward: 'Flat ₹100 Off', pointsUsed: 200, status: 'used' },
      { id: 'RED-003', date: 'May 15', reward: '₹50 Cashback', pointsUsed: 100, status: 'used' },
    ],
  },

  // ── Hotel ───────────────────────────────────────────────────────────────
  hotel: {
    programName: 'Stay Points Program',
    brandName: 'KARTSEEK Hotels',
    pointsLabel: 'Stay Points',
    redeemTitle: 'Redeem Stay Rewards',
    gradient: 'from-rose-500 via-pink-500 to-rose-600',
    accentColor: 'rose',
    sellerRatingLabel: 'Hotel Rating',
    serviceRatingLabel: 'Service Rating',
    earnRules: [
      { label: 'Base Points', desc: '1 pt per AED 10 spent on hotel bookings', icon: '💰', color: 'bg-amber-50 border-amber-200' },
      { label: 'Stay Completion Bonus', desc: '+20 pts for every completed stay', icon: '✅', color: 'bg-green-50 border-green-200' },
      { label: 'Loyalty Streak', desc: 'Bonus at 3, 5, 10, 20, 50 stays', icon: '🔥', color: 'bg-orange-50 border-orange-200' },
      { label: 'Hotel Rating Bonus', desc: '+10–25 pts when hotel rates you 4+ ★', icon: '⭐', color: 'bg-yellow-50 border-yellow-200' },
      { label: 'Review Bonus', desc: '+15 pts for leaving a detailed review', icon: '📝', color: 'bg-blue-50 border-blue-200' },
    ],
    orderTypes: [
      { key: 'standard', label: 'Standard Stay', iconName: 'BedDouble', color: 'text-rose-600 bg-rose-50' },
      { key: 'suite', label: 'Suite Upgrade', iconName: 'Sparkles', color: 'text-purple-600 bg-purple-50' },
      { key: 'business', label: 'Business Stay', iconName: 'Briefcase', color: 'text-blue-600 bg-blue-50' },
      { key: 'family', label: 'Family Package', iconName: 'Users', color: 'text-emerald-600 bg-emerald-50' },
    ],
    rewards: [
      { id: 'hr1', title: 'Room Upgrade', description: 'Free upgrade to next room category', pointsCost: 500, category: 'upgrade', icon: '⬆️', validDays: 60 },
      { id: 'hr2', title: 'Late Checkout', description: 'Check out at 4 PM instead of 12 PM', pointsCost: 200, category: 'freebie', icon: '🕐', validDays: 30 },
      { id: 'hr3', title: 'Free Breakfast', description: 'Complimentary breakfast for 2', pointsCost: 150, category: 'freebie', icon: '🥐', validDays: 30 },
      { id: 'hr4', title: 'AED 100 Off', description: 'On any booking above AED 500', pointsCost: 300, category: 'discount', icon: '🏷️', validDays: 30 },
      { id: 'hr5', title: 'Spa Voucher', description: '60-min spa treatment at partner hotels', pointsCost: 400, category: 'freebie', icon: '🧖', validDays: 30 },
      { id: 'hr6', title: 'Free Night', description: 'One free night at any 3-star property', pointsCost: 1500, category: 'freebie', icon: '🌙', validDays: 60 },
    ],
    mockOrders: [
      { id: 'HBK-A7B3C9', date: 'Today', restaurantName: 'The Grand Palace Hotel, Dubai', orderTotal: 1035, type: 'delivery' as const, status: 'completed', sellerRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(1035, 'completed', 7, 5, undefined, 1.5) },
      { id: 'HBK-X9D2F1', date: 'Jun 12', restaurantName: 'Seaside Family Resort, Mumbai', orderTotal: 4312, type: 'delivery' as const, status: 'completed', sellerRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(4312, 'completed', 6, 5, undefined, 1.5) },
      { id: 'HBK-M4K7P3', date: 'Feb 20', restaurantName: 'Heritage Boutique Hotel, London', orderTotal: 1104, type: 'delivery' as const, status: 'completed', sellerRating: 4, customerRating: 4, pointsBreakdown: calculateOrderPoints(1104, 'completed', 5, 4, undefined, 1.5) },
      { id: 'HBK-R2N5Q8', date: 'Jan 2', restaurantName: 'KARTSEEK Business Suites, Doha', orderTotal: 1954, type: 'delivery' as const, status: 'cancelled', pointsBreakdown: calculateOrderPoints(1954, 'cancelled', 0) },
      { id: 'HBK-P6W1J4', date: 'Dec 10', restaurantName: 'Budget Inn Express, Riyadh', orderTotal: 360, type: 'delivery' as const, status: 'completed', sellerRating: 4, customerRating: 3, pointsBreakdown: calculateOrderPoints(360, 'completed', 4, 4, undefined, 1.25) },
      { id: 'HBK-T3V8K2', date: 'Nov 5', restaurantName: 'Royal Palm Resort, Muscat', orderTotal: 675, type: 'delivery' as const, status: 'completed', sellerRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(675, 'completed', 3, 5, undefined, 1.25) },
    ],
    mockRedemptions: [
      { id: 'HRED-001', date: 'Jun 1', reward: 'Late Checkout', pointsUsed: 200, status: 'used' },
      { id: 'HRED-002', date: 'May 10', reward: 'Free Breakfast for 2', pointsUsed: 150, status: 'used' },
    ],
  },

  // ── Marketplace ─────────────────────────────────────────────────────────
  marketplace: {
    programName: 'Mall Points Program',
    brandName: 'KARTSEEK Marketplace',
    pointsLabel: 'Mall Points',
    redeemTitle: 'Redeem Mall Rewards',
    gradient: 'from-blue-600 via-indigo-600 to-blue-700',
    accentColor: 'blue',
    sellerRatingLabel: 'Seller Rating',
    serviceRatingLabel: 'Delivery Rating',
    earnRules: [
      { label: 'Base Points', desc: '1 pt per ₹20 spent on purchases', icon: '💰', color: 'bg-amber-50 border-amber-200' },
      { label: 'Order Completion', desc: '+10 pts for every delivered order', icon: '✅', color: 'bg-green-50 border-green-200' },
      { label: 'Review Bonus', desc: '+10 pts for verified product reviews', icon: '📝', color: 'bg-blue-50 border-blue-200' },
      { label: 'Seller Rating Bonus', desc: '+5–15 pts when seller rates you 4+ ★', icon: '⭐', color: 'bg-yellow-50 border-yellow-200' },
      { label: 'Referral Bonus', desc: '+50 pts when a referred friend orders', icon: '👥', color: 'bg-purple-50 border-purple-200' },
    ],
    orderTypes: [
      { key: 'standard', label: 'Standard', iconName: 'ShoppingBag', color: 'text-blue-600 bg-blue-50' },
      { key: 'express', label: 'Express', iconName: 'Zap', color: 'text-amber-600 bg-amber-50' },
      { key: 'pickup', label: 'Pickup', iconName: 'MapPin', color: 'text-emerald-600 bg-emerald-50' },
    ],
    rewards: [
      { id: 'mr1', title: 'Flat ₹200 Off', description: 'On orders above ₹1,000', pointsCost: 400, category: 'discount', icon: '🏷️', validDays: 30 },
      { id: 'mr2', title: 'Free Express Delivery', description: 'Next 3 orders delivered free', pointsCost: 250, category: 'upgrade', icon: '🚀', validDays: 30 },
      { id: 'mr3', title: '₹100 Cashback', description: 'Instant wallet credit', pointsCost: 200, category: 'cashback', icon: '💰', validDays: 14 },
      { id: 'mr4', title: 'Early Access Pass', description: 'Get early access to flash sales', pointsCost: 500, category: 'upgrade', icon: '⚡', validDays: 60 },
    ],
    mockOrders: [
      { id: 'MO-4501', date: 'Today', restaurantName: 'Sony WH-1000XM5 Headphones', orderTotal: 24990, type: 'delivery' as const, status: 'completed', sellerRating: 5, deliveryRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(24990, 'completed', 25, 5, 5, 1.5) },
      { id: 'MO-4489', date: 'Jun 9', restaurantName: 'Nike Air Max 270 (Black)', orderTotal: 12995, type: 'delivery' as const, status: 'completed', sellerRating: 4, deliveryRating: 4, customerRating: 4, pointsBreakdown: calculateOrderPoints(12995, 'completed', 24, 4, 4, 1.5) },
      { id: 'MO-4472', date: 'Jun 5', restaurantName: 'Kindle Paperwhite 2024', orderTotal: 13999, type: 'delivery' as const, status: 'completed', sellerRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(13999, 'completed', 23, 5, undefined, 1.5) },
      { id: 'MO-4460', date: 'Jun 1', restaurantName: 'Instant Pot Duo 7-in-1', orderTotal: 8499, type: 'delivery' as const, status: 'completed', sellerRating: 4, deliveryRating: 5, customerRating: 4, pointsBreakdown: calculateOrderPoints(8499, 'completed', 22, 4, 5, 1.5) },
    ],
    mockRedemptions: [
      { id: 'MRED-001', date: 'Jun 4', reward: 'Flat ₹200 Off', pointsUsed: 400, status: 'used' },
      { id: 'MRED-002', date: 'May 20', reward: '₹100 Cashback', pointsUsed: 200, status: 'used' },
    ],
  },

  // ── Grocery ─────────────────────────────────────────────────────────────
  grocery: {
    programName: 'Fresh Points Program',
    brandName: 'KARTSEEK Grocery',
    pointsLabel: 'Fresh Points',
    redeemTitle: 'Redeem Fresh Rewards',
    gradient: 'from-emerald-500 via-green-600 to-emerald-700',
    accentColor: 'emerald',
    sellerRatingLabel: 'Store Rating',
    serviceRatingLabel: 'Delivery Rating',
    earnRules: [
      { label: 'Base Points', desc: '1 pt per ₹15 spent on groceries', icon: '💰', color: 'bg-amber-50 border-amber-200' },
      { label: 'Order Completion', desc: '+5 pts for every completed basket', icon: '✅', color: 'bg-green-50 border-green-200' },
      { label: 'Weekly Streak', desc: 'Bonus for ordering every week', icon: '🔥', color: 'bg-orange-50 border-orange-200' },
      { label: 'Organic Bonus', desc: '+2 pts per organic item purchased', icon: '🌿', color: 'bg-lime-50 border-lime-200' },
    ],
    orderTypes: [
      { key: 'express', label: 'Express 30min', iconName: 'Zap', color: 'text-amber-600 bg-amber-50' },
      { key: 'scheduled', label: 'Scheduled', iconName: 'CalendarDays', color: 'text-blue-600 bg-blue-50' },
      { key: 'standard', label: 'Standard', iconName: 'ShoppingBag', color: 'text-emerald-600 bg-emerald-50' },
    ],
    rewards: [
      { id: 'gr1', title: 'Free Delivery', description: 'On next 5 grocery orders', pointsCost: 200, category: 'upgrade', icon: '🚚', validDays: 30 },
      { id: 'gr2', title: 'Flat ₹75 Off', description: 'On baskets above ₹500', pointsCost: 150, category: 'discount', icon: '🏷️', validDays: 14 },
      { id: 'gr3', title: 'Free Organic Box', description: 'Mixed seasonal organic vegetables', pointsCost: 300, category: 'freebie', icon: '🥬', validDays: 14 },
      { id: 'gr4', title: '₹50 Cashback', description: 'Wallet credit on next order', pointsCost: 100, category: 'cashback', icon: '💰', validDays: 7 },
    ],
    mockOrders: [
      { id: 'GO-1105', date: 'Today', restaurantName: 'Weekly Essentials Order', orderTotal: 2340, type: 'delivery' as const, status: 'completed', sellerRating: 5, deliveryRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(2340, 'completed', 18, 5, 5, 1.25) },
      { id: 'GO-1098', date: 'Yesterday', restaurantName: 'Fruits & Dairy Top-up', orderTotal: 680, type: 'delivery' as const, status: 'completed', sellerRating: 4, deliveryRating: 4, customerRating: 4, pointsBreakdown: calculateOrderPoints(680, 'completed', 17, 4, 4, 1.25) },
      { id: 'GO-1090', date: 'Jun 7', restaurantName: 'Monthly Pantry Stock', orderTotal: 5470, type: 'delivery' as const, status: 'completed', sellerRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(5470, 'completed', 16, 5, undefined, 1.25) },
    ],
    mockRedemptions: [
      { id: 'GRED-001', date: 'Jun 2', reward: '₹50 Cashback', pointsUsed: 100, status: 'used' },
    ],
  },

  // ── Pharmacy ────────────────────────────────────────────────────────────
  pharmacy: {
    programName: 'Health Points Program',
    brandName: 'KARTSEEK Pharmacy',
    pointsLabel: 'Health Points',
    redeemTitle: 'Redeem Health Rewards',
    gradient: 'from-teal-500 via-teal-600 to-cyan-600',
    accentColor: 'teal',
    sellerRatingLabel: 'Pharmacy Rating',
    serviceRatingLabel: 'Delivery Rating',
    earnRules: [
      { label: 'Base Points', desc: '1 pt per ₹25 spent on medicines', icon: '💰', color: 'bg-amber-50 border-amber-200' },
      { label: 'Order Completion', desc: '+10 pts per delivered order', icon: '✅', color: 'bg-green-50 border-green-200' },
      { label: 'Prescription Upload', desc: '+5 pts for uploading a valid prescription', icon: '📋', color: 'bg-cyan-50 border-cyan-200' },
      { label: 'Auto-Refill Bonus', desc: '+10 pts per auto-refill delivery', icon: '🔄', color: 'bg-blue-50 border-blue-200' },
    ],
    orderTypes: [
      { key: 'delivery', label: 'Home Delivery', iconName: 'Truck', color: 'text-teal-600 bg-teal-50' },
      { key: 'express', label: 'Express 1hr', iconName: 'Zap', color: 'text-amber-600 bg-amber-50' },
      { key: 'refill', label: 'Auto-Refill', iconName: 'RotateCcw', color: 'text-blue-600 bg-blue-50' },
    ],
    rewards: [
      { id: 'pr1', title: 'Free Health Checkup', description: 'Basic health screening at partner clinics', pointsCost: 500, category: 'freebie', icon: '🩺', validDays: 60 },
      { id: 'pr2', title: 'Flat ₹100 Off', description: 'On pharmacy orders above ₹400', pointsCost: 200, category: 'discount', icon: '🏷️', validDays: 30 },
      { id: 'pr3', title: 'Free Delivery', description: 'Next 3 pharmacy orders', pointsCost: 150, category: 'upgrade', icon: '🚚', validDays: 30 },
      { id: 'pr4', title: 'Vitamin Pack', description: 'Free monthly vitamin supplement box', pointsCost: 300, category: 'freebie', icon: '💊', validDays: 14 },
    ],
    mockOrders: [
      { id: 'PH-0335', date: 'Jun 10', restaurantName: 'Monthly Vitamins & Supplements', orderTotal: 1890, type: 'delivery' as const, status: 'completed', sellerRating: 5, deliveryRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(1890, 'completed', 8, 5, 5, 1.0) },
      { id: 'PH-0328', date: 'Jun 3', restaurantName: 'Prescription Refill — Dr. Sharma', orderTotal: 640, type: 'delivery' as const, status: 'completed', sellerRating: 4, customerRating: 4, pointsBreakdown: calculateOrderPoints(640, 'completed', 7, 4, undefined, 1.0) },
      { id: 'PH-0320', date: 'May 28', restaurantName: 'First Aid Kit Essentials', orderTotal: 1250, type: 'delivery' as const, status: 'completed', sellerRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(1250, 'completed', 6, 5, undefined, 1.0) },
    ],
    mockRedemptions: [
      { id: 'PRED-001', date: 'May 15', reward: 'Free Delivery', pointsUsed: 150, status: 'used' },
    ],
  },

  // ── Doctor ──────────────────────────────────────────────────────────────
  doctor: {
    programName: 'Wellness Points Program',
    brandName: 'KARTSEEK Health',
    pointsLabel: 'Wellness Points',
    redeemTitle: 'Redeem Wellness Rewards',
    gradient: 'from-indigo-500 via-violet-600 to-indigo-700',
    accentColor: 'indigo',
    sellerRatingLabel: 'Doctor Rating',
    serviceRatingLabel: 'Clinic Rating',
    earnRules: [
      { label: 'Base Points', desc: '1 pt per ₹30 spent on consultations', icon: '💰', color: 'bg-amber-50 border-amber-200' },
      { label: 'Consultation Bonus', desc: '+15 pts per completed consultation', icon: '✅', color: 'bg-green-50 border-green-200' },
      { label: 'Review Bonus', desc: '+10 pts for reviewing your doctor', icon: '📝', color: 'bg-blue-50 border-blue-200' },
      { label: 'Follow-up Loyalty', desc: '+20 pts for follow-up appointments', icon: '🔄', color: 'bg-purple-50 border-purple-200' },
    ],
    orderTypes: [
      { key: 'video', label: 'Video Consult', iconName: 'Video', color: 'text-indigo-600 bg-indigo-50' },
      { key: 'in-clinic', label: 'In-Clinic', iconName: 'Building', color: 'text-violet-600 bg-violet-50' },
      { key: 'follow-up', label: 'Follow-up', iconName: 'RotateCcw', color: 'text-blue-600 bg-blue-50' },
    ],
    rewards: [
      { id: 'dr1', title: 'Free Follow-up', description: 'One free follow-up consultation', pointsCost: 300, category: 'freebie', icon: '🩺', validDays: 60 },
      { id: 'dr2', title: '₹200 Off Consult', description: 'Any specialist consultation', pointsCost: 400, category: 'discount', icon: '🏷️', validDays: 30 },
      { id: 'dr3', title: 'Health Report', description: 'Comprehensive health report free', pointsCost: 500, category: 'freebie', icon: '📋', validDays: 60 },
      { id: 'dr4', title: '₹100 Cashback', description: 'On your next appointment', pointsCost: 200, category: 'cashback', icon: '💰', validDays: 14 },
    ],
    mockOrders: [
      { id: 'DC-0182', date: 'Today', restaurantName: 'Dr. Priya Mehta — Dermatology', orderTotal: 800, type: 'delivery' as const, status: 'completed', sellerRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(800, 'completed', 8, 5, undefined, 1.0) },
      { id: 'DC-0175', date: 'Jun 8', restaurantName: 'Dr. Raj Patel — General Medicine', orderTotal: 500, type: 'delivery' as const, status: 'completed', sellerRating: 4, customerRating: 4, pointsBreakdown: calculateOrderPoints(500, 'completed', 7, 4, undefined, 1.0) },
      { id: 'DC-0168', date: 'May 30', restaurantName: 'Dr. Ananya Gupta — Dentistry', orderTotal: 1200, type: 'delivery' as const, status: 'completed', sellerRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(1200, 'completed', 6, 5, undefined, 1.0) },
    ],
    mockRedemptions: [
      { id: 'DRED-001', date: 'May 20', reward: '₹100 Cashback', pointsUsed: 200, status: 'used' },
    ],
  },

  // ── Taxi ─────────────────────────────────────────────────────────────────
  taxi: {
    programName: 'Ride Points Program',
    brandName: 'KARTSEEK Rides',
    pointsLabel: 'Ride Points',
    redeemTitle: 'Redeem Ride Rewards',
    gradient: 'from-yellow-500 via-amber-500 to-yellow-600',
    accentColor: 'amber',
    sellerRatingLabel: 'Driver Rating',
    serviceRatingLabel: 'Vehicle Rating',
    earnRules: [
      { label: 'Base Points', desc: '1 pt per ₹15 spent on rides', icon: '💰', color: 'bg-amber-50 border-amber-200' },
      { label: 'Ride Completion', desc: '+5 pts for every completed ride', icon: '✅', color: 'bg-green-50 border-green-200' },
      { label: 'Rating Bonus', desc: '+5–15 pts when you rate driver 4+ ★', icon: '⭐', color: 'bg-yellow-50 border-yellow-200' },
      { label: 'Peak Hour Bonus', desc: '2x points during off-peak hours', icon: '🕐', color: 'bg-blue-50 border-blue-200' },
      { label: 'Referral Bonus', desc: '+100 pts per referred rider', icon: '👥', color: 'bg-purple-50 border-purple-200' },
    ],
    orderTypes: [
      { key: 'go', label: 'KARTSEEK Go', iconName: 'Car', color: 'text-yellow-700 bg-yellow-50' },
      { key: 'premier', label: 'Premier', iconName: 'Crown', color: 'text-purple-600 bg-purple-50' },
      { key: 'outstation', label: 'Outstation', iconName: 'MapPin', color: 'text-emerald-600 bg-emerald-50' },
      { key: 'rental', label: 'Rental', iconName: 'Clock', color: 'text-blue-600 bg-blue-50' },
    ],
    rewards: [
      { id: 'tr1', title: 'Free Short Ride', description: 'Up to ₹150 — city rides only', pointsCost: 300, category: 'freebie', icon: '🚗', validDays: 14 },
      { id: 'tr2', title: 'Flat ₹50 Off', description: 'On any ride above ₹200', pointsCost: 100, category: 'discount', icon: '🏷️', validDays: 7 },
      { id: 'tr3', title: 'Premier Upgrade', description: 'Next 3 rides upgraded to Premier', pointsCost: 400, category: 'upgrade', icon: '✨', validDays: 30 },
      { id: 'tr4', title: '₹200 Cashback', description: 'On outstation bookings', pointsCost: 500, category: 'cashback', icon: '💰', validDays: 30 },
    ],
    mockOrders: [
      { id: 'TR-8921', date: 'Today', restaurantName: 'Home → Office (Sector 14)', orderTotal: 285, type: 'delivery' as const, status: 'completed', sellerRating: 5, deliveryRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(285, 'completed', 42, 5, 5, 1.5) },
      { id: 'TR-8915', date: 'Jun 9', restaurantName: 'Airport Drop — Terminal 3', orderTotal: 1120, type: 'delivery' as const, status: 'completed', sellerRating: 5, deliveryRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(1120, 'completed', 41, 5, 5, 1.5) },
      { id: 'TR-8908', date: 'Jun 8', restaurantName: 'Mall → Home (Ambience Mall)', orderTotal: 195, type: 'delivery' as const, status: 'completed', sellerRating: 4, deliveryRating: 4, customerRating: 4, pointsBreakdown: calculateOrderPoints(195, 'completed', 40, 4, 4, 1.5) },
      { id: 'TR-8895', date: 'Jun 5', restaurantName: 'Intercity — Delhi → Agra', orderTotal: 3500, type: 'delivery' as const, status: 'completed', sellerRating: 5, deliveryRating: 5, customerRating: 5, pointsBreakdown: calculateOrderPoints(3500, 'completed', 39, 5, 5, 1.5) },
    ],
    mockRedemptions: [
      { id: 'TRED-001', date: 'Jun 3', reward: 'Flat ₹50 Off', pointsUsed: 100, status: 'used' },
      { id: 'TRED-002', date: 'May 25', reward: 'Free Short Ride', pointsUsed: 300, status: 'used' },
    ],
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getModuleLoyaltyConfig(moduleKey: LoyaltyModuleKey): ModuleLoyaltyConfig {
  return MODULE_CONFIGS[moduleKey] || MODULE_CONFIGS.restaurant;
}

/**
 * Build a complete loyalty profile for a given module.
 */
export function buildModuleLoyaltyProfile(moduleKey: LoyaltyModuleKey): LoyaltyProfile & { config: ModuleLoyaltyConfig } {
  const config = getModuleLoyaltyConfig(moduleKey);
  const orders = config.mockOrders;
  const redemptions = config.mockRedemptions;

  const completedOrders = orders.filter(o => o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled' || o.status === 'refunded');

  const earnedPoints = completedOrders.reduce((sum, o) => sum + o.pointsBreakdown.total, 0);
  const redeemedPoints = redemptions.reduce((sum, r) => sum + r.pointsUsed, 0);
  const totalPoints = earnedPoints - redeemedPoints;
  const lifetimePoints = earnedPoints;

  const currentTier = getTierForPoints(totalPoints);
  const nextTier = getNextTier(currentTier);
  const tierProgress = getTierProgress(totalPoints, currentTier, nextTier);

  let currentStreak = 0;
  for (const order of orders) {
    if (order.status === 'completed') currentStreak++;
    else break;
  }

  const ratedBySeller = completedOrders.filter(o => o.sellerRating);
  const ratedByDriver = completedOrders.filter(o => o.deliveryRating);
  const avgSellerRating = ratedBySeller.length > 0
    ? ratedBySeller.reduce((s, o) => s + (o.sellerRating || 0), 0) / ratedBySeller.length
    : 0;
  const avgDeliveryRating = ratedByDriver.length > 0
    ? ratedByDriver.reduce((s, o) => s + (o.deliveryRating || 0), 0) / ratedByDriver.length
    : 0;

  return {
    config,
    totalPoints,
    lifetimePoints,
    redeemedPoints,
    currentTier,
    nextTier,
    tierProgress,
    completedOrders: completedOrders.length,
    cancellationRate: orders.length > 0
      ? Math.round((cancelledOrders.length / orders.length) * 100)
      : 0,
    currentStreak,
    avgSellerRating: Math.round(avgSellerRating * 10) / 10,
    avgDeliveryRating: Math.round(avgDeliveryRating * 10) / 10,
    orderHistory: orders,
    redemptionHistory: redemptions,
  };
}

export const ALL_LOYALTY_MODULES: LoyaltyModuleKey[] = [
  'marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'hotel',
];
