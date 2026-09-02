import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type ClientOptions, Transport, type GrpcOptions } from '@nestjs/microservices';
import { join } from 'path';

/** Default proto loader options for all KARTSEEK gRPC clients. */
const DEFAULT_LOADER_OPTIONS = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [] as string[],
};

/** Canonical list of every gRPC service in the ecosystem. */
export const GRPC_SERVICES = {
  AUTH:         { name: 'AUTH_SERVICE',         package: 'auth',         proto: 'auth.proto',         defaultPort: 5001 },
  ORDER:        { name: 'ORDER_SERVICE_GRPC',   package: 'order',        proto: 'order.proto',        defaultPort: 5002 },
  PAYMENT:      { name: 'PAYMENT_SERVICE_GRPC', package: 'payment',      proto: 'payment.proto',      defaultPort: 5003 },
  NOTIFICATION: { name: 'NOTIFICATION_GRPC',    package: 'notification', proto: 'notification.proto', defaultPort: 5004 },
  RESTAURANT:   { name: 'RESTAURANT_GRPC',      package: 'restaurant',   proto: 'restaurant.proto',   defaultPort: 5005 },
  MARKETPLACE:  { name: 'MARKETPLACE_GRPC',     package: 'marketplace',  proto: 'marketplace.proto',  defaultPort: 5006 },
  TAXI:         { name: 'TAXI_SERVICE_GRPC',    package: 'taxi',         proto: 'taxi.proto',         defaultPort: 5007 },
  DELIVERY:     { name: 'DELIVERY_GRPC',        package: 'delivery',     proto: 'delivery.proto',     defaultPort: 5008 },
  USER:         { name: 'USER_SERVICE_GRPC',    package: 'user',         proto: 'user.proto',         defaultPort: 5009 },
  GROCERY:      { name: 'GROCERY_GRPC',         package: 'grocery',      proto: 'grocery.proto',      defaultPort: 5010 },
} as const;

export type GrpcServiceKey = keyof typeof GRPC_SERVICES;

@Injectable()
export class GrpcClientFactory {
  private readonly logger = new Logger(GrpcClientFactory.name);
  private readonly protoDir: string;

  constructor(private readonly config: ConfigService) {
    this.protoDir = join(process.cwd(), 'proto');
  }

  /**
   * Build a full GrpcOptions ClientOptions object for a known service.
   * URL resolution order:
   *   1. explicit `url` parameter
   *   2. `<SERVICE_NAME>_GRPC_URL` env variable
   *   3. `localhost:<defaultPort>` fallback
   *
   * @example
   *   factory.forService('AUTH')
   *   // → Transport.GRPC connecting to auth:5001, loading auth.proto
   */
  forService(key: GrpcServiceKey, url?: string): GrpcOptions {
    const svc = GRPC_SERVICES[key];
    const envKey = `${svc.name.toUpperCase()}_GRPC_URL`;
    const resolvedUrl =
      url ??
      this.config.get<string>(envKey, `localhost:${svc.defaultPort}`);

    this.logger.debug(`gRPC client [${svc.name}] → ${resolvedUrl}`);

    return {
      transport: Transport.GRPC,
      options: {
        package: svc.package,
        protoPath: join(this.protoDir, svc.proto),
        url: resolvedUrl,
        loader: DEFAULT_LOADER_OPTIONS,
        channelOptions: {
          'grpc.keepalive_time_ms': 10_000,
          'grpc.keepalive_timeout_ms': 5_000,
          'grpc.keepalive_permit_without_calls': 1,
          'grpc.http2.min_time_between_pings_ms': 10_000,
        },
      },
    };
  }

  /**
   * @deprecated Use `forService()` instead for type-safe lookup.
   * Low-level builder for custom packages not in GRPC_SERVICES.
   */
  create(serviceName: string, packageName: string, protoFile: string, url?: string): ClientOptions {
    const envKey = `${serviceName.toUpperCase()}_GRPC_URL`;
    const resolvedUrl = url ?? this.config.get<string>(envKey, 'localhost:5000');
    return {
      transport: Transport.GRPC,
      options: {
        package: packageName,
        protoPath: join(this.protoDir, protoFile),
        url: resolvedUrl,
        loader: DEFAULT_LOADER_OPTIONS,
      },
    };
  }
}
