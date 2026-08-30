import { registerAs } from '@nestjs/config';

/**
 * KARTSEEK API Gateway — Typed Application Configuration
 *
 * Registered as the 'app' namespace. Access via:
 *   configService.get<number>('app.port')
 *   configService.get<string>('app.nodeEnv')
 *   configService.get<boolean>('app.skipDb')
 *
 * All values are coerced to their proper types (number, boolean)
 * instead of the raw string values from process.env.
 */
export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.API_GATEWAY_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  // ── Skip Flags ────────────────────────────────────────────────────────────
  skipDb: process.env.SKIP_DB === 'true',
  skipKafka: process.env.SKIP_KAFKA === 'true',
  skipRedis: process.env.SKIP_REDIS === 'true',

  // ── HTTP Server Hardening ─────────────────────────────────────────────────
  http: {
    headersTimeout: parseInt(process.env.HTTP_HEADERS_TIMEOUT || '15000', 10),
    requestTimeout: parseInt(process.env.HTTP_REQUEST_TIMEOUT || '120000', 10),
    keepAliveTimeout: parseInt(process.env.HTTP_KEEPALIVE_TIMEOUT || '65000', 10),
    maxRequestsPerSocket: parseInt(process.env.HTTP_MAX_REQUESTS_PER_SOCKET || '100', 10),

    /**
     * How many reverse proxies sit in front of the gateway.
     *
     * Express ignores `X-Forwarded-For` until this is set, so `req.ip` was the
     * proxy's address on every request and the per-IP rate limit applied to the
     * whole platform at once. Deliberately a hop count rather than `true`:
     * trusting every hop lets anyone able to reach the app directly forge
     * `X-Forwarded-For` and take over another client's rate-limit bucket.
     *
     * `1` matches the single nginx in front of us. Set to `0` to disable when
     * the app is exposed directly, or higher behind an extra load balancer.
     */
    trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS || '1', 10),
  },

  // ── HPKP (Certificate Pinning) ───────────────────────────────────────────
  hpkp: {
    primaryPin: process.env.HPKP_PRIMARY_PIN,
    backupPin: process.env.HPKP_BACKUP_PIN,
    reportUri: process.env.HPKP_REPORT_URI || 'https://api.kartseek.com/api/v1/security/hpkp-report',
  },
}));

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  // The development fallback lives in `databaseCredentials()`; keeping a copy
  // here put the real password back into tracked source.
  password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  name: process.env.DB_NAME || 'kartseek_db',
  mongoUri: process.env.MONGO_URI,
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'kartseek_dev_secret_change_in_production',
  expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '900', 10),
}));

export const kafkaConfig = registerAs('kafka', () => ({
  brokers: process.env.KAFKA_BROKERS || 'localhost:9092',
  clientId: process.env.KAFKA_CLIENT_ID || 'kartseek-gateway',
  groupId: process.env.KAFKA_GROUP_ID || 'kartseek-consumers',
}));
