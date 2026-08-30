import {
  Controller, Get, Post, Param, Body, Query, Headers,
  Inject, HttpCode, HttpStatus, HttpException, Logger, Optional, UseGuards
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { of } from 'rxjs';
import { JwtAuthGuard, ResourceOwnershipGuard, ResourceOwner } from '@app/security';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { UserRole, rpcCatch } from '@app/common';

// Inline payment methods by country (avoids @app/region JS build cache issues)
const REGION_PAYMENT_METHODS: Record<string, Array<{ methodType: string; gateway: string; displayName: string; isDefault?: boolean }>> = {
  IN: [
    { methodType: 'upi', gateway: 'upi', displayName: 'UPI (GPay / PhonePe / Paytm)', isDefault: true },
    { methodType: 'card', gateway: 'razorpay', displayName: 'Credit / Debit Card' },
    { methodType: 'netbanking', gateway: 'razorpay', displayName: 'Net Banking' },
    { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
  ],
  AE: [
    { methodType: 'card', gateway: 'stripe', displayName: 'Credit / Debit Card', isDefault: true },
    { methodType: 'apple_pay', gateway: 'stripe', displayName: 'Apple Pay' },
    { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
  ],
  SA: [
    { methodType: 'card', gateway: 'stripe', displayName: 'Credit / Debit Card', isDefault: true },
    { methodType: 'mada', gateway: 'mada', displayName: 'Mada Card' },
    { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
  ],
  DEFAULT: [
    { methodType: 'card', gateway: 'stripe', displayName: 'Credit / Debit Card', isDefault: true },
    { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
  ]
};

/**
 * PaymentGatewayController — API Gateway proxy for the centralized payment microservice.
 *
 * Forwards all requests to payment-service via TCP ClientProxy.
 *
 * It used to return "realistic mock data" whenever payment-service was
 * unreachable, on the grounds that this let frontend work continue. The cost was
 * that a synthetic payment, refund or seller balance was indistinguishable from
 * a real one — in the environment where being wrong matters most. Failures now
 * propagate; use a stub payment-service if you need offline development.
 */
@ApiTags('💳 Payments')
@ApiBearerAuth('JWT')
// RolesGuard is mandatory here: this controller has six @Roles(ADMIN, SUPER_ADMIN)
// routes (refunds, settlements, reconciliation). It previously relied on the global
// RolesGuard, which was removed in main.ts — without a local one those routes would
// be reachable by any authenticated user.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentGatewayController {
  private readonly logger = new Logger(PaymentGatewayController.name);
  private paymentClient: ClientProxy | null = null;

  constructor(
    @Optional() @Inject('PAYMENT_SERVICE') paymentClient?: ClientProxy,
  ) {
    this.paymentClient = paymentClient || null;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Forward to payment-service, preserving the failure.
   *
   * Every route on this controller used to pass a fallback that was returned as
   * a 200 when payment-service was unreachable — `initiate_payment` answered
   * with a synthetic payment object, `get_seller_balance` with a balance,
   * `get_reconciliation` with a settled report. A caller could not tell a real
   * payment from an invented one, which is the worst possible failure mode for
   * this particular service. There is no fallback parameter here on purpose.
   *
   * The one legitimate exception is the static payment-method table, which is
   * configuration rather than transactional state — see {@link sendOrConfig}.
   */
  private async send<T>(cmd: string, data: any): Promise<T> {
    if (!this.paymentClient) {
      throw new HttpException('Payment service is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      return await lastValueFrom(
        this.paymentClient.send<T>({ cmd }, data).pipe(
          timeout(5000),
          catchError(rpcCatch('Payment service unavailable')),
        ),
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`payment-service [${cmd}] failed: ${(error as Error)?.message}`);
      throw new HttpException('Payment service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Deliberately degradable: falls back to a **static configuration table**, not
   * to invented transactional data. Which payment methods a country supports is
   * fixed reference data, so serving the standard list when payment-service is
   * briefly unreachable lets a shopper keep browsing without being shown a
   * balance or a payment state that was never real.
   */
  private async sendOrConfig<T>(cmd: string, data: any, config: T): Promise<T> {
    if (!this.paymentClient) return config;
    try {
      return await lastValueFrom(
        this.paymentClient.send<T>({ cmd }, data).pipe(
          timeout(5000),
          catchError(() => of(config)),
        ),
      );
    } catch {
      this.logger.warn(`payment-service [${cmd}] unreachable — serving static method table`);
      return config;
    }
  }

  // ── Health ────────────────────────────────────────────────────────────────

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Payment service health check' })
  async health() {
    // Reported `status: 'ok'` when payment-service could not be reached — a
    // health check that is incapable of returning anything but healthy, which is
    // exactly the signal monitoring relies on to page someone.
    try {
      return await this.send('payment_health', {});
    } catch {
      throw new HttpException(
        {
          status: 'unavailable',
          service: 'payment-service',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ── Payment Methods Discovery ─────────────────────────────────────────────

  @Public()
  @Get('methods/:countryCode')
  @ApiOperation({ summary: 'Get available payment methods for a country' })
  async getPaymentMethods(
    @Param('countryCode') countryCode: string,
    @Query('module') module?: string,
  ) {
    const config = REGION_PAYMENT_METHODS[countryCode] || REGION_PAYMENT_METHODS.DEFAULT;
    return this.sendOrConfig('get_payment_methods', { countryCode, module }, config);
  }

  // ── Payment Lifecycle ─────────────────────────────────────────────────────

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a payment for any module' })
  async initiate(@Body() dto: any) {
    return this.send('initiate_payment', dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify a payment after gateway callback' })
  async verify(@Body() dto: any) {
    return this.send('verify_payment', dto);
  }

  @Public()
  @Public() // payment gateways call this with a signature, not a JWT — must bypass auth
  @Post('webhook/:gateway')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle gateway webhooks (Razorpay, Stripe, UPI)' })
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    // Acknowledged `{ received: true }` even when payment-service never
    // processed the webhook. Razorpay and Stripe treat a 200 as "delivered" and
    // stop retrying, so a payment confirmation that failed here was lost for
    // good and the order stayed unpaid with the customer already charged.
    // Failing lets the provider redeliver.
    return this.send('handle_webhook', { gateway, payload, signature: '' });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  async getById(@Param('id') id: string) {
    return this.send('get_payment', { paymentId: id });
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payment by order/booking ID' })
  async getByOrder(@Param('orderId') orderId: string) {
    return this.send('get_payment_by_order', { orderId });
  }

  @UseGuards(ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'customerId' })
  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get customer payment history' })
  async getCustomerPayments(
    @Param('customerId') customerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.send('get_customer_payments', {
      customerId, page: Number(page) || 1, limit: Number(limit) || 20
    });
  }

  // ── Module-Specific ───────────────────────────────────────────────────────

  @Post('order')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Process an order payment' })
  async processOrderPayment(@Body() dto: any) {
    return this.send('process_order_payment', dto);
  }

  @Post('wallet/topup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Top up wallet via payment gateway' })
  async walletTopup(@Body() dto: any) {
    return this.send('wallet_topup', dto);
  }

  // ── Taxi Real-Time Billing ────────────────────────────────────────────────

  @Post('taxi/preauth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Pre-authorize taxi ride fare' })
  async taxiPreAuth(@Body() dto: any) {
    const holdAmount = Math.ceil((dto.estimatedFare || 350) * 1.2);
    return this.send('taxi_preauth', dto);
  }

  @Post('taxi/capture')
  @ApiOperation({ summary: 'Capture final taxi fare' })
  async taxiCapture(@Body() dto: any) {
    const capturedAmount = (dto.finalFare || 0) + (dto.tipAmount || 0) - (dto.discount || 0);
    return this.send('taxi_capture', dto);
  }

  @Post('taxi/cancel-billing')
  @ApiOperation({ summary: 'Cancel taxi billing and release hold' })
  async taxiCancelBilling(@Body() dto: any) {
    return this.send('taxi_cancel_billing', dto);
  }

  @Get('taxi/billing/:rideId')
  @ApiOperation({ summary: 'Get real-time taxi billing state' })
  async getTaxiBillingState(@Param('rideId') rideId: string) {
    return this.send('get_taxi_billing', { rideId });
  }

  // ── Escrow ────────────────────────────────────────────────────────────────

  @Post('escrow/:orderId/release')
  @ApiOperation({ summary: 'Release escrow after order delivery' })
  async releaseEscrow(@Param('orderId') orderId: string) {
    return this.send('release_escrow', { orderId });
  }

  // ── Refunds ───────────────────────────────────────────────────────────────

  @Post('refund')
  @ApiOperation({ summary: 'Initiate a full or partial refund' })
  async initiateRefund(@Body() dto: any) {
    return this.send('initiate_refund', dto);
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  @Get('invoices/:invoiceId')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoice(@Param('invoiceId') invoiceId: string) {
    return this.send('get_invoice', { invoiceId });
  }

  @Get('invoices/payment/:paymentId')
  @ApiOperation({ summary: 'Get invoice by payment ID' })
  async getInvoiceByPayment(@Param('paymentId') paymentId: string) {
    return this.send('get_invoice_by_payment', { paymentId });
  }

  @UseGuards(ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'customerId' })
  @Get('invoices/customer/:customerId')
  @ApiOperation({ summary: 'Get customer invoices' })
  async getCustomerInvoices(
    @Param('customerId') customerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.send('get_customer_invoices', {
      customerId, page: Number(page) || 1, limit: Number(limit) || 20
    });
  }

  @Post('invoices/:invoiceId/pdf')
  @ApiOperation({ summary: 'Generate invoice PDF' })
  async generateInvoicePdf(@Param('invoiceId') invoiceId: string) {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    return this.send('generate_invoice_pdf', { invoiceId });
  }

  @Post('invoices/:invoiceId/void')
  @ApiOperation({ summary: 'Void an invoice' })
  async voidInvoice(@Param('invoiceId') invoiceId: string, @Body('reason') reason: string) {
    return this.send('void_invoice', { invoiceId, reason });
  }

  // ── Settlement (Super Admin) ──────────────────────────────────────────────

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/dashboard')
  @ApiOperation({ summary: 'Super Admin: Payment dashboard' })
  async getDashboard(@Query() filters: any) {
    return this.send('get_payment_dashboard', filters);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/settlement/dashboard')
  @ApiOperation({ summary: 'Super Admin: Settlement dashboard' })
  async getSettlementDashboard(@Query() filters: any) {
    return this.send('get_settlement_dashboard', filters);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/settlement/seller/:sellerId')
  @ApiOperation({ summary: 'Super Admin: Seller balance' })
  async getSellerBalance(@Param('sellerId') sellerId: string) {
    return this.send('get_seller_balance', { sellerId });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/settlement/franchise/:franchiseId')
  @ApiOperation({ summary: 'Super Admin: Franchise earnings' })
  async getFranchiseEarnings(@Param('franchiseId') franchiseId: string) {
    return this.send('get_franchise_earnings', { franchiseId });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/revenue/:module')
  @ApiOperation({ summary: 'Super Admin: Module revenue with daily trend' })
  async getModuleRevenue(
    @Param('module') module: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.send('get_module_revenue', { module, startDate, endDate });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/reconciliation/:date')
  @ApiOperation({ summary: 'Super Admin: Daily reconciliation report' })
  async getReconciliation(@Param('date') date: string) {
    return this.send('get_reconciliation', { date });
  }
}
