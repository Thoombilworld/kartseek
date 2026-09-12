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
import { HealthModule } from '@app/common';
@Module({
  imports: [
    HealthModule.register({ service: 'payout-service', database: true, redis: true }),
    ConfigModule.forRoot({ isGlobal: true }),
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
