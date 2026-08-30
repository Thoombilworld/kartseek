import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';


import { RedisModule } from '@app/redis';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    RedisModule,
    
  ],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
