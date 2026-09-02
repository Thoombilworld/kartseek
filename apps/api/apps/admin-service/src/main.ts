import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { AdminModule } from './admin.module';
import { validateDatabaseConfig } from '@app/database';

async function bootstrap() {
  // Fail fast if DB_SYNCHRONIZE=true: these services share one PostgreSQL
  // instance, so auto-schema-sync would ALTER tables owned by other services.
  validateDatabaseConfig();
  // AdminModule, not the former AdminServiceModule: that one declared the same
  // controller and service but imported neither TypeOrmModule.forRoot nor
  // forFeature([PageLayout]), so AdminService could never be constructed and the
  // process died on boot with UnknownDependenciesException every single time.
  const app = await NestFactory.create(AdminModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // ── TCP transport ───────────────────────────────────────────────────────────
  const tcpPort = +(process.env.ADMIN_TCP_PORT ?? 4017);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();
  const httpPort = +(process.env.ADMIN_SERVICE_PORT ?? 3027);
  await app.listen(httpPort);
  Logger.log(`👑 Admin Service — HTTP :${httpPort} | TCP :${tcpPort}`, 'Bootstrap');
}
bootstrap();
