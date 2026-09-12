import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { RedisModule } from '@app/redis';
import { databaseCredentials } from '@app/database';
import { HealthModule } from '@app/common';

@Module({
  imports: [
    HealthModule.register({ service: 'user-service', database: true, redis: true }),
    ConfigModule.forRoot({ isGlobal: true }),
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
