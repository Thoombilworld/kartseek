import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Hotel } from './hotel.entity';

export enum HotelStaffRole {
  OWNER = 'OWNER',
  GENERAL_MANAGER = 'GENERAL_MANAGER',
  FRONT_DESK = 'FRONT_DESK',
  RECEPTIONIST = 'RECEPTIONIST',
  CONCIERGE = 'CONCIERGE',
  HOUSEKEEPING_MANAGER = 'HOUSEKEEPING_MANAGER',
  HOUSEKEEPING = 'HOUSEKEEPING',
  MAINTENANCE = 'MAINTENANCE',
  REVENUE_MANAGER = 'REVENUE_MANAGER',
  F_AND_B_MANAGER = 'F_AND_B_MANAGER',
}

@Entity('hotel_staff')
export class HotelStaff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Hotel, (hotel) => hotel.staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hotel_id' })
  hotel: Relation<Hotel>;

  @Column({ name: 'hotel_id' })
  hotelId: string;

  @Index()
  @Column({ comment: 'Links to Auth Service user' })
  userId: string;

  @Column({ length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'enum', enum: HotelStaffRole, default: HotelStaffRole.FRONT_DESK })
  role: HotelStaffRole;

  @Column({ type: 'jsonb', nullable: true, comment: 'Granular permissions' })
  permissions: Record<string, boolean> | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
