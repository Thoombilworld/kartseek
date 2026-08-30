import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PaymentGatewayAdapter,
  InitiateParams, GatewayInitiateResult,
  VerifyParams, GatewayVerifyResult,
  RefundParams, GatewayRefundResult,
  PreAuthParams, GatewayPreAuthResult,
  CaptureParams, GatewayCaptureResult,
  GatewayStatusResult,
} from './gateway-adapter.interface';

/**
 * MadaAdapter — Payment gateway adapter for Mada / SADAD (GCC).
 *
 * Supports: Mada debit cards (SA), SADAD bill payments (SA), NAPS (QA)
 * Used in: SA (Saudi Arabia), QA (Qatar)
 *
 * Mada is the Saudi debit card network mandated by SAMA (Saudi Arabian
 * Monetary Authority). SADAD is the national e-payment system.
 *
 * In production, integrate with a Mada-certified PSP (e.g., HyperPay, Moyasar).
 */
@Injectable()
export class MadaAdapter implements PaymentGatewayAdapter {
  readonly gatewayName = 'mada';
  private readonly logger = new Logger(MadaAdapter.name);
  private readonly merchantId: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.merchantId = this.config.get<string>('MADA_MERCHANT_ID', 'mada_test_merchant');
    this.apiKey = this.config.get<string>('MADA_API_KEY', 'mada_test_key');
  }

  async initiate(params: InitiateParams): Promise<GatewayInitiateResult> {
    this.logger.log(`[Mada] Initiating payment ${params.paymentNumber} | ${params.currency} ${params.amount}`);

    const checkoutId = `mada_${crypto.randomBytes(16).toString('hex')}`;

    // HyperPay/Moyasar checkout session
    const checkoutUrl = `https://checkout.mada.com.sa/v1/checkout/${checkoutId}`;

    return {
      success: true,
      gatewayOrderId: checkoutId,
      checkoutUrl,
      paymentToken: checkoutId,
      rawResponse: { checkoutId, merchantId: this.merchantId, amount: params.amount },
    };
  }

  async verify(params: VerifyParams): Promise<GatewayVerifyResult> {
    this.logger.log(`[Mada] Verifying payment ${params.gatewayPaymentId}`);

    // GET checkout status from PSP
    return {
      verified: true,
      status: 'SUCCESS',
      gatewayPaymentId: params.gatewayPaymentId,
      method: 'mada_card',
      rawResponse: { id: params.gatewayPaymentId, result: { code: '000.100.110', description: 'Approved' } },
    };
  }

  async refund(params: RefundParams): Promise<GatewayRefundResult> {
    this.logger.log(`[Mada] Refunding ${params.amount} for ${params.gatewayPaymentId}`);

    const refundId = `mada_ref_${crypto.randomBytes(12).toString('hex')}`;

    return {
      success: true,
      gatewayRefundId: refundId,
      status: 'PROCESSING',
      amount: params.amount,
      rawResponse: { refundId, originalPayment: params.gatewayPaymentId },
    };
  }

  async preAuthorize(params: PreAuthParams): Promise<GatewayPreAuthResult> {
    this.logger.log(`[Mada] Pre-authorizing ${params.amount} for ${params.paymentId}`);

    const preAuthId = `mada_auth_${crypto.randomBytes(12).toString('hex')}`;

    return {
      success: true,
      preAuthId,
      amount: params.amount,
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5-day hold
      rawResponse: { preAuthId, status: 'authorized' },
    };
  }

  async capture(params: CaptureParams): Promise<GatewayCaptureResult> {
    this.logger.log(`[Mada] Capturing ${params.captureAmount} from ${params.preAuthId}`);

    return {
      success: true,
      gatewayPaymentId: params.preAuthId,
      capturedAmount: params.captureAmount,
      excessReleased: 0,
      rawResponse: { preAuthId: params.preAuthId, captured: true },
    };
  }

  async getStatus(transactionId: string): Promise<GatewayStatusResult> {
    return {
      status: 'SUCCESS',
      gatewayPaymentId: transactionId,
      rawResponse: { id: transactionId, status: 'captured' },
    };
  }

  validateWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean {
    const expected = crypto
      .createHmac('sha256', secret || this.apiKey)
      .update(payload)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    } catch {
      return false;
    }
  }
}
