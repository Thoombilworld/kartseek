# KARTSEEK — Customer Registration, Login and Password-Reset Audit

Date: 2026-09-13 · Branch: `feat/admin-platform-upgrade` · Scope: the customer-facing
authentication pipeline (web signup/login/reset pages → API gateway `/auth/*` →
`public.users` in `kartseek_db` → Kafka → notification-service). Seller and
partner registration are M12's (user-service) and are only cross-referenced.

## 0. Summary

Customers could not create accounts because the gateway's password rule refused
every symbol outside the eight characters `@$!%*?&^#`, anywhere in the password,
while telling the customer the password "must include a special character". A
password such as `Passw0rd_2026.` was a 400. The web signup and reset pages
mirrored the same regex, so the refusal happened client-side first with the same
wrong message. Login, token refresh, logout, profile, account lockout and the
reset-token mechanics were verified working and were not the cause.

The same trace found four more defects on the register path, all fixed:

| #   | Defect                                                                                                                            | Effect on customers                                                                                 | Fix                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| RC1 | `PASSWORD_REGEX` closed symbol set and restricted character class                                                                 | Any password with `_ . - + ,` etc. refused with a misleading message                                | Rule now: 8–128 characters, no whitespace, upper, lower, digit, any symbol; message names examples |
| RC2 | Gateway `User` entity never mapped `users.country`                                                                                | Every new customer recorded as India (`'IN'`, the column default) whatever market they signed up in | Entity maps `country`; register writes `requestRegion(req)`                                        |
| RC3 | Register and `/auth/profile` returned the phone's ciphertext (`iv:tag:ciphertext`)                                                | Profile showed gibberish where the phone should be                                                  | Register echoes the submitted number; profile decrypts                                             |
| RC4 | `NotificationService.sendViaSendGrid` was a commented-out stub that reported success                                              | Password-reset e-mails never left the system, and the consumer logged "dispatched"                  | Real SendGrid v3 REST call; consumer warns unless the provider answered `SENT`                     |
| RC5 | `RegisterDto` advertised an optional `role` (enum incl. `SUPER_ADMIN`) the handler never read; register had no per-route throttle | Misleading contract in Swagger; brute-force registration paced only by the global limiter           | Field removed (whitelist now refuses it); register throttled 10/min per IP like login              |

No migration was needed: `users.country` already exists (user-service maps it);
the gateway simply did not know about it. That is the "database synchronization"
issue behind RC2 — two entities for one table, one of them incomplete.

## A. Root causes in detail

### RC1 — the password rule

`apps/api/apps/api-gateway/src/dto/gateway.dto.ts` carried

```
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,128}$/
```

Two problems. The lookahead demanded one of eight symbols, and the final
character class refused any character outside letters, digits and those eight,
so a password could fail for containing a perfectly good symbol. The
`@Matches` message said only that a special character was required. Three DTOs
shared it (`RegisterDto.password`, `ResetPasswordDto.newPassword`,
`SellerRegisterDto.password`) and both web pages copied it verbatim, so the
customer saw the same wrong message before the request left the browser.

Now (`gateway.dto.ts:45`):

```
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])\S{8,128}$/
```

with one message for all three DTOs: "Password must be 8–128 characters with no
spaces and include at least 1 uppercase letter, 1 lowercase letter, 1 digit and
1 symbol (for example ! @ # \_ -)". Unicode letters are accepted as characters
(`Ünïcødé-Pass1` passes); whitespace is refused anywhere.

### RC2 — every customer stored as India

`public.users.country` defaults to `'IN'`. user-service's entity maps it; the
gateway's copy (`apps/api/apps/api-gateway/src/entities/user.entity.ts`) did
not, so `register()` could not set it and the default won for every account
created through the gateway. QA probe rows created before the fix all read
`country = 'IN'` under an `X-Region-Code: QA` request. The entity now maps the
column (`user.entity.ts:80`) and register writes `country: requestRegion(req)`
(`gateway.controller.ts:517`), the same resolution every other gateway handler
uses (request `regionCode` set by the edge, else the `X-Region-Code` header,
else the platform default). `users.region_code` is a different column, the
admin scope lock, and is untouched.

**Which column is a customer's canonical market.** `users.country` (ISO
3166-1 alpha-2, the market the account was created in). It is the only market
column user-service maps, and its customer listing filters on it
(`apps/api/apps/user-service/src/user.service.ts:67`). `users.region_code` is
the admin scope lock: it rides into the JWT only when set
(`gateway.controller.ts:144`), is `NULL` for every customer, and must never be
read as a customer's market. An order's market is the order's own
`orders.region_code` (`apps/api/apps/order-service/src/entities/order.entity.ts:105`),
the market it was placed in, which need not equal the customer's home market.
Anything that backfills a market from the customer row must read
`users.country`, with the caveat in open item O8.

### RC3 — phone ciphertext in responses

The phone is encrypted at rest through `EncryptionService` (AES-GCM,
`iv:tag:ciphertext`). Register returned `savedUser.phone` (the ciphertext) and
`/auth/profile` returned `user.phone` unchanged. Register now echoes
`body.phone ?? null` (`gateway.controller.ts:543`); profile goes through
`readablePhone()` (`:455`), which decrypts and falls back to the stored value
only if decryption fails (a legacy plain-text row). Storage is unchanged.

### RC4 — reset e-mails never sent

`/auth/forgot-password` mints a single-use reset JWT, stores its hash in Redis
and publishes `auth.password_reset.requested`. notification-service's
`PasswordResetConsumer` calls `NotificationService.sendEmail`, whose SendGrid
branch was a commented-out SDK call returning `{ success: true }`. With a key
configured, nothing was sent and the consumer logged "dispatched". Now
`sendViaSendGrid` (`notification.service.ts:389`) POSTs to
`https://api.sendgrid.com/v3/mail/send` with `SENDGRID_API_KEY`, `EMAIL_FROM`
(default `no-reply@kartseek.com`), a 10 s timeout, and throws on a non-2xx so
`sendEmail` records `FAILED`. The consumer logs "dispatched" only on `SENT` and
otherwise warns with provider and status (`password-reset.consumer.ts:123`).
Without a key the provider stays log-only and says so at boot, as before; see
open item O1.

### RC5 — contract and throttle

`RegisterDto` declared `role?: string` with an enum that included
`SUPER_ADMIN`. The handler always writes `UserRole.CUSTOMER`, so it was never a
privilege escalation, but the Swagger contract said otherwise and clients could
believe it. Removed; the global `ValidationPipe` (whitelist +
forbidNonWhitelisted) now answers 400 to a body that carries it. Register gets
`@Throttle({ default: { limit: 10, ttl: 60_000 } })` (`gateway.controller.ts:485`),
matching login.

## B. Reproduction and first point of divergence

1. `POST /api/v1/auth/register` with `{"name","email","password":"Passw0rd_2026."}`
   → **400** "Password must contain at least one uppercase letter, one lowercase
   letter, one number, and one special character". The password satisfies every
   stated requirement. First divergence: the DTO, before the handler runs.
2. Same request with `Probe#Pass12345` → 201, tokens issued, `user.phone` is the
   ciphertext, `users.country = 'IN'` although the request carried
   `X-Region-Code: QA`.
3. Web `/auth/signup` with `Passw0rd_2026.` → the page's own regex shows the
   same wrong message; no request is sent.
4. `POST /auth/forgot-password` → 200 uniform message; Kafka event published;
   notification-service logs "dispatched"; no HTTP call to SendGrid exists in
   the code.

After the fix (live, dev fleet on :3001, gateway rebuilt by the watcher):

| Check                                                          | Result                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| Register `Passw0rd_2026.` with `X-Region-Code: QA` and a phone | 201; response `phone` is the submitted number                    |
| `select country from users where email = …`                    | `QA`                                                             |
| `GET /auth/profile` with the new token                         | phone decrypted, `status = active`                               |
| Register `nosymbols2026`                                       | 400 with the full rule in `message`                              |
| `POST /auth/forgot-password` for the new account               | 200; consumer path reaches the provider (log-only without a key) |
| `POST /auth/reset-password` with a forged token                | 400 "Invalid or expired reset token"                             |

## C. The pipeline as it runs

- **Web** `apps/web/src/app/auth/signup/page.tsx` → `authApi.register`
  (`packages/shared-core/src/api-endpoints.ts`) → `POST /auth/register`
  `{ name, email, password, phone? }`; success stores tokens and routes to `/`.
  Market comes from the `kartseek_country` cookie the edge forwards as
  `X-Region-Code`.
- **Gateway** `AuthController` (`apps/api/apps/api-gateway/src/controllers/gateway.controller.ts`,
  `@Controller('auth')`): register, login, refresh, logout, profile,
  forgot-password, reset-password, otp/send, otp/verify. bcrypt cost 12;
  refresh-token hash in Redis (one slot per user); reset token = JWT with
  `type: 'reset'` plus a Redis hash, single use; `AccountLockoutService`
  escalates 3 → 30 s, 5 → 5 min, 7 → 15 min, 10 → 1 h, 15 → 24 h with a 1 h
  decay; phone encrypted with `EncryptionService`.
- **Database** `public.users` in `kartseek_db` (no `synchronize`; migrations by
  hand). Two entities map it: user-service's (complete) and the gateway's
  (now includes `country`).
- **Mail** gateway → Kafka `auth.password_reset.requested` → notification-service
  `PasswordResetConsumer` → `NotificationService.sendEmail` → SendGrid REST.
- **Mobile** the Flutter customer app renders mock data and has no real
  register call (open item O3), so this audit's customer surface is the web.

## D. Fixes by layer

| Layer                    | Files                                                                                                                  | Commit  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------- |
| Gateway DTOs and handler | `dto/gateway.dto.ts`, `controllers/gateway.controller.ts`, `entities/user.entity.ts`, new `dto/password-rule.spec.ts`  | 8b6e4a9 |
| notification-service     | `notification.service.ts` (real SendGrid call), `password-reset.consumer.ts` (honest outcome log)                      | 8b6e4a9 |
| shared-core i18n         | `locales/{en,es,ar}.ts` prettier pass (formatting only; the files predated the hook)                                   | 55af5c9 |
| shared-core i18n         | `errPasswordRule` copy names example symbols in en, es, ar                                                             | fced5f4 |
| Web                      | `auth/signup/page.tsx`, `auth/reset-password/page.tsx` (same rule as the gateway), new `e2e/auth-registration.spec.ts` | e55ad2d |

Registration semantics record for M12 (user-service owns partner-register and
seller promotion and reuses customer registration's hashing and validation):
validation regex changed (`gateway.dto.ts:45`); hashing unchanged (bcrypt 12,
`gateway.controller.ts:499`); `users.status` unchanged (`active` for customers,
`pending` for self-registered sellers); `users.country` now set from the
request's market; `users.region_code` untouched. `users.country` is the customer's
canonical market; `users.region_code` is admin scope only (see RC2).

## E. Tests and verification

- `apps/api-gateway/src/dto/password-rule.spec.ts` — 19 cases: seven accepted
  shapes (incl. `Passw0rd_2026.`, `Correct-Horse-9`, `Ünïcødé-Pass1`, 123-char),
  eight refused (short, no upper/lower/digit/symbol, space, tab, 129-char), the
  DTO messages, and the absence of `role`.
- `gateway.controller.spec.ts` 17 + notification-service specs: 5 files, 57 tests pass.
- `apps/web/e2e/auth-registration.spec.ts` — 5/5 on the dev fleet, paced by
  `gateway-budget.ts`: signup through the real form with a symbol-rich password
  lands signed in; API login and profile (phone `null`, never a ciphertext; no
  admin scope lock); weak password → 400 with the rule; duplicate → 409;
  forgot-password uniform 200 and forged reset token → 400; the reset page
  enforces the rule before submitting.

  Two things the suite must do, both worth knowing for any future auth e2e:
  wait for React to attach the form's `onSubmit` before typing (a click on the
  server-rendered form is a native GET submit that reloads the page blank, e.g.
  `/auth/signup?`), and dismiss the consent banner with "Reject non-essential",
  which mounts over the submit button. The home page the app lands on after
  signup is itself a burst of gateway calls and has to be charged to the budget
  or the next API call meets the gateway's burst limit (429).

Run:

```
cd apps/api && npx vitest run apps/api-gateway/src/dto/password-rule.spec.ts apps/api-gateway/src/controllers/gateway.controller.spec.ts apps/notification-service
cd apps/web && npx playwright test e2e/auth-registration.spec.ts --project=chrome --workers=1
```

## F. Verified working, not changed

Login (200 with access + refresh tokens; null password hash refused), refresh
rotation, logout, profile, lockout escalation (3 failures → 30 s, growing),
forgot-password uniform response, reset-token single use, `ValidationPipe`
whitelist + forbidNonWhitelisted, bcrypt 12, phone encryption at rest, the
`users` schema (no drift; no migration needed).

## G. Findings outside this change (open)

| #   | Severity  | Finding                                                                                                                                                                                                                                 | Recommendation                                                                                                             |
| --- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| O1  | P1 (prod) | `SENDGRID_API_KEY` is not set in any env file; without it reset mail is log-only in every environment                                                                                                                                   | Set `SENDGRID_API_KEY` and `EMAIL_FROM` in the production secret; the service logs the missing key at boot                 |
| O2  | P2        | Register answers 409 "An account with this email already exists" while forgot-password is uniform, so register can enumerate addresses                                                                                                  | Team decision: keep (usability, now throttled 10/min) or answer 201-shaped "check your e-mail" and send a notice           |
| O3  | P2        | The Flutter customer app is mock-first: no real register/login call, so mobile customers cannot create accounts at all                                                                                                                  | Wire the mobile auth screens to `/auth/*` (tracked with the mobile programme)                                              |
| O4  | P2        | No e-mail verification: `email_verified` stays false and nothing gates on it; accounts are active immediately                                                                                                                           | Decide whether verification is required per market; if so, gate checkout/reset on it                                       |
| O5  | P3        | Seller self-registration leaves `role = customer` until admin approval                                                                                                                                                                  | M12 (`applySellerDecision`), already reported                                                                              |
| O6  | P3        | A click on the auth forms before hydration performs a native GET submit and reloads the page blank (inputs have no `name`, so nothing leaks into the URL)                                                                               | Disable submit until hydrated, or add `noValidate` + a client-only submit                                                  |
| O7  | P3        | The gateway logs a reset link in non-production for local testing                                                                                                                                                                       | Keep gated on `NODE_ENV !== 'production'`; never widen                                                                     |
| O8  | P2        | Every customer created through the gateway before 8b6e4a9 carries `users.country = 'IN'` (the column default), whatever market they signed up in, so a backfill from `users.country` is only trustworthy for rows created after the fix | Treat pre-fix `'IN'` as unknown; derive from the customer's addresses or first order if a market is needed, or leave unset |

## Appendix: commits

- 8b6e4a9 fix(auth): accept any password symbol; record the signup market; return the phone in clear
- 55af5c9 style(i18n): prettier pass on the en, es and ar locale files
- fced5f4 fix(i18n): password rule copy names example symbols, not the old fixed set
- e55ad2d fix(web): signup and reset pages check the same password rule as the gateway
