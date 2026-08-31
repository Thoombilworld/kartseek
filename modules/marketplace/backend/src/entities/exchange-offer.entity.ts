import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Exchange Offer Entity
 *
 * Represents a product exchange/trade-in offer (e.g., "Exchange your old phone and get up to ₹15,000 off").
 * Managed centrally by Super Admin and displayed on eligible product pages.
 */
@Entity('exchange_offers')
export class ExchangeOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Display title (e.g., "Exchange your old phone — get up to ₹15,000 off") */
  @Column({ type: 'varchar', nullable: true, default: '' })
  title: string | null;

  /** Description shown on the product page */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Category of product the customer trades in (e.g., "Smartphones", "Laptops") */
  @Column({ type: 'varchar', nullable: true, default: '' })
  exchangeCategory: string | null;

  /** Category of product the customer is buying */
  @Column({ type: 'varchar', nullable: true, default: '' })
  targetCategory: string | null;

  /** Maximum exchange value in currency */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  maxExchangeValue: number | null;

  /** Minimum exchange value */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minExchangeValue: number;

  /** Bonus amount added on top of exchange valuation (e.g., "Extra ₹2000 off") */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  bonusAmount: number;

  /** Conditions for the exchanged item (e.g., working, screen intact) */
  @Column({ type: 'jsonb', nullable: true })
  eligibilityCriteria: Record<string, any> | null;
  /*
   * Example:
   * {
   *   "conditions": ["Screen must be intact", "Device must power on", "No water damage"],
   *   "minAge": null,
   *   "maxAge": "5 years",
   *   "brands": ["Apple", "Samsung", "OnePlus", "Xiaomi"]
   * }
   */

  /** Specific product IDs this exchange applies to (null = all in targetCategory) */
  @Column({ type: 'simple-array', nullable: true })
  applicableProductIds: string[];

  /** Specific brand IDs this exchange applies to (null = all) */
  @Column({ type: 'simple-array', nullable: true })
  applicableBrandIds: string[];

  /** Countries where this exchange is available */
  @Column({ type: 'simple-array', nullable: true })
  applicableCountries: string[];

  /** Exchange icon/image URL */
  @Column({ type: 'varchar', nullable: true })
  iconUrl: string | null;

  /** How the exchange is fulfilled */
  @Column({ default: 'PICKUP' })
  fulfillmentMode: string; // PICKUP | DROP_OFF | COURIER

  /** Offer start date */
  @Column({ type: 'timestamp' })
  startsAt: Date;

  /** Offer end date */
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  /** Display priority (lower = higher priority) */
  @Column({ type: 'int', default: 100 })
  priority: number;

  /** Offer status */
  @Column({ default: 'ACTIVE' })
  status: string; // DRAFT | ACTIVE | PAUSED | EXPIRED | ARCHIVED

  /** Whether this offer is highlighted/featured */
  @Column({ default: false })
  isFeatured: boolean;

  /** Total exchanges processed via this offer */
  @Column({ type: 'int', default: 0 })
  totalExchanges: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}