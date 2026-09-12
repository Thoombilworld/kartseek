import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Bank Offer Entity
 *
 * Represents a bank/card partnership offer (e.g., "10% Instant Discount with HDFC Credit Card").
 * Managed centrally by Super Admin and displayed on product pages + checkout.
 */
@Entity('bank_offers')
export class BankOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Display title (e.g., "10% Instant Discount with HDFC Credit Card") */
  @Column({ type: 'varchar', nullable: true, default: '' })
  title: string | null;

  /** Short description for product page display */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Bank/issuer name (e.g., "HDFC Bank", "SBI", "Barclays") */
  @Column({ type: 'varchar', nullable: true, default: '' })
  bankName: string | null;

  /** Card type this offer applies to */
  @Column({ default: 'ALL' })
  cardType: string; // CREDIT | DEBIT | ALL | EMI | UPI | WALLET

  /** Card network (e.g., "VISA", "MASTERCARD", "RUPAY", "ALL") */
  @Column({ default: 'ALL' })
  cardNetwork: string;

  /** Discount type */
  @Column({ default: 'PERCENTAGE' })
  discountType: string; // PERCENTAGE | FLAT

  /** Discount value (e.g., 10 for 10% or 500 for ₹500 flat off) */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  discountValue: number | null;

  /** Maximum discount cap in currency (e.g., ₹1500 max off) */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscount: number | null;

  /** Minimum order value to avail the offer */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minOrderValue: number;

  /** Bank logo URL for display */
  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  /** Terms and conditions */
  @Column({ type: 'text', nullable: true })
  termsAndConditions: string | null;

  /** Which product categories this offer applies to (null = all) */
  @Column({ type: 'simple-array', nullable: true })
  applicableCategories: string[];

  /** Which countries this offer is active in */
  @Column({ type: 'simple-array', nullable: true })
  applicableCountries: string[];

  /** Maximum number of times this offer can be used in total */
  @Column({ type: 'int', nullable: true })
  totalUsageLimit: number | null;

  /** Maximum usage per customer */
  @Column({ type: 'int', nullable: true })
  perUserLimit: number | null;

  /** Current total usage count */
  @Column({ type: 'int', default: 0 })
  usageCount: number;

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

  /**
   * MARKET COLUMN — ISO-2, the platform's one spelling (2026-09-12 audit I7).
   *
   * A bank's cards are one country's. Every scope check on this entity reads
   * THIS column; `applicableCountries` above is display metadata the offer
   * carousel renders and is NOT a boundary — two encodings of the same fact is
   * how "which market does this run in" came to have four answers (AUD2-082).
   *
   * Deliberately NO `length: 2`, unlike the new columns this task adds. This
   * column already exists as an unbounded varchar, and narrowing it is a
   * destructive ALTER under `synchronize`: doing so in dev dropped and recreated
   * the column, silently emptying the two rows that had a market. The values
   * here are ISO-2 by convention and by `normaliseMarket`, and tightening the
   * type needs a marketplace migration rather than a type annotation.
   */
  @Column({ name: 'region_code', type: 'varchar', nullable: true })
  regionCode: string | null;

  /**
   * "Runs in every market", said explicitly rather than by absence.
   *
   * A NULL `region_code` meant two different things — an offer that genuinely
   * runs everywhere, and one nobody has attributed yet — and `assertInMarket`
   * had to refuse both to be safe, which it still does. The flag is what lets
   * an operator reading `[region-scope-denied]` tell a global offer from a
   * missing backfill. Read it through `isGlobalMarket(row)`, never as
   * `!row.regionCode`.
   */
  @Column({ name: 'is_global', type: 'boolean', default: false })
  isGlobal: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
