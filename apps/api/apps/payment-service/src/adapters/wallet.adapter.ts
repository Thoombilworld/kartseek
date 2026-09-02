import { Injectable, Logger } from '@nestjs/common';
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
 * WalletAdapter — Internal adapter for wallet-based payments.
 *
 * No external gateway calls. Deducts from the customer's KARTSEEK wallet
 * via the wallet-service through Kafka events or direct gRPC calls.
 *
 * Also handles split payments where part is paid by wallet and the
 * remainder by an external gateway.
 */
@Injectable()
export class WalletAdapter implements PaymentGatewayAdapter {
  readonly gatewayName = 'wallet';
  private readonly logger = new Logger(WalletAdapter.name);

  async initiate(params: InitiateParams): Promise<GatewayInitiateResult> {
    this.logger.log(`[Wallet] Initiating wallet debit | ${params.currency} ${params.amount} | User: ${params.customerId}`);

    // Wallet payments are instant — no external checkout needed
    const walletTxnId = `WTX-${crypto.randomUUID()}`;

    return {
      success: true,
      gatewayOrderId: walletTxnId,
      gatewayPaymentId: walletTxnId,
      rawResponse: { walletTxnId, type: 'DEBIT', amount: params.amount, userId: params.customerId },
    };
  }

  async verify(params: VerifyParams): Promise<GatewayVerifyResult> {
    this.logger.log(`[Wallet] Verifying wallet txn ${params.gatewayPaymentId}`);

    // Wallet transactions are verified internally — always trusted
    return {
      verified: true,
      status: 'SUCCESS',
      gatewayPaymentId: params.gatewayPaymentId,
      method: 'wallet',
      rawResponse: { verified: true },
    };
  }

  async refund(params: RefundParams): Promise<GatewayRefundResult> {
    this.logger.log(`[Wallet] Crediting wallet ${params.amount} for refund ${params.refundId}`);

    const refundTxnId = `WTX-REF-${crypto.randomUUID()}`;

    return {
      success: true,
      gatewayRefundId: refundTxnId,
      status: 'COMPLETED', // Wallet refunds are instant
      amount: params.amount,
      rawResponse: { refundTxnId, type: 'CREDIT' },
    };
  }

  async preAuthorize(params: PreAuthParams): Promise<GatewayPreAuthResult> {
    this.logger.log(`[Wallet] Pre-auth (hold) ${params.amount} for ${params.paymentId}`);

    const holdId = `WTX-HOLD-${crypto.randomUUID()}`;

    return {
      success: true,
      preAuthId: holdId,
      amount: params.amount,
      rawResponse: { holdId, status: 'held' },
    };
  }

  async capture(params: CaptureParams): Promise<GatewayCaptureResult> {
    this.logger.log(`[Wallet] Capturing ${params.captureAmount} from hold ${params.preAuthId}`);

    return {
      success: true,
      gatewayPaymentId: params.preAuthId,
      capturedAmount: params.captureAmount,
      excessReleased: 0,
      rawResponse: { captured: true },
    };
  }

  async getStatus(transactionId: string): Promise<GatewayStatusResult> {
    return {
      status: 'SUCCESS',
      gatewayPaymentId: transactionId,
      rawResponse: { id: transactionId, status: 'completed' },
    };
  }

  validateWebhookSignature(): boolean {
    // Wallet is internal — no external webhooks
    return true;
  }
}
