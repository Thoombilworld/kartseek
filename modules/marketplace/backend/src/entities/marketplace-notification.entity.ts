import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum NotificationType {
  ORDER_UPDATE = 'ORDER_UPDATE',
  PRICE_DROP = 'PRICE_DROP',
  DELIVERY_UPDATE = 'DELIVERY_UPDATE',
  PROMOTION = 'PROMOTION',
  REVIEW_RESPONSE = 'REVIEW_RESPONSE',
  RETURN_UPDATE = 'RETURN_UPDATE',
  REFUND_UPDATE = 'REFUND_UPDATE',
  SYSTEM = 'SYSTEM',
}

@Entity('marketplace_notifications')
export class MarketplaceNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.SYSTEM })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Extra payload: orderId, productId, etc.' })
  metadata: Record<string, any> | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Deep-link URL or route path' })
  actionUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
