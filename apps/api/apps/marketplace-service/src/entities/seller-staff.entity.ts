import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Seller } from './seller.entity';

/**
 * A person the seller has given access to their store.
 *
 * Replaces `addStaff()` returning `{ success: true, staffId: 'STF-' + Date.now() }`
 * against a `getStaff()` hard-coded to `[]` — an invite flow that recorded
 * nothing and listed nothing.
 */
@Entity('seller_staff')
@Index(['sellerId', 'status'])
export class SellerStaff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => Seller, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: Seller;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  /** admin | manager | catalog | finance | support */
  @Column({ default: 'support' })
  role: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  lastActive: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
