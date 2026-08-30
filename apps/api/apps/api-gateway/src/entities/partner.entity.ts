import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// 1. Partner
@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  name: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  email: string | null;

  @Column({ default: 'PENDING' }) // PENDING, APPROVED, BLOCKED
  status: string;

  @Column({ type: 'varchar', name: 'franchise_id', nullable: true })
  franchiseId: string | null;

  @Column({ type: 'varchar', name: 'region_code', nullable: true })
  regionCode: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 2. Partner User
@Entity('partner_users')
export class PartnerUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  userId: string | null; // auth_user_id

  @Column({ type: 'jsonb', default: [] })
  allowedRoles: string[]; // ["TAXI_DRIVER", "DELIVERY_PARTNER"]

  @Column({ type: 'varchar', nullable: true })
  activeRole: string | null; // "TAXI_DRIVER" or "DELIVERY_PARTNER"

  @CreateDateColumn()
  createdAt: Date;
}

// 3. Partner Role
@Entity('partner_roles')
export class PartnerRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  name: string | null; // TAXI_DRIVER, DELIVERY_PARTNER

  @Column({ type: 'jsonb', default: [] })
  permissions: string[];
}

// 4. Partner Role Assignment
@Entity('partner_role_assignments')
export class PartnerRoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerUserId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  roleId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

// 5. Partner Document
@Entity('partner_documents')
export class PartnerDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  roleType: string | null; // TAXI_DRIVER, DELIVERY_PARTNER, COMMON

  @Column({ type: 'varchar', nullable: true, default: '' })
  docType: string | null; // LICENSE, INDEMNITY, VEHICLE_REG, INSURANCE

  @Column({ type: 'varchar', nullable: true, default: '' })
  docUrl: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiryDate: Date | null;

  // Normalized KYC statuses (aligned with partner app KycStatus enum):
  // PENDING (= submitted), UNDER_REVIEW, APPROVED (= verified),
  // REJECTED, CORRECTION_REQUESTED, EXPIRED, SUSPENDED
  @Column({ default: 'PENDING' })
  status: string;

  @Column({ type: 'text', nullable: true })
  reviewNote: string | null; // Admin notes on approval/rejection

  @Column({ type: 'varchar', nullable: true })
  reviewedBy: string | null; // Admin user ID who reviewed

  @CreateDateColumn()
  createdAt: Date;
}

// 6. Partner Compliance Status
@Entity('partner_compliance_status')
export class PartnerComplianceStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerId: string | null;

  @Column({ default: true })
  isCompliant: boolean;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 7. Partner Online Session
@Entity('partner_online_sessions')
export class PartnerOnlineSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  roleType: string | null; // TAXI_DRIVER, DELIVERY_PARTNER

  @Column({ type: 'timestamp' })
  loginTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  logoutTime: Date | null;

  @Column({ default: 'ONLINE' }) // ONLINE, OFFLINE
  status: string;
}

// 8. Partner Location Update
@Entity('partner_location_updates')
export class PartnerLocationUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, default: 0 })
  lat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, default: 0 })
  lng: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  heading: number;

  @CreateDateColumn()
  timestamp: Date;
}

// 9. Partner Earning
@Entity('partner_earnings')
export class PartnerEarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  referenceType: string | null; // TAXI_RIDE, DELIVERY_TASK

  @Column({ type: 'varchar', nullable: true, default: '' })
  referenceId: string | null; // rideId or taskId

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  amount: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tip: number;

  @CreateDateColumn()
  createdAt: Date;
}

// 10. Partner Payout
@Entity('partner_payouts')
export class PartnerPayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  amount: number | null;

  @Column({ default: 'PENDING' }) // PENDING, PROCESSING, COMPLETED, FAILED
  status: string;

  @Column({ type: 'varchar', nullable: true })
  transactionReference: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

// 11. Partner SOS Case
@Entity('partner_sos_cases')
export class PartnerSosCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  referenceType: string | null; // TAXI_RIDE, DELIVERY_TASK

  @Column({ type: 'varchar', nullable: true })
  referenceId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, default: 0 })
  lat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, default: 0 })
  lng: number | null;

  @Column({ default: 'ACTIVE' }) // ACTIVE, RESOLVED
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}