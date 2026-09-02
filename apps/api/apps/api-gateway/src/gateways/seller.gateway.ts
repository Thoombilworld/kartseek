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
import { Logger, UseGuards, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { WsDdosGuard } from '@app/security';
import { authenticateWsClient } from './ws-auth.util';
import { WsTrackingGrantService } from '../services/ws-tracking-grant.service';
import { SellerOwnershipService } from '../services/seller-ownership.service';
import { getRegionConfig, DEFAULT_REGION } from '@app/region';

/** Roles allowed to observe every seller's events. */
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN']);

/**
 * SellerGateway — Real-time event hub for the KARTSEEK Seller App.
 *
 * Namespace: /seller
 *
 * Room conventions:
 *  - `seller:<sellerId>`  — seller-scoped events (orders, alerts, bookings)
 *  - `admin:sellers`      — mirrored to Super Admin panel for full visibility
 *
 * Events emitted TO sellers:
 *  - new_order            — pushed when a customer places an order (from Kafka order.created)
 *  - low_stock_alert      — pushed when stock drops below threshold (from Kafka inventory.low-stock)
 *  - new_booking          — hotel / restaurant table booking (from Kafka booking.new)
 *  - appointment_update   — doctor appointment lifecycle change (from Kafka appointment.scheduled)
 *  - new_complaint        — taxi vendor complaint submitted (from Kafka vendor_complaint.new)
 *  - call_ready           — patient joined video call room (from Kafka doctor.call_ready)
 *  - call_offer / call_answer / ice_candidate / call_ended — WebRTC signalling (peer-to-peer relay)
 *  - delivery_assigned    — delivery partner has been assigned to seller's order
 *
 * Events received FROM sellers:
 *  - join_seller_room     — explicit room join (fallback; server auto-joins on connect)
 *  - seller_order_ack     — seller acknowledges receiving a new order notification
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
  namespace: '/seller',
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 5000,
})
@UseGuards(WsDdosGuard)
export class SellerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SellerGateway.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    private readonly wsDdosGuard: WsDdosGuard,
    @Inject('SELLER_SERVICE') private readonly sellerClient: ClientProxy,
    private readonly trackingGrants: WsTrackingGrantService,
    private readonly sellerOwnership: SellerOwnershipService,
  ) {}

  // ── Connection Lifecycle ──────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    const allowed = await this.wsDdosGuard.validateConnection(client);
    if (!allowed) return;

    // The room used to be taken straight from `handshake.query.userId`, with no
    // token involved: connecting with `?userId=<any seller id>` joined that
    // seller's private room and streamed their live orders — customer names,
    // totals and all — to anyone who asked. The socket is now authenticated the
    // same way every HTTP route is.
    const user = authenticateWsClient(client, 'SellerGateway');
    if (!user) return;

    const sellerType = client.handshake.query.userType as string; // e.g. 'grocery_seller'
    const isAdmin = ADMIN_ROLES.has(String(user.role ?? '').toUpperCase());

    // `userId` on this namespace is the *seller* id, which is not the JWT
    // subject (that is the owning user). A seller may therefore still name it,
    // but only their own: ownership is confirmed against the seller record
    // before the room is joined. Admins may observe any seller.
    const requested = String(client.handshake.query.userId ?? '');
    if (!requested) {
      client.emit('error', { message: 'userId query param required' });
      client.disconnect();
      return;
    }

    if (!isAdmin && !(await this.sellerOwnership.owns(user.id, requested))) {
      this.logger.warn(`⛔ SellerGateway: user ${user.id} tried to join seller:${requested}`);
      client.emit('error', { code: 'FORBIDDEN', message: 'You do not have access to this seller account.' });
      client.disconnect(true);
      return;
    }

    const sellerId = requested;

    // Track session
    await this.redis.hset('ws:seller:sessions', client.id, JSON.stringify({
      sellerId,
      sellerType,
      connectedAt: new Date().toISOString(),
    }));

    await client.join(`seller:${sellerId}`);
    // `admin:sellers` carries EVERY seller's order events. Every connecting
    // seller used to be joined to it unconditionally, so each one received all
    // the others' new-order notifications. Admins only.
    if (isAdmin) await client.join('admin:sellers');

    // Deliver any pending offline notifications
    const pending = await this.redis.getJSON<any[]>(`seller:notifications:pending:${sellerId}`);
    if (pending && pending.length > 0) {
      client.emit('pending_notifications', pending);
      await this.redis.del(`seller:notifications:pending:${sellerId}`);
    }

    client.emit('seller_connected', {
      socketId: client.id,
      sellerId,
      sellerType,
      message: 'Connected to KARTSEEK Seller Hub',
      serverTime: new Date().toISOString(),
    });

    this.logger.log(`🏪 Seller connected: ${sellerId} [${sellerType}]`);
  }

  async handleDisconnect(client: Socket) {
    await this.wsDdosGuard.handleDisconnection(client);
    await this.redis.hdel('ws:seller:sessions', client.id);
    
    // 🔧 FIX: Clean up all event listeners to prevent memory leaks
    client.removeAllListeners();
    // Force disconnect to free socket resources
    client.disconnect(true);
    
    this.logger.log(`❌ Seller disconnected: ${client.id}`);
  }

  // ── Client-initiated Events ───────────────────────────────────────────────

  /**
   * Generic room join — used by pharmacy/grocery sellers to join
   * module-specific rooms (e.g. `pharmacy:{storeId}`, `admin:pharmacy`).
   */
  @SubscribeMessage('join_room')
  async handleJoinGenericRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.room) return;
    await client.join(data.room);
    client.emit('room_joined', { room: data.room });
    this.logger.debug(`Client ${client.id} joined room: ${data.room}`);
  }

  /** Explicit room join (useful if auth token rotates) */
  /**
   * Join a seller's live feed.
   *
   * The room was named by `data.sellerId` and joined unconditionally, so any
   * signed-in seller could watch another seller's orders and revenue — while
   * `handleConnection` twenty lines above performs exactly the check this
   * needed, against `sellers.owner_id`. The room could not simply be keyed to
   * the caller's own id either: a seller *account* id is not the JWT subject
   * (that is the owning user), and every broadcast addresses
   * `seller:<sellerId>`, so keying by user id would have produced a room that
   * silently never receives anything.
   *
   * `ownsSeller` is the same source of truth `SellerOwnershipGuard` uses on the
   * HTTP side, and it fails closed.
   */
  @SubscribeMessage('join_seller_room')
  async handleJoinRoom(
    @MessageBody() data: { sellerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as unknown as { user?: { id?: string; role?: string } }).user;
    if (!user?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }
    const sellerId = String(data?.sellerId ?? '');
    if (!sellerId) {
      client.emit('error', { message: 'sellerId is required' });
      return;
    }

    const isAdmin = ['admin', 'super_admin'].includes(String(user.role ?? '').toLowerCase());
    if (!isAdmin && !(await this.sellerOwnership.owns(user.id, sellerId))) {
      this.logger.warn(`⛔ SellerGateway: user ${user.id} tried to join seller:${sellerId}`);
      client.emit('error', { code: 'FORBIDDEN', message: 'You do not have access to this seller account.' });
      return;
    }

    await client.join(`seller:${sellerId}`);
    client.emit('room_joined', { room: `seller:${sellerId}` });
  }

  /** Seller acknowledges receiving a new order (clears pending badge) */
  @SubscribeMessage('seller_order_ack')
  async handleOrderAck(
    @MessageBody() data: { orderId: string; sellerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.redis.hdel(`seller:pending_orders:${data.sellerId}`, data.orderId);
    this.logger.log(`✅ Order ${data.orderId} acknowledged by seller ${data.sellerId}`);
    return { acked: true };
  }

  // ── WebRTC Signalling Relay (Doctor Module) ───────────────────────────────

  /**
   * Relay WebRTC offer from doctor to patient (or vice versa).
   * Both parties must be in the same `call:<appointmentId>` room.
   */

  /**
   * Signalling is confined to a call you actually joined.
   *
   * `call_offer`, `call_answer`, `ice_candidate` and `call_ended` each relayed
   * to `call:<appointmentId>` named straight from the message body, so a third
   * party could inject an SDP offer or hang up someone else's medical
   * consultation without ever joining its room.
   *
   * `join_call_room` already requires a grant, so Socket.IO's room set is the
   * membership record: if you are in the room you passed the check, and the
   * body can no longer name a room you are not in.
   */
  private inCall(client: Socket, appointmentId: string | undefined): boolean {
    if (!appointmentId) return false;
    if (client.rooms.has(`call:${appointmentId}`)) return true;
    this.logger.warn(`Refused call signalling for ${appointmentId} from ${client.id}: not in the call room`);
    client.emit('error', { code: 'FORBIDDEN', message: 'You are not a participant in this call.' });
    return false;
  }

  @SubscribeMessage('call_offer')
  handleCallOffer(
    @MessageBody() data: { appointmentId: string; sdp: RTCSessionDescriptionInit; targetId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.inCall(client, data?.appointmentId)) return;

    this.server.to(`call:${data.appointmentId}`).emit('call_offer', {
      fromId: client.id,
      sdp: data.sdp,
      appointmentId: data.appointmentId,
    });
  }

  @SubscribeMessage('call_answer')
  handleCallAnswer(
    @MessageBody() data: { appointmentId: string; sdp: RTCSessionDescriptionInit },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.inCall(client, data?.appointmentId)) return;

    this.server.to(`call:${data.appointmentId}`).emit('call_answer', {
      fromId: client.id,
      sdp: data.sdp,
    });
  }

  @SubscribeMessage('ice_candidate')
  handleIceCandidate(
    @MessageBody() data: { appointmentId: string; candidate: RTCIceCandidateInit },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.inCall(client, data?.appointmentId)) return;

    this.server.to(`call:${data.appointmentId}`).emit('ice_candidate', {
      fromId: client.id,
      candidate: data.candidate,
    });
  }

  /**
   * Join a consultation's WebRTC signalling room.
   *
   * This joined `call:<appointmentId>` on request and then announced
   * `call_ready` to whoever else was in the room — so a third party could insert
   * themselves into the signalling for someone else's medical consultation by
   * naming its appointment id.
   *
   * Only the patient and the doctor belong in that room. Neither this gateway
   * nor any HTTP route currently establishes that, and nothing in the web app
   * calls this event, so it fails closed rather than guessing: wiring a call UI
   * means issuing a grant from a route that has checked the appointment.
   */
  @SubscribeMessage('join_call_room')
  async handleJoinCallRoom(
    @MessageBody() data: { appointmentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as unknown as { user?: { id?: string; role?: string } }).user;
    if (!user?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    if (!(await this.trackingGrants.has(data?.appointmentId, user.id))) {
      this.logger.warn(`Refused call room ${data?.appointmentId} for ${user.id}: no grant`);
      client.emit('error', { message: 'You are not a participant in this consultation' });
      return;
    }

    await client.join(`call:${data.appointmentId}`);
    // Notify the other party that the peer is ready
    client.to(`call:${data.appointmentId}`).emit('call_ready', {
      peerId: client.id,
      appointmentId: data.appointmentId,
    });
    this.logger.log(`📹 ${client.id} joined call room: ${data.appointmentId}`);
  }

  @SubscribeMessage('call_ended')
  async handleCallEnded(
    @MessageBody() data: { appointmentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.inCall(client, data?.appointmentId)) return;

    this.server.to(`call:${data.appointmentId}`).emit('call_ended', {
      appointmentId: data.appointmentId,
      endedBy: client.id,
    });
    await client.leave(`call:${data.appointmentId}`);
    this.logger.log(`📵 Call ended: ${data.appointmentId}`);
  }

  // ── Server-Side Push Methods (called by HTTP controllers / Kafka consumers) ─

  /**
   * Push a new order notification to the seller.
   * Also mirrors to admin:sellers room for Super Admin visibility.
   */
  async notifyNewOrder(sellerId: string, order: {
    orderId: string;
    customerName: string;
    items: number;
    total: number;
    type: string;
    currency?: string;
    /** The market the order was placed in, which decides the currency. */
    regionCode?: string;
  }): Promise<void> {
    const payload = {
      event: 'new_order',
      ...order,
      // Was `?? 'INR'` — a seller in Doha saw new-order pushes in rupees.
      currency: order.currency ?? getRegionConfig(order.regionCode ?? DEFAULT_REGION)?.currencyCode ?? null,
      timestamp: new Date().toISOString(),
    };

    this.server.to(`seller:${sellerId}`).emit('new_order', payload);
    this.server.to('admin:sellers').emit('seller_event', { sellerId, ...payload });

    // Queue for offline sellers
    const sockets = await this.redis.smembers(`ws:user:${sellerId}`);
    if (sockets.length === 0) {
      const pending = (await this.redis.getJSON<any[]>(`seller:notifications:pending:${sellerId}`)) || [];
      pending.push(payload);
      await this.redis.setJSON(`seller:notifications:pending:${sellerId}`, pending.slice(-50), 86400 * 3);
    }

    this.logger.log(`🛒 New order ${order.orderId} → seller ${sellerId}`);
  }

  /** Push a low-stock alert for a specific inventory item. */
  async notifyLowStock(sellerId: string, item: {
    itemId: string;
    itemName: string;
    currentStock: number;
    threshold: number;
  }): Promise<void> {
    const payload = { event: 'low_stock_alert', ...item, timestamp: new Date().toISOString() };
    this.server.to(`seller:${sellerId}`).emit('low_stock_alert', payload);
    this.server.to('admin:sellers').emit('seller_event', { sellerId, ...payload });
    this.logger.log(`📦 Low stock: ${item.itemName} (${item.currentStock} left) → seller ${sellerId}`);
  }

  /** Push a new booking (hotel, doctor appointment, restaurant table). */
  async notifyNewBooking(sellerId: string, booking: {
    bookingId: string;
    customerName: string;
    bookingType: 'hotel' | 'appointment' | 'table';
    scheduledAt: string;
    details?: Record<string, any>;
  }): Promise<void> {
    const payload = { event: 'new_booking', ...booking, timestamp: new Date().toISOString() };
    this.server.to(`seller:${sellerId}`).emit('new_booking', payload);
    this.server.to('admin:sellers').emit('seller_event', { sellerId, ...payload });
    this.logger.log(`📅 New booking ${booking.bookingId} [${booking.bookingType}] → seller ${sellerId}`);
  }

  /** Push a complaint notification to a taxi vendor. */
  async notifyComplaint(vendorId: string, complaint: {
    complaintId: string;
    driverId: string;
    rideId: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }): Promise<void> {
    const payload = { event: 'new_complaint', ...complaint, timestamp: new Date().toISOString() };
    this.server.to(`seller:${vendorId}`).emit('new_complaint', payload);
    this.server.to('admin:sellers').emit('seller_event', { vendorId, ...payload });
    this.logger.log(`⚠️ Complaint ${complaint.complaintId} → vendor ${vendorId}`);
  }

  /** Push delivery-assigned event when a delivery partner accepts the order. */
  async notifyDeliveryAssigned(sellerId: string, assignment: {
    orderId: string;
    partnerId: string;
    partnerName: string;
    partnerPhone?: string;
    etaMinutes?: number;
  }): Promise<void> {
    const payload = { event: 'delivery_assigned', ...assignment, timestamp: new Date().toISOString() };
    this.server.to(`seller:${sellerId}`).emit('delivery_assigned', payload);
    this.logger.log(`🚚 Delivery assigned: ${assignment.partnerId} → order ${assignment.orderId}`);
  }

  /** Get count of connected sellers (for admin stats). */
  async getConnectedSellerCount(): Promise<number> {
    const sockets = await this.server.fetchSockets();
    return sockets.length;
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
