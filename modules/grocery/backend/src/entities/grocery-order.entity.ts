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
import { GroceryStore } from './grocery-store.entity';

export enum GroceryPaymentMethod {
  ONLINE = 'ONLINE',
  COD = 'COD',
  WALLET = 'WALLET',
}

export enum GroceryOrderStatus {
  PLACED = 'PLACED',
  CONFIRMED = 'CONFIRMED',
  PACKING = 'PACKING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/**
 * Valid status transitions — guards invalid updates.
 * Key = current status, Value = set of allowed next statuses.
 */
export const GROCERY_ORDER_STATUS_TRANSITIONS: Record<GroceryOrderStatus, GroceryOrderStatus[]> = {
  [GroceryOrderStatus.PLACED]: [GroceryOrderStatus.CONFIRMED, GroceryOrderStatus.CANCELLED],
  [GroceryOrderStatus.CONFIRMED]: [GroceryOrderStatus.PACKING, GroceryOrderStatus.CANCELLED],
  [GroceryOrderStatus.PACKING]: [GroceryOrderStatus.READY_FOR_PICKUP, GroceryOrderStatus.CANCELLED],
  [GroceryOrderStatus.READY_FOR_PICKUP]: [GroceryOrderStatus.OUT_FOR_DELIVERY],
  [GroceryOrderStatus.OUT_FOR_DELIVERY]: [GroceryOrderStatus.DELIVERED],
  [GroceryOrderStatus.DELIVERED]: [GroceryOrderStatus.REFUNDED],
  [GroceryOrderStatus.CANCELLED]: [],
  [GroceryOrderStatus.REFUNDED]: [],
};

@Entity({ name: 'grocery_orders', schema: 'grocery' })
export class GroceryOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string; // e.g., GRO-1029

  @Index()
  @Column()
  customerId: string;

  @Column({ type: 'varchar', nullable: true })
  driverId: string | null;

  /**
   * RESTRICT, not SET NULL.
   *
   * `storeId` below is NOT NULL, so a SET NULL rule could only ever have failed
   * at delete time — and it should: an order must always name the store that owes
   * the customer their groceries, including after that store leaves the platform.
   */
  @ManyToOne(() => GroceryStore, (store) => store.orders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<GroceryStore>;

  @Index()
  @Column()
  storeId: string;

  @Column({ type: 'jsonb' })
  items: Array<{
    productId: string;
    name: string;
    weight: string;
    price: number;
    quantity: number;
    preparationNote?: string;
  }>;
  // Snapshot of selected items at order time

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  itemTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  grandTotal: number;

  /*
   * The consumption tax inside this order, recorded rather than inferred.
   *
   * Every market's rate is inclusive (`REGION_CONFIGS[x].tax.isInclusive`), so
   * `grandTotal` was already the right amount to charge — but nothing stored how
   * much of it was tax. The receipt derived it as
   * `grandTotal - (itemTotal + deliveryFee - discount)`, which is exactly zero by
   * construction, so a Saudi order printed "VAT 0.00" on a 15% VAT sale and an
   * Indian one printed "GST 0.00" on 18% GST. Marketplace orders have carried
   * `taxAmount` all along; grocery is catching up.
   *
   * The rate and label are stored alongside the amount because a rate change
   * must not retroactively restate what an old receipt says.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  /** Percentage applied, e.g. 15 for 15%. Zero is a real answer, not "unknown". */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  /** Display name for the market — "VAT", "GST", "No Tax". */
  @Column({ type: 'varchar', length: 32, nullable: true })
  taxName: string | null;

  @Column({
    type: 'enum',
    enum: GroceryPaymentMethod,
  })
  paymentMethod: GroceryPaymentMethod;

  @Column({
    type: 'enum',
    enum: GroceryOrderStatus,
    default: GroceryOrderStatus.PLACED,
  })
  status: GroceryOrderStatus;

  @Column({ type: 'jsonb', nullable: true })
  deliveryAddress: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    pincode: string;
    // Optional: a hand-entered address from the customer's address book carries no
    // coordinates until something geocodes it.
    lat?: number;
    lng?: number;
  };

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '{ date, startTime, endTime } for scheduled deliveries',
  })
  deliverySlot: {
    date: string;
    startTime: string;
    endTime: string;
  } | null;

  @Column({ type: 'timestamptz', nullable: true })
  estimatedDeliveryAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'text', nullable: true })
  cancelReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
