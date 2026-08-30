/**
 * KARTSEEK — Taxi Type Definitions
 */

export type RideStatus =
  | 'searching'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'arrived'
  | 'trip_started'
  | 'trip_completed'
  | 'cancelled';

export interface VehicleType {
  id: string;
  name: string;
  icon: string;
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  capacity: number;
  estimatedTime: string;
}

export interface RideEstimate {
  vehicleTypeId: string;
  estimatedFare: number;
  estimatedDistance: number;
  estimatedDuration: number;
  surgeMultiplier: number;
  currency: string;
}

export interface Ride {
  id: string;
  customerId: string;
  driverId?: string;
  vehicleTypeId: string;
  pickup: { lat: number; lng: number; address: string };
  drop:   { lat: number; lng: number; address: string };
  status: RideStatus;
  fare: number;
  distance: number;
  duration: number;
  otp?: string;
  rating?: number;
  createdAt: string;
  completedAt?: string;
}

export interface NearbyDriver {
  id: string;
  name: string;
  lat: number;
  lng: number;
  vehicleType: string;
  rating: number;
  plateNumber: string;
}
