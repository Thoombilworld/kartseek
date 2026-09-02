import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodConfig } from '../entities/payment-method-config.entity';
import { type PaymentGatewayAdapter } from './gateway-adapter.interface';
import { RazorpayAdapter } from './razorpay.adapter';
import { StripeAdapter } from './stripe.adapter';
import { UpiAdapter } from './upi.adapter';
import { MadaAdapter } from './mada.adapter';
import { WalletAdapter } from './wallet.adapter';
import { RedisService } from '@app/redis';

/**
 * GatewayAdapterFactory — Resolves the correct payment gateway adapter
 * based on country code + payment method type.
 *
 * Uses the payment_method_configs table (cached in Redis) to determine
 * which gateway handles each payment method in each country.
 *
 * Example resolution:
 *   (countryCode: 'IN', methodType: 'upi')   → UpiAdapter
 *   (countryCode: 'IN', methodType: 'card')   → RazorpayAdapter
 *   (countryCode: 'AE', methodType: 'card')   → StripeAdapter
 *   (countryCode: 'SA', methodType: 'mada')   → MadaAdapter
 *   (any,              methodType: 'wallet')  → WalletAdapter
 */
@Injectable()
export class GatewayAdapterFactory {
  private readonly logger = new Logger(GatewayAdapterFactory.name);
  private readonly adapters: Map<string, PaymentGatewayAdapter>;

  constructor(
    @InjectRepository(PaymentMethodConfig)
    private readonly configRepo: Repository<PaymentMethodConfig>,
    private readonly redis: RedisService,
    private readonly razorpay: RazorpayAdapter,
    private readonly stripe: StripeAdapter,
    private readonly upi: UpiAdapter,
    private readonly mada: MadaAdapter,
    private readonly wallet: WalletAdapter,
  ) {
    // Register all adapters by gateway name
    this.adapters = new Map<string, PaymentGatewayAdapter>([
      ['razorpay', this.razorpay],
      ['stripe', this.stripe],
      ['upi', this.upi],
      ['mada', this.mada],
      ['wallet', this.wallet],
    ]);
  }

  // ── Adapter Resolution ──────────────────────────────────────────────────────

  /**
   * Get the payment gateway adapter for a given country and method type.
   */
  async getAdapter(countryCode: string, methodType: string): Promise<PaymentGatewayAdapter> {
    // Wallet is always internal
    if (methodType === 'wallet') {
      return this.wallet;
    }

    // Look up config to find which gateway handles this method in this country
    const config = await this.getMethodConfig(countryCode, methodType);

    if (!config) {
      // Fallback: try to resolve from default gateway mapping
      const fallbackGateway = this.getDefaultGateway(countryCode, methodType);
      const adapter = this.adapters.get(fallbackGateway);
      if (adapter) {
        this.logger.warn(`Using fallback gateway '${fallbackGateway}' for ${countryCode}/${methodType}`);
        return adapter;
      }

      throw new BadRequestException(
        `Payment method '${methodType}' is not available in country '${countryCode}'`,
      );
    }

    const adapter = this.adapters.get(config.gateway);
    if (!adapter) {
      throw new BadRequestException(`Gateway '${config.gateway}' adapter not registered`);
    }

    return adapter;
  }

  /**
   * Get the adapter directly by gateway name (for webhooks where we know the gateway).
   */
  getAdapterByName(gatewayName: string): PaymentGatewayAdapter {
    const adapter = this.adapters.get(gatewayName);
    if (!adapter) {
      throw new BadRequestException(`Unknown gateway: ${gatewayName}`);
    }
    return adapter;
  }

  // ── Payment Method Discovery ────────────────────────────────────────────────

  /**
   * Get all available payment methods for a country.
   * Used by frontend to render the checkout payment method selector.
   */
  async getAvailableMethods(
    countryCode: string,
    module?: string,
  ): Promise<PaymentMethodInfo[]> {
    const cacheKey = `payment:methods:${countryCode}:${module || 'all'}`;
    const cached = await this.redis.getJson<PaymentMethodInfo[]>(cacheKey);
    if (cached) return cached;

    let query = this.configRepo.createQueryBuilder('pmc')
      .where('pmc.countryCode = :countryCode', { countryCode })
      .andWhere('pmc.isActive = :active', { active: true })
      .orderBy('pmc.sortOrder', 'ASC');

    if (module) {
      // Filter methods that either allow all modules or include this one
      query = query.andWhere(
        `(pmc."allowedModules" = '[]'::jsonb OR pmc."allowedModules" @> :module)`,
        { module: JSON.stringify([module]) },
      );
    }

    const configs = await query.getMany();

    const methods: PaymentMethodInfo[] = configs.map(c => ({
      methodType: c.methodType,
      gateway: c.gateway,
      displayName: c.displayName,
      iconUrl: c.iconUrl,
      isDefault: c.isDefault,
      minAmount: Number(c.minAmount),
      maxAmount: Number(c.maxAmount)
    }));

    // Cache for 5 minutes
    await this.redis.setJson(cacheKey, methods, 300);
    return methods;
  }

  /**
   * Get the default payment method for a country.
   */
  async getDefaultMethod(countryCode: string): Promise<PaymentMethodInfo | null> {
    const methods = await this.getAvailableMethods(countryCode);
    return methods.find(m => m.isDefault) || methods[0] || null;
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private async getMethodConfig(countryCode: string, methodType: string): Promise<PaymentMethodConfig | null> {
    const cacheKey = `payment:config:${countryCode}:${methodType}`;
    const cached = await this.redis.getJson<PaymentMethodConfig>(cacheKey);
    if (cached) return cached;

    const config = await this.configRepo.findOne({
      where: { countryCode, methodType, isActive: true }
    });

    if (config) {
      await this.redis.setJson(cacheKey, config, 300);
    }

    return config;
  }

  /**
   * Default gateway mapping when no DB config exists.
   * Serves as a fallback and as the seed data reference.
   */
  private getDefaultGateway(countryCode: string, methodType: string): string {
    if (methodType === 'wallet') return 'wallet';

    const countryDefaults: Record<string, Record<string, string>> = {
      IN: { card: 'razorpay', upi: 'upi', netbanking: 'razorpay', wallet: 'wallet', cod: 'cod' },
      QA: { card: 'stripe', mada: 'mada', apple_pay: 'stripe' },
      AE: { card: 'stripe', apple_pay: 'stripe', samsung_pay: 'stripe' },
      SA: { card: 'stripe', mada: 'mada', sadad: 'mada', apple_pay: 'stripe' },
      US: { card: 'stripe', apple_pay: 'stripe', google_pay: 'stripe', ach: 'stripe' },
      UK: { card: 'stripe', apple_pay: 'stripe', google_pay: 'stripe' },
      SG: { card: 'stripe', apple_pay: 'stripe', grabpay: 'stripe', paynow: 'stripe' }
    };

    return countryDefaults[countryCode]?.[methodType] || 'stripe';
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentMethodInfo {
  methodType: string;
  gateway: string;
  displayName: string;
  iconUrl: string | null;
  isDefault: boolean;
  minAmount: number;
  maxAmount: number;
}
