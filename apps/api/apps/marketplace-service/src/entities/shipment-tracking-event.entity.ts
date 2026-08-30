import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { MarketplaceOrder } from './marketplace-order.entity';

/**
 * ShipmentTrackingEvent — Immutable log of shipment status updates.
 *
 * Each row is one event in the lifecycle of a shipment. Events are
 * append-only; updates are added as new rows, never edited.
 *
 * Industry Reference:
 *   Amazon: 15+ granular tracking states (Label Created → Out for Delivery → Delivered)
 *   Flipkart: Integrated carrier tracking via Ekart/3PL
 */
@Entity('shipment_tracking_events')
@Index(['orderId', 'timestamp'])
@Index(['trackingId'])
export class ShipmentTrackingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => MarketplaceOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: MarketplaceOrder;

  @Column({ comment: 'AWB / tracking number from courier' })
  trackingId: string;

  @Column({ type: 'varchar', nullable: true, comment: 'Courier/logistics partner name (Delhivery, Ekart, etc.)' })
  courierName: string | null;

  @Column({
    type: 'enum',
    enum: [
      'LABEL_CREATED',
      'PICKED_UP',
      'IN_TRANSIT',
      'REACHED_HUB',
      'OUT_FOR_DELIVERY',
      'DELIVERY_ATTEMPTED',
      'DELIVERED',
      'RETURNED_TO_ORIGIN',
      'LOST',
      'DAMAGED',
      'HELD_AT_CUSTOMS',
      'EXCEPTION',
    ],
    comment: 'Standardized shipment status',
  })
  status: string;

  @Column({ type: 'text', nullable: true, comment: 'Human-readable description from courier API' })
  description: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'City/location where event occurred' })
  location: string | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'GPS coordinates if available' })
  coordinates: {
    lat: number;
    lng: number;
    accuracy?: number;
  };

  @Column({ type: 'timestamp', comment: 'When the event actually happened (from courier)' })
  timestamp: Date;

  @Column({ type: 'varchar', nullable: true, comment: 'Courier-side event code for debugging' })
  courierEventCode: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Delivery partner who performed this action' })
  deliveryPartnerId: string | null;

  @Column('simple-array', { nullable: true, comment: 'Photo proof URLs (POD)' })
  photoUrls: string[];

  @Column({ type: 'varchar', nullable: true, comment: 'Recipient name for delivery confirmation' })
  receivedBy: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'OTP used for delivery verification' })
  otpVerified: string | null;

  @Column({
    type: 'enum',
    enum: ['COURIER_API', 'WEBHOOK', 'MANUAL', 'PARTNER_APP', 'SYSTEM'],
    default: 'SYSTEM',
    comment: 'How this event was ingested',
  })
  source: string;

  @CreateDateColumn({ comment: 'When this record was created in our system' })
  createdAt: Date;
}
