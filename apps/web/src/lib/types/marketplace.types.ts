/**
 * KARTSEEK — Marketplace Type Definitions
 * Scaffold — expand as marketplace API contracts are finalized.
 */

export interface MarketplaceProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  mrp?: number;
  currency: string;
  categoryId: string;
  subcategoryId?: string;
  sellerId: string;
  sellerName: string;
  images: string[];
  rating: number;
  reviewCount: number;
  stock: number;
  isActive: boolean;
  tags: string[];
  createdAt: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface MarketplaceSeller {
  id: string;
  storeName: string;
  slug: string;
  logoUrl?: string;
  rating: number;
  isVerified: boolean;
  regionCode: string;
}
