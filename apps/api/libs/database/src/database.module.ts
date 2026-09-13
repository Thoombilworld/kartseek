import { type DynamicModule, Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { databaseCredentials } from './database.credentials';

const isDev = process.env.NODE_ENV !== 'production';

@Module({})
export class DatabaseModule {
  // ── PostgreSQL — Relational data (Users, Orders, Transactions) ──────────────
  static registerPostgres(entities: any[] = [], schema: string = 'public'): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (cfg: ConfigService) => {
            const host = cfg.get<string>('DB_HOST', 'localhost');
            const port = cfg.get<number>('DB_PORT', 5432);
            if (isDev) {
              new Logger('DatabaseModule').warn(
                `PostgreSQL → ${host}:${port}  (dev: retries 3× then continues)`,
              );
            }
            return {
              type: 'postgres',
              /**
               * Host, port, credentials, SSL, pool size and the retry/timeout
               * policy all come from the one helper; the locals above exist
               * only for the dev log line.
               *
               * This factory used to restate the whole policy underneath the
               * spread — `max: isDev ? 5 : 20`, its own retries and its own
               * `connectTimeoutMS` — which made three different pool policies
               * on this platform: grocery's, the helper's, and this one. A
               * deploy that raised `DB_POOL_SIZE` moved two of them and left
               * the gateway, wallet and location services on 20 regardless
               * (AUD2-033). There is one now, and `DB_POOL_SIZE` moves it.
               */
              ...databaseCredentials(cfg),
              schema,
              entities,
              synchronize: false, // gateway never auto-migrates; each microservice owns its own schema
              logging: isDev ? ['error'] : false,
              keepConnectionAlive: !isDev,
            };
          },
        }),
      ],
      exports: [TypeOrmModule],
    };
  }

  // ── MongoDB — Document data (Product catalog, Logs, Chat) ──────────────────
  static registerMongo(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (cfg: ConfigService) => ({
            uri: cfg.get<string>('MONGO_URI', 'mongodb://localhost:27017/kartseek_catalog'),
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
            socketTimeoutMS: 30_000,
            retryWrites: true,
            retryReads: true,
            maxPoolSize: isDev ? 5 : 20,
          }),
        }),
      ],
      exports: [MongooseModule],
    };
  }
}
