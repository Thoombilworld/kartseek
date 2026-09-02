import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { WsDdosGuard } from '@app/security';
import { authenticateWsClient } from './gateways/ws-auth.util';
import { WsTrackingGrantService } from './services/ws-tracking-grant.service';

/**
 * TrackingGateway — Unified real-time tracking hub for all KARTSEEK services.
 *
 * Namespace: /tracking
 * Handles: Taxi rides, grocery/restaurant delivery, order status updates,
 *          and live driver/rider location broadcasting.
 *
 * All location data is persisted in Redis GEO sets for proximity queries.
 * Session metadata (user type, active rooms) stored in Redis hashes.
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
  namespace: 'tracking',
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling'],
})
@UseGuards(WsDdosGuard)
export class TrackingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  constructor(
    private readonly redis: RedisService,
    private readonly wsDdosGuard: WsDdosGuard,
    private readonly trackingGrants: WsTrackingGrantService,
  ) {}

  afterInit() {
    this.logger.log('🔌 TrackingGateway initialized — ready for connections');
  }

  // ── Connection Lifecycle ─────────────────────────────────────────────────

  /**
   * Accept a connection, once the caller has proved who they are.
   *
   * This namespace verified nothing. It read `userId` and `userType` straight
   * out of `client.handshake.query` — the client declaring its own identity —
   * and every other gateway in this folder calls `authenticateWsClient`.
   *
   * The consequence was not theoretical. An anonymous socket, carrying no token
   * of any kind, could connect and then join `order_<id>`, `chat_<id>` and
   * `trip_<id>` rooms by naming them; verified by connecting with
   * `{ userId: 'i-am-anyone' }` and receiving three `room_joined`
   * acknowledgements, one of them for a live taxi GPS room.
   *
   * The identity now comes from the JWT and the query string is ignored.
   */
  async handleConnection(client: Socket) {
    // ── DDoS: validate connection before any other logic ──
    const allowed = await this.wsDdosGuard.validateConnection(client);
    if (!allowed) return;

    const user = authenticateWsClient(client, 'TrackingGateway');
    if (!user) return;

    const userId = user.id;
    const userType = (user.role || 'customer').toLowerCase();

    this.logger.log(`📱 Connected: ${client.id} [user=${userId || 'anonymous'}, type=${userType}]`);

    // Track active session in Redis
    if (userId) {
      await this.redis.hset('ws:sessions', client.id, JSON.stringify({
        userId,
        userType,
        connectedAt: new Date().toISOString(),
      }));
      await this.redis.sadd(`ws:user:${userId}`, client.id);
    }

    // Send connection acknowledgment
    client.emit('connected', {
      socketId: client.id,
      serverTime: new Date().toISOString(),
      message: 'Connected to KARTSEEK Real-Time Hub',
    });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`❌ Disconnected: ${client.id}`);

    // Clean up session data
    const sessionRaw = await this.redis.hget('ws:sessions', client.id);
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      // Remove from user's socket set
      const userSockets = await this.redis.smembers(`ws:user:${session.userId}`);
      const updatedSockets = userSockets.filter(s => s !== client.id);
      if (updatedSockets.length === 0) {
        await this.redis.del(`ws:user:${session.userId}`);
      }

      // If driver, remove from GEO tracking
      if (session.userType === 'driver') {
        await this.redis.geodel('drivers:locations', session.userId);
        await this.redis.hdel('drivers:meta', session.userId);
        this.logger.log(`🚗 Driver ${session.userId} removed from live tracking`);
      }

      // If delivery partner, remove from GEO tracking
      if (session.userType === 'delivery') {
        await this.redis.geodel('delivery:locations', session.userId);
        await this.redis.hdel('delivery:meta', session.userId);
        this.logger.log(`📦 Delivery partner ${session.userId} removed from tracking`);
      }
    }
    await this.redis.hdel('ws:sessions', client.id);
  }

  // ── Taxi: Driver Location Updates ────────────────────────────────────────

  @SubscribeMessage('update_taxi_location')
  async handleTaxiLocationUpdate(
    @MessageBody() data: { tripId: string; driverId: string; lat: number; lng: number; heading: number; speed: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Verified before this guard: a plain customer could move any driver pin.

    // Only the party fulfilling this may announce it. `OrderGateway`'s own
    // `update_order_status` has always role-checked; these did not, so any
    // signed-in customer could drive another customer's order, ride or price.
    const actor = (client as unknown as { user?: { id?: string; role?: string } }).user;
    const FULFILLERS = ['admin', 'super_admin', 'seller', 'restaurant_seller',
      'grocery_seller', 'pharmacy_seller', 'hotel_owner', 'delivery', 'driver', 'vendor'];
    if (!actor?.id || !FULFILLERS.includes(String(actor.role ?? '').toLowerCase())) {
      client.emit('error', { message: 'Only a driver may report a vehicle position' });
      return;
    }

    // Store in Redis GEO
    await this.redis.geoadd('drivers:locations', data.lng, data.lat, data.driverId);
    await this.redis.hset('drivers:meta', data.driverId, JSON.stringify({
      heading: data.heading,
      speed: data.speed,
      tripId: data.tripId,
      lastUpdate: new Date().toISOString(),
    }));

    // Broadcast to customer tracking this trip
    this.server.to(`trip_${data.tripId}`).emit('taxi_location_updated', {
      driverId: data.driverId,
      lat: data.lat,
      lng: data.lng,
      heading: data.heading,
      speed: data.speed,
      timestamp: new Date().toISOString(),
    });

    // Track update count for analytics
    await this.redis.incr(`stats:taxi:updates:${new Date().toISOString().slice(0, 10)}`);
  }

  // ── Taxi: Ride Request Dispatch ──────────────────────────────────────────

  @SubscribeMessage('ride_request_to_driver')
  async handleRideRequestToDriver(
    @MessageBody() data: {
      rideId: string; driverId: string;
      pickupLat: number; pickupLng: number;
      dropLat?: number; dropLng?: number;
      pickupAddress?: string; dropAddress?: string;
      vehicleType: string; fareEstimate?: number;
      customerId: string; customerName?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Only the party fulfilling this may announce it. `OrderGateway`'s own
    // `update_order_status` has always role-checked; these did not, so any
    // signed-in customer could drive another customer's order, ride or price.
    const actor = (client as unknown as { user?: { id?: string; role?: string } }).user;
    const FULFILLERS = ['admin', 'super_admin', 'seller', 'restaurant_seller',
      'grocery_seller', 'pharmacy_seller', 'hotel_owner', 'delivery', 'driver', 'vendor'];
    if (!actor?.id || !FULFILLERS.includes(String(actor.role ?? '').toLowerCase())) {
      client.emit('error', { message: 'Only dispatch may offer a ride to a driver' });
      return;
    }

    // Send the ride request to the specific driver's socket connections
    const driverSockets = await this.redis.smembers(`ws:user:${data.driverId}`);
    if (driverSockets.length > 0) {
      for (const socketId of driverSockets) {
        this.server.to(socketId).emit('incoming_ride_request', {
          rideId: data.rideId,
          customerName: data.customerName || 'Customer',
          pickupLat: data.pickupLat,
          pickupLng: data.pickupLng,
          dropLat: data.dropLat,
          dropLng: data.dropLng,
          pickupAddress: data.pickupAddress,
          dropAddress: data.dropAddress,
          vehicleType: data.vehicleType,
          fareEstimate: data.fareEstimate,
          timestamp: new Date().toISOString(),
        });
      }
      this.logger.log(`📤 Ride request ${data.rideId} pushed to driver ${data.driverId}`);
    } else {
      this.logger.warn(`⚠️ Driver ${data.driverId} has no active socket connections`);
    }
  }

  @SubscribeMessage('ride_accepted')
  async handleRideAccepted(
    @MessageBody() data: {
      rideId: string; driverId: string; customerId: string;
      driverName: string; driverPhone?: string;
      driverLat: number; driverLng: number;
      vehicleType: string; vehiclePlate?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Only the party fulfilling this may announce it. `OrderGateway`'s own
    // `update_order_status` has always role-checked; these did not, so any
    // signed-in customer could drive another customer's order, ride or price.
    const actor = (client as unknown as { user?: { id?: string; role?: string } }).user;
    const FULFILLERS = ['admin', 'super_admin', 'seller', 'restaurant_seller',
      'grocery_seller', 'pharmacy_seller', 'hotel_owner', 'delivery', 'driver', 'vendor'];
    if (!actor?.id || !FULFILLERS.includes(String(actor.role ?? '').toLowerCase())) {
      client.emit('error', { message: 'Only a driver may accept a ride' });
      return;
    }

    // Notify the customer that a driver has accepted
    const customerSockets = await this.redis.smembers(`ws:user:${data.customerId}`);
    for (const socketId of customerSockets) {
      this.server.to(socketId).emit('ride_driver_assigned', {
        rideId: data.rideId,
        driverId: data.driverId,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        driverLat: data.driverLat,
        driverLng: data.driverLng,
        vehicleType: data.vehicleType,
        vehiclePlate: data.vehiclePlate,
        timestamp: new Date().toISOString(),
      });
    }

    // Also broadcast to the trip tracking room
    this.server.to(`trip_${data.rideId}`).emit('ride_status_changed', {
      rideId: data.rideId,
      status: 'DRIVER_ASSIGNED',
      driverId: data.driverId,
      driverName: data.driverName,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`✅ Ride ${data.rideId} accepted by ${data.driverId} — customer notified`);
  }

  @SubscribeMessage('ride_status_update')
  async handleRideStatusUpdate(
    @MessageBody() data: {
      rideId: string; status: string;
      driverId?: string; customerId?: string;
      details?: Record<string, any>;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Only the party fulfilling this may announce it. `OrderGateway`'s own
    // `update_order_status` has always role-checked; these did not, so any
    // signed-in customer could drive another customer's order, ride or price.
    const actor = (client as unknown as { user?: { id?: string; role?: string } }).user;
    const FULFILLERS = ['admin', 'super_admin', 'seller', 'restaurant_seller',
      'grocery_seller', 'pharmacy_seller', 'hotel_owner', 'delivery', 'driver', 'vendor'];
    if (!actor?.id || !FULFILLERS.includes(String(actor.role ?? '').toLowerCase())) {
      client.emit('error', { message: 'Only a driver may change a ride status' });
      return;
    }

    // Broadcast to everyone tracking this ride
    this.server.to(`trip_${data.rideId}`).emit('ride_status_changed', {
      rideId: data.rideId,
      status: data.status,
      driverId: data.driverId,
      ...data.details,
      timestamp: new Date().toISOString(),
    });

    // If customer ID provided, also push to their notification channel
    if (data.customerId) {
      const customerSockets = await this.redis.smembers(`ws:user:${data.customerId}`);
      for (const socketId of customerSockets) {
        this.server.to(socketId).emit('ride_status_changed', {
          rideId: data.rideId,
          status: data.status,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /** Server-side: Push a ride request to a specific driver */
  async pushRideRequestToDriver(driverId: string, rideData: any): Promise<boolean> {
    const driverSockets = await this.redis.smembers(`ws:user:${driverId}`);
    if (driverSockets.length === 0) return false;
    for (const socketId of driverSockets) {
      this.server.to(socketId).emit('incoming_ride_request', {
        ...rideData,
        timestamp: new Date().toISOString(),
      });
    }
    return true;
  }

  /** Server-side: Broadcast ride status to customer */
  async pushRideStatusToCustomer(customerId: string, rideId: string, status: string, details?: any): Promise<void> {
    this.server.to(`trip_${rideId}`).emit('ride_status_changed', {
      rideId, status, ...details,
      timestamp: new Date().toISOString(),
    });
    const customerSockets = await this.redis.smembers(`ws:user:${customerId}`);
    for (const socketId of customerSockets) {
      this.server.to(socketId).emit('ride_status_changed', {
        rideId, status, ...details,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ── Delivery: Partner Location Updates ───────────────────────────────────

  @SubscribeMessage('update_delivery_location')
  async handleDeliveryLocationUpdate(
    @MessageBody() data: { orderId: string; partnerId: string; lat: number; lng: number; heading: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Store delivery partner location
    await this.redis.geoadd('delivery:locations', data.lng, data.lat, data.partnerId);
    await this.redis.hset('delivery:meta', data.partnerId, JSON.stringify({
      heading: data.heading,
      orderId: data.orderId,
      lastUpdate: new Date().toISOString(),
    }));

    // Broadcast to customer tracking this order
    this.server.to(`order_${data.orderId}`).emit('delivery_location_updated', {
      partnerId: data.partnerId,
      lat: data.lat,
      lng: data.lng,
      heading: data.heading,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Room Management ──────────────────────────────────────────────────────

  /**
   * Watch a trip's live position.
   *
   * The room is named by an id the client supplies, and this joined it on
   * request. Combined with the missing authentication above, anyone at all
   * could stream a stranger's live coordinates by guessing a trip id.
   *
   * Drivers and support staff legitimately watch trips they are not riding in.
   * A rider needs a grant, which `WsTrackingGrantService` issues only from an
   * HTTP route that has already checked they own the trip.
   */
  @SubscribeMessage('join_trip_tracking')
  async handleJoinTripTracking(
    @MessageBody() data: { tripId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.tripId) return;
    const user = (client as unknown as { user?: { id?: string; role?: string } }).user;
    if (!user?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }
    const STAFF = ['admin', 'super_admin', 'seller', 'restaurant_seller',
      'grocery_seller', 'pharmacy_seller', 'delivery', 'driver'];

    if (!STAFF.includes(String(user.role ?? '').toLowerCase())
      && !(await this.trackingGrants.has(data.tripId, user.id))) {
      client.emit('error', { message: 'You may only track your own trips' });
      return;
    }

    client.join(`trip_${data.tripId}`);
    this.logger.log(`👀 ${client.id} joined trip tracking: ${data.tripId}`);
    client.emit('room_joined', { room: `trip_${data.tripId}`, type: 'taxi' });
  }

  @SubscribeMessage('leave_trip_tracking')
  handleLeaveTripTracking(
    @MessageBody() data: { tripId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`trip_${data.tripId}`);
    this.logger.log(`🚪 ${client.id} left trip tracking: ${data.tripId}`);
  }

  /**
   * Watch an order's delivery.
   *
   * Named by a client-supplied id and joined on request, on a namespace that
   * verified nothing — so this was readable by an anonymous socket. Same
   * treatment as `OrderGateway.track_order`: staff may watch orders they did not
   * place, a customer needs a grant issued by an ownership-checked HTTP route.
   */
  @SubscribeMessage('join_order_tracking')
  async handleJoinOrderTracking(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.orderId) return;
    const user = (client as unknown as { user?: { id?: string; role?: string } }).user;
    if (!user?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }
    const STAFF = ['admin', 'super_admin', 'seller', 'restaurant_seller',
      'grocery_seller', 'pharmacy_seller', 'delivery', 'driver'];

    if (!STAFF.includes(String(user.role ?? '').toLowerCase())
      && !(await this.trackingGrants.has(data.orderId, user.id))) {
      client.emit('error', { message: 'You may only track your own orders' });
      return;
    }

    client.join(`order_${data.orderId}`);
    this.logger.log(`📦 ${client.id} joined order tracking: ${data.orderId}`);
    client.emit('room_joined', { room: `order_${data.orderId}`, type: 'delivery' });
  }

  @SubscribeMessage('leave_order_tracking')
  handleLeaveOrderTracking(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`order_${data.orderId}`);
  }

  // ── Order Status Updates ─────────────────────────────────────────────────

  @SubscribeMessage('order_status_update')
  async handleOrderStatusUpdate(
    @MessageBody() data: {
      orderId: string;
      status: 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
      message?: string;
      estimatedTime?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Verified: customer B wrote status "delivered" into customer A's cached order status, which is what the tracking screen replays.

    // Only the party fulfilling this may announce it. `OrderGateway`'s own
    // `update_order_status` has always role-checked; these did not, so any
    // signed-in customer could drive another customer's order, ride or price.
    const actor = (client as unknown as { user?: { id?: string; role?: string } }).user;
    const FULFILLERS = ['admin', 'super_admin', 'seller', 'restaurant_seller',
      'grocery_seller', 'pharmacy_seller', 'hotel_owner', 'delivery', 'driver', 'vendor'];
    if (!actor?.id || !FULFILLERS.includes(String(actor.role ?? '').toLowerCase())) {
      client.emit('error', { message: 'Only the fulfilling party may change an order status' });
      return;
    }

    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    // Persist latest status in Redis
    await this.redis.setJSON(`order:status:${data.orderId}`, payload, 86400); // 24h TTL

    // Broadcast to everyone in the order room
    this.server.to(`order_${data.orderId}`).emit('order_status_changed', payload);

    this.logger.log(`📋 Order ${data.orderId} → ${data.status}`);
  }

  // ── Find Nearby Drivers/Delivery Partners ────────────────────────────────

  @SubscribeMessage('find_nearby_drivers')
  async handleFindNearbyDrivers(
    @MessageBody() data: { lat: number; lng: number; radiusKm?: number; serviceType?: 'taxi' | 'delivery' },
    @ConnectedSocket() client: Socket,
  ) {
    const radius = data.radiusKm || 5;
    const geoKey = data.serviceType === 'delivery' ? 'delivery:locations' : 'drivers:locations';
    const metaKey = data.serviceType === 'delivery' ? 'delivery:meta' : 'drivers:meta';

    const nearby = await this.redis.georadius(geoKey, data.lng, data.lat, radius);

    // Enrich with metadata
    const enriched = await Promise.all(
      nearby.map(async (d) => {
        const metaRaw = await this.redis.hget(metaKey, d.member);
        const meta = metaRaw ? JSON.parse(metaRaw) : {};
        return {
          id: d.member,
          lat: d.lat,
          lng: d.lng,
          distKm: d.dist,
          heading: meta.heading ?? 0,
          speed: meta.speed ?? 0,
          isOnTrip: !!(meta.tripId || meta.orderId),
        };
      }),
    );

    client.emit('nearby_drivers_result', {
      serviceType: data.serviceType || 'taxi',
      count: enriched.length,
      drivers: enriched,
      searchRadius: radius,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Chat / Support Messages ──────────────────────────────────────────────

  /**
   * Refused, for the same reason `join_chat` below is.
   *
   * This wrote a message into `chat:<roomId>` and broadcast it as
   * `data.senderId` / `data.senderName` — both taken from the message body — so
   * a caller could post into any room under anybody's name. Its companion
   * `join_chat` on this namespace has no membership source to check against and
   * now refuses; leaving the write path open would let a caller keep poisoning
   * stored conversations that nobody can legitimately join here.
   *
   * `ChatGateway` on `/chat` is the wired implementation: it takes the sender
   * from the connection's token, and its rooms are authorised.
   */
  @SubscribeMessage('send_chat_message')
  async handleChatMessage(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.warn(`Refused send_chat_message for room ${data?.roomId}: no membership source on this namespace`);
    client.emit('error', {
      message: 'Chat is not available on this connection. Use the /chat namespace.',
    });
  }

  /**
   * Join a chat room.
   *
   * Any id, from any socket, with no membership check and — before the
   * authentication fix above — no login either. Chat carries whatever two
   * people said to each other.
   *
   * There is no membership record for these rooms anywhere in the codebase, so
   * there is nothing to check against. Rather than approximate one, the join is
   * refused: a chat room that cannot verify its members should not be handing
   * out its messages. `ChatGateway` on `/chat` keys its rooms to the caller's
   * own id and is the wired implementation.
   */
  @SubscribeMessage('join_chat')
  handleJoinChat(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.warn(`Refused chat join for room ${data?.roomId}: no membership source on this namespace`);
    client.emit('error', {
      message: 'Chat is not available on this connection. Use the /chat namespace.',
    });
  }

  // ── Notifications ────────────────────────────────────────────────────────

  /**
   * Subscribe to your own notifications.
   *
   * The room was named by `data.userId` — the caller saying whose notifications
   * it wanted — and the handler then replied with that user's *pending* ones. So
   * naming somebody else's id both subscribed to their future notifications and
   * dumped their queued ones, on a namespace that required no login at all.
   *
   * The id now comes from the token. There is no legitimate reason to subscribe
   * to another account's notifications, so the parameter is ignored entirely
   * rather than permission-checked.
   */
  @SubscribeMessage('subscribe_notifications')
  async handleSubscribeNotifications(
    @MessageBody() _data: { userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as unknown as { user?: { id?: string; role?: string } }).user;
    if (!user?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }
    const userId = user.id;

    client.join(`notifications_${userId}`);
    this.logger.log(`🔔 ${client.id} subscribed to notifications for user: ${userId}`);

    // Send any pending notifications
    const pending = await this.redis.getJSON<any[]>(`notifications:pending:${userId}`);
    if (pending && pending.length > 0) {
      client.emit('pending_notifications', pending);
      await this.redis.del(`notifications:pending:${userId}`);
    }
  }

  // ── Server-side push methods (called by other services) ──────────────────

  /** Push a notification to a specific user (all their connected devices) */
  async pushNotification(userId: string, notification: { title: string; body: string; type: string; data?: any }) {
    const payload = {
      id: `notif_${Date.now()}`,
      ...notification,
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.server.to(`notifications_${userId}`).emit('notification', payload);

    // If user is offline, queue in Redis
    const userSockets = await this.redis.smembers(`ws:user:${userId}`);
    if (userSockets.length === 0) {
      const pending = (await this.redis.getJSON<any[]>(`notifications:pending:${userId}`)) || [];
      pending.push(payload);
      await this.redis.setJSON(`notifications:pending:${userId}`, pending.slice(-50), 86400 * 7); // Keep 7 days
    }
  }

  /** Push an order status change to a specific order room */
  async pushOrderUpdate(orderId: string, status: string, details?: any) {
    this.server.to(`order_${orderId}`).emit('order_status_changed', {
      orderId,
      status,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  // ── End-to-End Latency Monitoring ─────────────────────────────────────────

  /**
   * Client emits `ping_latency` with their local timestamp.
   * Server echoes it back with server timestamp so the client
   * can compute the full round-trip latency.
   *
   * Also tracks daily latency stats in Redis for the health endpoint.
   */
  @SubscribeMessage('ping_latency')
  async handlePingLatency(
    @MessageBody() data: { clientTimestamp: number },
    @ConnectedSocket() client: Socket,
  ) {
    const serverTimestamp = Date.now();
    const serverProcessingMs = serverTimestamp - (data.clientTimestamp || serverTimestamp);

    // Echo back to client for RTT calculation
    client.emit('pong_latency', {
      clientTimestamp: data.clientTimestamp,
      serverTimestamp,
      serverProcessingMs,
    });

    // Track daily latency stats in Redis
    const today = new Date().toISOString().slice(0, 10);
    const latencyKey = `stats:ws:latency:${today}`;
    try {
      const raw = await this.redis.get(latencyKey);
      const stats = raw ? JSON.parse(raw) : { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 };
      stats.count++;
      stats.totalMs += serverProcessingMs;
      stats.minMs = Math.min(stats.minMs, serverProcessingMs);
      stats.maxMs = Math.max(stats.maxMs, serverProcessingMs);
      await this.redis.set(latencyKey, JSON.stringify(stats), 86400 * 2); // 2-day TTL
    } catch {
      // Redis latency tracking failure is non-critical
    }
  }

  /** Get count of currently connected clients and latency stats */
  async getConnectionStats(): Promise<{ total: number; rooms: number; latency?: { avgMs: number; minMs: number; maxMs: number; samples: number } }> {
    const sockets = await this.server.fetchSockets();

    // Fetch today's latency stats
    let latency: { avgMs: number; minMs: number; maxMs: number; samples: number } | undefined;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = await this.redis.get(`stats:ws:latency:${today}`);
      if (raw) {
        const stats = JSON.parse(raw);
        if (stats.count > 0) {
          latency = {
            avgMs: Math.round(stats.totalMs / stats.count),
            minMs: stats.minMs === Infinity ? 0 : stats.minMs,
            maxMs: stats.maxMs,
            samples: stats.count,
          };
        }
      }
    } catch {
      // Non-critical
    }

    return {
      total: sockets.length,
      rooms: this.server.sockets.adapter.rooms.size,
      latency,
    };
  }

  // ── Admin Real-Time Events ──────────────────────────────────────────────

  @SubscribeMessage('subscribe_admin')
  async handleSubscribeAdmin(
    @MessageBody() data: { adminId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join('admin_dashboard');
    this.logger.log(`👑 Admin ${data.adminId} subscribed to admin events via ${client.id}`);
    client.emit('admin_subscribed', {
      room: 'admin_dashboard',
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('unsubscribe_admin')
  async handleUnsubscribeAdmin(
    @ConnectedSocket() client: Socket,
  ) {
    client.leave('admin_dashboard');
  }

  /** Push a new order event to all admin dashboards */
  async pushAdminNewOrder(order: { id: string; module: string; amount: number; customer: string }) {
    this.server.to('admin_dashboard').emit('admin:new_order', {
      ...order,
      timestamp: new Date().toISOString(),
    });
  }

  /** Push a new seller registration to admin */
  async pushAdminNewSeller(seller: { id: string; name: string; module: string; status: string }) {
    this.server.to('admin_dashboard').emit('admin:new_seller', {
      ...seller,
      timestamp: new Date().toISOString(),
    });
  }

  /** Push a complaint alert to admin */
  async pushAdminComplaint(complaint: { id: string; module: string; severity: string; subject: string }) {
    this.server.to('admin_dashboard').emit('admin:complaint', {
      ...complaint,
      timestamp: new Date().toISOString(),
    });
  }

  /** Push a KYC pending event to admin */
  async pushAdminKycPending(kyc: { userId: string; name: string; type: string; module: string }) {
    this.server.to('admin_dashboard').emit('admin:kyc_pending', {
      ...kyc,
      timestamp: new Date().toISOString(),
    });
  }

  /** Push system health alert to admin */
  async pushAdminSystemAlert(alert: { service: string; status: 'warning' | 'critical'; message: string }) {
    this.server.to('admin_dashboard').emit('admin:system_alert', {
      ...alert,
      timestamp: new Date().toISOString(),
    });
  }
}
