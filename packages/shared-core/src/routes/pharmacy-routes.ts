/** KARTSEEK — Pharmacy Route Constants */
export const PHARMACY_ROUTES = {
  HOME:               '/pharmacy',
  STORES:             '/pharmacy/stores',
  STORE:              (id: string) => `/pharmacy/stores/${id}`,
  PRESCRIPTION:       '/pharmacy/prescription',
  PRESCRIPTION_UPLOAD:'/pharmacy/prescription-upload',
} as const;
