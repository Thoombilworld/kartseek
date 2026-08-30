import { Module, Global } from '@nestjs/common';
import { KartseekLogger } from './logger.service';
@Global()
@Module({ providers: [KartseekLogger], exports: [KartseekLogger] })
export class LoggerModule {}
