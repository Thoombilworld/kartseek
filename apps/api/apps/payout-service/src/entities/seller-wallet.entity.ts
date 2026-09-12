import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * A seller's spendable and escrowed balance.
 *
 * marketplace-service already answers `GET /admin/marketplace/seller-wallets`
 * predicated on `sellers.regionCode`, while the payout routes beside it refused
 * a region-locked admin outright — so "a seller's spendable money" had two
 * answers depending on which route you asked (AUD2-086 / I12). The market
 * column below is what lets the two agree.
 */
@Entity('seller_wallets')
export class SellerWallet {
  @PrimaryColumn()
  sellerId: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  availableBalance: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  escrowBalance: number;

  @CreateDateColumn()
  createdAt: Date;

  /**
   * MARKET COLUMN — ISO-2, stamped from the owning seller, never from a request.
   *
   * NULL is "not yet attributed", which keeps the row refused for a locked
   * admin. A wallet created for a seller this service cannot resolve (the
   * databases split, the seller row gone) therefore fails closed rather than
   * becoming visible to every market.
   */
  @Column({ name: 'region_code', type: 'varchar', length: 2, nullable: true })
  @Index()
  regionCode: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
