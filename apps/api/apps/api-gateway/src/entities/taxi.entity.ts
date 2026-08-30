import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

// 1. Taxi Vendor
@Entity('taxi_vendors')
export class TaxiVendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  name: string | null;

  @Column({ default: 'PENDING' }) // PENDING, APPROVED, REJECTED, SUSPENDED
  status: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', name: 'franchise_id', nullable: true })
  franchiseId: string | null;

  @Column({ type: 'varchar', name: 'region_code', nullable: true })
  regionCode: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 2. Taxi Vendor User
@Entity('taxi_vendor_users')
export class TaxiVendorUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  vendorId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  userId: string | null; // auth_user_id

  @Column({ type: 'varchar', nullable: true, default: '' })
  email: string | null;

  @Column({ default: 'admin' }) // admin, dispatcher, accountant
  role: string;

  @CreateDateColumn()
  createdAt: Date;
}

// 3. Taxi Driver
@Entity('taxi_drivers')
export class TaxiDriver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  vendorId: string | null; // Nullable if independent driver

  @Column({ type: 'varchar', nullable: true, default: '' })
  userId: string | null; // auth_user_id

  @Column({ type: 'varchar', nullable: true, default: '' })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  lastName: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  phone: string | null;

  @Column({ default: 'PENDING' }) // PENDING, APPROVED, REJECTED, BLOCKED
  status: string;

  @Column({ default: 'OFFLINE' }) // ONLINE, OFFLINE
  onlineStatus: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating: number;

  @Column({ type: 'text', nullable: true })
  complianceReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 4. Taxi Vehicle
@Entity('taxi_vehicles')
export class TaxiVehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  vendorId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  plateNumber: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  model: string | null;

  @Column() // economy, comfort, premium, bike
  type: string;

  @Column({ default: 'PENDING' }) // PENDING, APPROVED, REJECTED, BLOCKED
  status: string;

  @Column({ type: 'varchar', nullable: true })
  assignedDriverId: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 5. Taxi Driver Document
@Entity('taxi_driver_documents')
export class TaxiDriverDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  driverId: string | null;

  @Column() // License, BackgroundCheck, Insurance
  type: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  docUrl: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiryDate: Date | null;

  @Column({ default: 'PENDING' }) // PENDING, APPROVED, REJECTED
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}

// 6. Taxi Vehicle Document
@Entity('taxi_vehicle_documents')
export class TaxiVehicleDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  vehicleId: string | null;

  @Column() // Registration, Permit, Insurance
  type: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  docUrl: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiryDate: Date | null;

  @Column({ default: 'PENDING' }) // PENDING, APPROVED, REJECTED
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}

// 7. Taxi Ride
@Entity('taxi_rides')
export class TaxiRide {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  customerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  driverId: string | null;

  @Column({ type: 'varchar', nullable: true })
  vehicleId: string | null;

  @Column({ type: 'varchar', nullable: true })
  vendorId: string | null;

  @Column({ default: 'SEARCHING_DRIVER' })
  // SEARCHING_DRIVER, DRIVER_ASSIGNED, DRIVER_ARRIVING, DRIVER_ARRIVED, RIDE_STARTED, RIDE_COMPLETED, CANCELLED_BY_CUSTOMER, CANCELLED_BY_DRIVER, NO_DRIVER_FOUND
  status: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  pickupAddress: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  dropAddress: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, default: 0 })
  pickupLat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, default: 0 })
  pickupLng: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, default: 0 })
  dropLat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, default: 0 })
  dropLng: number | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  paymentMethod: string | null; // CARD, WALLET, CASH

  @Column({ default: 'PENDING' }) // PENDING, PAID, FAILED, REFUNDED
  paymentStatus: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fareEstimate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  finalFare: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 8. Taxi Ride Status History
@Entity('taxi_ride_status_history')
export class TaxiRideStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  rideId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  status: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  timestamp: Date;
}

// 9. Taxi Ride Location
@Entity('taxi_ride_locations')
export class TaxiRideLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  rideId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, default: 0 })
  lat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, default: 0 })
  lng: number | null;

  @CreateDateColumn()
  timestamp: Date;
}

// 10. Taxi Fare Rule
@Entity('taxi_fare_rules')
export class TaxiFareRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  zoneId: string | null;

  @Column() // economy, comfort, premium, bike
  vehicleType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  baseFare: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  distanceFareRate: number | null; // per km

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  timeFareRate: number | null; // per min

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  minimumFare: number | null;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;
}

// 11. Taxi Fare Rule Version
@Entity('taxi_fare_rule_versions')
export class TaxiFareRuleVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  fareRuleId: string | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  version: number | null;

  @Column({ type: 'text', nullable: true })
  changeLog: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  baseFare: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  distanceFareRate: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  timeFareRate: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  minimumFare: number | null;

  @CreateDateColumn()
  createdAt: Date;
}

// 12. Taxi Surge Rule
@Entity('taxi_surge_rules')
export class TaxiSurgeRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  zoneId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  name: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  multiplier: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 3.5 })
  capLimit: number;

  @CreateDateColumn()
  createdAt: Date;
}

// 13. Taxi Surge Zone
@Entity('taxi_surge_zones')
export class TaxiSurgeZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  name: string | null;

  @Column({ type: 'jsonb', nullable: true })
  geoJson: any | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  activeMultiplier: number;
}

// 14. Taxi Surge Event
@Entity('taxi_surge_events')
export class TaxiSurgeEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  name: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, default: 0 })
  multiplier: number | null;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;
}

// 15. Taxi Cancellation Rule
@Entity('taxi_cancellation_rules')
export class TaxiCancellationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  vehicleType: string | null;

  @Column({ default: 5 })
  feeAfterMinutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  amount: number | null;
}

// 16. Taxi Waiting Fee Rule
@Entity('taxi_waiting_fee_rules')
export class TaxiWaitingFeeRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  vehicleType: string | null;

  @Column({ default: 3 })
  freeMinutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  ratePerMinute: number | null;
}

// 17. Taxi Fare Breakdown
@Entity('taxi_fare_breakdowns')
export class TaxiFareBreakdown {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  rideId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  baseFare: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  distanceFare: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  timeFare: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  surgeAdjustment: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  waitingFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cancellationFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  platformCommission: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  vendorCommission: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  driverEarning: number | null;
}

// 18. Taxi Driver Earning
@Entity('taxi_driver_earnings')
export class TaxiDriverEarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  driverId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  rideId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  amount: number | null;

  @Column({ default: 'UNPAID' }) // UNPAID, PAID
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}

// 19. Taxi Vendor Settlement
@Entity('taxi_vendor_settlements')
export class TaxiVendorSettlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  vendorId: string | null;

  @Column({ type: 'timestamp' })
  periodStart: Date;

  @Column({ type: 'timestamp' })
  periodEnd: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  grossEarnings: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  commissionDeductions: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  netPayout: number | null;

  @Column({ default: 'PENDING' }) // PENDING, PROCESSING, COMPLETED
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}

// 20. Taxi Commission Record
@Entity('taxi_commission_records')
export class TaxiCommissionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  rideId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  platformAmount: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  vendorAmount: number | null;

  @CreateDateColumn()
  createdAt: Date;
}

// 21. Taxi Payment Record
@Entity('taxi_payment_records')
export class TaxiPaymentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  rideId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  transactionId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  amount: number | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  paymentMethod: string | null;

  @Column() // SUCCESS, FAILED
  status: string;

  @Column({ type: 'varchar', nullable: true })
  maskedCardNumber: string | null;

  @Column({ type: 'text', nullable: true })
  auditLog: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

// 22. Taxi SOS Case
@Entity('taxi_sos_cases')
export class TaxiSosCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  rideId: string | null;

  @Column() // CUSTOMER, DRIVER
  triggeredBy: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ default: 'ACTIVE' }) // ACTIVE, INVESTIGATING, RESOLVED
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

// 23. Taxi Dispute
@Entity('taxi_disputes')
export class TaxiDispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  rideId: string | null;

  @Column() // CUSTOMER, DRIVER, VENDOR
  raisedBy: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  reason: string | null;

  @Column({ default: 'OPEN' }) // OPEN, UNDER_REVIEW, RESOLVED
  status: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

// 24. Taxi Audit Log
@Entity('taxi_audit_logs')
export class TaxiAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  adminUserId: string | null;

  @Column({ type: 'varchar', nullable: true })
  vendorUserId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  action: string | null; // APPROVE_VENDOR, REJECT_VENDOR, CHANGE_FARE, etc.

  @Column({ type: 'varchar', nullable: true, default: '' })
  entityName: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  entityId: string | null;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  timestamp: Date;
}