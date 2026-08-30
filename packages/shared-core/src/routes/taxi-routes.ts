/** KARTSEEK — Taxi Route Constants */
export const TAXI_ROUTES = {
  HOME:      '/taxi',
  SEARCH:    '/taxi/search',
  TRIP:      (id: string) => `/taxi/trip/${id}`,
  INTERCITY: '/taxi/intercity',
  RENTALS:   '/taxi/rentals',
  LOGIN:     '/taxi/login',
  DRIVE:     '/taxi/drive',
} as const;
