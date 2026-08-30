/**
 * PaymentGatewayAdapter — Interface that every payment gateway adapter must implement.
 *
 * This pattern allows the PaymentOrchestratorService to be completely
 * gateway-agnostic. The GatewayAdapterFactory resolves the correct adapter
 * based on the customer's region and selected payment method.
 *
 * Each adapter encapsulates:
 *  - Payment initiation (create checkout session / order)
 *  - Payment verification (signature / webhook validation)
 *  - Refund processing (full / partial)
 *  - Pre-authorization (hold) and capture (for taxi real-time billing)
 *  - Transaction status lookup
 */

// ── Request / Response Types ──────────────────────────────────────────────────

export interface InitiateParams {
  paymentId: string;
  paymentNumber: string;
  amount: number;
  currency: string;
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  orderId: string;
  description: string;
  callbackUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface GatewayInitiateResult {
  success: boolean;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  checkoutUrl?: string;
  paymentToken?: string;
  upiIntentLink?: string;
  qrCodeData?: string;
  expiresAt?: Date;
  rawResponse?: Record<string, unknown>;
}

export interface VerifyParams {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature?: string;
  rawPayload?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface GatewayVerifyResult {
  verified: boolean;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  gatewayPaymentId: string;
  amount?: number;
  currency?: string;
  method?: string;
  failureReason?: string;
  rawResponse?: Record<string, unknown>;
}

export interface RefundParams {
  gatewayPaymentId: string;
  amount: number;
  currency: string;
  reason: string;
  refundId: string;
}

export interface GatewayRefundResult {
  success: boolean;
  gatewayRefundId: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  amount: number;
  failureReason?: string;
  rawResponse?: Record<string, unknown>;
}

export interface PreAuthParams {
  paymentId: string;
  amount: number;
  currency: string;
  customerId: string;
  customerEmail?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface GatewayPreAuthResult {
  success: boolean;
  preAuthId: string;
  amount: number;
  expiresAt?: Date;
  rawResponse?: Record<string, unknown>;
}

export interface CaptureParams {
  preAuthId: string;
  captureAmount: number;
  currency: string;
}

export interface GatewayCaptureResult {
  success: boolean;
  gatewayPaymentId: string;
  capturedAmount: number;
  excessReleased: number;
  rawResponse?: Record<string, unknown>;
}

export interface GatewayStatusResult {
  status: 'INITIATED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'EXPIRED';
  gatewayPaymentId: string;
  amount?: number;
  currency?: string;
  rawResponse?: Record<string, unknown>;
}

// ── Adapter Interface ─────────────────────────────────────────────────────────

export interface PaymentGatewayAdapter {
  /** Unique identifier for this gateway (e.g. 'razorpay', 'stripe') */
  readonly gatewayName: string;

  /** Create a payment order / session at the gateway */
  initiate(params: InitiateParams): Promise<GatewayInitiateResult>;

  /** Verify that a payment was genuinely completed (signature / webhook check) */
  verify(params: VerifyParams): Promise<GatewayVerifyResult>;

  /** Initiate a full or partial refund at the gateway */
  refund(params: RefundParams): Promise<GatewayRefundResult>;

  /** Pre-authorize (hold) an amount without capturing — used for taxi rides */
  preAuthorize(params: PreAuthParams): Promise<GatewayPreAuthResult>;

  /** Capture a previously authorized amount — used at taxi ride completion */
  capture(params: CaptureParams): Promise<GatewayCaptureResult>;

  /** Check the current status of a transaction at the gateway */
  getStatus(transactionId: string): Promise<GatewayStatusResult>;

  /** Validate a webhook signature from the gateway */
  validateWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean;
}
