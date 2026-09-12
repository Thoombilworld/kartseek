import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { RedisModule } from '@app/redis';
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
  USER_SERVICE_PORT: Joi.number().port().default(3011),
  USER_GRPC_PORT: Joi.number().port().default(5009),
});

@Module({
  imports: [
    HealthModule.register({ service: 'user-service', database: true, redis: true }),
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        ...databaseCredentials(cfg),
        // `public`, not `user`. The `user` schema in kartseek_db is empty: the
        // 51 real users live in `public.users`, which the gateway registers
        // too. Pointing here at `user` made every DB-backed user-service route
        // fail with "relation user.users does not exist" while /health was 200.
        schema: 'public',
        entities: [User],
        synchronize: cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([User]),
    RedisModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserServiceModule {}
