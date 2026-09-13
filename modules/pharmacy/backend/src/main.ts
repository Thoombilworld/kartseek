import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { PharmacyServiceModule } from './pharmacy-service.module';
import { validateDatabaseConfig } from '@app/database';
import { HttpSurfaceGuard } from './transport/http-surface.guard';

async function bootstrap() {
  // Fail fast if DB_SYNCHRONIZE=true: these services share one PostgreSQL
  // instance, so auto-schema-sync would ALTER tables owned by other services.
  validateDatabaseConfig();
  const app = await NestFactory.create(PharmacyServiceModule);
  // Run onModuleDestroy/onApplicationShutdown on SIGTERM/SIGINT so Kafka
  // clients close (LeaveGroup) instead of lingering as dead group members
  // that block the next instance's join for a whole session timeout.
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // HttpSurfaceGuard closes the HTTP surface to everything but the two health
  // routes. It is what makes the wide bind below safe: the 41 HTTP routes on
  // PharmacyController carry no guards at all, and until now the only thing
  // stopping anyone reaching them was `app.listen(port, '127.0.0.1')` — which
  // is also what stopped the kubelet, leaving the pod TCP-probed (AUD2-002).
  app.useGlobalGuards(new HttpSurfaceGuard(app.get(Reflector)));
  // CORS is meaningless on a health-only surface, and `enableCors()` with no
  // arguments reflects any origin. A browser that needs this data goes through
  // the gateway, which is the only caller this service has.

  // ── TCP transport ───────────────────────────────────────────────────────────
  const tcpPort = +(process.env.PHARMACY_TCP_PORT ?? 4010);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();

  // ── HTTP transport (health probes only — see HttpSurfaceGuard) ────────────
  //
  // Bound to loopback by DEFAULT, and wide only when something says so.
  // `app.listen(port, '127.0.0.1')` was hard-coded here, which is safe on a
  // developer's machine — where `DEV_AUTH_BYPASS=true` makes every anonymous
  // request a SUPER_ADMIN, so an all-interfaces bind would hand that role to
  // anyone on the same network — and wrong in a container: a kubelet probes a
  // pod on its pod IP, so an httpGet probe could never reach this listener and
  // `k8s.mjs` fell all three probes back to `tcpSocket: 4010`. A port being
  // open cannot fail while Postgres is gone, which is the AUD2-002 defect.
  //
  // `PHARMACY_HTTP_HOST` is the same convention marketplace-service uses
  // (`MARKETPLACE_HTTP_HOST`), and both renderers already emit it as `0.0.0.0`
  // for every Nest service: `scripts/registry/compose.mjs` in the generated
  // `environment:` block, `scripts/registry/k8s.mjs` in the pod env. So the
  // container binds wide with no manifest edit, the host keeps loopback, and
  // HttpSurfaceGuard above is what makes the wide bind harmless either way.
  const httpPort = +(process.env.PHARMACY_SERVICE_PORT ?? 3020);
  const httpHost = process.env.PHARMACY_HTTP_HOST ?? '127.0.0.1';
  await app.listen(httpPort, httpHost);
  Logger.log(
    `💊 Pharmacy Service — TCP 0.0.0.0:${tcpPort} | health http://${httpHost}:${httpPort}/health`,
    'Bootstrap',
  );
}
bootstrap();
