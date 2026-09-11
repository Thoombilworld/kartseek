import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StaffMfaService } from './staff-mfa.service';

describe('StaffMfaService', () => {
  const realEnv = process.env;
  const store = new Map<string, string>();
  const redis = {
    set: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    del: vi.fn(async (k: string) => {
      store.delete(k);
    }),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const jwt = new JwtService({ secret: 'test-secret' });
  let svc: StaffMfaService;

  beforeEach(() => {
    store.clear();
    kafka.publish.mockClear();
    redis.set.mockClear();
    // Both echo flags are set explicitly: whichever the developer's own shell
    // happens to export must not decide what these assertions see.
    process.env = { ...realEnv, NODE_ENV: 'test', DEV_MFA_ECHO: 'true', DEV_AUTH_BYPASS: 'false' };
    svc = new StaffMfaService(redis as never, kafka as never, jwt);
  });

  afterAll(() => {
    process.env = realEnv;
  });

  it('creates a 6-digit challenge, stores it for 5 minutes and delivers it by email', async () => {
    const { challengeToken, devCode } = await svc.createChallenge({ id: 'u1', email: 'a@b.c' });
    expect(devCode).toMatch(/^\d{6}$/);
    expect(redis.set).toHaveBeenCalledWith('mfa:u1', expect.any(String), 300);
    // `to` / `subject` / `body` are NotificationService's EmailPayload fields —
    // the consumer hands the message straight to `sendEmail`, so the topic
    // payload has to be shaped the way that method reads it.
    expect(kafka.publish).toHaveBeenCalledWith(
      'notification.email',
      expect.objectContaining({
        to: 'a@b.c',
        subject: expect.any(String),
        body: expect.any(String),
      }),
    );
    expect(jwt.verify(challengeToken)).toMatchObject({ sub: 'u1', type: 'mfa' });
  });

  it('never puts the code in the challenge token itself', async () => {
    const { challengeToken, devCode } = await svc.createChallenge({ id: 'u1', email: 'a@b.c' });
    // The token travels back to a browser that has not proved the second factor
    // yet; a code readable from its payload would be no factor at all.
    expect(challengeToken).not.toContain(devCode!);
    expect(JSON.stringify(jwt.decode(challengeToken))).not.toContain(devCode!);
  });

  it('texts the code when the account has no email', async () => {
    const { devCode } = await svc.createChallenge({ id: 'u2', phone: '+97455512345' });
    expect(kafka.publish).toHaveBeenCalledWith(
      'notification.sms',
      expect.objectContaining({
        phone: '+97455512345',
        message: expect.stringContaining(devCode!),
      }),
    );
  });

  it('verifies the right code once and burns it', async () => {
    const { challengeToken, devCode } = await svc.createChallenge({ id: 'u1', email: 'a@b.c' });
    await expect(svc.verify(challengeToken, devCode!)).resolves.toBe('u1');
    await expect(svc.verify(challengeToken, devCode!)).rejects.toThrow(UnauthorizedException);
  });

  it('refuses a wrong code and locks after five attempts', async () => {
    const { challengeToken, devCode } = await svc.createChallenge({ id: 'u1', email: 'a@b.c' });
    for (let i = 0; i < 5; i++)
      await expect(svc.verify(challengeToken, '000000')).rejects.toThrow(UnauthorizedException);
    await expect(svc.verify(challengeToken, devCode!)).rejects.toThrow('Too many attempts');
  });

  it('counts the remaining attempts down in the refusal', async () => {
    const { challengeToken } = await svc.createChallenge({ id: 'u1', email: 'a@b.c' });
    await expect(svc.verify(challengeToken, '000000')).rejects.toThrow('4 attempt(s) remaining');
    await expect(svc.verify(challengeToken, '000000')).rejects.toThrow('3 attempt(s) remaining');
  });

  it('refuses an access token used as a challenge', async () => {
    const access = jwt.sign({ sub: 'u1', type: 'access' });
    await expect(svc.verify(access, '123456')).rejects.toThrow(UnauthorizedException);
  });

  it('refuses a challenge whose code was never stored', async () => {
    const orphan = jwt.sign({ sub: 'ghost', type: 'mfa' });
    await expect(svc.verify(orphan, '123456')).rejects.toThrow(UnauthorizedException);
  });

  it('does not echo the code outside development', async () => {
    // Both opt-ins on: production is the veto, not the absence of a flag.
    process.env.NODE_ENV = 'production';
    process.env.DEV_MFA_ECHO = 'true';
    process.env.DEV_AUTH_BYPASS = 'true';
    const { devCode } = await svc.createChallenge({ id: 'u1', email: 'a@b.c' });
    expect(devCode).toBeUndefined();
  });

  it('echoes the code for a fleet already running with DEV_AUTH_BYPASS', async () => {
    // The local fleet runs with DEV_AUTH_BYPASS=true and no MFA flag at all;
    // requiring a second opt-in there would only break the proof scripts.
    delete process.env.DEV_MFA_ECHO;
    process.env.DEV_AUTH_BYPASS = 'true';
    const { devCode } = await svc.createChallenge({ id: 'u1', email: 'a@b.c' });
    expect(devCode).toMatch(/^\d{6}$/);
  });
});
