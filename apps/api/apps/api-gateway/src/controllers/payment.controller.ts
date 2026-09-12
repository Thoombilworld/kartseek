import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  Inject,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
  Optional,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { of } from 'rxjs';
import { JwtAuthGuard, ResourceOwnershipGuard, ResourceOwner } from '@app/security';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { resolveScope } from '../guards/market-scope';
import {
  PaymentAdminFilterDto,
  PaymentDashboardFilterDto,
  PaymentRefundDto,
} from '../dto/payment.dto';
import { UserRole, rpcCatch } from '@app/common';

// Inline payment methods by country (avoids @app/region JS build cache issues)
const REGION_PAYMENT_METHODS: Record<
  string,
  Array<{ methodType: string; gateway: string; displayName: string; isDefault?: boolean }>
> = {
  IN: [
    {
      methodType: 'upi',
      gateway: 'upi',
      displayName: 'UPI (GPay / PhonePe / Paytm)',
      isDefault: true,
    },
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
  ],
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
// RolesGuard is mandatory here: this controller has eleven @Roles(ADMIN,
// SUPER_ADMIN) routes — six settlement and reconciliation reads, a refund, and
// four invoice routes. It previously relied on the global RolesGuard, which was
// removed in main.ts — without a local one those routes would be reachable by
// any authenticated user.
//
// This comment used to say "six … routes (refunds, settlements,
// reconciliation)". Refunds was NOT one of the six: `POST /refund` and the four
// invoice routes declared no `@Roles` at all, and the guard skips a route with
// no metadata, so the comment described the state a reader would assume rather
// than the state the file was in. The count here is load-bearing — if it stops
// matching, one of the eleven has lost its decorator.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentGatewayController {
  private readonly logger = new Logger(PaymentGatewayController.name);
  private paymentClient: ClientProxy | null = null;

  constructor(@Optional() @Inject('PAYMENT_SERVICE') paymentClient?: ClientProxy) {
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
        this.paymentClient
          .send<T>({ cmd }, data)
          .pipe(timeout(5000), catchError(rpcCatch('Payment service unavailable'))),
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`payment-service [${cmd}] failed: ${(error as Error)?.message}`);
      throw new HttpException('Payment service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
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
      customerId,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
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
  //
  // THIS ROUTE AND THE FOUR INVOICE ROUTES BELOW DECLARED NO `@Roles`.
  //
  // The class binds `RolesGuard` (see the class comment), but the guard returns
  // `true` when a route carries no metadata (`guards/roles.guard.ts:32-34`) —
  // so for these five alone the guard was a no-op, and any authenticated
  // caller could read any invoice by id, **void** any invoice and **initiate a
  // refund on any payment**, in any market. `payment.service.ts:348-378` checks
  // the payment's status and refundable amount and nothing else: not ownership,
  // not role, not market. The six settlement routes immediately below were
  // gated the whole time, which is what made the gap easy to read past
  // (whole-branch review, finding A-7).
  //
  // `payments.countryCode` and `invoices.countryCode` have always existed and
  // R6/R11 gave this service the predicate, so a refund is *scopable* — unlike
  // the refund QUEUE on `admin-marketplace.controller.ts`, which is Redis-only
  // and stays `refuseLockedAdmin`. A region-locked admin may refund a payment
  // in their own market; the market is resolved here and asserted against the
  // row by `payment.service.ts` / `invoice.service.ts`, so a path id from
  // another market answers 403 rather than moving money.
  //
  // Keys: `orders.refund` is the platform's "Process Refunds" key and is what
  // all five refund routes on `admin-marketplace.controller.ts` use;
  // `finance.view` matches the four sibling settlement reads in this file and
  // `finance.reports` the two report reads; `finance.payouts` is the finance
  // write key for a void. Roles stay ADMIN + SUPER_ADMIN, as on the siblings.

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:orders.refund')
  @Post('refund')
  @ApiOperation({ summary: 'Initiate a full or partial refund, in the caller market' })
  @ApiQuery({ name: 'countryCode', required: false })
  async initiateRefund(@Req() req: any, @Body() dto: PaymentRefundDto) {
    const { scope, market } = this.scopeOf(req, dto?.countryCode, 'that refund');
    // Named keys, never the body: `scope` is the gateway's own and must not be
    // forgeable, and `countryCode` is the market this gateway resolved — a body
    // carrying either would otherwise reach payment-service as if the gateway
    // had written it.
    return this.send('initiate_refund', {
      paymentId: dto?.paymentId,
      amount: dto?.amount,
      reason: dto?.reason,
      initiatedBy: req?.user?.userId ?? req?.user?.id ?? req?.user?.sub ?? 'unknown',
      countryCode: market,
      scope,
    });
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.view')
  @Get('invoices/:invoiceId')
  @ApiOperation({ summary: 'Get invoice by ID (admin)' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getInvoice(
    @Req() req: any,
    @Param('invoiceId') invoiceId: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that invoice');
    return this.send('get_invoice', { invoiceId, countryCode: market, scope });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.view')
  @Get('invoices/payment/:paymentId')
  @ApiOperation({ summary: 'Get invoice by payment ID (admin)' })
  async getInvoiceByPayment(@Req() req: any, @Param('paymentId') paymentId: string) {
    const { scope, market } = this.scopeOf(req, undefined, 'that invoice');
    return this.send('get_invoice_by_payment', { paymentId, countryCode: market, scope });
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
      customerId,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.reports')
  @Post('invoices/:invoiceId/pdf')
  @ApiOperation({ summary: 'Generate invoice PDF (admin)' })
  async generateInvoicePdf(@Req() req: any, @Param('invoiceId') invoiceId: string) {
    // The `expiresAt` that used to be computed here was never used: the expiry
    // that matters is the one `InvoiceService.generatePdf` signs the URL with.
    const { scope, market } = this.scopeOf(req, undefined, 'that invoice');
    return this.send('generate_invoice_pdf', { invoiceId, countryCode: market, scope });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.payouts')
  @Post('invoices/:invoiceId/void')
  @ApiOperation({ summary: 'Void an invoice (admin)' })
  async voidInvoice(
    @Req() req: any,
    @Param('invoiceId') invoiceId: string,
    @Body('reason') reason: string,
  ) {
    const { scope, market } = this.scopeOf(req, undefined, 'that invoice');
    return this.send('void_invoice', { invoiceId, reason, countryCode: market, scope });
  }

  // ── Settlement (admin) ────────────────────────────────────────────────────
  //
  // These six read money across markets. `payments.countryCode` and
  // `invoices.countryCode` have existed the whole time and nothing read them,
  // so `GET /payments/admin/settlement/seller/<IN-seller>` answered 200 for a
  // QA-locked admin (audit V8). `filters` is no longer forwarded verbatim: a
  // client-supplied `scope` key would otherwise reach payment-service as if the
  // gateway had written it.

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.view')
  @Get('admin/dashboard')
  @ApiOperation({ summary: 'Payment dashboard for one market, or all' })
  @ApiQuery({ name: 'countryCode', required: false })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'gateway', required: false })
  @ApiQuery({ name: 'sellerId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getDashboard(@Req() req: any, @Query() filters: PaymentDashboardFilterDto) {
    const { scope, market } = this.scopeOf(req, filters?.countryCode, 'that dashboard');
    // Named keys, never a spread of the query: `scope` is the gateway's own and
    // must not be forgeable. Every other field the dashboard query reads is
    // forwarded, because a filter declared on the DTO but dropped here is a
    // control the console can send and nothing acts on.
    return this.send('get_payment_dashboard', {
      module: filters?.module,
      status: filters?.status,
      gateway: filters?.gateway,
      sellerId: filters?.sellerId,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      page: filters?.page,
      limit: filters?.limit,
      countryCode: market,
      scope,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.view')
  @Get('admin/settlement/dashboard')
  @ApiOperation({ summary: 'Settlement dashboard for one market, or all' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getSettlementDashboard(@Req() req: any, @Query() filters: PaymentAdminFilterDto) {
    const { scope, market } = this.scopeOf(req, filters?.countryCode, 'that dashboard');
    return this.send('get_settlement_dashboard', {
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      countryCode: market,
      scope,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.view')
  @Get('admin/settlement/seller/:sellerId')
  @ApiOperation({ summary: "A seller's settlement balance" })
  async getSellerBalance(@Req() req: any, @Param('sellerId') sellerId: string) {
    const { scope, market } = this.scopeOf(req, undefined, "that seller's balance");
    return this.send('get_seller_balance', { sellerId, countryCode: market, scope });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.view')
  @Get('admin/settlement/franchise/:franchiseId')
  @ApiOperation({ summary: "A franchise's earnings" })
  async getFranchiseEarnings(@Req() req: any, @Param('franchiseId') franchiseId: string) {
    const { scope, market } = this.scopeOf(req, undefined, "that franchise's earnings");
    return this.send('get_franchise_earnings', { franchiseId, countryCode: market, scope });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.reports')
  @Get('admin/revenue/:module')
  @ApiOperation({ summary: 'Module revenue with daily trend' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getModuleRevenue(
    @Req() req: any,
    @Param('module') module: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that report');
    return this.send('get_module_revenue', {
      module,
      startDate,
      endDate,
      countryCode: market,
      scope,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.reports')
  @Get('admin/reconciliation/:date')
  @ApiOperation({ summary: 'Daily reconciliation report' })
  async getReconciliation(@Req() req: any, @Param('date') date: string) {
    // A calendar date, or a 400. Anything else reached payment-service, threw
    // inside the report query, and came back to the caller as a 500
    // "Payment service unavailable" for what was a typo in the URL.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      throw new BadRequestException('date must be a calendar date in YYYY-MM-DD form.');
    }
    const { scope, market } = this.scopeOf(req, undefined, 'that reconciliation');
    return this.send('get_reconciliation', { date, countryCode: market, scope });
  }
}
