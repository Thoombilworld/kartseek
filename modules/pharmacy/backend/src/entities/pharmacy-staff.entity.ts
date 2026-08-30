import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { PharmacyStore } from './pharmacy-store.entity';

export enum PharmacyStaffRole {
  PHARMACIST = 'PHARMACIST',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  DELIVERY_COORDINATOR = 'DELIVERY_COORDINATOR',
  INVENTORY_MANAGER = 'INVENTORY_MANAGER',
}

@Entity('pharmacy_staff')
export class PharmacyStaff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => PharmacyStore, (s) => s.staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: PharmacyStore;

  @Column({ name: 'store_id' })
  storeId: string;

  @Column({ length: 128 })
  name: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'enum', enum: PharmacyStaffRole, default: PharmacyStaffRole.CASHIER })
  role: PharmacyStaffRole;

  @Column({ type: 'varchar', nullable: true, comment: 'Pharmacist registration number (for PHARMACIST role)' })
  registrationNumber: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true, comment: 'Avatar/photo URL' })
  photoUrl: string | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Shift schedule' })
  schedule: Record<string, { start: string; end: string }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
