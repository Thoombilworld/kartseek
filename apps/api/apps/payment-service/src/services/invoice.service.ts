import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KafkaProducerService } from '@app/kafka';
import { RedisService } from '@app/redis';
import * as crypto from 'crypto';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { Payment, PaymentModule } from '../entities/payment.entity';

/**
 * InvoiceService — End-to-end invoice generation and security.
 *
 * Security layers applied to every invoice:
 *  1. Invoice IDs:     Cryptographic UUIDs (non-guessable) via crypto.randomUUID()
 *  2. Invoice Numbers: Prefixed with 'INV-' + short UUID for human readability
 *  3. Customer PII:    Email/phone encrypted via EncryptionService (AES-256-GCM)
 *  4. Card Data:       NEVER stored — PciComplianceInterceptor strips PAN/CVV globally
 *  5. PDF Storage:     User-scoped S3 keys prevent IDOR (generateFileKey)
 *  6. PDF Download:    Signed URLs with 15-minute expiry
 *  7. Access Control:  JwtAuthGuard + ResourceOwnershipGuard on download
 *  8. Audit Trail:     Kafka event 'invoice.generated' with correlation ID
 */
@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly kafka: KafkaProducerService,
    private readonly redis: RedisService,
  ) {}

  // ── Generate Invoice ──────────────────────────────────────────────────────

  async generateInvoiceForPayment(paymentId: string, orderDetails?: OrderDetails): Promise<Invoice> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

    // Check if invoice already exists
    const existing = await this.invoiceRepo.findOne({ where: { paymentId } });
    if (existing) {
      this.logger.log(`Invoice already exists for payment ${paymentId}: ${existing.invoiceNumber}`);
      return existing;
    }

    const invoiceNumber = `INV-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    // Build line items from order details
    const lineItems = this.buildLineItems(payment, orderDetails);
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

    // Tax breakdown
    const taxBreakdown = this.calculateTaxBreakdown(
      Number(payment.platformCommission),
      payment.countryCode,
    );
    const totalTax = taxBreakdown.reduce((sum, t) => sum + t.amount, 0);

    // Create invoice
    const invoice = this.invoiceRepo.create({
      invoiceNumber,
      module: payment.module,
      paymentId: payment.id,
      orderId: payment.orderId,
      customerId: payment.customerId,
      customerName: orderDetails?.customerName,
      customerEmail: orderDetails?.customerEmail,   // Will be encrypted by PiiInterceptor
      customerPhone: orderDetails?.customerPhone,   // Will be encrypted by PiiInterceptor
      sellerId: payment.sellerId,
      sellerName: orderDetails?.sellerName,
      sellerGstin: orderDetails?.sellerGstin,
      lineItems,
      subtotal,
      deliveryFee: orderDetails?.deliveryFee || 0,
      serviceFee: orderDetails?.serviceFee || 0,
      discount: orderDetails?.discount || 0,
      couponCode: orderDetails?.couponCode,
      walletDeduction: Number(payment.walletAmountUsed) || 0,
      taxBreakdown,
      totalTax,
      grandTotal: Number(payment.amount),
      currency: payment.currency,
      paymentMethod: payment.methodType || payment.gateway,
      paymentGateway: payment.gateway,
      countryCode: payment.countryCode,
      billingAddress: orderDetails?.billingAddress,
      status: InvoiceStatus.ISSUED,
      issuedAt: new Date(),
    });

    // Generate secure PDF storage key (user-scoped for IDOR prevention)
    invoice.pdfStorageKey = this.generateSecurePdfKey(payment.customerId, invoiceNumber);

    await this.invoiceRepo.save(invoice);

    // Link invoice to payment
    payment.invoiceId = invoice.id;
    await this.paymentRepo.save(payment);

    // Publish event
    await this.kafka.publish('invoice.generated', {
      invoiceId: invoice.id,
      invoiceNumber,
      paymentId: payment.id,
      module: payment.module,
      orderId: payment.orderId,
      customerId: payment.customerId,
      grandTotal: invoice.grandTotal,
      currency: invoice.currency,
    });

    this.logger.log(`Invoice generated: ${invoiceNumber} | Payment: ${payment.paymentNumber} | ${invoice.currency} ${invoice.grandTotal}`);

    return invoice;
  }

  // ── PDF Generation ────────────────────────────────────────────────────────

  /**
   * Generate invoice PDF (server-side).
   *
   * In production, uses pdfkit or puppeteer to generate the PDF.
   * The PDF is encrypted and uploaded to S3 with a user-scoped key.
   */
  async generatePdf(invoiceId: string): Promise<{ pdfUrl: string; expiresAt: Date }> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);

    // TODO: Replace with actual PDF generation (pdfkit/puppeteer)
    // const pdfBuffer = await this.renderPdf(invoice);
    // await this.s3.upload(invoice.pdfStorageKey, pdfBuffer, 'application/pdf');

    // Generate time-limited signed download URL (15-minute expiry).
    // `pdfStorageKey` is nullable — it is set when the PDF is actually stored,
    // and signing `null` produced a URL that 404s at the CDN rather than an
    // error the caller could act on.
    if (!invoice.pdfStorageKey) {
      throw new BadRequestException(
        `Invoice ${invoice.invoiceNumber ?? invoice.id} has no stored PDF to link to.`,
      );
    }
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const signedUrl = this.generateSignedUrl(invoice.pdfStorageKey, expiresAt);

    invoice.pdfUrl = signedUrl;
    await this.invoiceRepo.save(invoice);

    return { pdfUrl: signedUrl, expiresAt };
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async getInvoiceById(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    return invoice;
  }

  async getInvoiceByPayment(paymentId: string): Promise<Invoice | null> {
    return this.invoiceRepo.findOne({ where: { paymentId } });
  }

  async getCustomerInvoices(customerId: string, page = 1, limit = 20) {
    const [data, total] = await this.invoiceRepo.findAndCount({
      where: { customerId },
      order: { issuedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, hasMore: total > page * limit };
  }

  async getSellerInvoices(sellerId: string, page = 1, limit = 20) {
    const [data, total] = await this.invoiceRepo.findAndCount({
      where: { sellerId },
      order: { issuedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, hasMore: total > page * limit };
  }

  async voidInvoice(invoiceId: string, reason: string): Promise<Invoice> {
    const invoice = await this.getInvoiceById(invoiceId);
    invoice.status = InvoiceStatus.VOID;
    await this.invoiceRepo.save(invoice);
    this.logger.warn(`Invoice VOIDED: ${invoice.invoiceNumber} — ${reason}`);
    return invoice;
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private buildLineItems(
    payment: Payment,
    details?: OrderDetails,
  ): Array<{ name: string; description?: string; quantity: number; unitPrice: number; total: number; hsnCode?: string }> {
    if (details?.items?.length) {
      return details.items.map(item => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
        hsnCode: item.hsnCode,
      }));
    }

    // Fallback: single line item for the module
    const moduleLabels: Record<string, string> = {
      [PaymentModule.MARKETPLACE]: 'Marketplace Order',
      [PaymentModule.GROCERY]: 'Grocery Order',
      [PaymentModule.RESTAURANT]: 'Food Order',
      [PaymentModule.PHARMACY]: 'Pharmacy Order',
      [PaymentModule.HOTEL]: 'Hotel Booking',
      [PaymentModule.TAXI]: 'Taxi Ride',
      [PaymentModule.DOCTOR]: 'Doctor Appointment',
      [PaymentModule.WALLET_TOPUP]: 'Wallet Recharge',
    };

    return [{
      name: moduleLabels[payment.module] || 'Service Payment',
      description: `Order: ${payment.orderId}`,
      quantity: 1,
      unitPrice: Number(payment.amount),
      total: Number(payment.amount),
    }];
  }

  private calculateTaxBreakdown(commissionAmount: number, countryCode: string): Array<{ taxType: string; rate: number; amount: number }> {
    // Tax rules per region
    switch (countryCode) {
      case 'IN':
        // India: GST split into CGST + SGST
        const gstRate = 0.18;
        const halfRate = gstRate / 2;
        const cgst = Math.round(commissionAmount * halfRate * 100) / 100;
        const sgst = Math.round(commissionAmount * halfRate * 100) / 100;
        return [
          { taxType: 'CGST', rate: halfRate, amount: cgst },
          { taxType: 'SGST', rate: halfRate, amount: sgst },
        ];
      case 'AE':
      case 'SA':
      case 'QA':
        // GCC: 5% VAT
        const vatAmount = Math.round(commissionAmount * 0.05 * 100) / 100;
        return [{ taxType: 'VAT', rate: 0.05, amount: vatAmount }];
      case 'UK':
        // UK: 20% VAT
        const ukVat = Math.round(commissionAmount * 0.20 * 100) / 100;
        return [{ taxType: 'VAT', rate: 0.20, amount: ukVat }];
      case 'SG':
        // Singapore: 9% GST
        const sgGst = Math.round(commissionAmount * 0.09 * 100) / 100;
        return [{ taxType: 'GST', rate: 0.09, amount: sgGst }];
      case 'IN':
        // India: 16% VAT
        const keVat = Math.round(commissionAmount * 0.16 * 100) / 100;
        return [{ taxType: 'VAT', rate: 0.16, amount: keVat }];
      default:
        return [];
    }
  }

  /**
   * Generate user-scoped PDF storage key (prevents IDOR attacks).
   * Pattern: invoices/{userId}/{year}/{invoiceNumber}.pdf
   */
  private generateSecurePdfKey(customerId: string, invoiceNumber: string): string {
    const year = new Date().getFullYear();
    const hash = crypto.createHash('sha256').update(customerId).digest('hex').substring(0, 8);
    return `invoices/${hash}/${year}/${invoiceNumber}.pdf`;
  }

  /**
   * Generate a signed download URL with expiry (simulated).
   * In production: use AWS S3 getSignedUrl() or equivalent.
   */
  private generateSignedUrl(storageKey: string, expiresAt: Date): string {
    const signature = crypto
      .createHmac('sha256', 'invoice-signing-secret')
      .update(`${storageKey}:${expiresAt.toISOString()}`)
      .digest('hex')
      .substring(0, 16);
    return `/api/v1/invoices/download?key=${encodeURIComponent(storageKey)}&expires=${expiresAt.toISOString()}&sig=${signature}`;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderDetails {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  sellerName?: string;
  sellerGstin?: string;
  billingAddress?: string;
  deliveryFee?: number;
  serviceFee?: number;
  discount?: number;
  couponCode?: string;
  items?: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    hsnCode?: string;
  }>;
}
