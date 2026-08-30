import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { FranchiseController } from './franchise.controller';
import { FranchiseService } from './franchise.service';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Franchise } from './entities/franchise.entity';
import { buildEnvSchema, Joi } from '@app/common';

const envSchema = buildEnvSchema({
  FRANCHISE_TCP_PORT: Joi.number().default(4006),
  FRANCHISE_SERVICE_PORT: Joi.number().default(3016),
  // Defaults must match each service's own bind port in its main.ts.
  MARKETPLACE_TCP_PORT: Joi.number().default(4002),
  DOCTOR_TCP_PORT: Joi.number().default(4007),
  GROCERY_TCP_PORT: Joi.number().default(4008),
  PHARMACY_TCP_PORT: Joi.number().default(4010),
  RESTAURANT_TCP_PORT: Joi.number().default(4018),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envSchema,
      validationOptions: { abortEarly: false },
    }),
    RedisModule.register({ keyPrefix: 'kartseek:franchise:' }),
    KafkaModule,

    // franchise-service owns exactly one table: `franchises`.
    // It reaches every other module's data through that module's own service.
    DatabaseModule.registerPostgres([Franchise], 'franchise'),
    TypeOrmModule.forFeature([Franchise]),

    ClientsModule.register([
      { name: 'MARKETPLACE_SERVICE', transport: Transport.TCP, options: { host: '127.0.0.1', port: +(process.env.MARKETPLACE_TCP_PORT ?? 4002) } },
      { name: 'DOCTOR_SERVICE',      transport: Transport.TCP, options: { host: '127.0.0.1', port: +(process.env.DOCTOR_TCP_PORT      ?? 4007) } },
      { name: 'GROCERY_SERVICE',     transport: Transport.TCP, options: { host: '127.0.0.1', port: +(process.env.GROCERY_TCP_PORT     ?? 4008) } },
      { name: 'PHARMACY_SERVICE',    transport: Transport.TCP, options: { host: '127.0.0.1', port: +(process.env.PHARMACY_TCP_PORT    ?? 4010) } },
      { name: 'RESTAURANT_SERVICE',  transport: Transport.TCP, options: { host: '127.0.0.1', port: +(process.env.RESTAURANT_TCP_PORT  ?? 4018) } },
    ]),
  ],
  controllers: [FranchiseController],
  providers: [FranchiseService],
})
export class FranchiseModule {}
