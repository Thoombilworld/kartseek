import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
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
import { WsTrackingGrantService } from '../services/ws-tracking-grant.service';

/**
 * HotelGateway — Real-time events for hotel bookings and room availability.
 *
 * Namespace: /hotel
 * Handles: Booking confirmations, room availability updates, check-in notifications,
 *          price change broadcasts, and owner alerts.
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
  namespace: 'hotel',
  transports: ['websocket', 'polling'],
})
@UseGuards(WsDdosGuard)
export class HotelGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(HotelGateway.name);

  constructor(
    private readonly redis: RedisService,
    private readonly wsDdosGuard: WsDdosGuard,
    private readonly trackingGrants: WsTrackingGrantService,
  ) {}

  afterInit() {
    this.logger.log('🏨 HotelGateway initialized — ready for connections');
  }

  async handleConnection(client: Socket) {
    // ── JWT Auth ──
    const user = authenticateWsClient(client, 'HotelGateway');
    if (!user) return;

    // ── DDoS check ──
    const allowed = await this.wsDdosGuard.validateConnection(client);
    if (!allowed) return;

    const userId = user.id;
    const role = user.role?.toLowerCase() || 'customer';
    this.logger.log(`📱 Hotel WS connected: ${client.id} [user=${userId}, role=${role}]`);

    await this.redis.hset('ws:hotel:sessions', client.id, JSON.stringify({ userId, role, connectedAt: new Date().toISOString() }));

    client.emit('connected', { socketId: client.id, namespace: 'hotel', serverTime: new Date().toISOString() });
  }

  async handleDisconnect(client: Socket) {
    await this.wsDdosGuard.handleDisconnection(client);
    this.logger.log(`❌ Hotel WS disconnected: ${client.id}`);
    await this.redis.hdel('ws:hotel:sessions', client.id);

    // Clean up all event listeners to prevent memory leaks
    client.removeAllListeners();
    // Force disconnect to free socket resources
    client.disconnect(true);
  }

  // ── Room Tracking ─────────────────────────────────────────────────────────

  @SubscribeMessage('join_hotel_room')
  handleJoinHotelRoom(
    @MessageBody() data: { hotelId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`hotel:${data.hotelId}`);
    this.logger.log(`👀 ${client.id} joined hotel room: ${data.hotelId}`);
    client.emit('room_joined', { room: `hotel:${data.hotelId}`, type: 'hotel' });
  }

  @SubscribeMessage('leave_hotel_room')
  handleLeaveHotelRoom(
    @MessageBody() data: { hotelId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`hotel:${data.hotelId}`);
  }

  /**
   * Watch one booking.
   *
   * Named by a client-supplied id with no check, so any signed-in account could
   * follow a stranger's reservation. Hotel staff and admins legitimately watch
   * bookings they did not make; a guest needs the grant that an
   * ownership-checked booking route issues.
   */
  @SubscribeMessage('join_booking_tracking')
  async handleJoinBookingTracking(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.bookingId) return;
    const user = (client as unknown as { user?: { id?: string; role?: string } }).user;
    if (!user?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const STAFF = ['admin', 'super_admin', 'seller', 'hotel_owner'];
    if (!STAFF.includes(String(user.role ?? '').toLowerCase())
      && !(await this.trackingGrants.has(data.bookingId, user.id))) {
      client.emit('error', { message: 'You may only track your own bookings' });
      return;
    }

    client.join(`booking:${data.bookingId}`);
    this.logger.log(`📋 ${client.id} joined booking tracking: ${data.bookingId}`);
    client.emit('room_joined', { room: `booking:${data.bookingId}`, type: 'booking' });
  }

  /**
   * Join your own owner dashboard.
   *
   * Named by `data.ownerId`, so any signed-in account could watch another
   * hotel owner's live bookings and revenue. The id now comes from the token;
   * there is no reason to subscribe to somebody else's dashboard.
   */
  @SubscribeMessage('join_owner_dashboard')
  handleJoinOwnerDashboard(
    @MessageBody() _data: { ownerId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as unknown as { user?: { id?: string; role?: string } }).user;
    if (!user?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }
    client.join(`owner:${user.id}`);
    this.logger.log(`🏢 ${client.id} joined owner dashboard: ${user.id}`);
  }

  // ── Room Availability Updates ─────────────────────────────────────────────

  @SubscribeMessage('room_availability_change')
  async handleRoomAvailabilityChange(
    @MessageBody() data: { hotelId: string; roomId: string; date: string; available: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Only the party fulfilling this may announce it. `OrderGateway`'s own
    // `update_order_status` has always role-checked; these did not, so any
    // signed-in customer could drive another customer's order, ride or price.
    const actor = (client as unknown as { user?: { id?: string; role?: string } }).user;
    const FULFILLERS = ['admin', 'super_admin', 'seller', 'restaurant_seller',
      'grocery_seller', 'pharmacy_seller', 'hotel_owner', 'delivery', 'driver', 'vendor'];
    if (!actor?.id || !FULFILLERS.includes(String(actor.role ?? '').toLowerCase())) {
      client.emit('error', { message: 'Only the hotel may change its availability' });
      return;
    }

    const payload = { ...data, timestamp: new Date().toISOString() };
    await this.redis.setJSON(`hotel:availability:${data.roomId}:${data.date}`, payload, 86400);
    this.server.to(`hotel:${data.hotelId}`).emit('availability_updated', payload);
    this.logger.log(`🔄 Availability updated: hotel ${data.hotelId}, room ${data.roomId} → ${data.available} units`);
  }

  // ── Price Change Broadcasts ───────────────────────────────────────────────

  @SubscribeMessage('price_update')
  async handlePriceUpdate(
    @MessageBody() data: { hotelId: string; roomId: string; newPrice: number; oldPrice: number; currency: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Any signed-in socket could broadcast a fabricated price change to everyone viewing a hotel.

    // Only the party fulfilling this may announce it. `OrderGateway`'s own
    // `update_order_status` has always role-checked; these did not, so any
    // signed-in customer could drive another customer's order, ride or price.
    const actor = (client as unknown as { user?: { id?: string; role?: string } }).user;
    const FULFILLERS = ['admin', 'super_admin', 'seller', 'restaurant_seller',
      'grocery_seller', 'pharmacy_seller', 'hotel_owner', 'delivery', 'driver', 'vendor'];
    if (!actor?.id || !FULFILLERS.includes(String(actor.role ?? '').toLowerCase())) {
      client.emit('error', { message: 'Only the hotel may change its prices' });
      return;
    }

    const payload = { ...data, timestamp: new Date().toISOString() };
    this.server.to(`hotel:${data.hotelId}`).emit('price_changed', payload);
    this.logger.log(`💰 Price changed: hotel ${data.hotelId}, room ${data.roomId}: ${data.oldPrice} → ${data.newPrice} ${data.currency}`);
  }

  // ── Server-Side Push Methods (called by hotel-service via Kafka bridge) ───

  /** Push booking confirmation to customer + owner */
  async pushBookingConfirmation(bookingData: {
    bookingId: string; hotelId: string; customerId: string; ownerId: string;
    roomType: string; checkIn: string; checkOut: string; totalAmount: number;
  }) {
    const payload = { event: 'booking_confirmed', ...bookingData, timestamp: new Date().toISOString() };

    // Notify the booking room
    this.server.to(`booking:${bookingData.bookingId}`).emit('booking_status', payload);
    // Notify the hotel owner dashboard
    this.server.to(`owner:${bookingData.ownerId}`).emit('new_booking', payload);
    // Notify the hotel page (availability change)
    this.server.to(`hotel:${bookingData.hotelId}`).emit('booking_confirmed', payload);

    this.logger.log(`✅ Booking ${bookingData.bookingId} confirmed → customer + owner notified`);
  }

  /** Push booking cancellation */
  async pushBookingCancellation(bookingData: {
    bookingId: string; hotelId: string; ownerId: string; reason?: string;
  }) {
    const payload = { event: 'booking_cancelled', ...bookingData, timestamp: new Date().toISOString() };
    this.server.to(`booking:${bookingData.bookingId}`).emit('booking_status', payload);
    this.server.to(`owner:${bookingData.ownerId}`).emit('booking_cancelled', payload);
    this.server.to(`hotel:${bookingData.hotelId}`).emit('booking_cancelled', payload);
  }

  /** Push check-in notification to owner */
  async pushCheckInNotification(data: {
    bookingId: string; hotelId: string; ownerId: string; guestName: string; roomNumber?: string;
  }) {
    const payload = { event: 'guest_checked_in', ...data, timestamp: new Date().toISOString() };
    this.server.to(`owner:${data.ownerId}`).emit('guest_checked_in', payload);
    this.logger.log(`🛎️ Guest ${data.guestName} checked in → booking ${data.bookingId}`);
  }

  /** Get connection stats for this namespace */
  async getConnectionStats() {
    const sockets = await this.server.fetchSockets();
    const adapter = this.server.sockets?.adapter as any;
    return { total: sockets.length, rooms: adapter?.rooms?.size ?? 0 };
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
