import { api } from '@/lib/api-endpoints';

// ── Brand Follow ────────────────────────────────────────────────────────────

export async function followBrand(brandId: string, userId?: string) {
  return api.post<any>(`/marketplace/brands/${brandId}/follow`, { userId });
}

export async function unfollowBrand(brandId: string, userId?: string) {
  return api.delete<any>(`/marketplace/brands/${brandId}/follow`, { userId });
}

export async function isFollowingBrand(brandId: string, userId?: string) {
  return api.get<{ isFollowing: boolean }>(`/marketplace/brands/${brandId}/is-following`, { userId });
}

export async function getFollowerCount(brandId: string) {
  return api.get<{ brandId: string; count: number }>(`/marketplace/brands/${brandId}/followers/count`);
}

// ── Followed Brands ─────────────────────────────────────────────────────────

export async function getFollowedBrands(userId?: string, page = 1, limit = 20) {
  return api.get<any>('/marketplace/brands/followed', { userId, page, limit });
}

// ── Brand Feed (updates from followed brands) ───────────────────────────────

export async function getBrandFeed(userId?: string, page = 1, limit = 20, type?: string) {
  const params: Record<string, any> = { userId, page, limit };
  if (type) params.type = type;
  return api.get<any>('/marketplace/brands/feed', params);
}

// ── Brand Updates (specific brand) ──────────────────────────────────────────

export async function getBrandUpdates(brandId: string, page = 1, limit = 10) {
  return api.get<any>(`/marketplace/brands/${brandId}/updates`, { page, limit });
}
