import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { DatabaseModule } from '@app/database';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { buildEnvSchema, Joi } from '@app/common';

const envSchema = buildEnvSchema({
  WALLET_TCP_PORT: Joi.number().default(4014),
  // Must match this service's own main.ts. @nestjs/config writes validated
  // defaults BACK into process.env, and main.ts reads process.env after the
  // app is created — so a wrong default here silently moves the port the
  // service actually listens on, and the k8s probe then points at nothing.
  WALLET_SERVICE_PORT: Joi.number().default(3024),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envSchema,
      validationOptions: { abortEarly: false },
    }),
    // Use the shared DatabaseModule with graceful retry logic
    // (3 retries in dev → app boots without DB, 10 in prod)
    DatabaseModule.registerPostgres([WalletTransaction], 'wallet'),
    TypeOrmModule.forFeature([WalletTransaction]),
    RedisModule,
    KafkaModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
