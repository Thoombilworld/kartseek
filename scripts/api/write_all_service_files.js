/**
 * KARTSEEK — Write All Remaining Microservice Files
 * ────────────────────────────────────────────────────────────────────────
 * Generates main.ts, module, service, and controller files for all
 * remaining backend microservices. Idempotent — skips files that already
 * have > 200 bytes of content.
 *
 * Location: scripts/api/write_all_service_files.js
 * Run from monorepo root:
 *   node scripts/api/write_all_service_files.js
 * ────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.resolve(__dirname, '..', '..', 'apps', 'api');

const SERVICES = [
  { name: 'restaurant',  port: 3004, grpc: 5004, db: 'kartseek_restaurant',  transports: ['grpc','kafka'] },
  { name: 'pharmacy',    port: 3005, grpc: 5005, db: 'kartseek_pharmacy',     transports: ['grpc'] },
  { name: 'doctor',      port: 3006, grpc: 5006, db: 'kartseek_doctor',       transports: ['grpc'] },
  { name: 'taxi',        port: 3007, grpc: 5007, db: 'kartseek_taxi',         transports: ['grpc','kafka','ws'] },
  { name: 'delivery',    port: 3008, grpc: 5008, db: 'kartseek_delivery',     transports: ['grpc','kafka','ws'] },
  { name: 'location',    port: 3009, grpc: 5009, db: null,                    transports: ['grpc','redis'] },
  { name: 'search',      port: 3010, grpc: 5010, db: null,                    transports: ['grpc','kafka'] },
  { name: 'cart',        port: 3011, grpc: 5011, db: null,                    transports: ['grpc','redis'] },
  { name: 'order',       port: 3012, grpc: 5012, db: 'kartseek_orders',       transports: ['grpc','kafka'] },
  { name: 'payment',     port: 3013, grpc: 5013, db: 'kartseek_payments',     transports: ['grpc','kafka'] },
  { name: 'wallet',      port: 3014, grpc: 5014, db: 'kartseek_wallet',       transports: ['grpc','kafka'] },
  { name: 'loyalty',     port: 3015, grpc: 5015, db: 'kartseek_loyalty',      transports: ['kafka'] },
  { name: 'refund',      port: 3016, grpc: 5016, db: 'kartseek_refunds',      transports: ['kafka'] },
  { name: 'commission',  port: 3017, grpc: 5017, db: 'kartseek_commission',   transports: ['kafka'] },
  { name: 'payout',      port: 3018, grpc: 5018, db: 'kartseek_payouts',      transports: ['kafka'] },
  { name: 'notification',port: 3019, grpc: 5019, db: null,                    transports: ['kafka'] },
  { name: 'admin',       port: 3020, grpc: 5020, db: 'kartseek_admin',        transports: ['grpc'] },
  { name: 'seller',      port: 3021, grpc: 5021, db: 'kartseek_sellers',      transports: ['grpc','kafka'] },
  { name: 'franchise',   port: 3022, grpc: 5022, db: 'kartseek_franchise',    transports: ['grpc'] },
  { name: 'report',      port: 3024, grpc: 5024, db: 'kartseek_reports',      transports: ['grpc'] },
];

function pascal(n) { return n.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(''); }

function writeIfSmall(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 200) {
    console.log(`  ⏭  ${path.basename(filePath)} (has content)`);
    return;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ ${path.basename(filePath)}`);
}

for (const svc of SERVICES) {
  const P = pascal(svc.name);
  const dir = path.join(API_DIR, 'apps', `${svc.name}-service`, 'src');
  console.log(`\n📦 ${svc.name}-service`);

  // main.ts
  writeIfSmall(path.join(dir, 'main.ts'), `import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ${P}Module } from './${svc.name}.module';
async function bootstrap() {
  const app = await NestFactory.create(${P}Module);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: { package: '${svc.name}', protoPath: 'proto/${svc.name}.proto', url: process.env.${svc.name.toUpperCase()}_SERVICE_GRPC_URL ?? 'localhost:${svc.grpc}' },
  });
  await app.startAllMicroservices();
  await app.listen(process.env.${svc.name.toUpperCase()}_SERVICE_PORT ?? ${svc.port});
  console.log('[${P}Service] HTTP :${svc.port} | gRPC :${svc.grpc}');
}
bootstrap();
`);

  // module
  const dbImport = svc.db ? `TypeOrmModule.forRootAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const, host: cfg.get('DB_HOST', 'localhost'),
        port: cfg.get<number>('DB_PORT', 5432), username: cfg.get('DB_USER', 'kartseek'),
        password: cfg.get('DB_PASS', 'kartseek'), database: cfg.get('DB_NAME', '${svc.db}'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'], synchronize: cfg.get('NODE_ENV') !== 'production',
      }),
    }),` : '';
  const dbImportLine = svc.db ? `import { TypeOrmModule } from '@nestjs/typeorm';` : '';
  const kafkaImport = svc.transports.includes('kafka') ? `import { KafkaModule } from '@app/kafka';` : '';
  const kafkaModule = svc.transports.includes('kafka') ? 'KafkaModule,' : '';

  writeIfSmall(path.join(dir, `${svc.name}.module.ts`), `import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
${dbImportLine}
${kafkaImport}
import { RedisModule } from '@app/redis';
import { ${P}Controller } from './${svc.name}.controller';
import { ${P}Service } from './${svc.name}.service';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ${dbImport}
    RedisModule,
    ${kafkaModule}
  ],
  controllers: [${P}Controller],
  providers: [${P}Service],
})
export class ${P}Module {}
`);

  // service
  const kafkaDep = svc.transports.includes('kafka') ? `, private readonly kafka: KafkaProducerService` : '';
  const kafkaDepImport = svc.transports.includes('kafka') ? `import { KafkaProducerService } from '@app/kafka';` : '';

  writeIfSmall(path.join(dir, `${svc.name}.service.ts`), `import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
${kafkaDepImport}
@Injectable()
export class ${P}Service {
  private readonly logger = new Logger(${P}Service.name);
  constructor(private readonly redis: RedisService${kafkaDep}) {}
  async healthCheck() {
    return { service: '${svc.name}-service', status: 'ok', timestamp: new Date().toISOString() };
  }
}
`);

  // controller
  writeIfSmall(path.join(dir, `${svc.name}.controller.ts`), `import { Controller, Get } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ${P}Service } from './${svc.name}.service';
@Controller('${svc.name}')
export class ${P}Controller {
  constructor(private readonly svc: ${P}Service) {}
  @Get('health')
  health() { return this.svc.healthCheck(); }
  @GrpcMethod('${P}Service', 'HealthCheck')
  grpcHealth(_) { return this.svc.healthCheck(); }
}
`);
}

console.log('\n\n🎉 All services written. Ready to build.');
