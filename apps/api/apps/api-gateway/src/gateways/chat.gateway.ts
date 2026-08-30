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
import { authenticateWsClient, WsUser } from './ws-auth.util';
import { WsTrackingGrantService } from '../services/ws-tracking-grant.service';
import { SellerOwnershipService } from '../services/seller-ownership.service';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'driver' | 'support' | 'seller';
  content: string;
  type: 'text' | 'image' | 'location' | 'system';
  metadata?: Record<string, any>;
  createdAt: string;
  readBy: string[];
}

/**
 * ChatGateway — Real-time chat for KARTSEEK.
 *
 * Namespace: /chat
 *
 * Room conventions:
 *  - `trip:<tripId>`         — driver ↔ customer during a taxi ride
 *  - `order:<orderId>`       — delivery partner ↔ customer during order delivery
 *  - `support:<ticketId>`    — customer ↔ support agent
 *  - `seller:<sellerId>:<customerId>` — marketplace seller ↔ buyer
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
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
@UseGuards(WsDdosGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly redis: RedisService,
    private readonly wsDdosGuard: WsDdosGuard,
    private readonly trackingGrants: WsTrackingGrantService,
    private readonly sellerOwnership: SellerOwnershipService,
  ) {}

  // ── Room Authorisation ───────────────────────────────────────────────────

  /** Sees every room by definition of the role. */
  private static readonly ADMIN = ['admin', 'super_admin'];
  /** The fulfilling side of a delivery or ride, who talk to customers they did
   *  not previously know. */
  private static readonly FULFILLERS = [
    'admin', 'super_admin', 'seller', 'restaurant_seller', 'grocery_seller',
    'pharmacy_seller', 'hotel_owner', 'delivery', 'driver', 'vendor', 'support',
  ];
  private static readonly SUPPORT = ['admin', 'super_admin', 'support'];

  /**
   * May this user join that room?
   *
   * Every handler below took a `roomId` straight from the message body and
   * acted on it. `join_room` in particular replays the last 50 messages to
   * whoever asks, so naming `order:<someone-else's-order>` handed over a
   * stranger's conversation with their courier — and `send_message` then let
   * you write into it as yourself.
   *
   * The room names are the membership source: the conventions documented on
   * this class encode which resource, and sometimes which customer, a room
   * belongs to. Each shape is resolved against the same authority that already
   * governs the equivalent non-chat room, and a name matching no known shape is
   * refused rather than allowed — an unrecognised room must not be the open
   * case when joining one discloses its history.
   */
  private async mayJoin(user: WsUser, roomId: string): Promise<boolean> {
    if (!roomId) return false;
    const role = String(user.role ?? '').toLowerCase();
    if (ChatGateway.ADMIN.includes(role)) return true;

    // `trip:<tripId>` / `order:<orderId>` — the rule the live tracking rooms
    // already use: the fulfilling side by role, the customer by a grant that an
    // ownership-checked HTTP route issued after showing them the order.
    const resource = /^(?:trip|order):(.+)$/.exec(roomId);
    if (resource) {
      return ChatGateway.FULFILLERS.includes(role)
        || (await this.trackingGrants.has(resource[1], user.id));
    }

    // `seller:<sellerId>:<customerId>` — the buyer is named in the room itself;
    // the seller side has to actually own the account.
    const dm = /^seller:([^:]+):([^:]+)$/.exec(roomId);
    if (dm) {
      return user.id === dm[2] || (await this.sellerOwnership.owns(user.id, dm[1]));
    }

    // `support:<ticketId>` — staff only. The admin support console is the one
    // client that joins a chat room today, and there is no per-ticket
    // membership record to check a customer against; opening this to customers
    // means adding one, not widening the check.
    if (/^support:.+$/.test(roomId)) return ChatGateway.SUPPORT.includes(role);

    this.logger.warn(`Refused chat room "${roomId}" for ${user.id}: unrecognised room shape`);
    return false;
  }

  /**
   * The caller's socket must already be in the room.
   *
   * Once joining is authorised, Socket.IO's own room set is the membership
   * record for everything that follows — sending, typing, marking read. It
   * cannot be spoofed from a message body, and it drops on leave and on
   * reconnect.
   */
  private inRoom(client: Socket, roomId: string): boolean {
    return !!roomId && client.rooms.has(roomId);
  }

  private actor(client: Socket): WsUser | null {
    return (client as unknown as { user?: WsUser }).user ?? null;
  }

  // ── Connection Lifecycle ─────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    // ── JWT Auth ──
    const user = authenticateWsClient(client, 'ChatGateway');
    if (!user) return;

    // ── DDoS check ──
    const allowed = await this.wsDdosGuard.validateConnection(client);
    if (!allowed) return;

    const userId = user.id;
    const userType = user.role?.toLowerCase() || 'customer';

    // Store socket session
    await this.redis.hset('ws:chat:sessions', client.id, JSON.stringify({
      userId,
      userType,
      connectedAt: new Date().toISOString(),
      rooms: [],
    }));

    this.logger.log(`💬 Chat connected: ${userId} [type=${userType}, socket=${client.id}]`);

    client.emit('chat_connected', {
      socketId: client.id,
      userId,
      message: 'Connected to KARTSEEK Chat',
    });
  }

  async handleDisconnect(client: Socket) {
    await this.wsDdosGuard.handleDisconnection(client);
    const sessionRaw = await this.redis.hget('ws:chat:sessions', client.id);
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      // Broadcast typing stopped to all rooms
      for (const roomId of (session.rooms || [])) {
        this.server.to(roomId).emit('typing_stopped', {
          userId: session.userId,
          roomId,
        });
      }
      // Mark user as last seen
      await this.redis.hset('chat:last_seen', session.userId, new Date().toISOString());
    }
    await this.redis.hdel('ws:chat:sessions', client.id);
    this.logger.log(`👋 Chat disconnected: ${client.id}`);

    // Clean up all event listeners to prevent memory leaks
    client.removeAllListeners();
    // Force disconnect to free socket resources
    client.disconnect(true);
  }

  // ── Room Management ──────────────────────────────────────────────────────

  /**
   * Join a chat room and load recent message history.
   * Clients must join a room before sending/receiving messages.
   */
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; loadHistory?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.actor(client);
    if (!user?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }
    if (!(await this.mayJoin(user, data?.roomId))) {
      client.emit('error', { code: 'FORBIDDEN', message: 'You do not have access to this conversation.' });
      return;
    }

    client.join(data.roomId);

    // Update session rooms list
    const sessionRaw = await this.redis.hget('ws:chat:sessions', client.id);
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      session.rooms = [...new Set([...(session.rooms || []), data.roomId])];
      await this.redis.hset('ws:chat:sessions', client.id, JSON.stringify(session));
    }

    this.logger.log(`💬 ${client.id} joined chat room: ${data.roomId}`);

    // Load recent history if requested
    if (data.loadHistory !== false) {
      const history = await this.getChatHistory(data.roomId, 50);
      client.emit('chat_history', { roomId: data.roomId, messages: history });
    }

    client.emit('room_joined', { roomId: data.roomId });

    // Announce presence to room
    const sessionRaw2 = await this.redis.hget('ws:chat:sessions', client.id);
    if (sessionRaw2) {
      const session = JSON.parse(sessionRaw2);
      this.server.to(data.roomId).emit('user_joined', {
        userId: session.userId,
        userType: session.userType,
        roomId: data.roomId,
      });
    }
  }

  /** Leave a chat room */
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.roomId);
    this.logger.log(`🚪 ${client.id} left room: ${data.roomId}`);
    client.emit('room_left', { roomId: data.roomId });
  }

  // ── Messaging ────────────────────────────────────────────────────────────

  /** Send a chat message to a room */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: {
      roomId: string;
      content: string;
      type?: 'text' | 'image' | 'location';
      metadata?: Record<string, any>;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.inRoom(client, data?.roomId)) {
      client.emit('error', { code: 'FORBIDDEN', message: 'Join the room first.' });
      return;
    }

    const sessionRaw = await this.redis.hget('ws:chat:sessions', client.id);
    if (!sessionRaw) {
      client.emit('error', { message: 'Session not found — please reconnect' });
      return;
    }

    const session = JSON.parse(sessionRaw);
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      roomId: data.roomId,
      senderId: session.userId,
      senderName: session.userId, // In production, resolve from user service
      senderType: session.userType,
      content: data.content,
      type: data.type || 'text',
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
      readBy: [session.userId],
    };

    // Persist message (keep last 200 per room)
    await this.persistMessage(message);

    // Broadcast to room
    this.server.to(data.roomId).emit('new_message', message);

    // Update unread counts for all room members (excluding sender)
    await this.redis.incr(`chat:unread:${data.roomId}:total`);

    this.logger.log(`💬 [${data.roomId}] ${session.userId}: "${data.content.slice(0, 50)}"`);

    return { messageId: message.id, status: 'sent' };
  }

  /** Mark messages as read */
  @SubscribeMessage('mark_messages_read')
  async handleMarkRead(
    @MessageBody() data: { roomId: string; messageIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.inRoom(client, data?.roomId)) {
      client.emit('error', { code: 'FORBIDDEN', message: 'Join the room first.' });
      return;
    }

    const sessionRaw = await this.redis.hget('ws:chat:sessions', client.id);
    if (!sessionRaw) return;

    const session = JSON.parse(sessionRaw);

    // Notify room that messages were read
    this.server.to(data.roomId).emit('messages_read', {
      roomId: data.roomId,
      messageIds: data.messageIds,
      readBy: session.userId,
      readAt: new Date().toISOString(),
    });
  }

  // ── Typing Indicators ────────────────────────────────────────────────────

  /** User started typing */
  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.inRoom(client, data?.roomId)) {
      client.emit('error', { code: 'FORBIDDEN', message: 'Join the room first.' });
      return;
    }

    const sessionRaw = await this.redis.hget('ws:chat:sessions', client.id);
    if (!sessionRaw) return;

    const session = JSON.parse(sessionRaw);

    // Set typing TTL (auto-expires in 5s if no update)
    await this.redis.set(`chat:typing:${data.roomId}:${session.userId}`, '1', 5);

    // Broadcast to other room members (not the sender)
    client.to(data.roomId).emit('user_typing', {
      userId: session.userId,
      roomId: data.roomId,
    });
  }

  /** User stopped typing */
  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.inRoom(client, data?.roomId)) {
      client.emit('error', { code: 'FORBIDDEN', message: 'Join the room first.' });
      return;
    }

    const sessionRaw = await this.redis.hget('ws:chat:sessions', client.id);
    if (!sessionRaw) return;

    const session = JSON.parse(sessionRaw);
    await this.redis.del(`chat:typing:${data.roomId}:${session.userId}`);

    client.to(data.roomId).emit('typing_stopped', {
      userId: session.userId,
      roomId: data.roomId,
    });
  }

  // ── Server-Side Push Methods ─────────────────────────────────────────────

  /** Send a system message to a room (e.g., "Order picked up") */
  async sendSystemMessage(roomId: string, content: string, metadata?: Record<string, any>) {
    const message: ChatMessage = {
      id: `sys_${Date.now()}`,
      roomId,
      senderId: 'system',
      senderName: 'KARTSEEK',
      senderType: 'support',
      content,
      type: 'system',
      metadata,
      createdAt: new Date().toISOString(),
      readBy: [],
    };

    await this.persistMessage(message);
    this.server.to(roomId).emit('new_message', message);
    return message;
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private async persistMessage(message: ChatMessage) {
    const key = `chat:history:${message.roomId}`;
    // Store as JSON in a Redis list — keep last 200 messages
    const existing = (await this.redis.getJSON<ChatMessage[]>(key)) || [];
    existing.push(message);
    if (existing.length > 200) existing.splice(0, existing.length - 200);
    await this.redis.setJSON(key, existing, 86400 * 90); // 90-day TTL
  }

  private async getChatHistory(roomId: string, limit = 50): Promise<ChatMessage[]> {
    const all = (await this.redis.getJSON<ChatMessage[]>(`chat:history:${roomId}`)) || [];
    return all.slice(-limit);
  }
}
