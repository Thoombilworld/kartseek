import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Brand } from './brand.entity';

/**
 * Brand updates — announcements, new product launches, offers, etc.
 * Created by sellers/admins; surfaced to users who follow the brand.
 */
@Entity({ name: 'brand_updates', schema: 'marketplace' })
@Index(['brandId', 'createdAt'])
export class BrandUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'brand_id' })
  brandId: string;

  @ManyToOne(() => Brand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Relation<Brand>;

  /** NEW_PRODUCT | OFFER | LAUNCH | ANNOUNCEMENT */
  @Column({ default: 'ANNOUNCEMENT' })
  type: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  /** Deep link to product/deal page */
  @Column({ type: 'varchar', nullable: true })
  actionUrl: string | null;

  /** Optional reference to a specific product */
  @Column({ type: 'varchar', nullable: true, name: 'product_id' })
  productId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
