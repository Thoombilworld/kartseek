import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { GroceryStore } from './grocery-store.entity';
import { GroceryItem } from './grocery-item.entity';

export enum FlashDealStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  REJECTED = 'rejected',
}

@Entity('grocery_flash_deals')
export class GroceryFlashDeal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  storeId: string;

  @Column()
  storeName: string;

  @Column()
  @Index()
  productId: string;

  @Column()
  productName: string;

  @Column({ nullable: true })
  productEmoji?: string;

  @Column()
  category: string;

  @Column('decimal', { precision: 10, scale: 2 })
  originalPrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  flashPrice: number;

  @Column('int')
  discountPercent: number;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column('int', { default: 0 })
  stockLimit: number;

  @Column('int', { default: 0 })
  soldCount: number;

  @Column({ type: 'enum', enum: FlashDealStatus, default: FlashDealStatus.DRAFT })
  @Index()
  status: FlashDealStatus;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ nullable: true })
  rejectedReason?: string;

  @Column({ nullable: true })
  approvedBy?: string;

  @ManyToOne(() => GroceryStore, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId', referencedColumnName: 'id' })
  store?: GroceryStore;

  @ManyToOne(() => GroceryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId', referencedColumnName: 'id' })
  product?: GroceryItem;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
