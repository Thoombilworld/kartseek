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
              type:               'postgres',
              // host/port come from the shared helper too; the locals above exist
              // only for the dev log line.
              ...databaseCredentials(cfg),
              schema,
              entities,
              synchronize:        false,          // gateway never auto-migrates; each microservice owns its own schema
              logging:            isDev ? ['error'] : false,
              retryAttempts:      isDev ? 3 : 10, // 3 retries → app boots without DB in dev
              retryDelay:         isDev ? 1500 : 3000,
              keepConnectionAlive: !isDev,
              connectTimeoutMS:   5000,
              extra: {
                connectionTimeoutMillis: 5000,
                idleTimeoutMillis:       30_000,
                max:                     isDev ? 5 : 20,
              },
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
            uri:                     cfg.get<string>('MONGO_URI', 'mongodb://localhost:27017/kartseek_catalog'),
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS:         5000,
            socketTimeoutMS:          30_000,
            retryWrites:              true,
            retryReads:               true,
            maxPoolSize:              isDev ? 5 : 20,
          }),
        }),
      ],
      exports: [MongooseModule],
    };
  }
}
