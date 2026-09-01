import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Product } from './product.entity';

@Entity('reviews')
@Index(['productId', 'customerId'], { unique: true, where: '"deleted_at" IS NULL' })
// Review lists and the product rating aggregate both filter on status; without
// this the product page scanned the whole reviews table.
@Index(['productId', 'status'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', nullable: true })
  customerName: string | null;

  @Column({ type: 'smallint', comment: 'Rating 1-5' })
  rating: number;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column('simple-array', { nullable: true, comment: 'URLs to review images' })
  imageUrls: string[];

  @Column({ default: true })
  isVerifiedPurchase: boolean;

  @Column({ type: 'int', default: 0, comment: 'Number of "helpful" votes' })
  helpfulCount: number;

  @Column({ default: 'PUBLISHED', comment: 'PUBLISHED, HIDDEN, FLAGGED, PENDING' })
  status: string;

  @Column({ type: 'varchar', nullable: true, name: 'seller_reply' })
  sellerReply: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'seller_replied_at' })
  sellerRepliedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
