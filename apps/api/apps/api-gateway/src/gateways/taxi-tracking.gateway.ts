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
import { WsTrackingGrantService } from '../services/ws-tracking-grant.service';

const DRIVER_GEO_KEY = 'drivers:locations';
const DRIVER_META_KEY = 'drivers:meta';

/** Critical statuses that require delivery acknowledgment. */
const ACK_REQUIRED_STATUSES = new Set(['DRIVER_ASSIGNED', 'ARRIVED', 'COMPLETED', 'CANCELLED']);
const ACK_TIMEOUT_MS = 5000;
const ACK_MAX_RETRIES = 3;

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://*.kartseek.com',
    ],
    credentials: true,
  },
  namespace: '/taxi',
  transports: ['websocket', 'polling'],
})
@UseGuards(WsDdosGuard)
export class TaxiTrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('TaxiTrackingGateway');

  // In-memory map: driverId → Set<socketId> for fast targeted dispatch
  private driverSockets = new Map<string, Set<string>>();

  constructor(
    private readonly redis: RedisService,
    private readonly wsDdosGuard: WsDdosGuard,
    private readonly trackingGrants: WsTrackingGrantService,
  ) {}

  async handleConnection(client: Socket) {
    // ── JWT Auth ──
    const user = authenticateWsClient(client, 'TaxiTrackingGateway');
    if (!user) return;

    const allowed = await this.wsDdosGuard.validateConnection(client);
    if (!allowed) return;
    (client as any).user = user;
    this.logger.log(`Client Connected: ${client.id} [user=${user.id}]`);
  }

  async handleDisconnect(client: Socket) {
    await this.wsDdosGuard.handleDisconnection(client);
    this.logger.log(`Client Disconnected: ${client.id}`);

    // Clean up driver data if they were tracking
    const driverId = await this.redis.hget('socket:driver', client.id);
    if (driverId) {
      await this.redis.geodel(DRIVER_GEO_KEY, driverId);
      await this.redis.hdel(DRIVER_META_KEY, driverId);
      await this.redis.hdel('socket:driver', client.id);

      // Remove from in-memory map
      const sockets = this.driverSockets.get(driverId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.driverSockets.delete(driverId);
      }

      this.logger.log(`Driver ${driverId} removed from tracking`);
    }

    // 🔧 FIX: Clean up all event listeners to prevent memory leaks
    client.removeAllListeners();
    // Force disconnect to free socket resources
    client.disconnect(true);
  }

  // ── Driver Registration ──────────────────────────────────────────────────

  /**
   * Driver's partner app calls this on connect to register their socket for dispatch.
   * This enables the server to push ride requests directly to specific drivers.
   */
  @SubscribeMessage('joinAsDriver')
  async handleJoinAsDriver(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string },
  ) {
    const { driverId } = data;
    if (!driverId) return;

    // Map socket → driver in Redis
    await this.redis.hset('socket:driver', client.id, driverId);

    // Map driver → sockets in memory
    if (!this.driverSockets.has(driverId)) {
      this.driverSockets.set(driverId, new Set());
    }
    this.driverSockets.get(driverId)!.add(client.id);

    // Join driver-specific room for targeted dispatch
    client.join(`driver_${driverId}`);

    this.logger.log(`Driver ${driverId} registered with socket ${client.id}`);
  }

  // ── Driver Location Updates ──────────────────────────────────────────────

  /**
   * Driver mobile app emits their live GPS coordinates every 5 seconds.
   * Stored in Redis GEO set for proximity queries.
   */
  @SubscribeMessage('updateDriverLocation')
  async handleDriverLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string; lat: number; lng: number; heading: number; sequenceNumber?: number; rideId?: string },
  ) {
    // 1. Store driver location in Redis GEO set
    await this.redis.geoadd(DRIVER_GEO_KEY, data.lng, data.lat, data.driverId);

    // 2. Store driver metadata (heading, timestamp) in Redis hash
    await this.redis.hset(DRIVER_META_KEY, data.driverId, JSON.stringify({
      heading: data.heading,
      timestamp: new Date().toISOString(),
      rideId: data.rideId || null,
    }));

    // 3. Map socket ID → driver ID for cleanup on disconnect
    await this.redis.hset('socket:driver', client.id, data.driverId);

    // 4. Update in-memory driver→socket mapping
    if (!this.driverSockets.has(data.driverId)) {
      this.driverSockets.set(data.driverId, new Set());
    }
    this.driverSockets.get(data.driverId)!.add(client.id);

    // 5. Broadcast to specific customer if they are on an active ride
    if (data.rideId) {
      this.server.to(`ride_${data.rideId}`).emit('liveRideTracking', {
        driverId: data.driverId,
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        sequenceNumber: data.sequenceNumber || 0,
        timestamp: new Date().toISOString(),
      });
      // Also emit generic event for map view
      this.server.to(`ride_${data.rideId}`).emit('taxi_location_updated', {
        driverId: data.driverId,
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        sequenceNumber: data.sequenceNumber || 0,
        timestamp: new Date().toISOString(),
      });
    }

    // 6. Broadcast nearby drivers to the home screen
    try {
      const nearbyDrivers = await this.redis.georadius(DRIVER_GEO_KEY, data.lng, data.lat, 10);
      this.server.emit('nearbyDrivers', nearbyDrivers.map(d => ({
        driverId: d.member,
        lat: d.lat,
        lng: d.lng,
        dist: d.dist,
      })));
    } catch {
      // Redis GEO not available — skip broadcast
    }
  }

  // ── Customer Tracking Room ───────────────────────────────────────────────

  /**
   * Customer joins a specific ride room to listen for their assigned driver's location.
   */
  /**
   * Watch a ride's live position.
   *
   * The room was named by an id the client passed in and joined unconditionally,
   * so any signed-in account could stream a stranger's live coordinates by
   * naming their ride. Drivers and support legitimately watch rides they are not
   * in; a rider needs the grant that `GET /taxi/ride/:rideId` issues once it has
   * confirmed the ride is theirs.
   */
  @SubscribeMessage('joinRideTracking')
  async handleJoinRideTracking(@ConnectedSocket() client: Socket, @MessageBody() rideId: string) {
    if (!rideId) return;
    const user = (client as unknown as { user?: { id?: string; role?: string } }).user;
    if (!user?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const STAFF = ['admin', 'super_admin', 'driver', 'delivery', 'vendor'];
    if (!STAFF.includes(String(user.role ?? '').toLowerCase())
      && !(await this.trackingGrants.has(rideId, user.id))) {
      client.emit('error', { message: 'You may only track your own rides' });
      return;
    }

    client.join(`ride_${rideId}`);
    this.logger.log(`Client ${client.id} joined tracking room: ride_${rideId}`);
  }

  // ── Nearby Drivers ───────────────────────────────────────────────────────

  /**
   * Find nearest available drivers within a radius (km) of a customer's location.
   */
  @SubscribeMessage('findNearbyDrivers')
  async handleFindNearbyDrivers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number; radiusKm?: number },
  ) {
    const radius = data.radiusKm || 5;
    const nearby = await this.redis.georadius(DRIVER_GEO_KEY, data.lng, data.lat, radius);

    // FIX 2: Batch-fetch all driver metadata in 1 Redis call (HMGET)
    // instead of N individual hget() calls.
    const driverIds = nearby.map(d => d.member);
    const metaRaw = driverIds.length > 0
      ? await this.redis.hmget(DRIVER_META_KEY, driverIds)
      : [];

    const enriched = nearby.map((d, i) => {
      const meta = metaRaw[i] ? JSON.parse(metaRaw[i]!) : {};
      return {
        driverId: d.member,
        lat: d.lat,
        lng: d.lng,
        distKm: d.dist,
        heading: meta.heading ?? 0,
        isOnRide: !!meta.rideId,
      };
    });

    client.emit('nearbyDriversResult', enriched);
  }

  // ── Dispatch Methods (called from TaxiController) ────────────────────────

  /**
   * Dispatch a new ride request to specific online drivers.
   * Called directly by the TaxiController after creating a ride.
   */
  dispatchRideToDrivers(driverIds: string[], rideData: Record<string, any>) {
    let dispatched = 0;
    for (const driverId of driverIds) {
      // Emit to driver-specific room (joined via joinAsDriver)
      this.server.to(`driver_${driverId}`).emit('incoming_ride_request', {
        rideId: rideData.id,
        customerId: rideData.customerId,
        customerName: rideData.customerName,
        pickupLat: rideData.pickupLat,
        pickupLng: rideData.pickupLng,
        dropLat: rideData.dropLat,
        dropLng: rideData.dropLng,
        pickupAddress: rideData.pickupAddress,
        dropAddress: rideData.dropAddress,
        vehicleType: rideData.vehicleType,
        fareEstimate: rideData.fareEstimate,
        timestamp: new Date().toISOString(),
      });
      dispatched++;
    }
    this.logger.log(`📤 Dispatched ride ${rideData.id} to ${dispatched} driver(s)`);
    return dispatched;
  }

  /**
   * Notify the customer that a driver has accepted their ride.
   * Uses ack callback — retries up to 3 times if no acknowledgment within 5s.
   */
  notifyRideAccepted(rideId: string, driverData: Record<string, any>) {
    const payload = {
      rideId,
      ...driverData,
      timestamp: new Date().toISOString(),
    };
    this.emitWithAck(`ride_${rideId}`, 'ride_driver_assigned', payload, `ride_accepted:${rideId}`);
    this.logger.log(`✅ Notified ride ${rideId}: driver assigned (with ack)`);
  }

  /**
   * Notify all ride participants of a status change.
   * Critical statuses (ARRIVED, COMPLETED) use ack callbacks with retry.
   */
  notifyRideStatusChanged(rideId: string, status: string, extra?: Record<string, any>) {
    const payload = {
      rideId,
      status,
      ...extra,
      timestamp: new Date().toISOString(),
    };

    if (ACK_REQUIRED_STATUSES.has(status)) {
      this.emitWithAck(`ride_${rideId}`, 'ride_status_changed', payload, `ride_status:${rideId}:${status}`);
    } else {
      this.server.to(`ride_${rideId}`).emit('ride_status_changed', payload);
    }
    this.logger.log(`🔄 Ride ${rideId} status → ${status}`);
  }

  /**
   * Notify drivers and customer that a ride was cancelled.
   */
  notifyRideCancelled(rideId: string, cancelledBy: string, reason: string, driverIds?: string[]) {
    const payload = {
      rideId,
      status: 'CANCELLED',
      cancelledBy,
      reason,
      timestamp: new Date().toISOString(),
    };

    // Notify customer room (with ack)
    this.emitWithAck(`ride_${rideId}`, 'ride_status_changed', payload, `ride_cancelled:${rideId}`);

    // Notify dispatched drivers
    if (driverIds) {
      for (const driverId of driverIds) {
        this.server.to(`driver_${driverId}`).emit('ride_status_changed', payload);
      }
    }
    this.logger.log(`❌ Ride ${rideId} cancelled by ${cancelledBy}`);
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

        const acked = await ackPromise;
        if (acked) {
          this.logger.log(`📩 Ack received for ${logLabel} from ${s.id}`);
        } else if (attempt < ACK_MAX_RETRIES) {
          this.logger.warn(`⏱️ Ack timeout for ${logLabel} from ${s.id} — retry ${attempt + 1}/${ACK_MAX_RETRIES}`);
          // Retry only this specific socket
          s.emit(event, payload);
        } else {
          this.logger.error(`🚨 Ack failed for ${logLabel} from ${s.id} after ${ACK_MAX_RETRIES} retries`);
          // Track delivery failures in Redis for monitoring
          await this.redis.incr(`stats:ws:ack_failures:${new Date().toISOString().slice(0, 10)}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`Ack emission error for ${logLabel}: ${err.message}`);
    }
  }
}
