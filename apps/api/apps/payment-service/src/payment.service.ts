import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import * as crypto from 'crypto';
import { Payment, PaymentStatus, PaymentModule, PaymentGateway } from './entities/payment.entity';
import { GatewayAdapterFactory } from './adapters/gateway-adapter.factory';
import { RealTimeBillingService } from './services/realtime-billing.service';

/**
 * PaymentOrchestratorService — Central entry point for ALL payment processing.
 *
 * Every module (Marketplace, Grocery, Restaurant, Pharmacy, Hotel, Taxi,
 * Doctor, Wallet) routes payments through this single service. It:
 *
 *  1. Resolves the correct gateway adapter via GatewayAdapterFactory
 *  2. Creates a unified Payment record with module/region context
 *  3. Delegates to the gateway adapter for initiation/verification
 *  4. Publishes Kafka events for downstream services (settlement, invoice, notification)
 *  5. Provides Super Admin dashboard queries
 */
@Injectable()
export class PaymentOrchestratorService {
  private readonly logger = new Logger(PaymentOrchestratorService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly gatewayFactory: GatewayAdapterFactory,
    private readonly billingService: RealTimeBillingService,
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ── Core: Initiate Payment ────────────────────────────────────────────────

  async initiatePayment(dto: InitiatePaymentDto): Promise<PaymentResult> {
    this.logger.log(
      `[Payment] Initiating | Module: ${dto.module} | ${dto.currency} ${dto.amount} | ` +
      `Country: ${dto.countryCode} | Method: ${dto.methodType}`,
    );

    // 1. Validate
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');

    // 2. Resolve gateway adapter
    const adapter = await this.gatewayFactory.getAdapter(dto.countryCode, dto.methodType);
    const gatewayEnum = this.resolveGatewayEnum(adapter.gatewayName);

    // 3. Create payment record
    const paymentNumber = `PAY-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const payment = this.paymentRepo.create({
      paymentNumber,
      module: dto.module,
      orderId: dto.orderId,
      customerId: dto.customerId,
      sellerId: dto.sellerId,
      franchiseId: dto.franchiseId,
      amount: dto.amount,
      currency: dto.currency,
      gateway: gatewayEnum,
      status: PaymentStatus.INITIATED,
      countryCode: dto.countryCode,
      methodType: dto.methodType,
      callbackUrl: dto.callbackUrl,
      walletAmountUsed: dto.walletAmount || 0,
      metadata: dto.metadata,
    });

    await this.paymentRepo.save(payment);

    // 4. Initiate at gateway
    const result = await adapter.initiate({
      paymentId: payment.id,
      paymentNumber,
      amount: dto.amount - (dto.walletAmount || 0),
      currency: dto.currency,
      customerId: dto.customerId,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      orderId: dto.orderId,
      description: `${dto.module} payment: ${dto.orderId}`,
      callbackUrl: dto.callbackUrl,
      webhookUrl: dto.webhookUrl,
      metadata: dto.metadata,
    });

    // 5. Update payment with gateway response
    payment.gatewayOrderId = result.gatewayOrderId;
    payment.gatewayPaymentId = result.gatewayPaymentId || null;
    payment.checkoutUrl = result.checkoutUrl || null;
    payment.gatewayResponse = result.rawResponse || null;
    payment.status = PaymentStatus.PROCESSING;
    await this.paymentRepo.save(payment);

    // 6. Cache for fast lookup
    await this.redis.setJson(`payment:${payment.id}`, payment, 3600);
    await this.redis.setJson(`payment:order:${dto.orderId}`, payment, 3600);

    // 7. Publish event
    await this.kafka.publish('payment.v2.initiated', {
      paymentId: payment.id,
      paymentNumber,
      module: dto.module,
      orderId: dto.orderId,
      amount: dto.amount,
      currency: dto.currency,
      gateway: adapter.gatewayName,
      countryCode: dto.countryCode,
    });

    this.logger.log(`[Payment] Initiated ${paymentNumber} via ${adapter.gatewayName}`);

    return {
      success: true,
      paymentId: payment.id,
      paymentNumber,
      gatewayOrderId: result.gatewayOrderId,
      checkoutUrl: result.checkoutUrl,
      paymentToken: result.paymentToken,
      upiIntentLink: result.upiIntentLink,
      qrCodeData: result.qrCodeData,
    };
  }

  // ── Core: Verify Payment ──────────────────────────────────────────────────

  async verifyPayment(dto: VerifyPaymentDto): Promise<VerifyResult> {
    const payment = await this.findPaymentOrFail(dto.paymentId);
    const adapter = this.gatewayFactory.getAdapterByName(payment.gateway);

    // `gatewayOrderId` is nullable: it is written only once the gateway has
    // accepted the intent, so a payment that never reached the gateway has
    // none. Passing `null` through to the adapter meant asking the provider to
    // verify order `null`, whose response is provider-specific and none of it
    // useful. Refusing here says which payment and why.
    if (!payment.gatewayOrderId) {
      throw new BadRequestException(
        `Payment ${payment.paymentNumber} was never registered with ${payment.gateway}, so there is nothing to verify.`,
      );
    }

    this.logger.log(`[Payment] Verifying ${payment.paymentNumber} via ${payment.gateway}`);

    const result = await adapter.verify({
      gatewayOrderId: payment.gatewayOrderId,
      gatewayPaymentId: dto.gatewayPaymentId,
      gatewaySignature: dto.gatewaySignature,
      rawPayload: dto.rawPayload,
      headers: dto.headers,
    });

    // Escrow: successful payments go to ESCROW_HOLD
    const newStatus = result.verified
      ? PaymentStatus.ESCROW_HOLD
      : PaymentStatus.FAILED;

    payment.status = newStatus;
    payment.gatewayPaymentId = result.gatewayPaymentId;
    payment.gatewayResponse = result.rawResponse || null;
    payment.verifiedAt = result.verified ? new Date() : null;
    payment.failureReason = result.failureReason || null;
    await this.paymentRepo.save(payment);

    // Update cache
    await this.redis.setJson(`payment:${payment.id}`, payment, 3600);

    if (result.verified) {
      // Calculate commission splits
      await this.calculateCommissionSplits(payment);

      await this.kafka.publish('payment.v2.completed', {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        module: payment.module,
        orderId: payment.orderId,
        customerId: payment.customerId,
        sellerId: payment.sellerId,
        amount: payment.amount,
        currency: payment.currency,
        countryCode: payment.countryCode,
        gateway: payment.gateway,
        platformCommission: payment.platformCommission,
        netSellerAmount: payment.netSellerAmount,
      });

      await this.kafka.publish('payment.escrow.held', {
        paymentId: payment.id,
        orderId: payment.orderId,
        sellerId: payment.sellerId,
        amount: payment.amount,
      });
    } else {
      await this.kafka.publish('payment.v2.failed', {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        orderId: payment.orderId,
        reason: result.failureReason,
      });
    }

    return {
      verified: result.verified,
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      status: newStatus,
    };
  }

  // ── Core: Webhook Handler ─────────────────────────────────────────────────

  async handleWebhook(gateway: string, payload: any, signature: string): Promise<void> {
    this.logger.log(`[Payment] Webhook received from ${gateway}`);

    const adapter = this.gatewayFactory.getAdapterByName(gateway);
    const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const isValid = adapter.validateWebhookSignature(rawPayload, signature, '');
    if (!isValid) {
      this.logger.warn(`[Payment] Invalid webhook signature from ${gateway}`);
      return;
    }

    // Extract payment ID from webhook payload and verify
    const gatewayPaymentId = this.extractPaymentIdFromWebhook(gateway, payload);
    if (!gatewayPaymentId) return;

    const payment = await this.paymentRepo.findOne({
      where: { gatewayOrderId: gatewayPaymentId },
    });

    if (payment && payment.status === PaymentStatus.PROCESSING) {
      await this.verifyPayment({
        paymentId: payment.id,
        gatewayPaymentId,
        rawPayload: payload,
      });
    }
  }

  // ── Module-Specific Convenience Methods ───────────────────────────────────

  async processOrderPayment(dto: OrderPaymentDto): Promise<PaymentResult> {
    return this.initiatePayment({
      module: dto.module,
      orderId: dto.orderId,
      customerId: dto.customerId,
      sellerId: dto.sellerId,
      franchiseId: dto.franchiseId,
      amount: dto.amount,
      currency: dto.currency,
      countryCode: dto.countryCode,
      methodType: dto.methodType,
      callbackUrl: dto.callbackUrl,
      webhookUrl: dto.webhookUrl,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      walletAmount: dto.walletAmount,
      metadata: {
        items: dto.items,
        deliveryFee: dto.deliveryFee,
        couponCode: dto.couponCode,
      },
    });
  }

  async processTaxiPayment(dto: {
    rideId: string; customerId: string; customerEmail?: string;
    estimatedFare: number; currency: string; countryCode: string; paymentMethod: string;
  }): Promise<any> {
    return this.billingService.preAuthorize({
      rideId: dto.rideId,
      customerId: dto.customerId,
      customerEmail: dto.customerEmail,
      estimatedFare: dto.estimatedFare,
      currency: dto.currency,
      countryCode: dto.countryCode,
      paymentMethod: dto.paymentMethod,
    });
  }

  async captureTaxiFare(rideId: string, finalFare: number, tipAmount?: number, discount?: number): Promise<any> {
    return this.billingService.captureRideFare({ rideId, finalFare, tipAmount, discount });
  }

  async processWalletTopup(dto: {
    userId: string; amount: number; currency: string;
    countryCode: string; methodType: string; callbackUrl?: string;
  }): Promise<PaymentResult> {
    return this.initiatePayment({
      module: PaymentModule.WALLET_TOPUP,
      orderId: `TOPUP-${crypto.randomUUID().substring(0, 8)}`,
      customerId: dto.userId,
      amount: dto.amount,
      currency: dto.currency,
      countryCode: dto.countryCode,
      methodType: dto.methodType,
      callbackUrl: dto.callbackUrl,
      metadata: { type: 'wallet_topup' },
    });
  }

  // ── Escrow Release ────────────────────────────────────────────────────────

  async releaseEscrow(orderId: string): Promise<{ success: boolean; paymentId?: string }> {
    const payment = await this.paymentRepo.findOne({
      where: { orderId, status: PaymentStatus.ESCROW_HOLD },
    });

    if (!payment) {
      this.logger.warn(`No escrow hold found for order: ${orderId}`);
      return { success: false };
    }

    payment.status = PaymentStatus.ESCROW_RELEASED;
    payment.settledAt = new Date();
    await this.paymentRepo.save(payment);

    await this.kafka.publish('payment.escrow.released', {
      paymentId: payment.id,
      orderId,
      sellerId: payment.sellerId,
      amount: payment.amount,
      netSellerAmount: payment.netSellerAmount,
      platformCommission: payment.platformCommission,
    });

    this.logger.log(`Escrow released for ${payment.paymentNumber} | Order: ${orderId}`);
    return { success: true, paymentId: payment.id };
  }

  // ── Refunds ───────────────────────────────────────────────────────────────

  async initiateRefund(dto: {
    paymentId: string; amount: number; reason: string; initiatedBy: string;
  }): Promise<RefundResult> {
    const payment = await this.findPaymentOrFail(dto.paymentId);

    if (![PaymentStatus.SUCCESS, PaymentStatus.ESCROW_HOLD, PaymentStatus.ESCROW_RELEASED].includes(payment.status)) {
      throw new BadRequestException(`Cannot refund payment in status: ${payment.status}`);
    }

    const maxRefundable = Number(payment.amount) - Number(payment.refundedAmount);
    if (dto.amount > maxRefundable) {
      throw new BadRequestException(`Max refundable amount: ${maxRefundable}`);
    }

    const adapter = this.gatewayFactory.getAdapterByName(payment.gateway);

    // A refund needs the gateway's own payment id, and that is nullable — it
    // is set when the charge succeeds. Sending `null` asked the provider to
    // refund a charge it could not identify; on some adapters that is a 4xx,
    // on others an ambiguous success. Neither belongs on a money path.
    if (!payment.gatewayPaymentId) {
      throw new BadRequestException(
        `Payment ${payment.paymentNumber} has no gateway charge to refund.`,
      );
    }

    const refundId = `REF-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    const result = await adapter.refund({
      gatewayPaymentId: payment.gatewayPaymentId,
      amount: dto.amount,
      currency: payment.currency,
      reason: dto.reason,
      refundId,
    });

    if (result.success) {
      payment.refundedAmount = Number(payment.refundedAmount) + dto.amount;
      payment.status = payment.refundedAmount >= Number(payment.amount)
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;
      await this.paymentRepo.save(payment);

      await this.kafka.publish('payment.v2.refund.completed', {
        paymentId: payment.id,
        refundId,
        orderId: payment.orderId,
        customerId: payment.customerId,
        amount: dto.amount,
        reason: dto.reason,
        initiatedBy: dto.initiatedBy,
      });
    }

    return {
      success: result.success,
      refundId,
      gatewayRefundId: result.gatewayRefundId,
      amount: dto.amount,
      status: result.status,
    };
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async getPaymentById(paymentId: string): Promise<Payment> {
    return this.findPaymentOrFail(paymentId);
  }

  async getPaymentByOrder(orderId: string): Promise<Payment | null> {
    return this.paymentRepo.findOne({ where: { orderId } });
  }

  async getCustomerPayments(customerId: string, page = 1, limit = 20) {
    const [data, total] = await this.paymentRepo.findAndCount({
      where: { customerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, hasMore: total > page * limit };
  }

  async getAvailablePaymentMethods(countryCode: string, module?: string) {
    return this.gatewayFactory.getAvailableMethods(countryCode, module);
  }

  // ── Super Admin Dashboard ─────────────────────────────────────────────────

  async getPaymentsDashboard(filters: DashboardFilters) {
    const qb = this.paymentRepo.createQueryBuilder('p');

    if (filters.module) qb.andWhere('p.module = :module', { module: filters.module });
    if (filters.countryCode) qb.andWhere('p.countryCode = :cc', { cc: filters.countryCode });
    if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
    if (filters.gateway) qb.andWhere('p.gateway = :gw', { gw: filters.gateway });
    if (filters.startDate) qb.andWhere('p.createdAt >= :start', { start: new Date(filters.startDate) });
    if (filters.endDate) qb.andWhere('p.createdAt <= :end', { end: new Date(filters.endDate) });
    if (filters.sellerId) qb.andWhere('p.sellerId = :sid', { sid: filters.sellerId });

    // Aggregate stats
    const totalStats = await qb.clone()
      .select('COUNT(p.id)', 'totalTransactions')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'totalVolume')
      .addSelect('COALESCE(SUM(p."platformCommission"), 0)', 'totalCommission')
      .addSelect('COALESCE(SUM(p."netSellerAmount"), 0)', 'totalSellerPayouts')
      .addSelect('COALESCE(SUM(p."taxAmount"), 0)', 'totalTax')
      .addSelect('COALESCE(SUM(p."refundedAmount"), 0)', 'totalRefunds')
      .getRawOne();

    // Module-wise breakdown
    const moduleBreakdown = await this.paymentRepo.createQueryBuilder('p')
      .select('p.module', 'module')
      .addSelect('COUNT(p.id)', 'transactions')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'volume')
      .addSelect('COALESCE(SUM(p."platformCommission"), 0)', 'commission')
      .where(filters.startDate ? 'p.createdAt >= :start' : '1=1', { start: filters.startDate ? new Date(filters.startDate) : undefined })
      .andWhere(filters.endDate ? 'p.createdAt <= :end' : '1=1', { end: filters.endDate ? new Date(filters.endDate) : undefined })
      .groupBy('p.module')
      .getRawMany();

    // Gateway breakdown
    const gatewayBreakdown = await this.paymentRepo.createQueryBuilder('p')
      .select('p.gateway', 'gateway')
      .addSelect('COUNT(p.id)', 'transactions')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'volume')
      .where(filters.startDate ? 'p.createdAt >= :start' : '1=1', { start: filters.startDate ? new Date(filters.startDate) : undefined })
      .andWhere(filters.endDate ? 'p.createdAt <= :end' : '1=1', { end: filters.endDate ? new Date(filters.endDate) : undefined })
      .groupBy('p.gateway')
      .getRawMany();

    // Recent payments (paginated)
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const [recentPayments, recentTotal] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      summary: {
        totalTransactions: Number(totalStats.totalTransactions),
        totalVolume: Number(totalStats.totalVolume),
        totalCommission: Number(totalStats.totalCommission),
        totalSellerPayouts: Number(totalStats.totalSellerPayouts),
        totalTax: Number(totalStats.totalTax),
        totalRefunds: Number(totalStats.totalRefunds),
        netPlatformRevenue: Number(totalStats.totalCommission) - Number(totalStats.totalRefunds),
      },
      moduleBreakdown,
      gatewayBreakdown,
      payments: {
        data: recentPayments,
        total: recentTotal,
        page,
        limit,
      },
    };
  }

  async getModuleRevenue(module: PaymentModule, startDate: string, endDate: string) {
    const stats = await this.paymentRepo.createQueryBuilder('p')
      .select('COUNT(p.id)', 'transactions')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'grossRevenue')
      .addSelect('COALESCE(SUM(p."platformCommission"), 0)', 'commission')
      .addSelect('COALESCE(SUM(p."netSellerAmount"), 0)', 'sellerPayouts')
      .addSelect('COALESCE(SUM(p."franchiseShare"), 0)', 'franchisePayouts')
      .addSelect('COALESCE(SUM(p."taxAmount"), 0)', 'tax')
      .addSelect('COALESCE(SUM(p."refundedAmount"), 0)', 'refunds')
      .where('p.module = :module', { module })
      .andWhere('p.createdAt >= :start', { start: new Date(startDate) })
      .andWhere('p.createdAt <= :end', { end: new Date(endDate) })
      .andWhere('p.status IN (:...statuses)', {
        statuses: [PaymentStatus.SUCCESS, PaymentStatus.ESCROW_HOLD, PaymentStatus.ESCROW_RELEASED],
      })
      .getRawOne();

    // Daily trend
    const dailyTrend = await this.paymentRepo.createQueryBuilder('p')
      .select('DATE(p."createdAt")', 'date')
      .addSelect('COUNT(p.id)', 'transactions')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'volume')
      .where('p.module = :module', { module })
      .andWhere('p.createdAt >= :start', { start: new Date(startDate) })
      .andWhere('p.createdAt <= :end', { end: new Date(endDate) })
      .groupBy('DATE(p."createdAt")')
      .orderBy('DATE(p."createdAt")', 'ASC')
      .getRawMany();

    return { module, startDate, endDate, stats, dailyTrend };
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private async findPaymentOrFail(paymentId: string): Promise<Payment> {
    // Check cache first
    const cached = await this.redis.getJson<Payment>(`payment:${paymentId}`);
    if (cached) return cached;

    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    return payment;
  }

  private async calculateCommissionSplits(payment: Payment): Promise<void> {
    // Commission rates per module
    const rates: Record<string, number> = {
      marketplace: 0.12,
      grocery: 0.08,
      restaurant: 0.15,
      pharmacy: 0.10,
      hotel: 0.15,
      taxi: 0.20,
      doctor: 0.20,
      wallet_topup: 0,
    };

    const rate = rates[payment.module] ?? 0.10;
    const commission = Math.round(Number(payment.amount) * rate * 100) / 100;
    const tax = Math.round(commission * 0.18 * 100) / 100; // 18% GST on commission (India)
    const netSeller = Math.round((Number(payment.amount) - commission) * 100) / 100;

    payment.commissionRate = rate;
    payment.platformCommission = commission;
    payment.taxAmount = tax;
    payment.netSellerAmount = netSeller;

    await this.paymentRepo.save(payment);
  }

  private resolveGatewayEnum(gatewayName: string): PaymentGateway {
    const map: Record<string, PaymentGateway> = {
      razorpay: PaymentGateway.RAZORPAY,
      stripe: PaymentGateway.STRIPE,
      upi: PaymentGateway.UPI,
      mada: PaymentGateway.MADA,
            wallet: PaymentGateway.WALLET,
    };
    return map[gatewayName] || PaymentGateway.STRIPE;
  }

  private extractPaymentIdFromWebhook(gateway: string, payload: any): string | null {
    switch (gateway) {
      case 'razorpay':
        return payload?.payload?.payment?.entity?.order_id || null;
      case 'stripe':
        return payload?.data?.object?.id || null;
      case 'upi':
        return payload?.Body?.stkCallback?.CheckoutRequestID || null;
      default:
        return null;
    }
  }

  async healthCheck() {
    return { service: 'payment-service', status: 'ok', timestamp: new Date().toISOString() };
  }
}

// ── DTO Types ─────────────────────────────────────────────────────────────────

export interface InitiatePaymentDto {
  module: PaymentModule;
  orderId: string;
  customerId: string;
  sellerId?: string;
  franchiseId?: string;
  amount: number;
  currency: string;
  countryCode: string;
  methodType: string;
  callbackUrl?: string;
  webhookUrl?: string;
  customerEmail?: string;
  customerPhone?: string;
  walletAmount?: number;
  metadata?: Record<string, unknown>;
}

export interface VerifyPaymentDto {
  paymentId: string;
  gatewayPaymentId: string;
  gatewaySignature?: string;
  rawPayload?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface OrderPaymentDto extends InitiatePaymentDto {
  items?: any[];
  deliveryFee?: number;
  couponCode?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  paymentNumber: string;
  gatewayOrderId?: string;
  checkoutUrl?: string;
  paymentToken?: string;
  upiIntentLink?: string;
  qrCodeData?: string;
}

export interface VerifyResult {
  verified: boolean;
  paymentId: string;
  paymentNumber: string;
  status: PaymentStatus;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  gatewayRefundId?: string;
  amount: number;
  status: string;
}

export interface DashboardFilters {
  module?: PaymentModule;
  countryCode?: string;
  status?: PaymentStatus;
  gateway?: string;
  sellerId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
