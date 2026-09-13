import * as Joi from 'joi';
import { STORE_EMULATOR_SWITCHES, devOnlyStoreSwitch } from '@app/common';

/**
 * KARTSEEK API Gateway — Environment Variable Validation Schema
 *
 * Validates ALL required and optional environment variables at startup.
 * If a required variable is missing or has an invalid value, the app
 * fails fast with a clear error message instead of crashing later.
 *
 * Usage: Pass to ConfigModule.forRoot({ validationSchema })
 */
export const envValidationSchema = Joi.object({
  // ── App ──────────────────────────────────────────────────────────────────
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  API_GATEWAY_PORT: Joi.number().port().default(3001),

  // ── Skip Flags (dev convenience, refused in production) ──────────────────
  // Each of these swaps a shared store for an in-process emulator, so each is
  // rejected at boot when NODE_ENV=production. The rule is the shared one from
  // `@app/common` rather than a copy, because the gateway and the other 25
  // services disagreeing about which environments may run on an emulator is
  // precisely how one of them would end up doing it.
  ...Object.fromEntries(STORE_EMULATOR_SWITCHES.map((f) => [f, devOnlyStoreSwitch(f)])),

  // ── Dev Auth Bypass ───────────────────────────────────────────────────────
  DEV_AUTH_BYPASS: Joi.string().valid('true', 'false').default('false'),
  // Role the bypass injects. Defaults to CUSTOMER, so admin/seller routes stay
  // closed unless a developer opts in deliberately. Never read in production —
  // the guard also requires NODE_ENV !== 'production'. Validated here so a typo
  // fails at boot rather than as a puzzling 403.
  DEV_AUTH_BYPASS_ROLE: Joi.string()
    .uppercase()
    .valid(
      'CUSTOMER',
      'ADMIN',
      'SUPER_ADMIN',
      'SELLER',
      'DRIVER',
      'FRANCHISE_ADMIN',
      'FRANCHISE_OWNER',
      'SUPPORT_AGENT',
      'FINANCE_MANAGER',
      'PRODUCT_MANAGER',
      'RESTAURANT_SELLER',
      'GROCERY_SELLER',
      'PHARMACY_SELLER',
      'PHARMACIST',
      'DOCTOR',
      'TAXI_DRIVER',
      'DELIVERY_DRIVER',
      'DELIVERY_BOY',
    )
    .default('CUSTOMER'),

  // ── PostgreSQL ───────────────────────────────────────────────────────────
  DB_HOST: Joi.string().default('127.0.0.1'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().default('postgres'),
  // No default. A default here is returned by ConfigService even when the
  // variable is unset, which would make the production guard in
  // `databaseCredentials()` unreachable — it would never see a missing password.
  DB_PASSWORD: Joi.string().allow('').optional(),
  // There is deliberately no `DB_PASS`. It was an accepted alias until the
  // whole-branch review found that `scripts/registry/compose.mjs` blanks only
  // `DB_PASSWORD` for the ten `database: null` services, so the alias carried
  // the superuser password into every credential-free container (N2). One
  // secret, one name. `allowUnknown` below means an old `.env` line is ignored
  // rather than fatal — but nothing reads it.
  DB_NAME: Joi.string().default('kartseek_db'),
  /**
   * Connection-pool and retry policy, applied by `databaseCredentials()` in
   * @app/database — one policy for every service rather than three (AUD2-033).
   *
   * No defaults here on purpose: a Joi default is returned by ConfigService
   * even when the variable is unset, which would move the real defaults out of
   * the helper and into two schemas that could drift from it. Declared so a
   * non-numeric value is refused at boot instead of silently becoming NaN.
   */
  DB_POOL_SIZE: Joi.number().integer().min(1).optional(),
  DB_POOL_TIMEOUT_MS: Joi.number().integer().min(0).optional(),
  DB_CONNECT_TIMEOUT_MS: Joi.number().integer().min(0).optional(),
  DB_RETRY_ATTEMPTS: Joi.number().integer().min(0).optional(),
  DB_RETRY_DELAY_MS: Joi.number().integer().min(0).optional(),
  // Auto-schema-sync. Defaults OFF: multiple services share one database, so
  // letting each ALTER the shared tables to match its own entities makes the
  // resulting schema depend on service boot order. Use migrations instead.
  DB_SYNCHRONIZE: Joi.string().valid('true', 'false').default('false'),

  // ── MongoDB ──────────────────────────────────────────────────────────────
  MONGO_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .optional(),

  // ── Redis ────────────────────────────────────────────────────────────────
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),

  // ── Kafka ────────────────────────────────────────────────────────────────
  KAFKA_BROKERS: Joi.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: Joi.string().default('kartseek-gateway'),
  KAFKA_GROUP_ID: Joi.string().default('kartseek-consumers'),

  // ── JWT ──────────────────────────────────────────────────────────────────
  // 32, not 16: `resolveJwtSecret()` is what every signer and verifier actually
  // calls, and it refuses anything shorter. At min(16) a 20-character secret
  // passed validation at boot and was then rejected at the point of use, which
  // reads as "auth is broken" rather than "the secret is too short".
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT signing secret — must be at least 32 characters')
    .custom((value, helpers) => {
      if (process.env.NODE_ENV === 'production') {
        const weakPatterns = ['dev', 'test', 'change', 'example', 'placeholder'];
        if (weakPatterns.some((p) => value.toLowerCase().includes(p))) {
          return helpers.error('any.invalid', {
            message: 'JWT_SECRET contains dev/test patterns — use a strong secret in production',
          });
        }
      }
      return value;
    }),
  JWT_EXPIRES_IN: Joi.number().positive().default(900),

  // ── Encryption (PII / Field-Level) ──────────────────────────────────────
  ENCRYPTION_KEY: Joi.string()
    .hex()
    .length(64)
    .when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.optional() })
    .description('AES-256-GCM key — 64-character hex string (32 bytes)'),

  // ── Google Maps ─────────────────────────────────────────────────────────
  GOOGLE_MAPS_API_KEY: Joi.string().optional(),

  // ── Object storage ───────────────────────────────────────────────────────
  // Two seams, and the private one is validated because getting it wrong is
  // how identity documents ended up on the CDN-fronted public bucket
  // (re-review RF-1). `STORAGE_PRIVATE_BUCKET` is required whenever the
  // provider is a cloud one: a KYC upload with no private bucket configured is
  // refused at the seam, and failing at boot instead says so where an operator
  // reads it.
  STORAGE_PROVIDER: Joi.string().valid('s3', 'gcs', 'r2', 'local').default('local'),
  CDN_DOMAIN: Joi.string().default('cdn.kartseek.com'),
  STORAGE_LOCAL_DIR: Joi.string().allow('').optional(),
  // RF-4: and it may not BE the public one. Requiring the variable stops the
  // private seam falling back to `S3_BUCKET`; it does not stop an operator
  // setting both to the same string, which is invisible afterwards — every
  // upload succeeds and the identity documents are on the CDN. `invalid` with a
  // reference refuses that pairing at boot, where it is still legible, and
  // `StorageService`'s constructor refuses it again for the services that do
  // not run this schema.
  //
  // Two references cover all three cloud providers, and there is deliberately
  // no `R2_BUCKET`: the `r2` provider carries its own endpoint and credentials
  // (`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) but writes to
  // `this.bucket` — which `storage.service.ts:89` resolves from
  // `S3_BUCKET || GCS_BUCKET`. So `r2` is guarded by the `S3_BUCKET` reference
  // below; adding an `R2_BUCKET` ref would guard a variable nothing reads.
  STORAGE_PRIVATE_BUCKET: Joi.string()
    .allow('')
    .when('STORAGE_PROVIDER', {
      is: Joi.valid('s3', 'gcs', 'r2'),
      then: Joi.string()
        .min(1)
        .required()
        .invalid(Joi.ref('S3_BUCKET'), Joi.ref('GCS_BUCKET'))
        .messages({
          'any.invalid':
            'STORAGE_PRIVATE_BUCKET must not be the public bucket (S3_BUCKET/GCS_BUCKET): the ' +
            'public bucket is CDN-fronted, so KYC documents would be readable by anyone.',
        }),
      otherwise: Joi.optional(),
    })
    .description('Private bucket for confidential documents — never the CDN-fronted one'),
  STORAGE_PRIVATE_PREFIX: Joi.string().allow('').default('private/'),
  STORAGE_PRIVATE_DIR: Joi.string()
    .allow('')
    .optional()
    .description('local provider only — must be outside any served static path'),

  // ── CSRF Protection ─────────────────────────────────────────────────────
  CSRF_ENABLED: Joi.string().valid('true', 'false').default('true'),
  CSRF_COOKIE_NAME: Joi.string().default('kartseek_csrf'),
  CSRF_COOKIE_SECURE: Joi.string().valid('true', 'false').default('false'),
  CSRF_COOKIE_SAMESITE: Joi.string().valid('Strict', 'Lax', 'None').default('Strict'),

  // ── DDoS Protection (HTTP) ────────────────────────────────────────────
  DDOS_RATE_LIMIT_WINDOW: Joi.number().positive().default(60),
  DDOS_RATE_LIMIT_MAX: Joi.number().positive().default(100),
  DDOS_BURST_WINDOW: Joi.number().positive().default(5),
  DDOS_BURST_MAX: Joi.number().positive().default(20),
  DDOS_BAN_DURATION: Joi.number().positive().default(900),
  DDOS_MAX_BODY_SIZE: Joi.number().positive().default(10485760),

  // ── HTTP Server Hardening ────────────────────────────────────────────────
  HTTP_HEADERS_TIMEOUT: Joi.number().positive().default(15000),
  HTTP_REQUEST_TIMEOUT: Joi.number().positive().default(120000),
  HTTP_KEEPALIVE_TIMEOUT: Joi.number().positive().default(65000),
  HTTP_MAX_REQUESTS_PER_SOCKET: Joi.number().positive().default(100),

  // ── HPKP (Certificate Pinning — production only) ─────────────────────────
  HPKP_PRIMARY_PIN: Joi.string().optional(),
  HPKP_BACKUP_PIN: Joi.string().optional(),
  HPKP_REPORT_URI: Joi.string().uri().optional(),

  // ── Microservice TCP Ports ───────────────────────────────────────────────
  // These defaults are what the gateway dials when the variable is absent from
  // .env, so each one MUST match the port the service actually binds in its own
  // main.ts. The first four were off by one service each: marketplace has no
  // .env override, so the gateway dialled 4001 while the service listened on
  // 4002 and every catalog call came back ECONNREFUSED → 503. The other three
  // were masked only because .env happens to set them explicitly — and CART's
  // stale 4002 default aliased onto marketplace's real port.
  MARKETPLACE_TCP_PORT: Joi.number().port().default(4002),
  CART_TCP_PORT: Joi.number().port().default(4003),
  ORDER_TCP_PORT: Joi.number().port().default(4004),
  LOYALTY_TCP_PORT: Joi.number().port().default(4005),
  FRANCHISE_TCP_PORT: Joi.number().port().default(4006),
  DOCTOR_TCP_PORT: Joi.number().port().default(4007),
  GROCERY_TCP_PORT: Joi.number().port().default(4008),
  PHARMACY_TCP_PORT: Joi.number().port().default(4010),
  LOCATION_TCP_PORT: Joi.number().port().default(4013),
  WALLET_TCP_PORT: Joi.number().port().default(4014),
  ADMIN_TCP_PORT: Joi.number().port().default(4017),
  RESTAURANT_TCP_PORT: Joi.number().port().default(4018),
  COMMISSION_TCP_PORT: Joi.number().port().default(4020),
  PAYOUT_TCP_PORT: Joi.number().port().default(4021),
  REFUND_TCP_PORT: Joi.number().port().default(4022),
  SEARCH_TCP_PORT: Joi.number().port().default(4023),
  REPORT_TCP_PORT: Joi.number().port().default(4024),
  HOTEL_TCP_PORT: Joi.number().port().default(4025),
  PAYMENT_TCP_PORT: Joi.number().port().default(4026),
  TAXI_TCP_PORT: Joi.number().port().default(4027),
  AUDIT_LOG_TCP_PORT: Joi.number().port().default(4028),
}).options({
  // Allow env vars not listed above (e.g. PATH, npm_*)
  allowUnknown: true,
  // Strip unknown keys from the validated config object
  stripUnknown: false,
});
