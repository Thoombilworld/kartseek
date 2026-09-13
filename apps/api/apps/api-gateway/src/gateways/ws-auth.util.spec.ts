import { describe, it, expect, beforeEach } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { verifyWsToken } from './ws-auth.util';
import type { Socket } from 'socket.io';

// At least 32 characters: `resolveJwtSecret()` refuses anything shorter, in
// every environment, which is the AUD2-071 fix this spec now runs under.
const SECRET = 'ws-spec-secret-at-least-32-characters-long';

const clientWith = (token: string) =>
  ({ id: 'sock-1', handshake: { auth: { token }, query: {} } }) as unknown as Socket;

/**
 * A WebSocket handshake is a credential check like any other.
 *
 * `verifyWsToken` checked only the signature, so every token this gateway signs
 * opened `/notifications`, `/orders`, `/chat` and the rest as its subject —
 * including the MFA challenge token, which is handed to a browser that has not
 * yet proved the second factor, and the 30-day refresh token. The rule is now
 * the one `JwtAuthGuard` applies on the HTTP side.
 */
describe('verifyWsToken token type', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    delete process.env.ALLOW_WS_DEV_AUTH;
  });

  it('accepts an access token', () => {
    const token = jwt.sign({ sub: 'u1', role: 'ADMIN', type: 'access' }, SECRET);
    expect(verifyWsToken(clientWith(token))).toEqual({
      id: 'u1',
      email: undefined,
      role: 'ADMIN',
    });
  });

  it('refuses an MFA challenge token', () => {
    // Signed by this gateway and perfectly valid — but it authorises nothing
    // until the code that goes with it has been verified.
    const token = jwt.sign({ sub: 'u1', role: 'ADMIN', type: 'mfa' }, SECRET);
    expect(verifyWsToken(clientWith(token))).toBeNull();
  });

  it('refuses a refresh token', () => {
    const token = jwt.sign({ sub: 'u1', role: 'CUSTOMER', type: 'refresh' }, SECRET);
    expect(verifyWsToken(clientWith(token))).toBeNull();
  });

  it('still accepts a token minted before the type claim existed', () => {
    // Live sessions at rollout carry no `type`; they age out with their own expiry.
    const token = jwt.sign({ sub: 'u1', role: 'CUSTOMER' }, SECRET);
    expect(verifyWsToken(clientWith(token))?.id).toBe('u1');
  });

  it('refuses a token signed with the wrong secret', () => {
    const token = jwt.sign({ sub: 'u1', role: 'ADMIN', type: 'access' }, 'not-the-secret');
    expect(verifyWsToken(clientWith(token))).toBeNull();
  });
});
