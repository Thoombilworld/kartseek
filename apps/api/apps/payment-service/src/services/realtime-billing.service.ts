import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from '@app/kafka';
import { RedisService } from '@app/redis';
import { GatewayAdapterFactory } from '../adapters/gateway-adapter.factory';

/**
 * RealTimeBillingService — Handles pre-auth → meter → capture flow for taxi rides.
 *
 * Taxi billing is unique: the final amount is only known when the ride completes.
 * This service manages the full lifecycle:
 *
 *  1. RIDE_STARTED  → Pre-authorize estimated fare (hold on customer's card/wallet)
 *  2. RIDE_IN_PROGRESS → Update live fare meter via WebSocket (customer sees real-time cost)
 *  3. RIDE_COMPLETED → Capture final fare, release excess hold
 *  4. CANCELLED → Release full hold, optionally charge cancellation fee
 *
 * Pre-auth state is stored in Redis for fast access during active rides.
 */
@Injectable()
export class RealTimeBillingService {
  private readonly logger = new Logger(RealTimeBillingService.name);
  private readonly PREAUTH_TTL = 3600 * 24; // 24 hours

  constructor(
    private readonly gatewayFactory: GatewayAdapterFactory,
    private readonly kafka: KafkaProducerService,
    private readonly redis: RedisService,
  ) {}

  // ── 1. Pre-Authorize on Ride Start ──────────────────────────────────────────

  async preAuthorize(params: {
    rideId: string;
    customerId: string;
    customerEmail?: string;
    estimatedFare: number;
    currency: string;
    countryCode: string;
    paymentMethod: string;
  }): Promise<PreAuthResult> {
    const {
      rideId, customerId, estimatedFare, currency, countryCode, paymentMethod,
    } = params;

    this.logger.log(`[Taxi Billing] Pre-auth ${currency} ${estimatedFare} | Ride: ${rideId}`);

    // Add 20% buffer to estimated fare for surge/route changes
    const holdAmount = Math.round(estimatedFare * 1.2 * 100) / 100;

    const adapter = await this.gatewayFactory.getAdapter(countryCode, paymentMethod);

    const result = await adapter.preAuthorize({
      paymentId: rideId,
      amount: holdAmount,
      currency,
      customerId,
      customerEmail: params.customerEmail,
      description: `Taxi ride pre-authorization: ${rideId}`,
      metadata: { rideId, estimatedFare, holdAmount },
    });

    if (!result.success) {
      this.logger.error(`[Taxi Billing] Pre-auth FAILED for ride ${rideId}`);
      await this.kafka.publish('taxi.billing.preauth.failed', { rideId, customerId, reason: 'Pre-auth failed' });
      return { success: false, rideId, reason: 'Payment pre-authorization failed' };
    }

    // Store pre-auth state in Redis
    const preAuthState: PreAuthState = {
      rideId,
      customerId,
      preAuthId: result.preAuthId,
      holdAmount,
      estimatedFare,
      currentFare: 0,
      currency,
      countryCode,
      paymentMethod,
      gateway: adapter.gatewayName,
      createdAt: new Date().toISOString(),
    };
    await this.redis.setJson(`taxi:billing:${rideId}`, preAuthState, this.PREAUTH_TTL);

    await this.kafka.publish('taxi.billing.preauth', {
      rideId, customerId, holdAmount, preAuthId: result.preAuthId, currency,
    });

    this.logger.log(`[Taxi Billing] Pre-auth SUCCESS | Hold: ${currency} ${holdAmount} | PreAuth: ${result.preAuthId}`);

    return { success: true, rideId, preAuthId: result.preAuthId, holdAmount };
  }

  // ── 2. Update Live Fare Meter ───────────────────────────────────────────────

  async updateMeter(rideId: string, currentFare: number): Promise<void> {
    const state = await this.redis.getJson<PreAuthState>(`taxi:billing:${rideId}`);
    if (!state) {
      this.logger.warn(`[Taxi Billing] No pre-auth state for ride ${rideId}`);
      return;
    }

    state.currentFare = currentFare;
    await this.redis.setJson(`taxi:billing:${rideId}`, state, this.PREAUTH_TTL);

    // Push to customer via WebSocket (through Kafka → taxi tracking gateway)
    await this.kafka.publish('taxi.billing.meter_updated', {
      rideId,
      customerId: state.customerId,
      currentFare,
      estimatedFare: state.estimatedFare,
      currency: state.currency,
    });
  }

  // ── 3. Capture Final Fare on Ride Completion ────────────────────────────────

  async captureRideFare(params: {
    rideId: string;
    finalFare: number;
    tipAmount?: number;
    discount?: number;
  }): Promise<CaptureResult> {
    const { rideId, finalFare, tipAmount = 0, discount = 0 } = params;

    const state = await this.redis.getJson<PreAuthState>(`taxi:billing:${rideId}`);
    if (!state) {
      this.logger.error(`[Taxi Billing] No pre-auth state for ride ${rideId} — cannot capture`);
      return { success: false, rideId, reason: 'No pre-authorization found', capturedAmount: 0, excessReleased: 0 };
    }

    const captureAmount = Math.round((finalFare + tipAmount - discount) * 100) / 100;

    this.logger.log(
      `[Taxi Billing] Capturing ${state.currency} ${captureAmount} ` +
      `(fare: ${finalFare}, tip: ${tipAmount}, discount: ${discount}) | Hold was: ${state.holdAmount}`,
    );

    const adapter = await this.gatewayFactory.getAdapter(state.countryCode, state.paymentMethod);

    const result = await adapter.capture({
      preAuthId: state.preAuthId,
      captureAmount,
      currency: state.currency,
    });

    if (!result.success) {
      this.logger.error(`[Taxi Billing] Capture FAILED for ride ${rideId}`);
      await this.kafka.publish('taxi.billing.capture.failed', { rideId, reason: 'Capture failed' });
      return { success: false, rideId, reason: 'Payment capture failed', capturedAmount: 0, excessReleased: 0 };
    }

    const excessReleased = Math.round((state.holdAmount - captureAmount) * 100) / 100;

    // Clean up Redis state
    await this.redis.del(`taxi:billing:${rideId}`);

    await this.kafka.publish('taxi.billing.captured', {
      rideId,
      customerId: state.customerId,
      capturedAmount: captureAmount,
      excessReleased,
      gatewayPaymentId: result.gatewayPaymentId,
      currency: state.currency,
      tipAmount,
      discount,
    });

    this.logger.log(
      `[Taxi Billing] Capture SUCCESS | Charged: ${state.currency} ${captureAmount} ` +
      `| Released: ${excessReleased}`,
    );

    return {
      success: true,
      rideId,
      capturedAmount: captureAmount,
      excessReleased,
      gatewayPaymentId: result.gatewayPaymentId,
    };
  }

  // ── 4. Handle Ride Cancellation ─────────────────────────────────────────────

  async handleCancellation(params: {
    rideId: string;
    cancellationFee: number;
    cancelledBy: string;
  }): Promise<CaptureResult> {
    const { rideId, cancellationFee, cancelledBy } = params;

    const state = await this.redis.getJson<PreAuthState>(`taxi:billing:${rideId}`);
    if (!state) {
      this.logger.warn(`[Taxi Billing] No pre-auth for cancelled ride ${rideId} — nothing to release`);
      return { success: true, rideId, capturedAmount: 0, excessReleased: 0 };
    }

    this.logger.log(
      `[Taxi Billing] Cancellation | Ride: ${rideId} | By: ${cancelledBy} | Fee: ${state.currency} ${cancellationFee}`,
    );

    if (cancellationFee > 0) {
      // Capture the cancellation fee, release the rest
      const adapter = await this.gatewayFactory.getAdapter(state.countryCode, state.paymentMethod);
      await adapter.capture({
        preAuthId: state.preAuthId,
        captureAmount: cancellationFee,
        currency: state.currency,
      });
    }
    // If no fee, the pre-auth expires automatically (or we can explicitly void it)

    await this.redis.del(`taxi:billing:${rideId}`);

    await this.kafka.publish('taxi.billing.cancelled', {
      rideId,
      customerId: state.customerId,
      cancellationFee,
      cancelledBy,
      holdReleased: state.holdAmount - cancellationFee,
    });

    return {
      success: true,
      rideId,
      capturedAmount: cancellationFee,
      excessReleased: state.holdAmount - cancellationFee,
    };
  }

  // ── Get Current Billing State ───────────────────────────────────────────────

  async getBillingState(rideId: string): Promise<PreAuthState | null> {
    return this.redis.getJson<PreAuthState>(`taxi:billing:${rideId}`);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PreAuthState {
  rideId: string;
  customerId: string;
  preAuthId: string;
  holdAmount: number;
  estimatedFare: number;
  currentFare: number;
  currency: string;
  countryCode: string;
  paymentMethod: string;
  gateway: string;
  createdAt: string;
}

export interface PreAuthResult {
  success: boolean;
  rideId: string;
  preAuthId?: string;
  holdAmount?: number;
  reason?: string;
}

export interface CaptureResult {
  success: boolean;
  rideId: string;
  capturedAmount: number;
  excessReleased: number;
  gatewayPaymentId?: string;
  reason?: string;
}
