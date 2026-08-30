/**
 * KARTSEEK — Pharmacy Type Definitions
 */

export interface PharmacyStore {
  id: string;
  name: string;
  slug: string;
  address: string;
  logoUrl?: string;
  rating: number;
  isOpen: boolean;
  hasDelivery: boolean;
  requiresPrescription: boolean;
  regionCode: string;
}

export interface Medicine {
  id: string;
  storeId: string;
  name: string;
  genericName?: string;
  manufacturer: string;
  price: number;
  mrp?: number;
  dosageForm: string;
  strength: string;
  packSize: string;
  isPrescriptionRequired: boolean;
  imageUrl?: string;
  stock: number;
  isActive: boolean;
}

export interface Prescription {
  id: string;
  customerId: string;
  imageUrl: string;
  status: 'pending' | 'verified' | 'rejected';
  pharmacyId?: string;
  notes?: string;
  uploadedAt: string;
}
