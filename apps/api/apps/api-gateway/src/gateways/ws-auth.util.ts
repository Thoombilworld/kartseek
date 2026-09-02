/**
 * KARTSEEK — WebSocket JWT Authentication Utility
 *
 * Verifies JWT tokens in WebSocket handshake for real-time gateways.
 * Clients must provide a token via:
 *   1. `auth.token` in handshake options (preferred)
 *   2. `token` query parameter (fallback)
 *
 * Example (client):
 *   const socket = io('/chat', { auth: { token: 'Bearer <jwt>' } });
 *   // or
 *   const socket = io('/chat?token=<jwt>');
 */
import { type Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

const logger = new Logger('WsAuth');

export interface WsUser {
  id: string;
  email?: string;
  role: string;
}

/**
 * Extracts and verifies a JWT token from a WebSocket handshake.
 * Returns the decoded user payload, or null if verification fails.
 *
 * With `ALLOW_WS_DEV_AUTH=true` outside production, a `userId` query param
 * opens a tokenless dev session. Such a session is always role CUSTOMER — it
 * cannot name its own role, so it can never reach an admin-only room.
 */
export function verifyWsToken(client: Socket): WsUser | null {
  const secret = process.env.JWT_SECRET || 'kartseek-dev-secret';

  // 1. Try auth.token (Socket.IO v4 preferred pattern)
  let token: string | undefined =
    (client.handshake.auth?.token as string) ||
    (client.handshake.query?.token as string);

  if (token?.startsWith('Bearer ')) {
    token = token.slice(7);
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, secret) as any;
      return {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.role || 'CUSTOMER',
      };
    } catch (err) {
      logger.warn(`WS JWT verification failed: ${(err as Error).message}`);
      return null;
    }
  }

  // 2. Dev fallback — a tokenless session identified only by query params.
  //
  // This used to be gated on `NODE_ENV !== 'production'` and to read the role
  // straight off `query.userType`, which handed out any role for the asking:
  // connecting with `?userId=x&userType=SUPER_ADMIN` and no token at all
  // produced an admin session. In SellerGateway that skips the ownership check
  // and joins `admin:sellers`, the room carrying every seller's live orders —
  // customer names and totals included. Presenting no credential was strictly
  // more powerful than presenting a real one, since a token that fails
  // verification is rejected above.
  //
  // NODE_ENV is set by no dev script and no compose file here, so that gate was
  // open in every environment that had not explicitly declared itself
  // production — local, CI and staging alike. It is now an explicit opt-in, and
  // the role is pinned: a tokenless session is never privileged, whatever it
  // claims. Developers who need an admin socket present a real admin token.
  if (process.env.ALLOW_WS_DEV_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
    const userId = client.handshake.query?.userId as string;
    if (userId) {
      logger.warn(
        `⚠️  ${client.id}: tokenless dev session for user ${userId} (ALLOW_WS_DEV_AUTH=true). Role forced to CUSTOMER.`,
      );
      return { id: userId, role: 'CUSTOMER' };
    }
  }

  return null;
}

/**
 * Authenticates a WebSocket client and attaches user data.
 * Disconnects the client if authentication fails.
 * Returns the verified user or null if disconnected.
 */
export function authenticateWsClient(client: Socket, gatewayName: string): WsUser | null {
  const user = verifyWsToken(client);
  if (!user) {
    logger.warn(`⛔ ${gatewayName}: client ${client.id} rejected — invalid or missing token`);
    client.emit('error', { code: 'AUTH_REQUIRED', message: 'Valid JWT token is required. Provide via auth.token or query.token.' });
    client.disconnect(true);
    return null;
  }

  // Attach user data to socket for downstream handlers
  (client as any).user = user;
  return user;
}
