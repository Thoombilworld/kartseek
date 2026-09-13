import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { WsDdosGuard } from '@app/security';
import { authenticateWsClient } from './ws-auth.util';

const ACK_TIMEOUT_MS = 5000;
const ACK_MAX_RETRIES = 3;

/**
 * DoctorQueueGateway — Real-time token queue & appointment tracking for doctors.
 *
 * Namespace: /doctor-queue
 *
 * Handles:
 *  - Live token number broadcasts (doctor advances to next patient)
 *  - Queue position updates for all waiting patients
 *  - Appointment reminder notifications
 *  - Doctor presence tracking (online/offline)
 *
 * Clients subscribe to a doctor's queue room: `doctor_queue_{doctorId}_{date}`
 * and receive real-time updates when the token advances.
 */
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://*.kartseek.com'],
    credentials: true,
  },
  namespace: '/doctor-queue',
  transports: ['websocket', 'polling'],
})
@UseGuards(WsDdosGuard)
export class DoctorQueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DoctorQueueGateway.name);

  constructor(
    private readonly redis: RedisService,
    private readonly wsDdosGuard: WsDdosGuard,
  ) {}

  // ── Connection Lifecycle ─────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    const allowed = await this.wsDdosGuard.validateConnection(client);
    if (!allowed) return;

    /**
     * Identity comes from the verified token, never the query string.
     *
     * This read `userId` straight off `handshake.query` and joined
     * `user_${userId}` with it, so connecting as
     * `?userId=<somebody-else>` put you in that patient's private room and
     * delivered their appointment and queue notifications. The other nine
     * gateways already route through `authenticateWsClient`; this one did not.
     *
     * `authenticateWsClient` emits an AUTH_REQUIRED error and disconnects when
     * the token is missing or invalid, so returning here is the whole handling.
     */
    const user = authenticateWsClient(client, 'DoctorGateway');
    if (!user) return;

    const userId = user.id;
    const userType = user.role?.toLowerCase() || 'customer';

    if (userId) {
      client.join(`user_${userId}`);
      await this.redis.hset(
        'ws:doctor-queue:sessions',
        client.id,
        JSON.stringify({
          userId,
          userType,
          connectedAt: new Date().toISOString(),
        }),
      );
    }

    this.logger.log(
      `🩺 Connected to doctor-queue: ${client.id} [user=${userId || 'anonymous'}, type=${userType}]`,
    );

    client.emit('connected', {
      socketId: client.id,
      serverTime: new Date().toISOString(),
      message: 'Connected to KARTSEEK Doctor Queue',
    });
  }

  async handleDisconnect(client: Socket) {
    await this.wsDdosGuard.handleDisconnection(client);
    await this.redis.hdel('ws:doctor-queue:sessions', client.id);

    // 🔧 FIX: Clean up all event listeners to prevent memory leaks
    client.removeAllListeners();
    // Force disconnect to free socket resources
    client.disconnect(true);

    this.logger.log(`👋 Disconnected from doctor-queue: ${client.id}`);
  }

  // ── Client Subscriptions ─────────────────────────────────────────────────

  /** Subscribe to a doctor's queue for a specific date. */
  @SubscribeMessage('subscribe_queue')
  handleSubscribeQueue(
    @MessageBody() data: { doctorId: string; date?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const date = data.date || new Date().toISOString().slice(0, 10);
    const room = `doctor_queue_${data.doctorId}_${date}`;

    client.join(room);
    this.logger.log(`📡 ${client.id} subscribed to queue: ${room}`);

    client.emit('subscription_confirmed', {
      room,
      doctorId: data.doctorId,
      date,
    });
  }

  /** Unsubscribe from a doctor's queue. */
  @SubscribeMessage('unsubscribe_queue')
  handleUnsubscribeQueue(
    @MessageBody() data: { doctorId: string; date?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const date = data.date || new Date().toISOString().slice(0, 10);
    const room = `doctor_queue_${data.doctorId}_${date}`;
    client.leave(room);
    this.logger.log(`📡 ${client.id} unsubscribed from queue: ${room}`);
  }

  // ── Server-Side Push Methods (called by controllers/services) ────────────

  /**
   * Broadcasts a token advance event to all clients watching a doctor's queue.
   * Called by the doctor controller after `advanceToken()` succeeds.
   */
  async broadcastTokenAdvance(
    doctorId: string,
    date: string,
    currentToken: number,
    avgWaitMinutes: number,
  ) {
    const room = `doctor_queue_${doctorId}_${date}`;
    const payload = {
      event: 'token_advanced',
      doctorId,
      date,
      currentToken,
      avgWaitMinutes,
      timestamp: new Date().toISOString(),
    };

    this.server.to(room).emit('token_advanced', payload);
    this.logger.log(`🔔 Token advanced → #${currentToken} broadcast to room ${room}`);
  }

  /**
   * Broadcasts the full queue state (all appointments with positions).
   * Called after token advance or when a new patient books/cancels.
   */
  async broadcastQueueUpdate(
    doctorId: string,
    date: string,
    queueData: {
      currentToken: number;
      totalTokens: number;
      waitingCount: number;
      avgWaitMinutes: number;
      appointments: Array<{
        id: string;
        tokenNumber: number;
        queuePosition: number;
        estimatedWaitMinutes: number;
        status: string;
      }>;
    },
  ) {
    const room = `doctor_queue_${doctorId}_${date}`;
    const payload = {
      event: 'queue_updated',
      doctorId,
      date,
      ...queueData,
      timestamp: new Date().toISOString(),
    };

    this.server.to(room).emit('queue_updated', payload);
    this.logger.log(
      `📊 Queue update broadcast to ${room}: ${queueData.totalTokens} tokens, now serving #${queueData.currentToken}`,
    );
  }

  /**
   * Sends an appointment reminder to a specific user's notification channel.
   * Used for the 30-minute-before push notification.
   */
  async sendAppointmentReminder(
    userId: string,
    reminderData: {
      appointmentId: string;
      doctorName: string;
      date: string;
      time: string;
      minutesUntil: number;
      location?: { name: string; address: string; latitude?: number; longitude?: number };
    },
  ) {
    const payload = {
      event: 'appointment_reminder',
      ...reminderData,
      timestamp: new Date().toISOString(),
    };

    // Push to user's personal room (all connected devices)
    this.server.to(`user_${userId}`).emit('appointment_reminder', payload);
    this.logger.log(
      `⏰ Reminder sent to user ${userId} for appointment ${reminderData.appointmentId}`,
    );
  }

  /**
   * Notifies a specific user about a consultation status change.
   * E.g., "Your turn is next!" or "Doctor has started your consultation".
   */
  async notifyConsultationUpdate(
    userId: string,
    data: {
      appointmentId: string;
      status: 'check_in' | 'your_turn' | 'in_progress' | 'completed';
      message: string;
      tokenNumber?: number;
      queuePosition?: number;
    },
  ) {
    const payload = {
      event: 'consultation_update',
      ...data,
      timestamp: new Date().toISOString(),
    };

    await this.emitWithAck(
      `user_${userId}`,
      'consultation_update',
      payload,
      `consultation:${data.status}:${userId}`,
    );
    this.logger.log(`🩺 Consultation update → ${userId}: ${data.status}`);
  }

  // ── Ack Helper ─────────────────────────────────────────────────────────────

  /**
   * Emit an event to a room with Socket.IO acknowledgment.
   * Retries up to ACK_MAX_RETRIES times if no ack received within ACK_TIMEOUT_MS.
   */
  private async emitWithAck(
    room: string,
    event: string,
    payload: Record<string, any>,
    logLabel: string,
    attempt = 1,
  ): Promise<void> {
    try {
      const sockets = await this.server.in(room).fetchSockets();
      if (sockets.length === 0) {
        this.logger.warn(`⚠️ No sockets in room ${room} for ${logLabel}`);
        return;
      }

      for (const s of sockets) {
        const ackPromise = new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), ACK_TIMEOUT_MS);
          s.emit(event, payload, (ack: any) => {
            clearTimeout(timeout);
            resolve(true);
          });
        });

        const ackReceived = await ackPromise;
        if (ackReceived) {
          this.logger.debug(`✅ Ack received for ${logLabel} on socket ${s.id}`);
        } else {
          this.logger.warn(
            `❌ No ack for ${logLabel} on socket ${s.id} (Attempt ${attempt}/${ACK_MAX_RETRIES})`,
          );
          if (attempt < ACK_MAX_RETRIES) {
            // Wait 1s before retrying
            await new Promise((r) => setTimeout(r, 1000));
            // We recursively call emitWithAck, but we must only target this specific socket.
            // Since `room` might be a multi-socket room, it's safer to target the socket directly:
            await this.emitWithAck(s.id, event, payload, logLabel, attempt + 1);
          } else {
            // Track failure in Redis for metrics
            // Bounded at 35 days: read back for today by the gateway's own
            // metrics board, and `volatile-lru` may evict nothing that has no
            // expiry (AUD2-031).
            const ackStat = `stats:ws:ack_failures:${new Date().toISOString().slice(0, 10)}`;
            if ((await this.redis.incr(ackStat)) === 1) await this.redis.expire(ackStat, 3_024_000);
          }
        }
      }
    } catch (e: any) {
      this.logger.error(`Error in emitWithAck for ${logLabel}: ${e.message}`);
    }
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
