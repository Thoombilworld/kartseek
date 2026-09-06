/**
 * Redis-backed Socket.IO Adapter for Horizontal WebSocket Scaling.
 *
 * This adapter uses @socket.io/redis-adapter to share WebSocket state
 * across multiple API Gateway instances via Redis Pub/Sub.
 *
 * Each instance creates dedicated Redis pub/sub clients (separate from
 * the application cache client) for event broadcast coordination.
 *
 * Usage in main.ts:
 *   const adapter = new RedisIoAdapter(app);
 *   await adapter.connectToRedis();
 *   app.useWebSocketAdapter(adapter);
 */
import { IoAdapter } from '@nestjs/platform-socket.io';
import { type INestApplication, Logger } from '@nestjs/common';
import { type ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

/**
 * `error` listeners the shared pub/sub clients may carry: one per Socket.IO
 * namespace (see connectToRedis), with room to add gateways without a warning.
 */
const MAX_ADAPTER_LISTENERS = 64;

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger('RedisIoAdapter');
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private pubClient: ReturnType<typeof createClient> | null = null;
  private subClient: ReturnType<typeof createClient> | null = null;

  constructor(private readonly app: INestApplication) {
    super(app);
  }

  /**
   * Connect pub/sub Redis clients for the adapter.
   * Must be called before app.useWebSocketAdapter().
   */
  async connectToRedis(): Promise<void> {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    const redisUrl = password ? `redis://:${password}@${host}:${port}` : `redis://${host}:${port}`;

    this.pubClient = createClient({ url: redisUrl });
    this.subClient = this.pubClient.duplicate();

    // Every Socket.IO namespace builds its own RedisAdapter over these two
    // shared clients, and each adapter registers an `error` listener on both.
    // Eleven namespaces (ten gateways plus the default `/`) cross Node's
    // default ceiling of ten, so every boot printed a MaxListenersExceededWarning
    // pointing here. One listener per namespace, released with it, is not a
    // leak; raise the ceiling rather than silence the warning outright.
    this.pubClient.setMaxListeners(MAX_ADAPTER_LISTENERS);
    this.subClient.setMaxListeners(MAX_ADAPTER_LISTENERS);

    // Error handlers to prevent unhandled rejections
    this.pubClient.on('error', (err) =>
      this.logger.error(`Redis PUB client error: ${err.message}`),
    );
    this.subClient.on('error', (err) =>
      this.logger.error(`Redis SUB client error: ${err.message}`),
    );

    try {
      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
      this.logger.log(`✅ Redis Socket.IO adapter connected (${host}:${port})`);
    } catch (err: any) {
      this.logger.warn(
        `⚠️ Redis adapter connection failed: ${err.message}. ` +
          `Falling back to in-memory adapter (single-instance mode).`,
      );
      this.adapterConstructor = null;
    }
  }

  /**
   * Create the Socket.IO server with the Redis adapter attached.
   * Falls back to default in-memory adapter if Redis is unavailable.
   */
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
      this.logger.log('🔗 Socket.IO server using Redis adapter for horizontal scaling');
    } else {
      this.logger.warn('🔗 Socket.IO server using in-memory adapter (single-instance only)');
    }

    return server;
  }

  /**
   * Gracefully shut down pub/sub clients on application close.
   */
  async close(): Promise<void> {
    try {
      await this.pubClient?.quit();
      await this.subClient?.quit();
      this.logger.log('Redis adapter pub/sub clients disconnected');
    } catch (err: any) {
      this.logger.error(`Redis adapter cleanup error: ${err.message}`);
    }
  }
}
