/**
 * KARTSEEK Restaurant Loyalty Program Engine
 *
 * Automatically calculates loyalty points based on:
 *  1. Order total (base points)
 *  2. Order completion bonus
 *  3. No-cancellation streak bonus
 *  4. Seller rating bonus
 *  5. Delivery partner rating bonus
 *  6. Tier multiplier
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LoyaltyTier {
  name: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  min: number;
  max: number;
  multiplier: number;
  icon: string;
  color: string;
  perks: string[];
}

export interface LoyaltyOrder {
  id: string;
  date: string;
  restaurantName: string;
  orderTotal: number;
  type: 'delivery' | 'takeaway' | 'dine-in' | 'table-booking';
  status: 'completed' | 'cancelled' | 'refunded';
  sellerRating?: number;      // 1–5 rating given by the restaurant to the customer
  deliveryRating?: number;    // 1–5 rating given by the delivery partner
  customerRating?: number;    // 1–5 rating given by the customer
  pointsBreakdown: PointsBreakdown;
}

export interface PointsBreakdown {
  base: number;
  completionBonus: number;
  streakBonus: number;
  sellerRatingBonus: number;
  deliveryRatingBonus: number;
  tierMultiplierBonus: number;
  total: number;
}

export interface LoyaltyProfile {
  totalPoints: number;
  lifetimePoints: number;
  redeemedPoints: number;
  currentTier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  tierProgress: number;
  completedOrders: number;
  cancellationRate: number;
  currentStreak: number;
  avgSellerRating: number;
  avgDeliveryRating: number;
  orderHistory: LoyaltyOrder[];
  redemptionHistory: RedemptionEntry[];
}

export interface RedemptionEntry {
  id: string;
  date: string;
  reward: string;
  pointsUsed: number;
  status: 'active' | 'used' | 'expired';
}

export interface RedeemableReward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: 'discount' | 'freebie' | 'upgrade' | 'cashback';
  icon: string;
  validDays: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    name: 'Bronze', min: 0, max: 499, multiplier: 1.0, icon: '🥉',
    color: 'from-amber-700 to-amber-800',
    perks: ['1 pt per ₹20 spent', 'Basic earning rate'],
  },
  {
    name: 'Silver', min: 500, max: 1499, multiplier: 1.25, icon: '🥈',
    color: 'from-slate-400 to-slate-500',
    perks: ['1.25x point multiplier', 'Birthday bonus 50 pts', 'Priority support'],
  },
  {
    name: 'Gold', min: 1500, max: 4999, multiplier: 1.5, icon: '🥇',
    color: 'from-amber-400 to-yellow-500',
    perks: ['1.5x point multiplier', 'Free delivery on 2 orders/week', 'Exclusive deals'],
  },
  {
    name: 'Platinum', min: 5000, max: 14999, multiplier: 2.0, icon: '💎',
    color: 'from-violet-500 to-indigo-600',
    perks: ['2x point multiplier', 'Free dessert every order', 'VIP table booking'],
  },
  {
    name: 'Diamond', min: 15000, max: 999999, multiplier: 3.0, icon: '👑',
    color: 'from-rose-500 to-pink-600',
    perks: ['3x point multiplier', 'Personal concierge', 'All perks unlocked'],
  },
];

export const REDEEMABLE_REWARDS: RedeemableReward[] = [
  { id: 'rr1', title: 'Flat ₹100 Off', description: 'On any restaurant order above ₹300', pointsCost: 200, category: 'discount', icon: '🏷️', validDays: 30 },
  { id: 'rr2', title: 'Free Dessert', description: 'Add a free dessert to your next order', pointsCost: 150, category: 'freebie', icon: '🍰', validDays: 14 },
  { id: 'rr3', title: 'Free Delivery Pass', description: 'Free delivery on next 5 orders', pointsCost: 400, category: 'upgrade', icon: '🚴', validDays: 30 },
  { id: 'rr4', title: '₹50 Cashback', description: 'Instant wallet credit on next order', pointsCost: 100, category: 'cashback', icon: '💰', validDays: 7 },
  { id: 'rr5', title: 'Premium Table Upgrade', description: 'Upgrade to premium seating on dine-in', pointsCost: 300, category: 'upgrade', icon: '✨', validDays: 30 },
  { id: 'rr6', title: 'Flat ₹250 Off', description: 'On any order above ₹600', pointsCost: 500, category: 'discount', icon: '🎉', validDays: 30 },
  { id: 'rr7', title: '₹500 Cashback', description: 'Wallet credit — no minimum order', pointsCost: 1000, category: 'cashback', icon: '🤑', validDays: 30 },
  { id: 'rr8', title: 'Chef\'s Special Dish', description: 'Unlock the secret chef\'s special at any restaurant', pointsCost: 750, category: 'freebie', icon: '👨‍🍳', validDays: 14 },
];

// ─── Calculation Engine ─────────────────────────────────────────────────────────

const BASE_RATE = 1; // 1 point per ₹20 spent
const BASE_DIVISOR = 20;
const COMPLETION_BONUS = 10;
const STREAK_MILESTONES = [5, 10, 25, 50, 100];
const STREAK_BONUSES = [15, 30, 75, 150, 500];

/**
 * Calculate loyalty points for a single completed restaurant order.
 */
export function calculateOrderPoints(
  orderTotal: number,
  orderStatus: 'completed' | 'cancelled' | 'refunded',
  currentStreak: number,
  sellerRating?: number,
  deliveryRating?: number,
  tierMultiplier: number = 1.0,
): PointsBreakdown {
  // No points for cancelled/refunded orders
  if (orderStatus !== 'completed') {
    return { base: 0, completionBonus: 0, streakBonus: 0, sellerRatingBonus: 0, deliveryRatingBonus: 0, tierMultiplierBonus: 0, total: 0 };
  }

  // 1. Base points: 1 pt per ₹20 spent
  const base = Math.floor(orderTotal / BASE_DIVISOR) * BASE_RATE;

  // 2. Completion bonus: flat 10 pts for each completed order
  const completionBonus = COMPLETION_BONUS;

  // 3. Streak bonus: milestone rewards for consecutive completions
  let streakBonus = 0;
  for (let i = 0; i < STREAK_MILESTONES.length; i++) {
    if (currentStreak === STREAK_MILESTONES[i]) {
      streakBonus = STREAK_BONUSES[i];
      break;
    }
  }

  // 4. Seller rating bonus: +5–15 pts if seller rates customer 4+ stars
  let sellerRatingBonus = 0;
  if (sellerRating && sellerRating >= 4) {
    sellerRatingBonus = sellerRating === 5 ? 15 : 5;
  }

  // 5. Delivery rating bonus: +5–10 pts if driver rates customer 4+ stars
  let deliveryRatingBonus = 0;
  if (deliveryRating && deliveryRating >= 4) {
    deliveryRatingBonus = deliveryRating === 5 ? 10 : 5;
  }

  // 6. Tier multiplier on subtotal
  const subtotal = base + completionBonus + streakBonus + sellerRatingBonus + deliveryRatingBonus;
  const tierMultiplierBonus = Math.round(subtotal * (tierMultiplier - 1));

  const total = subtotal + tierMultiplierBonus;

  return { base, completionBonus, streakBonus, sellerRatingBonus, deliveryRatingBonus, tierMultiplierBonus, total };
}

/**
 * Get the tier for a given point total.
 */
export function getTierForPoints(points: number): LoyaltyTier {
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (points >= LOYALTY_TIERS[i].min) return LOYALTY_TIERS[i];
  }
  return LOYALTY_TIERS[0];
}

/**
 * Get the next tier above the current one, or null if at max.
 */
export function getNextTier(currentTier: LoyaltyTier): LoyaltyTier | null {
  const idx = LOYALTY_TIERS.findIndex(t => t.name === currentTier.name);
  return idx < LOYALTY_TIERS.length - 1 ? LOYALTY_TIERS[idx + 1] : null;
}

/**
 * Calculate tier progress percentage toward the next tier.
 */
export function getTierProgress(points: number, current: LoyaltyTier, next: LoyaltyTier | null): number {
  if (!next) return 100;
  return Math.min(100, Math.round(((points - current.min) / (next.min - current.min)) * 100));
}

// ─── Mock User Loyalty Data ─────────────────────────────────────────────────────

export const MOCK_LOYALTY_ORDERS: LoyaltyOrder[] = [
  {
    id: 'RO-4201', date: 'Today', restaurantName: 'Biryani Blues', orderTotal: 680,
    type: 'delivery', status: 'completed', sellerRating: 5, deliveryRating: 5, customerRating: 5,
    pointsBreakdown: calculateOrderPoints(680, 'completed', 48, 5, 5, 1.5),
  },
  {
    id: 'RO-4195', date: 'Yesterday', restaurantName: 'Burger King', orderTotal: 420,
    type: 'takeaway', status: 'completed', sellerRating: 4, customerRating: 4,
    pointsBreakdown: calculateOrderPoints(420, 'completed', 47, 4, undefined, 1.5),
  },
  {
    id: 'RO-4188', date: 'Jun 8', restaurantName: 'Sushi Kingdom', orderTotal: 1250,
    type: 'dine-in', status: 'completed', sellerRating: 5, customerRating: 5,
    pointsBreakdown: calculateOrderPoints(1250, 'completed', 46, 5, undefined, 1.5),
  },
  {
    id: 'RO-4170', date: 'Jun 7', restaurantName: 'Pizza Palace', orderTotal: 550,
    type: 'delivery', status: 'completed', sellerRating: 4, deliveryRating: 4, customerRating: 4,
    pointsBreakdown: calculateOrderPoints(550, 'completed', 45, 4, 4, 1.5),
  },
  {
    id: 'RO-4155', date: 'Jun 5', restaurantName: 'Arabia Bites', orderTotal: 380,
    type: 'delivery', status: 'completed', sellerRating: 5, deliveryRating: 5, customerRating: 5,
    pointsBreakdown: calculateOrderPoints(380, 'completed', 44, 5, 5, 1.5),
  },
  {
    id: 'RO-4140', date: 'Jun 3', restaurantName: 'The Grand Biryani House', orderTotal: 920,
    type: 'table-booking', status: 'completed', sellerRating: 5, customerRating: 5,
    pointsBreakdown: calculateOrderPoints(920, 'completed', 43, 5, undefined, 1.5),
  },
  {
    id: 'RO-4120', date: 'Jun 1', restaurantName: 'Healthy Cravings', orderTotal: 350,
    type: 'delivery', status: 'cancelled',
    pointsBreakdown: calculateOrderPoints(350, 'cancelled', 0),
  },
  {
    id: 'RO-4100', date: 'May 30', restaurantName: "Domino's Pizza", orderTotal: 490,
    type: 'delivery', status: 'completed', sellerRating: 4, deliveryRating: 4, customerRating: 3,
    pointsBreakdown: calculateOrderPoints(490, 'completed', 42, 4, 4, 1.5),
  },
];

export const MOCK_REDEMPTION_HISTORY: RedemptionEntry[] = [
  { id: 'RED-001', date: 'Jun 6', reward: 'Free Dessert', pointsUsed: 150, status: 'used' },
  { id: 'RED-002', date: 'May 28', reward: 'Flat ₹100 Off', pointsUsed: 200, status: 'used' },
  { id: 'RED-003', date: 'May 15', reward: '₹50 Cashback', pointsUsed: 100, status: 'used' },
];

/**
 * Build the complete loyalty profile for the current user.
 */
export function buildLoyaltyProfile(): LoyaltyProfile {
  const completedOrders = MOCK_LOYALTY_ORDERS.filter(o => o.status === 'completed');
  const cancelledOrders = MOCK_LOYALTY_ORDERS.filter(o => o.status === 'cancelled' || o.status === 'refunded');

  const earnedPoints = completedOrders.reduce((sum, o) => sum + o.pointsBreakdown.total, 0);
  const redeemedPoints = MOCK_REDEMPTION_HISTORY.reduce((sum, r) => sum + r.pointsUsed, 0);
  const totalPoints = earnedPoints - redeemedPoints;
  const lifetimePoints = earnedPoints;

  const currentTier = getTierForPoints(totalPoints);
  const nextTier = getNextTier(currentTier);
  const tierProgress = getTierProgress(totalPoints, currentTier, nextTier);

  // Streak: count consecutive completed orders from most recent
  let currentStreak = 0;
  for (const order of MOCK_LOYALTY_ORDERS) {
    if (order.status === 'completed') currentStreak++;
    else break;
  }

  // Avg ratings
  const ratedBySeller = completedOrders.filter(o => o.sellerRating);
  const ratedByDriver = completedOrders.filter(o => o.deliveryRating);
  const avgSellerRating = ratedBySeller.length > 0
    ? ratedBySeller.reduce((s, o) => s + (o.sellerRating || 0), 0) / ratedBySeller.length
    : 0;
  const avgDeliveryRating = ratedByDriver.length > 0
    ? ratedByDriver.reduce((s, o) => s + (o.deliveryRating || 0), 0) / ratedByDriver.length
    : 0;

  return {
    totalPoints,
    lifetimePoints,
    redeemedPoints,
    currentTier,
    nextTier,
    tierProgress,
    completedOrders: completedOrders.length,
    cancellationRate: MOCK_LOYALTY_ORDERS.length > 0
      ? Math.round((cancelledOrders.length / MOCK_LOYALTY_ORDERS.length) * 100)
      : 0,
    currentStreak,
    avgSellerRating: Math.round(avgSellerRating * 10) / 10,
    avgDeliveryRating: Math.round(avgDeliveryRating * 10) / 10,
    orderHistory: MOCK_LOYALTY_ORDERS,
    redemptionHistory: MOCK_REDEMPTION_HISTORY,
  };
}
