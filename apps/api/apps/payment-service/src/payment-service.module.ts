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
import { HealthModule } from '@app/common';

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
    ConfigModule.forRoot({ isGlobal: true }),
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
