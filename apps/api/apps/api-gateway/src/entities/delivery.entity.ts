import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// 1. Delivery Partner
@Entity('delivery_partners')
export class DeliveryPartner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerId: string | null; // Linked to unified partner

  @Column({ default: 'APPROVED' }) // APPROVED, SUSPENDED
  status: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating: number;

  @CreateDateColumn()
  createdAt: Date;
}

// 2. Delivery Task
@Entity('delivery_tasks')
export class DeliveryTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  orderId: string | null;

  @Column({ type: 'varchar', nullable: true })
  deliveryPartnerId: string | null; // Unified partner ID

  @Column() // food, grocery, pharmacy, marketplace
  serviceType: string;

  @Column({ default: 'ASSIGNED' })
  // ASSIGNED, ACCEPTED, PICKING_UP, PICKED_UP, DELIVERING, ARRIVED, DELIVERED, FAILED, RETURN_STARTED, RETURN_COMPLETED
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

  @Column({ default: false })
  isCod: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  codAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'varchar', nullable: true })
  pickupProofUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  dropProofUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  otpCode: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 3. Delivery Task Status History
@Entity('delivery_task_status_history')
export class DeliveryTaskStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  taskId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  status: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  timestamp: Date;
}

// 4. Delivery Partner Earning
@Entity('delivery_partner_earnings')
export class DeliveryPartnerEarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  taskId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  amount: number | null;

  @Column({ default: 'UNPAID' }) // UNPAID, PAID
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}

// 5. Delivery COD Collection
@Entity('delivery_cod_collections')
export class DeliveryCodCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  taskId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  collectedAmount: number | null;

  @Column({ default: 'PENDING_REMITTANCE' }) // PENDING_REMITTANCE, REMITTED
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}

// 6. Delivery Return Task
@Entity('delivery_return_tasks')
export class DeliveryReturnTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  originalTaskId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  partnerId: string | null;

  @Column({ default: 'PENDING' }) // PENDING, RETURNED, DISPOSED
  status: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}