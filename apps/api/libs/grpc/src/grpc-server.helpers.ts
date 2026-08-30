/**
 * KARTSEEK gRPC Server Helpers
 * Utility decorators and functions for services that EXPOSE gRPC endpoints.
 *
 * Usage in a microservice main.ts:
 *   import { createGrpcMicroserviceOptions } from '@app/grpc';
 *   const app = await NestFactory.createMicroservice(MyModule, createGrpcMicroserviceOptions('auth', 'auth.proto', 5001));
 */
import { GrpcOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

const DEFAULT_LOADER = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

/**
 * Creates standard gRPC microservice options for a given service.
 * Used in each microservice's main.ts to expose itself as a gRPC server.
 *
 * @param packageName  - Proto package name (e.g. 'auth')
 * @param protoFile    - Proto filename (e.g. 'auth.proto')
 * @param port         - Port to listen on (default from env or fallback)
 *
 * @example
 *   // In auth-service/src/main.ts:
 *   const app = await NestFactory.createMicroservice(
 *     AuthServiceModule,
 *     createGrpcMicroserviceOptions('auth', 'auth.proto', 5001),
 *   );
 */
export function createGrpcMicroserviceOptions(
  packageName: string,
  protoFile: string,
  port: number,
): GrpcOptions {
  const url = process.env[`GRPC_HOST`]
    ? `${process.env.GRPC_HOST}:${port}`
    : `0.0.0.0:${port}`;

  return {
    transport: Transport.GRPC,
    options: {
      package: packageName,
      protoPath: join(process.cwd(), 'proto', protoFile),
      url,
      loader: DEFAULT_LOADER,
      channelOptions: {
        'grpc.max_receive_message_length': 1024 * 1024 * 10,  // 10MB
        'grpc.max_send_message_length': 1024 * 1024 * 10,
      },
    },
  };
}

/** Convenience constants — use in each service's main.ts */
export const GRPC_SERVER_CONFIGS = {
  auth:         () => createGrpcMicroserviceOptions('auth',         'auth.proto',         +(process.env.AUTH_GRPC_PORT         ?? 5001)),
  order:        () => createGrpcMicroserviceOptions('order',        'order.proto',        +(process.env.ORDER_GRPC_PORT        ?? 5002)),
  payment:      () => createGrpcMicroserviceOptions('payment',      'payment.proto',      +(process.env.PAYMENT_GRPC_PORT      ?? 5003)),
  notification: () => createGrpcMicroserviceOptions('notification', 'notification.proto', +(process.env.NOTIFICATION_GRPC_PORT ?? 5004)),
  restaurant:   () => createGrpcMicroserviceOptions('restaurant',   'restaurant.proto',   +(process.env.RESTAURANT_GRPC_PORT   ?? 5005)),
  marketplace:  () => createGrpcMicroserviceOptions('marketplace',  'marketplace.proto',  +(process.env.MARKETPLACE_GRPC_PORT  ?? 5006)),
  taxi:         () => createGrpcMicroserviceOptions('taxi',         'taxi.proto',         +(process.env.TAXI_GRPC_PORT         ?? 5007)),
  delivery:     () => createGrpcMicroserviceOptions('delivery',     'delivery.proto',     +(process.env.DELIVERY_GRPC_PORT     ?? 5008)),
  user:         () => createGrpcMicroserviceOptions('user',         'user.proto',         +(process.env.USER_GRPC_PORT         ?? 5009)),
  grocery:      () => createGrpcMicroserviceOptions('grocery',      'grocery.proto',      +(process.env.GROCERY_GRPC_PORT      ?? 5010)),
} as const;
