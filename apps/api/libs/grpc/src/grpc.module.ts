/**
 * KARTSEEK gRPC Shared Library
 * Provides helpers for registering gRPC clients and loading proto definitions.
 *
 * Usage:
 *   GrpcClientModule.register([
 *     { name: 'AUTH_SERVICE', packageName: 'auth', protoFileName: 'auth.proto' },
 *   ])
 */
import { DynamicModule, Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { GrpcClientFactory } from './grpc-client.factory';

export interface GrpcServiceConfig {
  /** Injection token (e.g. 'AUTH_SERVICE'). Used with @Inject('AUTH_SERVICE'). */
  name: string;
  /** gRPC package name matching the package declaration in the .proto file. */
  packageName: string;
  /** Proto file name, relative to the /proto directory (e.g. 'auth.proto'). */
  protoFileName: string;
  /** Optional URL override. Falls back to `<NAME>_GRPC_URL` env var. */
  url?: string;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [GrpcClientFactory],
  exports: [GrpcClientFactory],
})
export class GrpcLibModule {
  /**
   * Register one or more gRPC service clients.
   * Each entry creates a ClientProxy injected under `config.name`.
   */
  static register(services: GrpcServiceConfig[]): DynamicModule {
    return {
      global: true,
      module: GrpcLibModule,
      imports: [
        ConfigModule,
        ClientsModule.registerAsync(
          services.map((svc) => ({
            name: svc.name,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => ({
              transport: Transport.GRPC,
              options: {
                package: svc.packageName,
                protoPath: join(process.cwd(), 'proto', svc.protoFileName),
                url:
                  svc.url ??
                  cfg.get<string>(
                    `${svc.name.toUpperCase().replace(/_GRPC$/, '')}_GRPC_URL`,
                    'localhost:5000',
                  ),
                loader: {
                  keepCase: true,
                  longs: String,
                  enums: String,
                  defaults: true,
                  oneofs: true,
                },
              },
            }),
          })),
        ),
      ],
      providers: [GrpcClientFactory],
      exports: [GrpcClientFactory, ClientsModule],
    };
  }
}
