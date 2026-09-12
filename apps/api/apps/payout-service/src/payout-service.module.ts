import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { PayoutController } from './payout.controller';
import { PayoutService } from './payout.service';
import { SellerWallet } from './entities/seller-wallet.entity';
import { Payout } from './entities/payout.entity';
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
  PAYOUT_SERVICE_PORT: Joi.number().port().default(3031),
  PAYOUT_TCP_PORT: Joi.number().port().default(4021),
});

@Module({
  imports: [
    HealthModule.register({ service: 'payout-service', database: true, redis: true }),
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,
        ...databaseCredentials(cfg),
        schema: 'payout',
        // Explicit classes, never a __dirname glob — the bundled build makes the
        // glob match nothing, leaving TypeORM with no metadata and every
        // DB-backed route throwing while /health still returns 200.
        entities: [SellerWallet, Payout],
        synchronize: cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    RedisModule,
    KafkaModule,
    TypeOrmModule.forFeature([SellerWallet, Payout]),
  ],
  controllers: [PayoutController],
  providers: [PayoutService],
})
export class PayoutServiceModule {}
