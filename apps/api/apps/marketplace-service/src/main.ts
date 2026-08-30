import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { MarketplaceModule } from './marketplace.module';
import { createGrpcMicroserviceOptions } from '@app/grpc';
import { InternalServiceGuard } from '@app/security';
import { HttpSurfaceGuard } from './http-surface.guard';

async function bootstrap() {
  const app = await NestFactory.create(MarketplaceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // NOTE: exceptions from TCP/gRPC handlers are shaped by RpcAwareExceptionsFilter,
  // bound with @UseFilters on each controller that owns message handlers. It cannot
  // be registered here: connectMicroservice() below does not inherit this app's
  // global filters, and APP_FILTER does not reach microservice transports either.
  // Opt-in service-to-service auth on TCP/gRPC handlers (no-op unless
  // INTERNAL_SERVICE_SECRET is configured). See InternalServiceGuard.
  //
  // HttpSurfaceGuard closes the HTTP surface to everything but health probes.
  // This service is consumed over TCP and gRPC; the HTTP listener below existed
  // only because `app.listen()` is required to keep the process alive, and it was
  // publishing an unauthenticated duplicate of the whole API. Ordered first so it
  // rejects before any route-level guard runs.
  app.useGlobalGuards(new HttpSurfaceGuard(app.get(Reflector)), new InternalServiceGuard());

  // CORS is meaningless on a health-only surface, and `enableCors()` with no
  // arguments reflects any origin. Left off deliberately — if a browser ever
  // needs to reach this service, it should go through the gateway.

  // ── gRPC transport ──────────────────────────────────────────────────────────
  const grpcPort = +(process.env.MARKETPLACE_GRPC_PORT ?? 5006);
  app.connectMicroservice(
    createGrpcMicroserviceOptions('marketplace', 'marketplace.proto', grpcPort),
  );

  // ── TCP transport (for gateway ClientProxy.send() calls) ────────────────────
  const tcpPort = +(process.env.MARKETPLACE_TCP_PORT ?? 4002);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();

  // ── HTTP transport (health probes only — see HttpSurfaceGuard) ──────────────
  //
  // Bound to loopback by default. Kubernetes probes reach the container on its
  // pod IP rather than 127.0.0.1, so the manifest sets MARKETPLACE_HTTP_HOST to
  // 0.0.0.0 explicitly; the guard is what makes that safe, the bind address is
  // defence in depth for anything running outside a pod network.
  const httpPort = +(process.env.MARKETPLACE_SERVICE_PORT ?? 3012);
  const httpHost = process.env.MARKETPLACE_HTTP_HOST ?? '127.0.0.1';
  await app.listen(httpPort, httpHost);
  Logger.log(
    `🛍️  Marketplace Service — gRPC :${grpcPort} | TCP :${tcpPort} | health http://${httpHost}:${httpPort}/health`,
    'Bootstrap',
  );
}
bootstrap();
