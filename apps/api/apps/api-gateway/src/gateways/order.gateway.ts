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
import { WsTrackingGrantService } from '../services/ws-tracking-grant.service';
import { WsDdosGuard } from '@app/security';
import { UserRole } from '@app/common';
import { authenticateWsClient } from './ws-auth.util';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderStatusPayload {
  orderId: string;
  status: OrderStatus;
  message?: string;
  estimatedTime?: number; // minutes
  partnerId?: string;
  partnerName?: string;
  partnerPhone?: string;
  partnerLocation?: { lat: number; lng: number };
  timestamp: string;
}

/**
 * OrderGateway — Real-time order lifecycle events for KARTSEEK.
 *
 * Namespace: /orders
 *
 * Room conventions:
 *  - `order:<orderId>`   — all parties tracking an order
 *  - `seller:<sellerId>` — seller's live incoming order feed
 *  - `admin:orders`      — admin live order dashboard
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
  namespace: '/orders',
  transports: ['websocket', 'polling'],
})
@UseGuards(WsDdosGuard)
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrderGateway.name);

  constructor(
    private readonly redis: RedisService,
    private readonly wsDdosGuard: WsDdosGuard,
    private readonly trackingGrants: WsTrackingGrantService,
  ) {}

  // ── Connection Lifecycle ─────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    // ── JWT Auth ──
    const user = authenticateWsClient(client, 'OrderGateway');
    if (!user) return;

    // ── DDoS check ──
    const allowed = await this.wsDdosGuard.validateConnection(client);
    if (!allowed) return;

    const userId = user.id;
    const role = user.role?.toLowerCase() || 'customer';

    await this.redis.hset('ws:orders:sessions', client.id, JSON.stringify({
      userId,
      role,
      connectedAt: new Date().toISOString(),
    }));

    // Auto-join role-based rooms.
    //
    // Matched against the whole UserRole enum, not the two bare strings this
    // used to compare. `super_admin` — the role the Super Admin Panel actually
    // signs in with — is not `'admin'`, so it fell through both branches and
    // never joined `admin:orders`: the live order dashboard was empty for
    // precisely the account it was built for. The three vertical seller roles
    // (`restaurant_seller`, `grocery_seller`, `pharmacy_seller`) missed
    // `seller:<id>` the same way.
    const ADMIN_ROLES = new Set<string>([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    const SELLER_ROLES = new Set<string>([
      UserRole.SELLER, UserRole.RESTAURANT_SELLER,
      UserRole.GROCERY_SELLER, UserRole.PHARMACY_SELLER,
    ]);

    if (ADMIN_ROLES.has(role)) {
      client.join('admin:orders');
      this.logger.log(`👑 Admin ${userId} (${role}) joined live order dashboard`);
    } else if (SELLER_ROLES.has(role)) {
      client.join(`seller:${userId}`);
      this.logger.log(`🏪 Seller ${userId} (${role}) connected to order feed`);
    }

    client.emit('orders_connected', {
      socketId: client.id,
      userId,
      role,
      message: 'Connected to KARTSEEK Order Hub',
    });
  }

  async handleDisconnect(client: Socket) {
    await this.wsDdosGuard.handleDisconnection(client);
    await this.redis.hdel('ws:orders:sessions', client.id);
    this.logger.log(`❌ Orders socket disconnected: ${client.id}`);

    // Clean up all event listeners to prevent memory leaks
    client.removeAllListeners();
    // Force disconnect to free socket resources
    client.disconnect(true);
  }

  // ── Room Subscriptions ────────────────────────────────────────────────────

  /** Customer/delivery partner joins an order's real-time room */
  /**
   * Join an order's live room.
   *
   * The room is named by an id the client supplies, and this used to join it on
   * request. The connection is JWT-authenticated, so the caller had to be
   * *somebody* — but any signed-in customer could pass any order id and start
   * receiving that order's `order_status` and `partner_location` broadcasts,
   * which carry the delivery partner's name, phone number and live coordinates.
   * Verified: customer B emitted `track_order` with customer A's order number
   * and got back `tracking_started`.
   *
   * Staff — sellers, delivery partners and admins — legitimately watch orders
   * they did not place, and are already role-checked at connection. A customer
   * needs a grant, which `WsTrackingGrantService` issues only downstream of an
   * HTTP route that has verified they own the order.
   */
  @SubscribeMessage('track_order')
  async handleTrackOrder(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.orderId) {
      client.emit('error', { message: 'orderId is required' });
      return;
    }

    // Read the identity off the socket, not out of Redis.
    //
    // `authenticateWsClient` attaches `client.user` synchronously during
    // `handleConnection`; the `ws:orders:sessions` write that follows it is
    // async. A client that emits on its own `connect` event — which is exactly
    // what `useOrderTracking` does — can arrive before that write lands and be
    // told "Not authenticated" for a perfectly valid session.
    const user = (client as unknown as { user?: { id?: string; role?: string } }).user;
    if (!user?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }
    const session = { userId: user.id, role: user.role };
    const role = String(session.role ?? '').toLowerCase();

    const STAFF = new Set<string>([
      UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SELLER,
      UserRole.RESTAURANT_SELLER, UserRole.GROCERY_SELLER, UserRole.PHARMACY_SELLER,
      'delivery',
    ]);

    if (!STAFF.has(role)) {
      const permitted = await this.trackingGrants.has(data.orderId, session.userId);
      if (!permitted) {
        // Refused rather than silently ignored: a client that believes it is
        // tracking and receives nothing looks like a dead order, not a denial.
        this.logger.warn(
          `Refused order tracking: user ${session.userId} (${role}) has no grant for ${data.orderId}`,
        );
        client.emit('error', { message: 'You may only track your own orders' });
        return;
      }
    }

    const room = `order:${data.orderId}`;
    client.join(room);
    this.logger.log(`📦 ${client.id} tracking order: ${data.orderId}`);

    // Send cached last-known status
    const cached = await this.redis.getJSON<OrderStatusPayload>(`order:status:${data.orderId}`);
    if (cached) {
      client.emit('order_status', cached);
    }

    client.emit('tracking_started', { orderId: data.orderId, room });
  }

  /** Stop tracking an order */
  @SubscribeMessage('stop_tracking')
  handleStopTracking(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`order:${data.orderId}`);
    client.emit('tracking_stopped', { orderId: data.orderId });
  }

  // ── Status Updates (typically emitted by seller/delivery services) ───────

  /**
   * Seller or delivery service emits order status change.
   * Also broadcasts to admin dashboard.
   */
  @SubscribeMessage('update_order_status')
  async handleUpdateOrderStatus(
    @MessageBody() data: {
      orderId: string;
      status: OrderStatus;
      message?: string;
      estimatedTime?: number;
      partnerId?: string;
      partnerName?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const sessionRaw = await this.redis.hget('ws:orders:sessions', client.id);
    if (!sessionRaw) return;

    const session = JSON.parse(sessionRaw);
    // Only sellers/delivery/admin can update status
    if (!['seller', 'delivery', 'admin'].includes(session.role)) {
      client.emit('error', { message: 'Insufficient permissions to update order status' });
      return;
    }

    await this.pushOrderUpdate(data.orderId, data.status, {
      message: data.message,
      estimatedTime: data.estimatedTime,
      partnerId: data.partnerId,
      partnerName: data.partnerName,
    });

    return { success: true };
  }

  /** Delivery partner emits live location while on a delivery */
  @SubscribeMessage('delivery_location_update')
  async handleDeliveryLocation(
    @MessageBody() data: { orderId: string; partnerId: string; lat: number; lng: number; heading?: number },
    @ConnectedSocket() client: Socket,
  ) {
    // The sibling `update_order_status` role-checks; this one wrote to the GEO index and broadcast a courier position from any caller.

    // Only the party fulfilling this may announce it. `OrderGateway`'s own
    // `update_order_status` has always role-checked; these did not, so any
    // signed-in customer could drive another customer's order, ride or price.
    const actor = (client as unknown as { user?: { id?: string; role?: string } }).user;
    const FULFILLERS = ['admin', 'super_admin', 'seller', 'restaurant_seller',
      'grocery_seller', 'pharmacy_seller', 'hotel_owner', 'delivery', 'driver', 'vendor'];
    if (!actor?.id || !FULFILLERS.includes(String(actor.role ?? '').toLowerCase())) {
      client.emit('error', { message: 'Only a delivery partner may report a location' });
      return;
    }

    // Store in GEO index
    await this.redis.geoadd('delivery:locations', data.lng, data.lat, data.partnerId);

    const payload = {
      partnerId: data.partnerId,
      lat: data.lat,
      lng: data.lng,
      heading: data.heading ?? 0,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to customer tracking this order
    this.server.to(`order:${data.orderId}`).emit('partner_location', payload);

    // Cache latest location
    await this.redis.setJSON(`delivery:location:${data.orderId}`, payload, 3600);
  }

  // ── Server-Side Push Methods (called from HTTP controllers) ──────────────

  /** Push an order status update to all listeners (customer, admin, seller) */
  async pushOrderUpdate(orderId: string, status: OrderStatus, details: Partial<OrderStatusPayload> = {}) {
    const payload: OrderStatusPayload = {
      orderId,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    };

    // Cache for reconnecting clients
    await this.redis.setJSON(`order:status:${orderId}`, payload, 86400);

    // Broadcast to order room (customer + delivery partner)
    this.server.to(`order:${orderId}`).emit('order_status', payload);

    // Broadcast to admin live dashboard
    this.server.to('admin:orders').emit('order_event', {
      event: 'status_change',
      ...payload,
    });

    this.logger.log(`📦 Order ${orderId} → ${status}`);

    return payload;
  }

  /** Push a new incoming order notification to a seller's room */
  async notifyNewOrder(sellerId: string, order: {
    orderId: string;
    customerName: string;
    items: number;
    total: number;
    type: 'marketplace' | 'grocery' | 'restaurant' | 'pharmacy';
  }) {
    const payload = {
      event: 'new_order',
      ...order,
      timestamp: new Date().toISOString(),
    };

    this.server.to(`seller:${sellerId}`).emit('new_order', payload);
    this.server.to('admin:orders').emit('order_event', payload);

    this.logger.log(`🛍️ New order for seller ${sellerId}: ${order.orderId}`);
    return payload;
  }

  /** Get real-time stats for admin dashboard */
  async getActiveOrdersCount(): Promise<number> {
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
