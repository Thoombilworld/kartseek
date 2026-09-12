import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';

// Entities
import { Payment } from './entities/payment.entity';
import { Invoice } from './entities/invoice.entity';
import { PaymentMethodConfig } from './entities/payment-method-config.entity';
import { SettlementRecord } from './entities/settlement-record.entity';

// Core Services
import { PaymentOrchestratorService } from './payment.service';
import { PaymentController } from './payment.controller';
import { WebhookController } from './controllers/webhook.controller';

// Domain Services
import { SettlementEngineService } from './services/settlement-engine.service';
import { InvoiceService } from './services/invoice.service';
import { RealTimeBillingService } from './services/realtime-billing.service';

// Gateway Adapters
import { GatewayAdapterFactory } from './adapters/gateway-adapter.factory';
import { RazorpayAdapter } from './adapters/razorpay.adapter';
import { StripeAdapter } from './adapters/stripe.adapter';
import { UpiAdapter } from './adapters/upi.adapter';
import { MadaAdapter } from './adapters/mada.adapter';
import { WalletAdapter } from './adapters/wallet.adapter';
import { databaseCredentials } from '@app/database';
import { HealthModule, buildEnvSchema, Joi } from '@app/common';

/**
 * Validated at boot, which is where a misconfiguration is cheapest.
 *
 * `buildEnvSchema()` carries the production refusal of SKIP_DB / SKIP_KAFKA /
 * SKIP_REDIS — each swaps a shared store for an in-process emulator — and that
 * refusal is only ever reached through `validationSchema`. This module called
 * a bare `ConfigModule.forRoot`, so it loaded no schema and the guard was
 * written, tested, and absent from this process.
 *
 * The port defaults must equal this service's own main.ts defaults:
 * @nestjs/config writes validated defaults BACK into process.env, and main.ts
 * reads process.env after the app is created — so a wrong default here silently
 * moves the port the service listens on, and `npm run registry:check` is what
 * catches the disagreement.
 */
const envSchema = buildEnvSchema({
  PAYMENT_SERVICE_PORT: Joi.number().port().default(3025),
  PAYMENT_TCP_PORT: Joi.number().port().default(4026),
  PAYMENT_GRPC_PORT: Joi.number().port().default(5003),
});

/**
 * PaymentServiceModule — NestJS module for the centralized payment microservice.
 *
 * Registers:
 *  - 4 TypeORM entities (Payment, Invoice, PaymentMethodConfig, SettlementRecord)
 *  - 1 Orchestrator service (central entry point)
 *  - 3 Domain services (Settlement, Invoice, RealTimeBilling)
 *  - 5 Gateway adapters (Razorpay, Stripe, UPI, Mada, Wallet)
 *  - 1 Adapter factory (route resolution)
 *
 * Database: kartseek_db (PostgreSQL)
 */
@Module({
  imports: [
    HealthModule.register({ service: 'payment-service', database: true, redis: true }),
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        ...databaseCredentials(cfg),
        schema: 'payment',
        entities: [Payment, Invoice, PaymentMethodConfig, SettlementRecord],
        synchronize: cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([Payment, Invoice, PaymentMethodConfig, SettlementRecord]),
    RedisModule,
    KafkaModule,
  ],
  controllers: [PaymentController, WebhookController],
  providers: [
    // Core
    PaymentOrchestratorService,

    // Domain Services
    SettlementEngineService,
    InvoiceService,
    RealTimeBillingService,

    // Gateway Adapters
    RazorpayAdapter,
    StripeAdapter,
    UpiAdapter,
    MadaAdapter,
    WalletAdapter,
    GatewayAdapterFactory,
  ],
  exports: [PaymentOrchestratorService, SettlementEngineService, InvoiceService],
})
export class PaymentServiceModule {}
