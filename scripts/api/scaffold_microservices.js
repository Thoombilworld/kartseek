/**
 * KARTSEEK — Microservice Scaffold Script
 * ────────────────────────────────────────────────────────────────────────
 * Generates main.ts, app.module.ts, service.ts, controller.ts for each
 * backend microservice.
 *
 * Location: scripts/api/scaffold_microservices.js
 * Run from monorepo root:
 *   node scripts/api/scaffold_microservices.js
 * ────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

// Resolve the API directory relative to this script's location
const API_DIR = path.resolve(__dirname, '..', '..', 'apps', 'api');

const SERVICES = [
  { name: 'marketplace-service', port: 3002, grpcPort: 5002, db: 'kartseek_marketplace', transport: ['grpc','kafka'] },
  { name: 'grocery-service',     port: 3003, grpcPort: 5003, db: 'kartseek_grocery',     transport: ['grpc','kafka'] },
  { name: 'restaurant-service',  port: 3004, grpcPort: 5004, db: 'kartseek_restaurant',  transport: ['grpc','kafka'] },
  { name: 'pharmacy-service',    port: 3005, grpcPort: 5005, db: 'kartseek_pharmacy',    transport: ['grpc'] },
  { name: 'doctor-service',      port: 3006, grpcPort: 5006, db: 'kartseek_doctor',      transport: ['grpc'] },
  { name: 'taxi-service',        port: 3007, grpcPort: 5007, db: 'kartseek_taxi',        transport: ['grpc','websocket'] },
  { name: 'delivery-service',    port: 3008, grpcPort: 5008, db: 'kartseek_delivery',    transport: ['grpc','kafka','websocket'] },
  { name: 'location-service',    port: 3009, grpcPort: 5009, db: null,                   transport: ['grpc','redis'] },
  { name: 'search-service',      port: 3010, grpcPort: 5010, db: null,                   transport: ['grpc','kafka'] },
  { name: 'cart-service',        port: 3011, grpcPort: 5011, db: null,                   transport: ['grpc','redis'] },
  { name: 'order-service',       port: 3012, grpcPort: 5012, db: 'kartseek_orders',      transport: ['grpc','kafka'] },
  { name: 'payment-service',     port: 3013, grpcPort: 5013, db: 'kartseek_payments',    transport: ['grpc','kafka'] },
  { name: 'wallet-service',      port: 3014, grpcPort: 5014, db: 'kartseek_wallet',      transport: ['grpc','kafka'] },
  { name: 'loyalty-service',     port: 3015, grpcPort: 5015, db: 'kartseek_loyalty',     transport: ['kafka'] },
  { name: 'refund-service',      port: 3016, grpcPort: 5016, db: 'kartseek_refunds',     transport: ['kafka'] },
  { name: 'commission-service',  port: 3017, grpcPort: 5017, db: 'kartseek_commission',  transport: ['kafka'] },
  { name: 'payout-service',      port: 3018, grpcPort: 5018, db: 'kartseek_payouts',     transport: ['kafka'] },
  { name: 'notification-service',port: 3019, grpcPort: 5019, db: null,                   transport: ['kafka'] },
  { name: 'admin-service',       port: 3020, grpcPort: 5020, db: 'kartseek_admin',       transport: ['grpc'] },
  { name: 'seller-service',      port: 3021, grpcPort: 5021, db: 'kartseek_sellers',     transport: ['grpc','kafka'] },
  { name: 'franchise-service',   port: 3022, grpcPort: 5022, db: 'kartseek_franchise',   transport: ['grpc'] },
  { name: 'audit-log-service',   port: 3023, grpcPort: 5023, db: null,                   transport: ['kafka','mongodb'] },
  { name: 'report-service',      port: 3024, grpcPort: 5024, db: 'kartseek_reports',     transport: ['grpc'] },
];

function pascal(str) {
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function camel(str) {
  const p = pascal(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function generateMain(svc) {
  const P = pascal(svc.name.replace('-service', ''));
  return `import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ${P}Module } from './${svc.name.replace('-service', '')}.module';

async function bootstrap() {
  const app = await NestFactory.create(${P}Module);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: '${svc.name.replace('-service', '')}',
      protoPath: 'proto/${svc.name.replace('-service', '')}.proto',
      url: process.env.${svc.name.replace(/-/g, '_').toUpperCase()}_GRPC_URL ?? 'localhost:${svc.grpcPort}',
    },
  });
  await app.startAllMicroservices();
  await app.listen(process.env.${svc.name.replace(/-/g, '_').toUpperCase()}_PORT ?? ${svc.port});
  console.log(\`[${P}Service] HTTP :${svc.port} | gRPC :${svc.grpcPort}\`);
}
bootstrap();
`;
}

function generateModule(svc) {
  const P = pascal(svc.name.replace('-service', ''));
  const moduleName = svc.name.replace('-service', '');
  const hasDb = !!svc.db;
  const hasKafka = svc.transport.includes('kafka');
  const hasMongo = svc.transport.includes('mongodb');

  const imports = [`ConfigModule.forRoot({ isGlobal: true })`];
  if (hasDb) {
    imports.push(`TypeOrmModule.forRootAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('DB_HOST', 'localhost'),
        port: cfg.get<number>('DB_PORT', 5432),
        username: cfg.get('DB_USER', 'kartseek'),
        password: cfg.get('DB_PASS', 'kartseek'),
        database: cfg.get('DB_NAME', '${svc.db}'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: cfg.get('NODE_ENV') !== 'production',
      }),
    })`);
  }
  if (hasMongo) {
    imports.push(`MongooseModule.forRootAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        uri: cfg.get('MONGO_URI', 'mongodb://localhost:27017/kartseek_${moduleName}'),
      }),
    })`);
  }

  const extraImports = [];
  if (hasDb) { extraImports.push(`import { TypeOrmModule } from '@nestjs/typeorm';`); }
  if (hasMongo) { extraImports.push(`import { MongooseModule } from '@nestjs/mongoose';`); }

  return `import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
${extraImports.join('\n')}
import { RedisModule } from '@app/redis';
import { ${P}Controller } from './${moduleName}.controller';
import { ${P}Service } from './${moduleName}.service';

@Module({
  imports: [
    ${imports.join(',\n    ')},
    RedisModule,
  ],
  controllers: [${P}Controller],
  providers: [${P}Service],
})
export class ${P}Module {}
`;
}

function generateService(svc) {
  const P = pascal(svc.name.replace('-service', ''));
  const moduleName = svc.name.replace('-service', '');
  return `import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';

@Injectable()
export class ${P}Service {
  private readonly logger = new Logger(${P}Service.name);
  constructor(private readonly redis: RedisService) {}

  async healthCheck() {
    return { service: '${svc.name}', status: 'ok', timestamp: new Date().toISOString() };
  }
}
`;
}

function generateController(svc) {
  const P = pascal(svc.name.replace('-service', ''));
  const moduleName = svc.name.replace('-service', '');
  return `import { Controller, Get } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ${P}Service } from './${moduleName}.service';

@Controller('${moduleName}')
export class ${P}Controller {
  constructor(private readonly svc: ${P}Service) {}

  @Get('health')
  health() { return this.svc.healthCheck(); }

  @GrpcMethod('${P}Service', 'HealthCheck')
  grpcHealth(_) { return this.svc.healthCheck(); }
}
`;
}

// ─── Generate all services ────────────────────────────────────────────────
for (const svc of SERVICES) {
  const moduleName = svc.name.replace('-service', '');
  const srcDir = path.join(API_DIR, 'apps', svc.name, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  const files = {
    'main.ts': generateMain(svc),
    [`${moduleName}.module.ts`]: generateModule(svc),
    [`${moduleName}.service.ts`]: generateService(svc),
    [`${moduleName}.controller.ts`]: generateController(svc),
  };

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(srcDir, filename);
    // Only write if file doesn't exist or is effectively empty (< 200 bytes)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 200) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${svc.name}/${filename}`);
    } else {
      console.log(`⏭️  ${svc.name}/${filename} — already has content, skipping`);
    }
  }
}

console.log('\n🎉 All 23 microservices scaffolded successfully.');
