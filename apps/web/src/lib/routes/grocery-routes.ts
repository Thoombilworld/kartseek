/** KARTSEEK — Grocery Route Constants */
export const GROCERY_ROUTES = {
  HOME:          '/grocery',
  STORE:         (id: string) => `/grocery/store/${id}`,
  CATEGORY:      (id: string) => `/grocery/category/${id}`,
  PRODUCT:       (storeId: string, productId: string) => `/grocery/store/${storeId}/product/${productId}`,
} as const;
