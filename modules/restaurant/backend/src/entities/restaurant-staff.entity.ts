import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Restaurant } from './restaurant.entity';

export enum StaffRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CHEF = 'CHEF',
  KITCHEN_STAFF = 'KITCHEN_STAFF',
  WAITER = 'WAITER',
  CASHIER = 'CASHIER',
  DELIVERY_COORDINATOR = 'DELIVERY_COORDINATOR',
}

@Entity({ name: 'restaurant_staff', schema: 'restaurant' })
export class RestaurantStaff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Restaurant, (r) => r.staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Relation<Restaurant>;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @Index()
  @Column({ comment: 'Links to Auth Service user' })
  userId: string;

  @Column({ length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'enum', enum: StaffRole, default: StaffRole.KITCHEN_STAFF })
  role: StaffRole;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Granular permissions e.g. { canManageMenu, canAcceptOrders, canViewReports }',
  })
  permissions: Record<string, boolean>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
