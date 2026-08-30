'use client';

/**
 * KARTSEEK WebSocket Client
 * ─────────────────────────
 * Singleton manager for all Socket.IO connections in the web portal.
 *
 * Namespaces (must match the gateway's `@WebSocketGateway({ namespace })` set):
 *  - /notifications  — push notifications & presence
 *  - /chat           — in-app messaging
 *  - /orders         — order lifecycle events (admins auto-join `admin:orders`)
 *  - /taxi           — taxi driver GPS streaming
 *  - /franchise      — franchise room events
 *  - /seller         — seller order/stock/call events
 *  - /recommendations, /hotel, /doctor-queue
 *
 * When the backend (WS_BASE_URL) is unreachable, connections degrade
 * gracefully: a single quiet console.warn per namespace, no retry
 * storms, no red console errors.
 */

import { io, Socket } from 'socket.io-client';

// Resolved once in lib/config/api-base.ts alongside the REST base, so a deploy
// that forgets the variable fails loudly instead of shipping a bundle that
// silently never connects.
import { WS_BASE_URL } from '@/lib/config/api-base';
import { getAuthToken } from '@/lib/auth-token';

/**
 * The namespaces the gateway actually registers, one entry per
 * `@WebSocketGateway({ namespace })` in `apps/api/apps/api-gateway/src/gateways`.
 *
 * `'tracking'` used to be the first member of this union and no gateway has ever
 * declared it: socket.io answers an unknown namespace with `Invalid namespace`
 * and the handshake fails, so `use-admin-socket` (the Super Admin live feed) and
 * `use-restaurant-socket` connected to nothing at all. `'pharmacy'` was listed
 * and never used. Keeping this union in step with the server is what makes a
 * wrong namespace a compile error rather than a silent dead socket.
 */
export type NamespaceKey =
  | 'notifications' | 'chat' | 'orders' | 'taxi'
  | 'franchise' | 'seller' | 'recommendations'
  | 'hotel' | 'doctor-queue';

const sockets: Partial<Record<NamespaceKey, Socket>> = {};

/** The auth token each live socket was opened with, so a sign-in can replace it. */
const socketTokens: Partial<Record<NamespaceKey, string | null>> = {};

/** Track which namespaces have already logged their first error */
const errorLogged: Partial<Record<NamespaceKey, boolean>> = {};

interface ConnectOptions {
  userId?: string;
  userType?: string;
  role?: string;
  /** Defaults to the current session token; pass only to override. */
  token?: string;
}

/**
 * Get or create a socket connection for a given namespace.
 * All sockets are singletons — calling this multiple times is safe.
 *
 * When the backend is unreachable the socket is still created (so
 * callers can safely attach listeners) but reconnection attempts
 * are limited and console noise is suppressed.
 */
export function getSocket(namespace: NamespaceKey, options: ConnectOptions = {}): Socket {
  // Every gateway but `/doctor-queue` runs `authenticateWsClient()`, which
  // `disconnect(true)`s any socket without a valid JWT — and the tokenless dev
  // path is gated on ALLOW_WS_DEV_AUTH, which is `false` in .env.example and set
  // nowhere else. Ten call sites passed only a `userId`, so notifications, order
  // tracking, chat, taxi tracking, franchise events and live recommendations
  // were all dropped at the handshake in every environment. Defaulting the token
  // here rather than at each call site means a new hook cannot reintroduce it.
  const token = options.token ?? getAuthToken();

  const existing = sockets[namespace];
  if (existing) {
    // Reuse only while the credential still matches. Signing in after a socket
    // was opened anonymously used to leave the dead socket cached for the life
    // of the page, because `getSocket` returned it before ever looking at auth.
    if (socketTokens[namespace] === token) return existing;
    disconnectSocket(namespace);
  }

  const socket = io(`${WS_BASE_URL}/${namespace}`, {
    transports: ['websocket', 'polling'],
    auth: token ? { token } : undefined,
    query: {
      ...(options.userId && { userId: options.userId }),
      ...(options.userType && { userType: options.userType }),
      ...(options.role && { role: options.role }),
    },
    reconnection: true,
    reconnectionAttempts: 3,        // Was 10 — reduces console spam
    reconnectionDelay: 2000,        // Was 1000 — less aggressive
    reconnectionDelayMax: 15000,    // Was 10000
    timeout: 10000,                 // Was 20000 — fail faster
  });

  // Standard lifecycle logging
  socket.on('connect', () => {
    errorLogged[namespace] = false;          // Reset error flag on successful connect
    console.log(`[WS /${namespace}] ✅ Connected — socket ID: ${socket.id}`);
  });

  socket.on('disconnect', (reason: string) => {
    console.debug(`[WS /${namespace}] Disconnected — reason: ${reason}`);
  });

  // Only log the first connection error per namespace — subsequent
  // retries are expected when the backend is simply not running.
  socket.on('connect_error', (err: Error) => {
    if (!errorLogged[namespace]) {
      errorLogged[namespace] = true;
      console.warn(
        `[WS /${namespace}] Backend unreachable (${err.message}). ` +
        `Real-time features will be unavailable until the API server starts.`
      );
    }
    // Silently swallow subsequent retry errors — no console.error spam
  });

  socket.on('reconnect', (attempt: number) => {
    console.log(`[WS /${namespace}] 🔄 Reconnected after ${attempt} attempt(s)`);
  });

  // When all reconnection attempts are exhausted, log once and stop.
  socket.io.on('reconnect_failed', () => {
    console.debug(
      `[WS /${namespace}] Reconnection attempts exhausted. ` +
      `The socket will stay idle until the page is refreshed.`
    );
  });

  sockets[namespace] = socket;
  socketTokens[namespace] = token;
  return socket;
}

/** Disconnect and clean up a specific namespace socket */
export function disconnectSocket(namespace: NamespaceKey) {
  const socket = sockets[namespace];
  if (socket) {
    socket.disconnect();
    delete sockets[namespace];
    delete socketTokens[namespace];
    delete errorLogged[namespace];
  }
}

/** Disconnect all active sockets (call on user logout) */
export function disconnectAll() {
  (Object.keys(sockets) as NamespaceKey[]).forEach(disconnectSocket);
}

/** Check if a socket is currently connected */
export function isConnected(namespace: NamespaceKey): boolean {
  return sockets[namespace]?.connected ?? false;
}

