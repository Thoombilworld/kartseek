# Code Review: Bug & Issue Report
**KARTSEEK Super App** — Auto-generated code review with 12 identified issues  
**Date:** 2025-01-30

---

## 🔴 Critical Issues

### 1. **Dockerfile Version Mismatch**  
**Severity:** 🔴 Critical  
**File:** `apps/api/Dockerfile.prod`, `apps/api/Dockerfile`  
**Issue:** Dockerfiles use `node:20-alpine` but `package.json` requires Node >=25.0.0. Node 20 lacks APIs/features from Node 25, causing runtime errors in production.  
**Fix:** Update both Dockerfiles to `node:25-alpine`  
✅ **Already Fixed in:** `Dockerfile.prod`

```dockerfile
# Before
FROM node:20-alpine AS builder

# After  
FROM node:25-alpine AS builder
```

---

### 2. **Docker Image Size Optimization**  
**Severity:** 🔴 Critical  
**File:** `apps/api/Dockerfile.prod`  
**Issue:** Production stage copies entire `node_modules` from builder (which includes dev deps + all 27 services' dependencies). `npm ci` installs for all services, not just api-gateway.  
**Impact:** 
- Image size ~1.2GB instead of ~200MB  
- Slower pushes to registry  
- Larger attack surface  

**Fix:** Use multi-stage build with separate prod-deps layer  
✅ **Already Fixed in:** `Dockerfile.prod`

---

### 3. **Helmet CSP `unsafe-inline` Scripts**  
**Severity:** 🔴 Critical (Security)  
**File:** `apps/api/apps/api-gateway/src/main.ts` (line 57)  
**Issue:** CSP header allows `'unsafe-inline'` scripts, defeating the entire purpose of CSP (blocks inline injection attacks).  
```javascript
scriptSrc: ["'self'", "'unsafe-inline'"],   // ❌ CSP is now useless
```

**Root Cause:** Comment claims "Required for Swagger UI" but Swagger UI v5+ supports CSP nonces.  

**Fix:** 
```typescript
import { nanoid } from 'nanoid';

// In bootstrap function:
const scriptNonce = nanoid(16);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", `'nonce-${scriptNonce}'`],
      // ... rest unchanged
    },
  },
}));

// SwaggerModule setup (before SwaggerModule.setup()):
const document = SwaggerModule.createDocument(app, swaggerConfig);
document.servers = [/* ... */];

// Option: use swaggerOptions.csp if library supports it, or:
// Manually inject nonce into swagger-ui.bundle.js via custom middleware
```

---

### 4. **Hardcoded Database Credentials**  
**Severity:** 🔴 Critical (Security)  
**File:** `docker-compose.yml` (lines 19-21), `.env.example`  
**Issue:** PostgreSQL/MongoDB passwords are hardcoded in version control.  
```yaml
POSTGRES_PASSWORD: kartseek123  # ❌ Visible in git history forever
MONGO_INITDB_ROOT_PASSWORD: kartseek123
```

**Fix:**
```yaml
# docker-compose.yml — use env interpolation:
environment:
  POSTGRES_USER: ${POSTGRES_USER:-postgres}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-change_me_in_prod}
  POSTGRES_DB: ${POSTGRES_DB:-kartseek_db}
```

Create `.env` (in `.gitignore`):
```
POSTGRES_PASSWORD=<generate-strong-secret>
MONGO_INITDB_ROOT_PASSWORD=<generate-strong-secret>
```

**Action:** Rotate all database passwords immediately; these are publicly visible.

---

## 🟠 High Priority Issues

### 5. **Missing Health Check Rate Limit Bypass**  
**Severity:** 🟠 High  
**File:** `apps/api/apps/api-gateway/src/main.ts` (line 137-142)  
**Issue:** Global throttler (100 req/60s) applies to `/health` endpoint. Kubernetes/load balancers probe health frequently, triggering 429 errors and false unavailability alerts.  

**Fix:**
```typescript
// apps/api/apps/api-gateway/src/controllers/health.controller.ts
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Get()
health() {
  return { status: 'ok' };
}
```

---

### 6. **WebSocket Memory Leak Risk**  
**Severity:** 🟠 High (Production Impact)  
**Files:** 
- `apps/api/apps/api-gateway/src/gateways/taxi-tracking.gateway.ts`
- `apps/api/apps/api-gateway/src/gateways/doctor.gateway.ts`
- `apps/api/apps/api-gateway/src/gateways/recommendation.gateway.ts`

**Issue:** `emitWithAck()` with recursive retry persists socket references without cleanup. Long-running connections accumulate in memory.

**Example Problem:**
```typescript
// taxi-tracking.gateway.ts line 264
private async emitWithAck(roomOrSocket: string, event: string, payload: any, logLabel: string, attempt = 0) {
  // ... emit logic ...
  if (!acked) {
    await this.emitWithAck(roomOrSocket, event, payload, logLabel, attempt + 1);
    // ❌ Socket references accumulate; no cleanup on disconnect
  }
}

@SubscribeMessage('disconnect')
handleDisconnect(client: Socket) {
  // ❌ Missing: client.removeAllListeners() before removal
}
```

**Fix:**
```typescript
@SubscribeMessage('disconnect')
handleDisconnect(client: Socket) {
  const rideId = (client.data || {}).rideId;
  if (rideId) {
    client.leave(`ride_${rideId}`);
  }
  client.removeAllListeners();  // ✅ Cleanup all event listeners
  client.disconnect(true);       // ✅ Force disconnect
  this.logger.debug(`Client ${client.id} disconnected (listeners cleared)`);
}
```

Apply to:
- `TaxiTrackingGateway`
- `DoctorQueueGateway`
- `RecommendationGateway`
- All other `*.gateway.ts` files

---

### 7. **Database Synchronize Safety Check**  
**Severity:** 🟠 High (Data Corruption Risk)  
**File:** `apps/api/.env.example`, database bootstrap  
**Issue:** Multiple services share one PostgreSQL. If even one service enables `DB_SYNCHRONIZE=true`, it auto-alters shared tables and can corrupt data.  

**Current safeguard:** Comment in `.env.example` says "Keep false".

**Fix:** Add runtime validation in `apps/api/apps/api-gateway/src/config/app.config.ts`:
```typescript
import { Logger } from '@nestjs/common';

export const validateDatabaseConfig = () => {
  if (process.env.DB_SYNCHRONIZE === 'true') {
    throw new Error(
      `❌ FATAL: DB_SYNCHRONIZE=true is forbidden. Multiple services share one DB; ` +
      `enabling AUTO-SCHEMA-SYNC will corrupt shared tables. ` +
      `Set DB_SYNCHRONIZE=false and run migrations manually.`
    );
  }
};

// In main.ts bootstrap():
validateDatabaseConfig();
```

---

### 8. **CORS Custom Headers Incomplete**  
**Severity:** 🟠 High (Silent API Failures)  
**File:** `apps/api/apps/api-gateway/src/main.ts` (line 83-98)  
**Issue:** CORS `allowedHeaders` missing some custom headers client sends. Browser preflight fails silently for missing headers.  

**Current allowedHeaders:**
```typescript
allowedHeaders: [
  'Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID',
  'X-Client-Version', 'X-Client-Platform',
  'X-Region-Code', 'X-Language-Code', 'X-Timezone',
  'X-Latitude', 'X-Longitude',
],
```

**Issue:** If web client sends `X-Device-ID`, `X-Session-ID`, or other custom headers not listed, the request is silently rejected by browser with CORS error in console.

**Fix:** Compare with actual client code (`apps/web/src/api/api-client.ts` or similar):
```typescript
// Audit client headers, then add ALL:
allowedHeaders: [
  // Standard
  'Content-Type', 'Authorization',
  // Security tokens
  'X-CSRF-Token', 'X-Request-ID',
  // Client metadata
  'X-Client-Version', 'X-Client-Platform', 'X-Device-ID',
  // Location & localization
  'X-Region-Code', 'X-Language-Code', 'X-Timezone',
  'X-Latitude', 'X-Longitude',
  // Session (if used)
  'X-Session-ID',
],
```

---

### 9. **Global RolesGuard Silently Disabled**  
**Severity:** 🟠 High (Authorization Bypass Risk)  
**File:** `apps/api/apps/api-gateway/src/main.ts` (line 122-135)  
**Issue:** Comments document that a global `RolesGuard` was disabled because it silently rejected 538+ routes. If someone re-enables it globally by mistake, all authorization silently breaks with no test catching it.

**Current Status:** Each controller manually applies `@UseGuards(JwtAuthGuard, RolesGuard)`.

**Risk:** 
- Future refactor might add `APP_GUARD: RolesGuard` provider
- No integration test validates `@Roles()` routes reject unauthenticated users
- Authorization silently fails in production

**Fix:** Add integration test:
```typescript
// test/auth.e2e-spec.ts
describe('Authorization (E2E)', () => {
  it('@Roles() routes reject unauthenticated users', async () => {
    // Test that admin endpoints return 401 without token
    // Test that @Roles("ADMIN") rejects non-admin users
  });

  it('RolesGuard is not registered globally', () => {
    // Parse AppModule providers and assert no global RolesGuard
    const appModule = module.get(AppModule);
    const providers = Reflect.getMetadata('nest:providers', AppModule);
    const hasGlobalRolesGuard = providers.some(
      (p) => p?.provide === 'APP_GUARD' && p?.useClass?.name === 'RolesGuard'
    );
    expect(hasGlobalRolesGuard).toBe(false);
  });
});
```

Add comment to code:
```typescript
// CRITICAL: RolesGuard MUST NOT be registered globally as APP_GUARD.
// Global guards run before controller-level guards, breaking authorization.
// If re-enabling global role checking is needed, write integration tests first.
```

---

## 🟡 Medium Priority Issues

### 10. **Missing Error Handling in Bootstrap**  
**Severity:** 🟡 Medium  
**File:** `apps/api/apps/api-gateway/src/main.ts` (line 256 — end)  
**Issue:** No try-catch around `app.listen()`. If port 3001 is already in use, process crashes with cryptic error.

**Fix:**
```typescript
async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      // ... rest of config ...
    });
    
    // ... setup code ...
    
    const port = configService.get<number>('app.port', 3001);
    await app.listen(port, '0.0.0.0');
    
    Logger.log(
      `🚀 API Gateway running on:       http://localhost:${port}/api/v1`,
      'Bootstrap'
    );
  } catch (error) {
    const port = process.env.API_GATEWAY_PORT || 3001;
    if ((error as any)?.code === 'EADDRINUSE') {
      Logger.error(
        `❌ Port ${port} already in use. Kill the process or use a different port:\n` +
        `   export API_GATEWAY_PORT=3002 && npm run dev:api`,
        'Bootstrap',
        error
      );
    } else {
      Logger.error(`❌ Failed to start API Gateway: ${error.message}`, 'Bootstrap', error);
    }
    process.exit(1);
  }
}

bootstrap();
```

---

### 11. **Nginx SSL Certificate Generation**  
**Severity:** 🟡 Medium  
**File:** `package.json` (nginx:certs script), `docker-compose.yml`  
**Issue:** `npm run nginx:certs` generates `./nginx/ssl/kartseek.crt` + `.key`, but directory doesn't exist. Fails with "No such file or directory".

**Fix:** Update script in `package.json`:
```json
"nginx:certs": "mkdir -p nginx/ssl && docker run --rm -v ./nginx/ssl:/ssl alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /ssl/kartseek.key -out /ssl/kartseek.crt -subj /C=GB/ST=London/L=London/O=KARTSEEK/OU=Engineering/CN=localhost -addext subjectAltName=DNS:localhost,DNS:kartseek.local,IP:127.0.0.1"
```

---

### 12. **TypeScript Version Conflict Potential**  
**Severity:** 🟡 Medium  
**File:** `apps/api/webpack.config.js` (line 22), `package.json`  
**Issue:** TypeScript 6 is recent; ts-loader may not be fully compatible. `webpack.config.js` explicitly sets `transpileOnly: true` to work around TS compiler issues.

**Current setup:** Works, but fragile to TS/ts-loader version updates.

**Recommendation:**
```typescript
// webpack.config.js — document why transpileOnly is necessary:
/**
 * Force transpileOnly: true (skip type-checking in webpack).
 * Reason: TypeScript 6 with ts-loader has strict ignoreDeprecations handling.
 * Type-checking is already run separately via `tsc --noEmit` in lint step.
 * 
 * If upgrading ts-loader or TypeScript, test against Node 25+ APIs:
 *   npm run type-check && npm run dev:api
 */
```

**Lock versions explicitly:**
```json
{
  "devDependencies": {
    "typescript": "^6.0.0",     // Keep explicit for Node 25 compat
    "ts-loader": "^9.6.0",       // Verify w/ ts-loader repo for TS 6 support
    "webpack": "^5.99.0"
  }
}
```

---

## Summary

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 4 | Node 20→25, Docker image bloat, CSP `unsafe-inline`, hardcoded credentials |
| 🟠 High | 5 | Health check throttle, WebSocket leaks, DB sync risk, CORS headers, RolesGuard |
| 🟡 Medium | 3 | Bootstrap error handling, Nginx cert dir, TS version |

**Next Steps:**
1. ✅ Update Dockerfiles to Node 25 (DONE in `Dockerfile.prod`)
2. 🔲 Remove CSP `unsafe-inline`
3. 🔲 Rotate database credentials
4. 🔲 Add `@SkipThrottle()` to health endpoint
5. 🔲 Fix WebSocket disconnect handlers
6. 🔲 Add DB_SYNCHRONIZE validation
7. 🔲 Add authorization integration tests

---

**Generated:** 2025-01-30  
**Review Scope:** Monorepo structure, Dockerfiles, main.ts gateway bootstrap, docker-compose.yml, package.json configs
