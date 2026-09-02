import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  type PaymentGatewayAdapter,
  type InitiateParams, type GatewayInitiateResult,
  type VerifyParams, type GatewayVerifyResult,
  type RefundParams, type GatewayRefundResult,
  type PreAuthParams, type GatewayPreAuthResult,
  type CaptureParams, type GatewayCaptureResult,
  type GatewayStatusResult,
} from './gateway-adapter.interface';

/**
 * RazorpayAdapter — Payment gateway adapter for Razorpay (India).
 *
 * Supports: Cards, UPI, NetBanking, Wallets (Paytm/PhonePe), EMI
 * Used in: IN (India)
 *
 * API Reference: https://razorpay.com/docs/api/
 *
 * In production, replace the HTTP calls below with the official
 * `razorpay` npm package. The structure is designed to be drop-in compatible.
 */
@Injectable()
export class RazorpayAdapter implements PaymentGatewayAdapter {
  readonly gatewayName = 'razorpay';
  private readonly logger = new Logger(RazorpayAdapter.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID', 'rzp_test_placeholder');
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET', 'test_secret_placeholder');
    this.webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET', 'whsec_placeholder');
  }

  async initiate(params: InitiateParams): Promise<GatewayInitiateResult> {
    this.logger.log(`[Razorpay] Initiating payment ${params.paymentNumber} | ₹${params.amount}`);

    // Razorpay Orders API: POST /v1/orders
    const orderPayload = {
      amount: Math.round(params.amount * 100), // Razorpay uses paise
      currency: params.currency,
      receipt: params.paymentNumber,
      notes: {
        paymentId: params.paymentId,
        orderId: params.orderId,
        customerId: params.customerId,
        ...params.metadata,
      },
    };

    // TODO: Replace with actual Razorpay SDK call
    // const order = await this.razorpay.orders.create(orderPayload);
    const gatewayOrderId = `order_${crypto.randomBytes(12).toString('hex')}`;

    return {
      success: true,
      gatewayOrderId,
      paymentToken: this.keyId, // Frontend uses this to initialize Razorpay checkout
      rawResponse: { ...orderPayload, id: gatewayOrderId, status: 'created' },
    };
  }

  async verify(params: VerifyParams): Promise<GatewayVerifyResult> {
    this.logger.log(`[Razorpay] Verifying payment ${params.gatewayPaymentId}`);

    // Razorpay signature verification: HMAC-SHA256(orderId + '|' + paymentId, secret)
    const body = `${params.gatewayOrderId}|${params.gatewayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    const verified = expectedSignature === params.gatewaySignature;

    if (!verified) {
      this.logger.warn(`[Razorpay] Signature mismatch for ${params.gatewayPaymentId}`);
    }

    return {
      verified,
      status: verified ? 'SUCCESS' : 'FAILED',
      gatewayPaymentId: params.gatewayPaymentId,
      failureReason: verified ? undefined : 'Signature verification failed',
      rawResponse: { verified, body, expectedSignature },
    };
  }

  async refund(params: RefundParams): Promise<GatewayRefundResult> {
    this.logger.log(`[Razorpay] Refunding ₹${params.amount} for ${params.gatewayPaymentId}`);

    // POST /v1/payments/:paymentId/refund
    const gatewayRefundId = `rfnd_${crypto.randomBytes(12).toString('hex')}`;

    return {
      success: true,
      gatewayRefundId,
      status: 'PROCESSING',
      amount: params.amount,
      rawResponse: { id: gatewayRefundId, payment_id: params.gatewayPaymentId, amount: Math.round(params.amount * 100) },
    };
  }

  async preAuthorize(params: PreAuthParams): Promise<GatewayPreAuthResult> {
    this.logger.log(`[Razorpay] Pre-authorizing ₹${params.amount} for ${params.paymentId}`);

    // Razorpay doesn't natively support pre-auth; use payment links with partial capture
    const preAuthId = `auth_${crypto.randomBytes(12).toString('hex')}`;

    return {
      success: true,
      preAuthId,
      amount: params.amount,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day hold
      rawResponse: { preAuthId, status: 'authorized' },
    };
  }

  async capture(params: CaptureParams): Promise<GatewayCaptureResult> {
    this.logger.log(`[Razorpay] Capturing ₹${params.captureAmount} from pre-auth ${params.preAuthId}`);

    // POST /v1/payments/:paymentId/capture
    const gatewayPaymentId = `pay_${crypto.randomBytes(12).toString('hex')}`;

    return {
      success: true,
      gatewayPaymentId,
      capturedAmount: params.captureAmount,
      excessReleased: 0,
      rawResponse: { id: gatewayPaymentId, captured: true, amount: Math.round(params.captureAmount * 100) },
    };
  }

  async getStatus(transactionId: string): Promise<GatewayStatusResult> {
    this.logger.log(`[Razorpay] Checking status for ${transactionId}`);

    // GET /v1/payments/:paymentId
    return {
      status: 'SUCCESS',
      gatewayPaymentId: transactionId,
      rawResponse: { id: transactionId, status: 'captured' },
    };
  }

  validateWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret || this.webhookSecret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  }
}
