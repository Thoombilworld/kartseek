import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Inject,
  ForbiddenException,
  UsePipes,
  ValidationPipe,
  Logger,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { JwtAuthGuard, AccountLockoutService, EncryptionService } from '@app/security';
import { User } from '../entities/user.entity';
import { AdminRole } from '../entities/admin-role.entity';
import { UserRole, sellerTypeFromRole, isStaffRole, type SellerType } from '@app/common';
import { StaffMfaService } from '../services/staff-mfa.service';
import {
  LoginDto,
  RegisterDto,
  SellerRegisterDto,
  ResetPasswordDto,
  OtpSendDto,
  OtpVerifyDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  MfaVerifyDto,
} from '../dto/gateway.dto';

/**
 * Auth Controller — Registration, Login, OTP, Token Refresh
 *
 * Handles all authentication flows for:
 *  - Customer (web + mobile)
 *  - Seller Portal login
 *  - Admin login
 *
 * Partner auth is handled separately in PartnerController.
 */
@ApiTags('🔐 Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    private readonly jwtService: JwtService,
    private readonly lockout: AccountLockoutService,
    private readonly encryption: EncryptionService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AdminRole) private readonly roleRepo: Repository<AdminRole>,
    private readonly staffMfa: StaffMfaService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** SHA-256 hash a token for secure storage (never store raw tokens). */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private readonly logger = new Logger('AuthController');

  /** Access-token lifetime in seconds — also the revocation-entry TTL. */
  private static readonly ACCESS_TTL_SECONDS = 3600;
  private static readonly REFRESH_TTL_SECONDS = 2592000; // 30 days
  /** Password-reset links are deliberately short-lived. */
  private static readonly RESET_TTL_SECONDS = 1800; // 30 minutes
  /** One-time codes expire fast and cannot be requested without limit. */
  private static readonly OTP_TTL_SECONDS = 300; // 5 minutes
  private static readonly OTP_MAX_PER_WINDOW = 5;
  private static readonly OTP_THROTTLE_WINDOW_SECONDS = 900; // 15 minutes

  /**
   * Mint an access/refresh pair for a user.
   *
   * Two claims beyond the identity matter here:
   *
   * `type` — the pair used to be indistinguishable apart from `exp`, so a 30-day
   * refresh token was accepted as a Bearer credential on every protected route.
   * `JwtAuthGuard` now admits only `type: 'access'`.
   *
   * `jti` — gives each token its own identity, which is what makes logout able to
   * kill one session. Without it, two tokens minted for the same user in the same
   * second were byte-identical, so "rotation" inside that window was a no-op and
   * no individual token could be revoked or audited.
   */
  private issueTokens(
    user: {
      // Nullable to match the `users` table: an account is identified by email
      // *or* phone, and the entity types both as nullable. Declaring them
      // `string | undefined` forced every caller to launder a real column
      // through a cast, which is how a `null` email reached the claim below.
      id: string;
      email?: string | null;
      phone?: string | null;
      role: string;
      sellerType?: string | null;
      regionCode?: string | null;
      regionLocked?: boolean | null;
    },
    extra?: { adminPermissions?: string[] },
  ) {
    // `sellerType` rides in the token so portal isolation can be enforced from a
    // signed claim. Omitted entirely for non-sellers rather than sent as null, so
    // "no seller type" is unambiguous to every consumer.
    const sellerType = user.sellerType ?? sellerTypeFromRole(user.role);
    // Absent identifiers are omitted rather than signed as `null`: a claim
    // present-but-null reads as "this user has no email" to some consumers and
    // as "unknown" to others, and JwtStrategy checks presence.
    const identity = {
      sub: user.id,
      ...(user.email ? { email: user.email } : {}),
      ...(user.phone ? { phone: user.phone } : {}),
      role: user.role,
      ...(sellerType ? { sellerType } : {}),
      // Staff market scope (market-scope.ts). Omitted when unset so a customer's
      // token carries no claim to misread; `regionLocked` only ever appears as true.
      ...(user.regionCode ? { regionCode: String(user.regionCode).toUpperCase() } : {}),
      ...(user.regionLocked ? { regionLocked: true } : {}),
      // The console permission keys `RolesGuard` checks `perm:` requirements
      // against. Omitted rather than signed as `[]` for a customer, so an
      // absent claim means "not staff" and never "staff with nothing granted".
      ...(extra?.adminPermissions ? { adminPermissions: extra.adminPermissions } : {}),
    };
    const accessToken = this.jwtService.sign(
      { ...identity, type: 'access', jti: crypto.randomUUID() },
      { expiresIn: AuthController.ACCESS_TTL_SECONDS },
    );
    const refreshToken = this.jwtService.sign(
      { ...identity, type: 'refresh', jti: crypto.randomUUID() },
      { expiresIn: AuthController.REFRESH_TTL_SECONDS },
    );
    return { accessToken, refreshToken };
  }

  // ── Health ──────────────────────────────────────────────────────────────────
  @Get('status')
  @ApiOperation({ summary: 'Auth service health check' })
  @ApiOkResponse({ description: 'Auth service is running' })
  healthCheck() {
    return { service: 'auth-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  // ── Email/Password Login ───────────────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Authenticates a user and returns a JWT access token + refresh token. ' +
      'A staff role gets `{ requires2FA: true, challengeToken }` and no tokens ' +
      'until POST /auth/mfa/verify.',
  })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'customer@kartseek.com' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiOkResponse({
    description: 'Authentication successful',
    schema: {
      example: {
        success: true,
        user: {
          id: 'USR-001',
          name: 'Jane Customer',
          email: 'customer@kartseek.com',
          role: 'CUSTOMER',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiJ9...',
        refreshToken: 'ref_tok_abc123...',
        expiresIn: 3600,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid credentials' })
  async login(@Body() body: LoginDto) {
    const emailKey = body.email.toLowerCase();

    // ── Account Lockout Check ────────────────────────────────────────────────
    const lockoutRemaining = await this.lockout.isLockedOut(emailKey);
    if (lockoutRemaining) {
      throw new ForbiddenException(
        `Account temporarily locked. Try again in ${Math.ceil(lockoutRemaining / 60)} minute(s).`,
      );
    }

    // Find user in DB
    const user = await this.userRepo.findOne({ where: { email: emailKey } });
    if (!user || !user.isActive) {
      // Record failed attempt even for non-existent accounts (timing attack prevention)
      const result = await this.lockout.recordFailedAttempt(emailKey);
      if (result.locked) {
        throw new ForbiddenException(
          `Account temporarily locked. Try again in ${Math.ceil(result.lockoutDuration / 60)} minute(s).`,
        );
      }
      throw new UnauthorizedException(
        `Invalid email or password. ${result.remainingAttempts} attempt(s) remaining.`,
      );
    }

    // An account with no password cannot be signed into with one.
    //
    // Phone-first accounts (created by /auth/otp/verify) carry a null hash until
    // their owner sets a password through a reset. Without this check
    // `bcrypt.compare` is handed `undefined`, which throws — a 500 that leaks the
    // account's existence and, worse, invites the "just give it a placeholder
    // hash" fix that caused the takeover this replaced.
    //
    // Reported through the same failed-attempt path as a wrong password, so the
    // response cannot be used to tell the two states apart.
    if (!user.passwordHash) {
      const result = await this.lockout.recordFailedAttempt(emailKey);
      if (result.locked) {
        throw new ForbiddenException(
          `Account temporarily locked. Try again in ${Math.ceil(result.lockoutDuration / 60)} minute(s).`,
        );
      }
      throw new UnauthorizedException(
        `Invalid email or password. ${result.remainingAttempts} attempt(s) remaining.`,
      );
    }

    // Verify bcrypt password hash
    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid) {
      const result = await this.lockout.recordFailedAttempt(emailKey);
      if (result.locked) {
        throw new ForbiddenException(
          `Account locked after ${result.totalAttempts} failed attempts. ` +
            `Try again in ${Math.ceil(result.lockoutDuration / 60)} minute(s).`,
        );
      }
      throw new UnauthorizedException(
        `Invalid email or password. ${result.remainingAttempts} attempt(s) remaining.`,
      );
    }

    // ── Success — clear lockout ──────────────────────────────────────────────
    // A correct password clears the counter whether or not a second factor
    // follows: the lockout is there to stop password guessing, and leaving it
    // armed would let a staff account lock itself out by signing in five times.
    await this.lockout.clearAttempts(emailKey);

    /**
     * Staff finish signing in with a second factor, so no session exists yet.
     *
     * The console used to receive the access token here and then ask for an OTP
     * it checked in the browser against a build-time constant. The password was
     * therefore the only real barrier, and anyone who skipped the OTP screen —
     * or read the constant out of the JavaScript bundle — was already signed in.
     * What goes back now is a challenge that authorises nothing.
     */
    if (isStaffRole(user.role)) {
      const challenge = await this.staffMfa.createChallenge(user);
      return {
        success: true,
        requires2FA: true,
        challengeToken: challenge.challengeToken,
        user: { id: user.id, email: user.email, role: user.role },
        ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
      };
    }

    return this.completeLogin(user);
  }

  /**
   * The session itself, shared by password login and MFA completion.
   *
   * Everything that makes a login real lives here — the token pair, the Redis
   * `session:` record the guard and logout read, and the hashed refresh token —
   * so a staff sign-in that clears its second factor gets exactly the session a
   * customer gets, not a reconstruction of one.
   */
  /**
   * The permission keys an account signs in with: its admin role's, or the
   * system role matching its `UserRole`.
   *
   * Resolved at sign-in rather than read from the database on every request —
   * the guard runs on routes that have no repository and no business opening a
   * connection. The cost is that a narrowed role takes effect at the holder's
   * next refresh rather than instantly, which is why `/auth/refresh` recomputes
   * this rather than copying the old claim across.
   *
   * The fallback by key exists because accounts predate `users.admin_role_id`:
   * the QA regional admin carries a market lock and no role row, and the lock
   * is what says which system role it really is. Reading `role.toLowerCase()`
   * for it would hand a locked ADMIN the global Admin set.
   */
  private async adminPermissionsFor(user: User): Promise<string[] | undefined> {
    const role = String(user.role).toUpperCase();
    if (!isStaffRole(role)) return undefined;
    // Never a database lookup: the wildcard is the platform owner's by
    // definition, and a missing `admin_roles` row must not silently narrow it.
    if (role === 'SUPER_ADMIN') return ['*'];
    const byId = user.adminRoleId
      ? await this.roleRepo.findOne({ where: { id: user.adminRoleId } })
      : null;
    const key = user.regionLocked ? 'regional_admin' : role.toLowerCase();
    const fallback = byId ? null : await this.roleRepo.findOne({ where: { key } });
    return (byId ?? fallback)?.permissions ?? [];
  }

  private async completeLogin(user: User) {
    // Issue JWT tokens
    const { accessToken, refreshToken } = this.issueTokens(user, {
      adminPermissions: await this.adminPermissionsFor(user),
    });

    // Cache session in Redis (1 hour TTL)
    await this.redis.setJson(
      `session:${user.id}`,
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        loginAt: new Date().toISOString(),
      },
      3600,
    );

    // Store refresh token HASH for validation (never store raw tokens)
    await this.redis.set(`refresh:${user.id}`, this.hashToken(refreshToken), 2592000); // 30 days

    return {
      success: true,
      user: {
        id: user.id,
        // Registration stores the customer's name; echoing the email's local
        // part here instead meant someone who signed up as "Jane Doe" was
        // greeted as "jane" the moment they logged back in. Fall back to the
        // local part only for accounts that genuinely have no name on file.
        // Phone-only accounts have no email at all, so the local-part fallback
        // has to tolerate its absence rather than throw mid-login.
        name:
          [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
          user.email?.split('@')[0] ||
          user.phone ||
          'Customer',
        email: user.email,
        role: user.role,
        // Which portal this seller may open. The client persists it to a cookie
        // the edge middleware reads, so both isolation layers work from the same
        // backend-issued value instead of one the user picked.
        sellerType: user.sellerType ?? sellerTypeFromRole(user.role),
        // A seller awaiting approval signs in fine but must not be sent to the
        // portal, so the client needs to know the difference.
        status: user.status ?? 'active',
        // The console draws its market context from these, and the gateway
        // enforces the same values from the token.
        regionCode: user.regionCode ?? null,
        regionLocked: user.regionLocked === true,
        avatar: null as unknown,
      },
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }

  // ── Staff second factor ────────────────────────────────────────────────────
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Complete a staff sign-in with the delivered code',
    description:
      'Exchanges the challenge token from /auth/login plus the six-digit code ' +
      'for the normal login response. The code is checked here, never in the client.',
  })
  @ApiUnauthorizedResponse({ description: 'Expired challenge, wrong code, or attempts exhausted' })
  async mfaVerify(@Body() body: MfaVerifyDto) {
    const userId = await this.staffMfa.verify(body.challengeToken, body.code);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    // Re-read rather than trusting the challenge: an account disabled during
    // the five minutes the code was valid must not still be able to finish.
    if (!user || !user.isActive) throw new UnauthorizedException('Account unavailable.');
    return this.completeLogin(user);
  }

  // ── Registration ───────────────────────────────────────────────────────────
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new customer account',
    description: 'Creates a new customer account. Sends welcome email and onboarding push.',
  })
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string', example: 'Jane Doe' },
        email: { type: 'string', example: 'jane@example.com' },
        phone: { type: 'string', example: '+919800000000' },
        password: { type: 'string', example: 'securePassword123' },
      },
      required: ['name', 'email', 'password'],
    },
  })
  @ApiCreatedResponse({ description: 'Account created successfully' })
  @ApiBadRequestResponse({ description: 'Email already exists or invalid data' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async register(@Body() body: RegisterDto) {
    if (!body.name || !body.email || !body.password) {
      throw new BadRequestException('Name, email, and password are required');
    }

    // Check for existing user
    const existing = await this.userRepo.findOne({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash password with bcrypt (12 salt rounds)
    const passwordHash = await bcrypt.hash(body.password, 12);

    // Encrypt phone number for PII protection (if provided)
    const encryptedPhone = body.phone ? this.encryption.encrypt(body.phone) : null;

    // Create user in DB
    const nameParts = (body.name || '').trim().split(/\s+/);
    const user = this.userRepo.create({
      email: body.email.toLowerCase(),
      phone: encryptedPhone,
      passwordHash,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      role: UserRole.CUSTOMER,
      isActive: true,
    });
    const savedUser = await this.userRepo.save(user);

    // Emit registration event
    await this.kafka.publish(KAFKA_TOPICS.USER_REGISTERED || 'user.registered', {
      userId: savedUser.id,
      email: body.email,
    });

    // Issue JWT tokens
    const { accessToken, refreshToken } = this.issueTokens(savedUser);

    await this.redis.set(
      `refresh:${savedUser.id}`,
      this.hashToken(refreshToken),
      AuthController.REFRESH_TTL_SECONDS,
    );

    return {
      success: true,
      user: {
        id: savedUser.id,
        name: body.name,
        email: savedUser.email,
        phone: savedUser.phone,
        role: savedUser.role,
        createdAt: savedUser.createdAt,
      },
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }

  // ── Seller Registration ────────────────────────────────────────────────────
  @Post('seller/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a seller account for a specific portal',
    description:
      'Creates a seller bound to one module. The account starts pending and cannot ' +
      'open the portal until an admin approves it.',
  })
  @ApiBody({ type: SellerRegisterDto })
  @ApiCreatedResponse({ description: 'Seller account created, pending approval' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async registerSeller(@Body() body: SellerRegisterDto) {
    const emailKey = body.email.toLowerCase().trim();

    const existing = await this.userRepo.findOne({ where: { email: emailKey } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const nameParts = (body.name || '').trim().split(/\s+/);
    const user = this.userRepo.create({
      email: emailKey,
      phone: body.phone ? this.encryption.encrypt(body.phone) : null,
      passwordHash: await bcrypt.hash(body.password, 12),
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      role: UserRole.SELLER,
      // The portal this account is bound to. Self-assignment is only safe because
      // the account lands `pending` — approval, not the sign-up form, is what
      // actually opens a portal.
      sellerType: body.sellerType as SellerType,
      status: 'pending',
      isActive: true,
    });
    const saved = await this.userRepo.save(user);

    await this.kafka.publish(KAFKA_TOPICS.USER_REGISTERED, {
      userId: saved.id,
      email: saved.email,
      role: saved.role,
      sellerType: saved.sellerType,
      businessName: body.businessName,
    });

    // Signed in immediately so they can watch their own approval progress; the
    // guard still keeps them out of the portal until the status flips to active.
    const { accessToken, refreshToken } = this.issueTokens(saved);
    await this.redis.set(
      `refresh:${saved.id}`,
      this.hashToken(refreshToken),
      AuthController.REFRESH_TTL_SECONDS,
    );

    return {
      success: true,
      user: {
        id: saved.id,
        name: body.name,
        email: saved.email,
        role: saved.role,
        sellerType: saved.sellerType,
        status: saved.status,
      },
      accessToken,
      refreshToken,
      expiresIn: AuthController.ACCESS_TTL_SECONDS,
    };
  }

  // ── OTP Send ───────────────────────────────────────────────────────────────
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a one-time code by SMS',
    description: 'Issues a 6-digit code valid for 5 minutes. Rate limited per phone number.',
  })
  @ApiBody({
    schema: {
      properties: { phone: { type: 'string', example: '+919800000000' } },
      required: ['phone'],
    },
  })
  @ApiOkResponse({ description: 'Code sent if the number is valid' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async sendOtp(@Body() body: OtpSendDto) {
    // There was no send route at all: `otp/verify` read `otp:<phone>` from Redis,
    // but nothing ever wrote it, so phone sign-in could never be started by a real
    // customer — only the development code '1234' worked.
    const phone = body.phone.trim();

    // An SMS costs money and lands on someone's handset, so the number of codes a
    // single number can trigger is capped before one is generated.
    const throttleKey = `otp:sent:${phone}`;
    const sent = await this.redis.incr(throttleKey);
    if (sent === 1) {
      await this.redis.expire(throttleKey, AuthController.OTP_THROTTLE_WINDOW_SECONDS);
    }
    if (sent > AuthController.OTP_MAX_PER_WINDOW) {
      throw new HttpException(
        'Too many codes requested. Please wait a few minutes before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // crypto.randomInt, not Math.random — a predictable code is no code at all.
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.redis.set(`otp:${phone}`, code, AuthController.OTP_TTL_SECONDS);

    await this.kafka.publish(KAFKA_TOPICS.NOTIFICATION_SMS, {
      phone,
      message: `${code} is your KARTSEEK verification code. It expires in ${Math.round(AuthController.OTP_TTL_SECONDS / 60)} minutes.`,
      purpose: 'auth.otp',
    });

    // Without an SMS provider configured there is no other way to complete the
    // flow locally. Never in production — the code is the credential.
    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn(`📱 DEV OTP for ${phone}: ${code}`);
    }

    return {
      success: true,
      message: 'If that number can receive messages, a verification code has been sent.',
      expiresInSeconds: AuthController.OTP_TTL_SECONDS,
    };
  }

  // ── OTP Verification ───────────────────────────────────────────────────────
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP (phone/email)',
    description:
      'Verifies a one-time password sent via SMS or email. Static OTP "1234" is accepted for development.',
  })
  @ApiBody({
    schema: {
      properties: {
        phone: { type: 'string', example: '+919800000000' },
        otp: { type: 'string', example: '1234' },
      },
    },
  })
  @ApiOkResponse({ description: 'OTP verified successfully' })
  async verifyOtp(@Body() body: OtpVerifyDto) {
    // Validate OTP from Redis.
    //
    // The static '1234' escape hatch is gated on an explicit opt-in, not on
    // NODE_ENV. `NODE_ENV !== 'production'` is true in every environment that
    // forgot to set it — staging, CI, a developer's laptop, a demo box on a
    // public IP — and this endpoint *creates an account and issues a session*,
    // so anything that reaches it can mint a token for any phone number. Making
    // it a named flag means enabling it is a decision someone took, and grepping
    // for the flag finds every environment where it is live.
    const staticOtpEnabled =
      process.env.ALLOW_STATIC_DEV_OTP === 'true' && process.env.NODE_ENV !== 'production';
    const isDevOtp = staticOtpEnabled && body.otp === '1234';
    if (isDevOtp) {
      this.logger.warn(
        `⚠️  Static dev OTP accepted for ${body.phone} — ALLOW_STATIC_DEV_OTP is on`,
      );
    }
    const cached = await this.redis.get(`otp:${body.phone}`);
    if (!isDevOtp && cached !== body.otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Find or create user by phone
    let user = await this.userRepo.findOne({ where: { phone: body.phone } });
    if (!user) {
      user = this.userRepo.create({
        email: `${body.phone.replace(/[^0-9]/g, '')}@phone.kartseek.com`,
        phone: body.phone,
        // No password. This used to be `bcrypt.hash(body.phone)` — labelled a
        // "temporary hash", but both halves of the resulting credential were the
        // phone number: the email above is derived from it too. Anyone who knew a
        // customer's number could sign in through /auth/login without ever
        // holding a code. Verified end to end during the August audit.
        //
        // A phone-first account has no password until its owner sets one, and
        // `login()` refuses accounts in that state — see the null-hash check
        // there. Setting one is a password *reset*, which proves control of the
        // account by a channel the attacker does not have.
        passwordHash: null,
        firstName: 'Phone',
        lastName: 'User',
        role: UserRole.CUSTOMER,
        isActive: true,
      });
      user = await this.userRepo.save(user);
    }

    // Clear the used OTP before deciding what to hand back, so the code is spent
    // on both paths. Clearing it only after a token was issued meant a staff
    // sign-in that stops at the second factor left the SMS code live for another
    // challenge — and for anyone else who had read it.
    await this.redis.del(`otp:${body.phone}`);

    /**
     * A phone number is not a second factor for staff.
     *
     * This path called `issueTokens` directly, so a staff account that carries a
     * `phone` value could obtain a working staff access token from an SMS code
     * alone — straight past the challenge `/auth/login` demands. It also wrote
     * neither the `session:` record nor the hashed `refresh:` entry, so what it
     * minted was not even the session the rest of the gateway expects. Both
     * halves are fixed by ending in the same two places `login` does.
     */
    if (isStaffRole(user.role)) {
      const challenge = await this.staffMfa.createChallenge(user);
      return {
        success: true,
        requires2FA: true,
        challengeToken: challenge.challengeToken,
        user: { id: user.id, email: user.email, role: user.role },
        ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
      };
    }

    return this.completeLogin(user);
  }

  // ── Token Refresh ──────────────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      properties: {
        refreshToken: { type: 'string', example: 'ref_tok_abc123...' },
      },
    },
  })
  @ApiOkResponse({ description: 'New access token issued' })
  async refreshToken(@Body() body: RefreshTokenDto) {
    try {
      // Verify the refresh token signature
      const decoded = this.jwtService.verify(body.refreshToken);
      const userId = decoded.sub;

      // Only a refresh token may be exchanged here. Tokens minted before `type`
      // existed carry none, and are still accepted so live sessions survive the
      // rollout; they age out with their own 30-day expiry.
      if (decoded.type && decoded.type !== 'refresh') {
        throw new UnauthorizedException('Not a refresh token');
      }

      // Check if refresh token HASH is still valid in Redis
      const storedHash = await this.redis.get(`refresh:${userId}`);
      if (!storedHash || storedHash !== this.hashToken(body.refreshToken)) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      /**
       * The account itself, not a literal rebuilt from the old claims.
       *
       * This route used to mint a fresh hour of access from thirty-day-old
       * claims without ever asking the database, which made two things
       * permanent that are supposed to be revocable: a staff member
       * deactivated in the console kept refreshing until their refresh token
       * expired, and a role narrowed there stayed wide for just as long,
       * because the new token was a copy of the old one's authority.
       *
       * Reading the user is also what lets the permission claim be recomputed
       * below — the only moment between sign-ins where a role change can take
       * effect.
       */
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Account unavailable.');
      }

      // `sellerType` must be carried across or the refreshed token silently
      // loses it: a seller who stayed signed in past the access token's hour
      // would come back without a portal claim and be locked out of their own
      // module. It comes off the account now, so a portal granted or withdrawn
      // since the last sign-in is reflected too.
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = this.issueTokens(
        user,
        { adminPermissions: await this.adminPermissionsFor(user) },
      );

      // Rotate refresh token hash
      await this.redis.set(
        `refresh:${userId}`,
        this.hashToken(newRefreshToken),
        AuthController.REFRESH_TTL_SECONDS,
      );

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ── Forgot Password ────────────────────────────────────────────────────────
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({
    schema: {
      properties: { email: { type: 'string', example: 'user@kartseek.com' } },
    },
  })
  @ApiOkResponse({ description: 'Reset email sent if account exists' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    // This used to return success and do nothing at all — no token was minted and
    // no mail was sent, so password recovery was a dead end for every customer
    // while looking like it had worked.
    const emailKey = body.email.toLowerCase().trim();
    const user = await this.userRepo.findOne({ where: { email: emailKey } });

    if (user) {
      // Short-lived and single-use: the `jti` is recorded in Redis and consumed on
      // first use, so a link that leaks from an inbox cannot be replayed.
      const jti = crypto.randomUUID();
      const resetToken = this.jwtService.sign(
        { sub: user.id, email: user.email, type: 'reset', jti },
        { expiresIn: AuthController.RESET_TTL_SECONDS },
      );
      await this.redis.set(
        `reset-token:${jti}`,
        this.hashToken(resetToken),
        AuthController.RESET_TTL_SECONDS,
      );

      const resetUrl =
        `${process.env.WEB_APP_URL || 'http://localhost:3000'}` +
        `/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

      // Delivery belongs to notification-service, which owns the templates and the
      // provider. Publishing rather than calling it directly keeps this route
      // responsive when that service is down — and it is not started by `dev:all`.
      await this.kafka.publish(KAFKA_TOPICS.PASSWORD_RESET_REQUESTED, {
        userId: user.id,
        email: user.email,
        resetUrl,
        expiresInSeconds: AuthController.RESET_TTL_SECONDS,
      });

      // Without a mail provider wired up there is no other way to complete the
      // flow locally. Never in production — the link is a bearer credential.
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`🔑 DEV password reset link for ${user.email}: ${resetUrl}`);
      }
    }

    // Identical answer either way, so the endpoint cannot be used to discover
    // which addresses have accounts.
    return {
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    };
  }

  // ── Reset Password ─────────────────────────────────────────────────────────
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({
    schema: {
      properties: {
        token: { type: 'string' },
        newPassword: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({ description: 'Password updated successfully' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async resetPassword(@Body() body: ResetPasswordDto) {
    if (!body.token || !body.newPassword) {
      throw new BadRequestException('Token and new password are required');
    }

    // Verify the reset token
    let decoded: any;
    try {
      decoded = this.jwtService.verify(body.token);
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Only a token minted by forgot-password may reset a password. Verifying the
    // signature alone accepted ANY token signed with the same secret — an access
    // token worked as a reset token, letting anyone holding one change the
    // account's password without knowing the current one.
    if (decoded.type !== 'reset' || !decoded.jti) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Single use: the entry is written at issue time and consumed here, so a link
    // that leaks from an inbox or a browser history cannot be replayed.
    const resetKey = `reset-token:${decoded.jti}`;
    const storedHash = await this.redis.get(resetKey);
    if (!storedHash || storedHash !== this.hashToken(body.token)) {
      throw new BadRequestException('This reset link has already been used or has expired.');
    }
    await this.redis.del(resetKey);

    const userId = decoded.sub;
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    // Hash the new password with bcrypt (12 salt rounds)
    user.passwordHash = await bcrypt.hash(body.newPassword, 12);
    await this.userRepo.save(user);

    // Invalidate all existing sessions and refresh tokens
    await this.redis.del(`session:${userId}`);
    await this.redis.del(`refresh:${userId}`);
    // Revoke all issued JWTs for this user (checked by JwtAuthGuard)
    await this.redis.set(`revoked-users:${userId}`, 'password-reset', 3600); // 1 hour TTL matches max token lifetime

    // Clear any lockout on this account. Lockouts are counted against the
    // email used at the login prompt, so an account without one has none to
    // clear — guarding is not a lost side effect.
    if (user.email) {
      await this.lockout.clearAttempts(user.email);
    }

    return { success: true, message: 'Password has been updated successfully.' };
  }

  // ── Get Profile (Authenticated) ────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiOkResponse({ description: 'User profile data' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async getProfile(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) throw new UnauthorizedException('Not authenticated');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    // Straight from the verified token, not recomputed: the console must gate
    // its navigation on exactly the keys the gateway will enforce, and a
    // profile read that disagreed with the bearer token would draw a sidebar
    // whose links answer 403.
    const adminPermissions = req.user?.adminPermissions ?? null;
    const adminRole = user.adminRoleId
      ? await this.roleRepo.findOne({ where: { id: user.adminRoleId } })
      : null;

    return {
      success: true,
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      sellerType: user.sellerType ?? sellerTypeFromRole(user.role),
      // `status` drives `sellerApproved` in the web client, which decides
      // whether a seller is sent to their portal or to their pending
      // application. It was omitted here while `/auth/login` returned it, so
      // any client that rebuilt its session from this route saw an undefined
      // status and defaulted to approved — a pending seller was routed into a
      // portal that then refused them.
      status: user.status,
      regionCode: user.regionCode ?? null,
      regionLocked: user.regionLocked === true,
      adminPermissions,
      adminRole: adminRole ? { id: adminRole.id, key: adminRole.key, name: adminRole.name } : null,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate session' })
  @ApiOkResponse({ description: 'Session invalidated' })
  async logout(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (userId) {
      await this.redis.del(`session:${userId}`);
      await this.redis.del(`refresh:${userId}`);
    }

    // Clearing the session keys alone did not end the session: the access token
    // is self-contained and stayed valid for the rest of its hour, so a signed-out
    // browser's token still opened every protected route. Blacklist this token by
    // its `jti` for whatever life it had left — that is what makes the sign-out
    // take effect across every module and service immediately.
    //
    // Deliberately per-token, not per-user: `revoked-users:` (used by password
    // reset) would sign the customer out of their other devices too, which is not
    // what pressing "log out" on one of them should do.
    const jti = req.user?.jti;
    const exp = req.user?.exp;
    if (jti) {
      const remaining = exp
        ? exp - Math.floor(Date.now() / 1000)
        : AuthController.ACCESS_TTL_SECONDS;
      if (remaining > 0) {
        await this.redis.set(`revoked-tokens:${jti}`, 'logout', remaining);
      }
    }

    return { success: true, message: 'Logged out successfully' };
  }
}
