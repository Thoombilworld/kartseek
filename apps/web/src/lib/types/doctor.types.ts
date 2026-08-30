/**
 * KARTSEEK — Doctor Appointment Type Definitions
 */

export interface Hospital {
  id: string;
  name: string;
  slug: string;
  address: string;
  logoUrl?: string;
  rating: number;
  specialties: string[];
  isActive: boolean;
  regionCode: string;
}

export interface Doctor {
  id: string;
  hospitalId: string;
  name: string;
  specialty: string;
  qualification: string;
  experience: number;
  fee: number;
  currency: string;
  rating: number;
  reviewCount: number;
  avatarUrl?: string;
  isAvailable: boolean;
}

export interface AppointmentSlot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface Appointment {
  id: string;
  doctorId: string;
  customerId: string;
  slotId: string;
  status: 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: string;
}
