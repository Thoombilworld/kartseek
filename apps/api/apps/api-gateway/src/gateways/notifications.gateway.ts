import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { WsDdosGuard } from '@app/security';
import { authenticateWsClient } from './ws-auth.util';

/**
 * NotificationsGateway — Real-time notification system for KARTSEEK.
 *
 * Namespace: /notifications
 *
 * Handles:
 *  - Push notifications to individual users (order updates, promotions)
 *  - Topic-based broadcasts (flash sales, system announcements)
 *  - Typing indicators for customer-support chat
 *  - Presence tracking (online/offline status)
 */
@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://*.kartseek.com',
    ],
    credentials: true,
  },
  namespace: '/notifications',
  transports: ['websocket', 'polling'],
})
@UseGuards(WsDdosGuard)
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly redis: RedisService,
    private readonly wsDdosGuard: WsDdosGuard,
  ) {}

  // ── Connection Lifecycle ─────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    // ── JWT Auth ──
    const user = authenticateWsClient(client, 'NotificationsGateway');
    if (!user) return;

    // ── DDoS check ──
    const allowed = await this.wsDdosGuard.validateConnection(client);
    if (!allowed) return;

    const userId = user.id;

    // Join personal notification room.
    //
    // `user:` with a colon, not the `user_` this gateway used to join. Every
    // one of the seventeen `notificationsGateway.server.to('user:<id>')` emits
    // in KafkaWsBridgeService addressed the colon form, so none of them reached
    // anybody: order updates, prescription verdicts, booking confirmations and
    // appointment reminders were all published to an empty room. Colon is the
    // convention the order, seller, franchise and hotel gateways already use;
    // the room name is chosen server-side and never named by a client, so this
    // is invisible to every caller. (Room membership lives in the socket.io
    // Redis adapter, so a rolling deploy briefly splits old and new sockets
    // across the two names.)
    client.join(`user:${userId}`);

    // Track online status
    await this.redis.sadd('online:users', userId);
    await this.redis.hset('ws:notif:sessions', client.id, JSON.stringify({
      userId,
      connectedAt: new Date().toISOString(),
    }));

    this.logger.log(`🔔 ${userId} connected to notifications [socket=${client.id}]`);

    // Deliver any queued notifications
    const pending = await this.redis.getJSON<any[]>(`notifications:queue:${userId}`);
    if (pending && pending.length > 0) {
      client.emit('queued_notifications', pending);
      await this.redis.del(`notifications:queue:${userId}`);
      this.logger.log(`📬 Delivered ${pending.length} queued notifications to ${userId}`);
    }

    // Send unread count
    const unreadCount = await this.redis.get(`notifications:unread:${userId}`);
    client.emit('unread_count', { count: parseInt(unreadCount || '0', 10) });
  }

  async handleDisconnect(client: Socket) {
    await this.wsDdosGuard.handleDisconnection(client);
    const sessionRaw = await this.redis.hget('ws:notif:sessions', client.id);
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      // Only mark offline if no other sockets for this user
      const roomSockets = await this.server.in(`user:${session.userId}`).fetchSockets();
      if (roomSockets.length <= 1) {
        // This was the last socket — user is now offline
        await this.redis.hset('online:last_seen', session.userId, new Date().toISOString());
        // Keep in online set for 5 minutes (grace period for reconnects)
        setTimeout(async () => {
          const stillOnline = await this.server.in(`user:${session.userId}`).fetchSockets();
          if (stillOnline.length === 0) {
            await this.redis.del(`online:users`); // Would need srem, simplified here
          }
        }, 5 * 60 * 1000);
      }
    }
    await this.redis.hdel('ws:notif:sessions', client.id);
    this.logger.log(`👋 Client disconnected from notifications: ${client.id}`);

    // Clean up all event listeners to prevent memory leaks
    client.removeAllListeners();
    // Force disconnect to free socket resources
    client.disconnect(true);
  }

  // ── Notification Subscriptions ───────────────────────────────────────────

  /** Subscribe to a topic (e.g., "flash_sales", "grocery_deals", "system") */
  @SubscribeMessage('subscribe_topic')
  handleSubscribeTopic(
    @MessageBody() data: { topic: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`topic_${data.topic}`);
    this.logger.log(`📡 ${client.id} subscribed to topic: ${data.topic}`);
    client.emit('subscription_confirmed', { topic: data.topic });
  }

  /** Unsubscribe from a topic */
  @SubscribeMessage('unsubscribe_topic')
  handleUnsubscribeTopic(
    @MessageBody() data: { topic: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`topic_${data.topic}`);
  }

  /** Mark notifications as read */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() data: { userId: string; notificationIds?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    // Whose notifications: the token's, not the body's. This took `data.userId`,
    // so one account could mark another's notifications read and zero their
    // unread counter.
    const actor = (client as unknown as { user?: { id?: string } }).user;
    if (!actor?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }
    const userId = actor.id;

    if (data.notificationIds) {
      // Mark specific notifications as read
      for (const id of data.notificationIds) {
        await this.redis.hset(`notifications:read:${userId}`, id, 'true');
      }
    }
    // Reset unread counter
    await this.redis.set(`notifications:unread:${userId}`, '0');
    client.emit('unread_count', { count: 0 });
  }

  /** Check if a user is online */
  @SubscribeMessage('check_presence')
  async handleCheckPresence(
    @MessageBody() data: { userIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    // Asking whether someone else is online is a normal affordance — a chat
    // shows it — so this is not scoped to the caller. What it lacked was a
    // bound: an unauthenticated, unlimited list turned it into a way to
    // enumerate which of an arbitrary set of accounts are currently online, and
    // when each was last seen.
    const actor = (client as unknown as { user?: { id?: string } }).user;
    if (!actor?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }
    const requested = Array.isArray(data?.userIds) ? data.userIds.slice(0, 50) : [];

    const presence: Record<string, { online: boolean; lastSeen?: string }> = {};
    for (const userId of requested) {
      const isOnline = await this.redis.sismember('online:users', userId);
      const lastSeen = await this.redis.hget('online:last_seen', userId);
      presence[userId] = { online: isOnline, lastSeen: lastSeen || undefined };
    }
    client.emit('presence_result', presence);
  }

  // ── Server-Side Push Methods (called by controllers/services) ────────────

  /** Send a notification to a specific user */
  async notifyUser(userId: string, notification: {
    title: string;
    body: string;
    type: 'order' | 'promotion' | 'system' | 'chat' | 'delivery' | 'payment';
    icon?: string;
    actionUrl?: string;
    data?: Record<string, any>;
  }) {
    const payload = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...notification,
      createdAt: new Date().toISOString(),
      read: false,
    };

    // Increment unread count
    await this.redis.incr(`notifications:unread:${userId}`);

    // Try to push in real-time
    const roomSockets = await this.server.in(`user:${userId}`).fetchSockets();
    if (roomSockets.length > 0) {
      this.server.to(`user:${userId}`).emit('notification', payload);
    } else {
      // Queue for later delivery
      const queue = (await this.redis.getJSON<any[]>(`notifications:queue:${userId}`)) || [];
      queue.push(payload);
      await this.redis.setJSON(`notifications:queue:${userId}`, queue.slice(-100), 86400 * 30); // 30 days
    }

    return payload;
  }

  /** Broadcast to a topic (flash sale, system alert, etc.) */
  async broadcastToTopic(topic: string, notification: {
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
  }) {
    const payload = {
      id: `broadcast_${Date.now()}`,
      ...notification,
      createdAt: new Date().toISOString(),
      topic,
    };

    this.server.to(`topic_${topic}`).emit('topic_notification', payload);
    this.logger.log(`📢 Broadcast to topic "${topic}": ${notification.title}`);

    // Track broadcast analytics
    await this.redis.incr(`stats:broadcasts:${topic}:${new Date().toISOString().slice(0, 10)}`);

    return payload;
  }

  /** Send order status notification */
  async notifyOrderUpdate(userId: string, orderId: string, status: string, details?: any) {
    const statusMessages: Record<string, string> = {
      confirmed: '🎉 Your order has been confirmed!',
      preparing: '👨‍🍳 Your order is being prepared',
      ready: '✅ Your order is ready for pickup',
      picked_up: '🚀 Your order has been picked up by the delivery partner',
      out_for_delivery: '🛵 Your order is out for delivery',
      delivered: '📦 Your order has been delivered!',
      cancelled: '❌ Your order has been cancelled',
    };

    return this.notifyUser(userId, {
      title: `Order #${orderId.slice(-6).toUpperCase()}`,
      body: statusMessages[status] || `Order status updated to: ${status}`,
      type: 'order',
      actionUrl: `/orders/${orderId}`,
      data: { orderId, status, ...details },
    });
  }

  @SubscribeMessage('ping_latency')
  async handlePingLatency(
    @MessageBody() data: { clientTimestamp: number },
    @ConnectedSocket() client: Socket,
  ) {
    const serverTimestamp = Date.now();
    const serverProcessingMs = serverTimestamp - (data?.clientTimestamp || serverTimestamp);

    client.emit('pong_latency', {
      clientTimestamp: data?.clientTimestamp,
      serverTimestamp,
      serverProcessingMs,
    });

    const today = new Date().toISOString().slice(0, 10);
    const latencyKey = `stats:ws:latency:${today}`;
    try {
      if (this.redis) {
        const raw = await this.redis.get(latencyKey);
        const stats = raw ? JSON.parse(raw) : { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 };
        stats.count++;
        stats.totalMs += serverProcessingMs;
        stats.minMs = Math.min(stats.minMs, serverProcessingMs);
        stats.maxMs = Math.max(stats.maxMs, serverProcessingMs);
        await this.redis.set(latencyKey, JSON.stringify(stats), 86400 * 2);
      }
    } catch {
      // ignore
    }
  }

}
