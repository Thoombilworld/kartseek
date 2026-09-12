import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PaymentModule } from './payment.entity';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  SENT = 'SENT',
  VOID = 'VOID',
}

/**
 * Invoice — Unified invoice record for every completed payment across all modules.
 *
 * Generated automatically upon payment success. Contains the full financial
 * breakdown (line items, taxes, discounts) and a link to the encrypted PDF
 * stored in S3 with a user-scoped key.
 *
 * Security:
 *  - Invoice IDs use generateDocumentId('INV') — non-guessable UUIDs
 *  - Customer PII (email, phone) encrypted via EncryptionService (AES-256-GCM)
 *  - PDF storage key generated via generateFileKey() for IDOR prevention
 *  - Download URLs are time-limited signed URLs (15-minute expiry)
 */
@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-readable, non-sequential invoice number (e.g. INV-a1b2c3d4-...) */
  @Column({ unique: true })
  @Index()
  invoiceNumber: string;

  // ── Source ─────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: PaymentModule })
  @Index()
  module: PaymentModule;

  @Column({ comment: 'The payment this invoice was generated from' })
  @Index()
  paymentId: string;

  @Column({ comment: 'Module-specific order/booking/ride/appointment ID' })
  @Index()
  orderId: string;

  // ── Participants ──────────────────────────────────────────────────────────

  @Column()
  @Index()
  customerId: string;

  @Column({ type: 'varchar', nullable: true })
  customerName: string | null;

  /** Encrypted via PiiEncryptionInterceptor */
  @Column({ type: 'varchar', nullable: true })
  customerEmail: string | null;

  /** Encrypted via PiiEncryptionInterceptor */
  @Column({ type: 'varchar', nullable: true })
  customerPhone: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  sellerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  sellerName: string | null;

  @Column({ type: 'varchar', nullable: true })
  sellerGstin: string | null;

  // ── Line Items ────────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', comment: 'Array of line items with name, qty, unit price, total' })
  lineItems: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    total: number;
    hsnCode?: string;
  }>;

  // ── Financial Breakdown ───────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  serviceFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'varchar', nullable: true })
  couponCode: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  walletDeduction: number;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Tax breakdown by type (GST, CGST, SGST, VAT, etc.)',
  })
  taxBreakdown: Array<{
    taxType: string;
    rate: number;
    amount: number;
  }>;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalTax: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  grandTotal: number;

  @Column({ length: 3 })
  currency: string;

  // ── Payment Info ──────────────────────────────────────────────────────────

  @Column({ length: 30 })
  paymentMethod: string;

  @Column({ length: 30 })
  paymentGateway: string;

  /** Masked card number (PCI: first 6 + last 4 only) — set by PciSecurityService.maskPan() */
  @Column({ type: 'varchar', nullable: true })
  maskedCardNumber: string | null;

  // ── PDF ────────────────────────────────────────────────────────────────────

  /** S3 key generated via generateFileKey(userId, 'invoice.pdf') */
  @Column({ type: 'varchar', nullable: true })
  pdfStorageKey: string | null;

  /** Time-limited signed download URL (regenerated on each request) */
  @Column({ type: 'varchar', nullable: true })
  pdfUrl: string | null;

  // ── Region ────────────────────────────────────────────────────────────────

  /**
   * MARKET COLUMN — ISO-2, the platform's `region_code` under another name.
   *
   * Payment predates the convention and calls it `countryCode`; every scope
   * check in this module reads THIS column, and a new entity here uses
   * `regionCode` (2026-09-12 audit I7). The register of exceptions lives in
   * `libs/common/src/market/market-scope.ts`, above `normaliseMarket` — which is
   * what every one of those checks passes through, so one rule serves both
   * spellings and no caller has to remember which.
   */
  @Column({ length: 2 })
  countryCode: string;

  @Column({ type: 'varchar', nullable: true, comment: 'Billing address for the invoice' })
  billingAddress: string | null;

  // ── Status ────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.ISSUED })
  status: InvoiceStatus;

  @Column({ type: 'timestamptz' })
  issuedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
