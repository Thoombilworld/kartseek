import { Injectable } from '@nestjs/common';
import { RedisService } from '@app/redis';

/**
 * Permission to listen to one order's live tracking room.
 *
 * `OrderGateway.handleTrackOrder` joined `order:<orderId>` from an id the client
 * supplied and checked nothing. The socket is JWT-authenticated, so the caller
 * had to be *somebody* — but any signed-in customer could name any order id and
 * be placed in its room, then receive every `order_status` and
 * `partner_location` broadcast for it. Those payloads carry the delivery
 * partner's name, phone number and live coordinates.
 *
 * Verified before this existed: customer B emitted `track_order` with customer
 * A's order number and got back
 * `tracking_started { room: 'order:ORD-1786406081701-1875' }`.
 *
 * The gateway cannot resolve ownership itself. Orders live in four different
 * services — marketplace, restaurant, pharmacy and grocery — each with its own
 * table and its own idea of an order id, and the socket gateway holds a Redis
 * connection and nothing else. Rather than teach it about all four, the HTTP
 * routes that *already* perform an ownership check record that they did:
 * `grant()` is called once the customer has been shown the order, and
 * `has()` is what the socket join requires.
 *
 * A grant is therefore never issued except downstream of a real ownership check,
 * and it expires, so a shared or leaked order id does not confer permanent
 * access to a live feed.
 */
@Injectable()
export class WsTrackingGrantService {
  /**
   * Long enough to outlast a delivery the customer is watching, short enough
   * that access does not persist after they have stopped.
   */
  private static readonly TTL_SECONDS = 60 * 60 * 3;

  constructor(private readonly redis: RedisService) {}

  private key(orderId: string, userId: string): string {
    return `ws:track:${orderId}:${userId}`;
  }

  /** Record that `userId` has been shown `orderId` by an ownership-checked route. */
  async grant(orderId: string, userId: string | undefined): Promise<void> {
    if (!orderId || !userId) return;
    await this.redis.set(this.key(orderId, userId), '1', WsTrackingGrantService.TTL_SECONDS);
  }

  /** Whether `userId` may join `orderId`'s live room. */
  async has(orderId: string, userId: string | undefined): Promise<boolean> {
    if (!orderId || !userId) return false;
    return (await this.redis.get(this.key(orderId, userId))) !== null;
  }
}
