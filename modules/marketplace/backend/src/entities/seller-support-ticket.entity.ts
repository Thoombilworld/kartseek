import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Seller } from './seller.entity';

/**
 * A support ticket raised by a seller.
 *
 * Replaces `createTicket()` returning `{ ticketId: 'TKT-' + Date.now() }` with
 * `getSupport()` answering `{ tickets: [] }` — a seller could report a missing
 * payout, be given a reference number, and have nothing recorded for anyone to
 * act on or for them to follow up with.
 */
@Entity('seller_support_tickets')
@Index(['sellerId', 'status'])
export class SellerSupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-quotable reference, e.g. `TKT-4F21A9`. Unique across the platform. */
  @Column({ unique: true })
  reference: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => Seller, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: Seller;

  @Column()
  subject: string;

  @Column({ default: 'general' })
  category: string;

  /** low | medium | high | urgent */
  @Column({ default: 'medium' })
  priority: string;

  /** open | in_progress | resolved | closed */
  @Column({ default: 'open' })
  status: string;

  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  messages: Array<{ sender: string; body: string; at: string }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
