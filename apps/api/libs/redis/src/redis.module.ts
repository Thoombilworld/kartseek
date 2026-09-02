/**
 * KARTSEEK Redis Shared Library
 * Provides a singleton RedisService wrapping ioredis.
 * Import { RedisModule } or RedisModule.register({ keyPrefix }) into any microservice.
 */
import { type DynamicModule, Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {
  /**
   * Optional static factory for services that need a custom key prefix.
   * Usage: RedisModule.register({ keyPrefix: 'kartseek:' })
   */
  static register(options?: { keyPrefix?: string }): DynamicModule {
    return {
      global: true,
      module: RedisModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'REDIS_OPTIONS',
          useValue: options ?? {},
        },
        RedisService,
      ],
      exports: [RedisService],
    };
  }
}
