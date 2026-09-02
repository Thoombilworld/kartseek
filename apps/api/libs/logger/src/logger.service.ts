import { Injectable, type LoggerService } from '@nestjs/common';

@Injectable()
export class KartseekLogger implements LoggerService {
  private context = 'KARTSEEK';
  setContext(ctx: string) { this.context = ctx; }
  log(msg: string)   { console.log(`[${new Date().toISOString()}] [${this.context}] INFO  ${msg}`); }
  error(msg: string, trace?: string) { console.error(`[${new Date().toISOString()}] [${this.context}] ERROR ${msg}`, trace ?? ''); }
  warn(msg: string)  { console.warn(`[${new Date().toISOString()}] [${this.context}] WARN  ${msg}`); }
  debug(msg: string) { console.debug(`[${new Date().toISOString()}] [${this.context}] DEBUG ${msg}`); }
  verbose(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] VERB  ${msg}`); }
}
