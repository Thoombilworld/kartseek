/** KARTSEEK — Restaurant Route Constants */
export const RESTAURANT_ROUTES = {
  HOME:          '/restaurant',
  LIST:          '/restaurant/list',
  DETAIL:        (slug: string) => `/restaurant/${slug}`,
  CUISINE:       (id: string) => `/restaurant/cuisine/${id}`,
  SEARCH:        '/restaurant/search',
  TABLE_BOOKING: '/restaurant/table-booking',
  TAKEAWAY:      '/restaurant/takeaway',
  CHECKOUT:      '/restaurant/checkout',
} as const;
