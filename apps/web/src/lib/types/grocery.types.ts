/**
 * KARTSEEK — Grocery Type Definitions
 */

export interface GroceryStore {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  address: string;
  rating: number;
  deliveryTime: string;
  minOrder: number;
  isOpen: boolean;
  regionCode: string;
}

export interface GroceryProduct {
  id: string;
  storeId: string;
  name: string;
  price: number;
  mrp?: number;
  unit: string;
  weight: string;
  categoryId: string;
  imageUrl?: string;
  isOrganic: boolean;
  isFresh: boolean;
  stock: number;
}

export interface GroceryCategory {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
}
