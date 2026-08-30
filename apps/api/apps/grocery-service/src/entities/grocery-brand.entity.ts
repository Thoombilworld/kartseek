import {
  Entity, Column, PrimaryGeneratedColumn, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * A brand a seller may list products under.
 *
 * Brand was a free-text column on the product — 11 distinct spellings across
 * 224 rows, 70 of them empty — so nothing could be browsed by brand reliably,
 * two sellers could spell the same manufacturer differently, and anyone could
 * list under any name at all.
 *
 * Sellers **request** a brand and a moderator approves it, mirroring how
 * listings are moderated: `approvalStatus` gates whether it can be used, and
 * the request records who asked so the decision can be traced back.
 */
@Entity('grocery_brands')
@Index(['approvalStatus'])
export class GroceryBrand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  slug: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  /** Who makes it — what a moderator checks the request against. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  manufacturer: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Unapproved brands are invisible to shoppers and unusable on a listing.
   *
   * Unlike a product, the default here is PENDING even for rows created by a
   * backfill — every existing brand string was seller-supplied and none was
   * ever reviewed, so treating them as approved would be inventing a decision
   * nobody made. The backfill approves them explicitly instead, which leaves a
   * record that it was a migration and not a moderator.
   */
  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  /** The seller who asked for it; null for platform-seeded brands. */
  @Column({ type: 'uuid', nullable: true })
  requestedBySellerId: string | null;

  /** Markets the brand is listed in. NULL = all. */
  @Column({ type: 'jsonb', nullable: true })
  countries: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
