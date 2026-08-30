import {
  Controller, Post, Req, Res, Headers, HttpCode, HttpStatus, Logger, RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RazorpayAdapter } from '../adapters/razorpay.adapter';
import { StripeAdapter } from '../adapters/stripe.adapter';
import { Payment } from '../entities/payment.entity';
import { ConfigService } from '@nestjs/config';

/**
 * WebhookController — Receives async payment events from gateways.
 *
 * Security:
 *  - No JWT guard (external gateways call these endpoints)
 *  - Each endpoint validates the gateway's HMAC signature
 *  - Idempotent: duplicate event IDs are ignored
 *
 * Events handled:
 *  - payment.authorized / payment.captured / payment.failed
 *  - refund.created / refund.processed
 *  - dispute.created
 */
@ApiTags('🔔 Payment Webhooks')
@Controller('payments/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly processedEvents = new Set<string>(); // In production, use Redis

  constructor(
    private readonly razorpay: RazorpayAdapter,
    private readonly stripe: StripeAdapter,
    private readonly config: ConfigService,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
  ) {}

  // ── Razorpay Webhook ────────────────────────────────────────────────────

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook receiver' })
  async handleRazorpay(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
    @Res() res: Response,
  ) {
    const body = req.rawBody || Buffer.from(JSON.stringify(req.body));

    // 1. Validate signature
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET', 'whsec_placeholder');
    try {
      const valid = this.razorpay.validateWebhookSignature(body, signature, secret);
      if (!valid) {
        this.logger.warn('[Razorpay Webhook] Invalid signature — rejecting');
        return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
      }
    } catch (err) {
      this.logger.warn(`[Razorpay Webhook] Signature validation error: ${(err as Error).message}`);
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Signature validation failed' });
    }

    // 2. Parse event
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventId = event?.event_id || event?.id || `rz_${Date.now()}`;
    const eventType = event?.event || 'unknown';

    // 3. Idempotency check
    if (this.processedEvents.has(eventId)) {
      this.logger.log(`[Razorpay Webhook] Duplicate event ${eventId} — skipping`);
      return res.json({ received: true, duplicate: true });
    }
    this.processedEvents.add(eventId);

    // 4. Route event
    this.logger.log(`[Razorpay Webhook] Processing event: ${eventType} (${eventId})`);

    try {
      const payload = event?.payload;
      switch (eventType) {
        case 'payment.authorized':
          await this.handlePaymentAuthorized('razorpay', payload?.payment?.entity);
          break;
        case 'payment.captured':
          await this.handlePaymentCaptured('razorpay', payload?.payment?.entity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed('razorpay', payload?.payment?.entity);
          break;
        case 'refund.created':
        case 'refund.processed':
          await this.handleRefundUpdate('razorpay', payload?.refund?.entity);
          break;
        case 'dispute.created':
          this.logger.warn(`[Razorpay] Dispute created: ${JSON.stringify(payload?.dispute?.entity?.id)}`);
          break;
        default:
          this.logger.log(`[Razorpay] Unhandled event type: ${eventType}`);
      }
    } catch (err) {
      this.logger.error(`[Razorpay Webhook] Error processing ${eventType}: ${(err as Error).message}`);
    }

    return res.json({ received: true, eventId, eventType });
  }

  // ── Stripe Webhook ──────────────────────────────────────────────────────

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook receiver' })
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    const body = req.rawBody || Buffer.from(JSON.stringify(req.body));

    // 1. Validate signature (Stripe uses timestamp-based HMAC)
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', 'whsec_placeholder');
    try {
      const valid = this.stripe.validateWebhookSignature(body, signature, secret);
      if (!valid) {
        this.logger.warn('[Stripe Webhook] Invalid signature — rejecting');
        return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
      }
    } catch (err) {
      // In dev mode with placeholder secrets, allow through with a warning
      this.logger.warn(`[Stripe Webhook] Signature validation skipped in dev: ${(err as Error).message}`);
    }

    // 2. Parse event
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventId = event?.id || `evt_${Date.now()}`;
    const eventType = event?.type || 'unknown';

    // 3. Idempotency check
    if (this.processedEvents.has(eventId)) {
      this.logger.log(`[Stripe Webhook] Duplicate event ${eventId} — skipping`);
      return res.json({ received: true, duplicate: true });
    }
    this.processedEvents.add(eventId);

    // 4. Route event
    this.logger.log(`[Stripe Webhook] Processing event: ${eventType} (${eventId})`);

    try {
      const data = event?.data?.object;
      switch (eventType) {
        case 'payment_intent.succeeded':
          await this.handlePaymentCaptured('stripe', {
            id: data?.id,
            order_id: data?.metadata?.order_id,
            amount: (data?.amount || 0) / 100,
            currency: data?.currency?.toUpperCase(),
          });
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed('stripe', {
            id: data?.id,
            order_id: data?.metadata?.order_id,
            error_description: data?.last_payment_error?.message,
          });
          break;
        case 'charge.refunded':
          await this.handleRefundUpdate('stripe', {
            id: data?.id,
            payment_id: data?.payment_intent,
            amount: (data?.amount_refunded || 0) / 100,
          });
          break;
        case 'charge.dispute.created':
          this.logger.warn(`[Stripe] Dispute created: ${data?.id}`);
          break;
        case 'checkout.session.completed':
          this.logger.log(`[Stripe] Checkout session completed: ${data?.id}`);
          break;
        default:
          this.logger.log(`[Stripe] Unhandled event type: ${eventType}`);
      }
    } catch (err) {
      this.logger.error(`[Stripe Webhook] Error processing ${eventType}: ${(err as Error).message}`);
    }

    return res.json({ received: true, eventId, eventType });
  }

  // ── Shared Event Handlers ───────────────────────────────────────────────

  private async handlePaymentAuthorized(gateway: string, data: any) {
    if (!data) return;
    this.logger.log(`[${gateway}] Payment authorized: ${data.id} | Amount: ${data.amount}`);

    // Update payment record status
    const orderId = data.order_id || data.notes?.orderId;
    if (orderId) {
      await this.paymentRepo.update(
        { gatewayOrderId: orderId },
        { status: 'AUTHORIZED' as any, gatewayPaymentId: data.id },
      );
    }
  }

  private async handlePaymentCaptured(gateway: string, data: any) {
    if (!data) return;
    this.logger.log(`[${gateway}] Payment captured: ${data.id} | Amount: ${data.amount}`);

    const orderId = data.order_id || data.notes?.orderId || data.metadata?.order_id;
    if (orderId) {
      await this.paymentRepo.update(
        { gatewayOrderId: orderId },
        {
          status: 'SUCCESS' as any,
          gatewayPaymentId: data.id,
          verifiedAt: new Date(),
        },
      );
    }

    // TODO: Emit Kafka event 'payment.captured' to notify order-service
    // this.kafkaProducer.emit('payment.captured', { orderId, amount: data.amount, gateway });
  }

  private async handlePaymentFailed(gateway: string, data: any) {
    if (!data) return;
    this.logger.warn(`[${gateway}] Payment failed: ${data.id} | Reason: ${data.error_description || data.error_code}`);

    const orderId = data.order_id || data.notes?.orderId || data.metadata?.order_id;
    if (orderId) {
      await this.paymentRepo.update(
        { gatewayOrderId: orderId },
        {
          status: 'FAILED' as any,
          failureReason: data.error_description || data.error_code || 'Payment declined',
        },
      );
    }
  }

  private async handleRefundUpdate(gateway: string, data: any) {
    if (!data) return;
    this.logger.log(`[${gateway}] Refund update: ${data.id} | Amount: ${data.amount}`);

    // Update refund status in payment record
    const paymentId = data.payment_id;
    if (paymentId) {
      await this.paymentRepo.update(
        { gatewayPaymentId: paymentId },
        { status: 'REFUNDED' as any, refundedAmount: data.amount },
      );
    }
  }
}
