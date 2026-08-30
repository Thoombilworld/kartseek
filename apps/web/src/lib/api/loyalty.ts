import { api } from '../api-endpoints';

/**
 * Note the doubled segment. The gateway declares this surface as
 * `@Controller('api/loyalty')` while its global prefix is already `api/v1`, so
 * the route really is `/api/v1/api/loyalty/...`. `'/loyalty'` here produced a
 * 404 on every call, which is why nothing on the site had ever shown a points
 * balance. `apps/mcp-server/src/tools/loyalty.ts` carries the same workaround.
 */
const BASE = '/api/loyalty';

export interface LoyaltyPointsData {
  userId: string;
  points: number;
  tier: string;
  nextTier: string;
  pointsToNextTier: number;
  totalEarned: number;
  lastUpdated: string;
}

export const loyaltyApi = {
  /**
   * Fetch the current user's loyalty points and tier status
   */
  getPoints: async (): Promise<LoyaltyPointsData> => {
    return api.get<LoyaltyPointsData>(`${BASE}/points`);
  },

  /**
   * Internal/Admin function: Award loyalty points manually
   */
  awardPoints: async (data: { points: number; reason: string; orderId?: string }) => {
    return api.post(`${BASE}/award`, data);
  },

  /**
   * Spend points for checkout credit.
   *
   * Refuses with a 400 when the balance cannot cover it, so a rejection arrives
   * as a thrown `ApiError` rather than a 200 the caller has to inspect.
   */
  redeem: async (points: number) => {
    return api.post<{ success: boolean; pointsRedeemed: number; discountAmount: number; newTotal: number }>(
      `${BASE}/redeem`, { points },
    );
  },

  /** What an order of this size would earn, at the customer's current tier. */
  preview: async (orderTotal: number) => {
    return api.get<{ basePoints: number; tierMultiplier: number; tier: string; totalPoints: number; estimatedValue: number }>(
      `${BASE}/preview`, { orderTotal },
    );
  },
};
