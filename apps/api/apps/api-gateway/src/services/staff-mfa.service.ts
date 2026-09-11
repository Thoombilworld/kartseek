import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';

/**
 * Second factor for staff sign-in.
 *
 * Login for a staff role no longer returns an access token; it returns a
 * short-lived challenge token (JWT, type `mfa`) and delivers a six-digit code.
 * `verify` exchanges challenge + code for the session. The code lives in Redis
 * under the user id with an attempt counter, so a brute force runs out after
 * five tries and the code cannot be replayed once used.
 *
 * Before this, the admin console compared the code in the browser against
 * `NEXT_PUBLIC_ADMIN_OTP || '123456'` — a constant shipped to every visitor —
 * and it did so *after* it had already stored the access token. The second
 * factor was therefore not a factor at all: anyone holding a staff password
 * had a working session before the OTP screen was drawn, and closing that
 * screen changed nothing. Both halves move here: the code is generated,
 * delivered and checked on the server, and no token exists until it matches.
 */
@Injectable()
export class StaffMfaService {
  private readonly logger = new Logger(StaffMfaService.name);
  static readonly TTL_SECONDS = 300;
  static readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    private readonly jwt: JwtService,
  ) {}

  private key(userId: string) {
    return `mfa:${userId}`;
  }

  /**
   * Whether the response may carry the code back to the caller.
   *
   * `DEV_AUTH_BYPASS` counts as an opt-in because the local fleet already runs
   * with it: requiring a second flag would mean every proof script and every
   * developer hit an undeliverable challenge until they edited their `.env`.
   * `NODE_ENV=production` vetoes both, so no deployment can echo a credential
   * however its flags are set.
   */
  private echoAllowed(): boolean {
    return (
      process.env.NODE_ENV !== 'production' &&
      (process.env.DEV_MFA_ECHO === 'true' || process.env.DEV_AUTH_BYPASS === 'true')
    );
  }

  async createChallenge(user: { id: string; email?: string | null; phone?: string | null }) {
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.redis.set(
      this.key(user.id),
      JSON.stringify({ code, attempts: 0 }),
      StaffMfaService.TTL_SECONDS,
    );
    // The code is never a claim: the token identifies the pending sign-in, the
    // code proves possession of the inbox or handset, and the two must not
    // travel together.
    const challengeToken = this.jwt.sign(
      { sub: user.id, type: 'mfa', jti: crypto.randomUUID() },
      { expiresIn: StaffMfaService.TTL_SECONDS },
    );
    const message =
      `${code} is your KARTSEEK admin sign-in code. ` +
      `It expires in ${StaffMfaService.TTL_SECONDS / 60} minutes.`;
    // `to`/`subject`/`body` and `phone`/`message` are NotificationService's own
    // EmailPayload and SmsPayload fields — the consumer forwards these straight
    // to `sendEmail`/`sendSms`, so any other spelling delivers an empty mail.
    if (user.email) {
      await this.kafka.publish(KAFKA_TOPICS.NOTIFICATION_EMAIL, {
        to: user.email,
        subject: 'Your KARTSEEK sign-in code',
        body: message,
        templateId: 'staff-mfa-code',
        variables: { code },
      });
    } else if (user.phone) {
      await this.kafka.publish(KAFKA_TOPICS.NOTIFICATION_SMS, { phone: user.phone, message });
    } else {
      // Nothing to deliver to. The challenge still stands so the response shape
      // cannot be used to tell a reachable account from an unreachable one.
      this.logger.warn(`No email or phone on staff account ${user.id} — code undeliverable.`);
    }
    this.logger.log(`MFA challenge issued for ${user.id}`);
    return { challengeToken, ...(this.echoAllowed() ? { devCode: code } : {}) };
  }

  async verify(challengeToken: string, code: string): Promise<string> {
    let payload: { sub?: string; type?: string };
    try {
      payload = this.jwt.verify(challengeToken);
    } catch {
      throw new UnauthorizedException('Sign-in challenge expired. Please sign in again.');
    }
    if (payload.type !== 'mfa' || !payload.sub) {
      throw new UnauthorizedException('Not a sign-in challenge.');
    }
    const raw = await this.redis.get(this.key(payload.sub));
    if (!raw) throw new UnauthorizedException('Sign-in challenge expired. Please sign in again.');
    const state = JSON.parse(raw) as { code: string; attempts: number };
    if (state.attempts >= StaffMfaService.MAX_ATTEMPTS) {
      await this.redis.del(this.key(payload.sub));
      throw new UnauthorizedException('Too many attempts. Please sign in again.');
    }
    const expected = Buffer.from(state.code);
    const given = Buffer.from(String(code ?? '').padStart(expected.length, ' '));
    const match = given.length === expected.length && crypto.timingSafeEqual(expected, given);
    if (!match) {
      state.attempts += 1;
      await this.redis.set(
        this.key(payload.sub),
        JSON.stringify(state),
        StaffMfaService.TTL_SECONDS,
      );
      throw new UnauthorizedException(
        `Invalid code. ${StaffMfaService.MAX_ATTEMPTS - state.attempts} attempt(s) remaining.`,
      );
    }
    // Burned on success: a code that survived its own use would let anyone who
    // read it over a shoulder replay the sign-in for the rest of the five
    // minutes.
    await this.redis.del(this.key(payload.sub));
    return payload.sub;
  }
}
