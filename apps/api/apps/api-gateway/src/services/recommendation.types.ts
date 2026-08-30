/**
 * KARTSEEK — Recommendation Engine Types
 *
 * Shared type definitions for the cross-module recommendation system.
 * Used by: RecommendationService, RecommendationGateway,
 *          RecommendationController, ActivityTrackingInterceptor,
 *          and the frontend useRecommendations hook.
 */

// ─── Module Enum ────────────────────────────────────────────────────────────

export type RecommendationModule =
  | 'marketplace'
  | 'grocery'
  | 'pharmacy'
  | 'hotel'
  | 'restaurant'
  | 'doctor';

export const ALL_RECOMMENDATION_MODULES: RecommendationModule[] = [
  'marketplace', 'grocery', 'pharmacy', 'hotel', 'restaurant', 'doctor',
];

// ─── User Activity Event ────────────────────────────────────────────────────

export type ActivityAction =
  | 'view'
  | 'search'
  | 'add_to_cart'
  | 'order'
  | 'review'
  | 'wishlist'
  | 'book'
  | 'reorder'
  | 'click_recommendation';

export interface UserActivityEvent {
  userId: string;
  module: RecommendationModule;
  action: ActivityAction;
  entityType: string;       // 'product', 'store', 'hotel', 'doctor', 'restaurant', 'medicine'
  entityId?: string;        // Specific item ID
  category?: string;        // Category / cuisine / specialization
  metadata: Record<string, any>;  // search query, price, rating, etc.
  timestamp: string;        // ISO 8601
  region?: string;          // Country code (IN, AE, US, etc.)
  sessionId?: string;       // Browser session for anonymous tracking
}

// ─── User Profile (Redis) ───────────────────────────────────────────────────

export interface UserRecommendationProfile {
  userId: string;
  /** Category affinity scores (0-1), e.g. { "electronics": 0.8, "fashion": 0.3 } */
  categoryScores: Record<string, number>;
  /** Module engagement scores (0-1), e.g. { "marketplace": 0.9, "grocery": 0.7 } */
  moduleScores: Record<string, number>;
  /** Price preference range */
  priceRange: { min: number; max: number; avg: number };
  /** Last 50 viewed/ordered entity IDs with their module */
  recentEntities: Array<{ module: RecommendationModule; entityId: string; at: string }>;
  /** Last 20 search queries with module context */
  searchHistory: Array<{ query: string; module: RecommendationModule; at: string }>;
  /** Order history (last 100) */
  orderHistory: Array<{ module: RecommendationModule; entityId: string; category?: string; at: string }>;
  /** Per-module last activity timestamp */
  lastActive: Record<string, string>;
  /** Region */
  region?: string;
  /** Profile last updated */
  updatedAt: string;
}

// ─── Recommendation Output ──────────────────────────────────────────────────

export type RecommendationReason =
  | 'recently_viewed'
  | 'order_history'
  | 'trending'
  | 'popular_in_region'
  | 'similar_users'
  | 'cross_module'
  | 'reorder'
  | 'search_based'
  | 'category_affinity'
  | 'new_arrival';

export interface Recommendation {
  id: string;
  module: RecommendationModule;
  entityType: string;
  entityId: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  score: number;             // 0-1 relevance score
  reason: RecommendationReason;
  reasonLabel: string;       // Human-readable: "Based on your recent orders"
  metadata: Record<string, any>;  // price, rating, distance, etc.
}

export interface RecommendationSet {
  module: RecommendationModule;
  forYou: Recommendation[];
  trending: Recommendation[];
  crossModule: Recommendation[];
  generatedAt: string;
}

// ─── WebSocket Events ───────────────────────────────────────────────────────

export interface WsRecommendationUpdate {
  module: RecommendationModule;
  recommendations: Recommendation[];
  type: 'for_you' | 'trending' | 'cross_module';
  generatedAt: string;
}

export interface WsSubscribeModule {
  module: RecommendationModule;
}

export interface WsTrackView {
  module: RecommendationModule;
  entityType: string;
  entityId: string;
  category?: string;
  durationMs?: number;   // Time spent viewing
}

export interface WsRecommendationClicked {
  recommendationId: string;
  module: RecommendationModule;
  entityId: string;
  position: number;       // Position in the carousel (for ranking feedback)
}

// ─── Entity Metadata Cache (Redis) ─────────────────────────────────────────

export interface CachedEntityMetadata {
  entityId: string;
  module: RecommendationModule;
  entityType: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  category?: string;
  price?: number;
  rating?: number;
  region?: string;
  updatedAt: string;
}

// ─── Route → Module Mapping ─────────────────────────────────────────────────

export const ROUTE_MODULE_MAP: Record<string, RecommendationModule> = {
  'marketplace': 'marketplace',
  'sellers': 'marketplace',
  'grocery': 'grocery',
  'pharmacy': 'pharmacy',
  'hotels': 'hotel',
  'hotel': 'hotel',
  'restaurants': 'restaurant',
  'restaurant': 'restaurant',
  'doctor': 'doctor',
};

export const ACTION_WEIGHT: Record<ActivityAction, number> = {
  view: 0.1,
  search: 0.15,
  add_to_cart: 0.3,
  wishlist: 0.25,
  book: 0.8,
  order: 1.0,
  review: 0.6,
  reorder: 0.9,
  click_recommendation: 0.2,
};
