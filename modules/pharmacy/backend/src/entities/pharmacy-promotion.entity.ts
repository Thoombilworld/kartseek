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
import { PharmacyStore } from './pharmacy-store.entity';

export enum PharmacyPromoType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
  FREE_DELIVERY = 'FREE_DELIVERY',
}

@Entity({ name: 'pharmacy_promotions', schema: 'pharmacy' })
export class PharmacyPromotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => PharmacyStore, (s) => s.promotions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Relation<PharmacyStore>;

  @Column({ name: 'store_id' })
  storeId: string;

  @Column({ length: 128 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index({ unique: true })
  @Column({ length: 32 })
  code: string;

  @Column({ type: 'enum', enum: PharmacyPromoType, default: PharmacyPromoType.PERCENTAGE })
  type: PharmacyPromoType;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: 'Discount value (percent or flat amount)',
  })
  value: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Min order amount to apply',
  })
  minOrderAmount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Max discount cap (for percentage type)',
  })
  maxDiscountAmount: number | null;

  @Column({ type: 'int', default: 0, comment: 'Max uses across all customers; 0 = unlimited' })
  maxUses: number;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'int', default: 1, comment: 'Per-customer usage limit' })
  usesPerCustomer: number;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column('simple-array', { nullable: true, comment: 'Restrict to specific category IDs' })
  applicableCategories: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
