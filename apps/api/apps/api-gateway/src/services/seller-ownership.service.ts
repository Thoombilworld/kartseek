import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { RedisService } from '@app/redis';

/**
 * Does a user own a seller account?
 *
 * A seller account id is not the same thing as the id in a JWT — one login can
 * own a seller account whose id is unrelated to the user's own — so any room or
 * feed named `seller:<sellerId>` has to resolve that relationship rather than
 * assume it. This lived as a private method on `SellerGateway`; `ChatGateway`
 * needs the same answer for its `seller:<sellerId>:<customerId>` rooms, and two
 * copies of an ownership check are two things that can drift apart, so it is
 * shared.
 *
 * Fails closed: a lookup that errors or times out answers `false`, because the
 * caller is deciding whether to hand over another account's data.
 */
@Injectable()
export class SellerOwnershipService {
  private readonly logger = new Logger(SellerOwnershipService.name);

  /** Short — long enough to spare the RPC on a burst of joins, not long enough
   *  for a revoked owner to keep access for meaningful time. */
  private static readonly CACHE_SECONDS = 60;

  constructor(
    private readonly redis: RedisService,
    @Inject('SELLER_SERVICE') private readonly sellerClient: ClientProxy,
    @Inject('GROCERY_SERVICE') private readonly groceryClient: ClientProxy,
  ) {}

  async owns(userId: string | undefined, sellerId: string | undefined): Promise<boolean> {
    if (!userId || !sellerId) return false;

    const cacheKey = `seller-owner:${sellerId}`;
    try {
      const cached = await this.redis.get(cacheKey);
      // An empty string is a cached "this seller has no owner" — a real answer,
      // not a cache miss, so it must not fall through to another lookup.
      if (cached !== null && cached !== undefined) return cached !== '' && cached === userId;
    } catch {
      /* fall through to the authoritative lookup */
    }

    const ownerId = await this.resolveOwner(sellerId);
    await this.redis
      .set(cacheKey, ownerId ?? '', SellerOwnershipService.CACHE_SECONDS)
      .catch((): undefined => undefined);
    return !!ownerId && ownerId === userId;
  }

  /**
   * Resolve the owning user for a seller-room id.
   *
   * Marketplace is asked first, because most `seller:<id>` rooms are marketplace
   * seller ids. Grocery is asked second, because a grocery store id is *not* a
   * marketplace seller id: the grocery seller portal connects to `/seller` with
   * `userId=<groceryStoreId>` and the marketplace lookup has no such row, so it
   * returned no owner and every grocery seller was disconnected with FORBIDDEN
   * the moment they opened their dashboard. The grocery Kafka → WebSocket
   * bridges have therefore always published into a room nobody could join.
   *
   * A `null` from both is a genuine "nobody owns this", which the caller caches
   * and treats as denied.
   */
  private async resolveOwner(sellerId: string): Promise<string | null> {
    const lookups: Array<[string, ClientProxy, string, Record<string, string>]> = [
      ['marketplace', this.sellerClient, 'get_seller_owner', { sellerId }],
      ['grocery', this.groceryClient, 'get_grocery_store_owner', { storeId: sellerId }],
    ];

    for (const [label, client, cmd, payload] of lookups) {
      try {
        const res: any = await firstValueFrom(
          client.send({ cmd }, payload).pipe(timeout(3000)),
        );
        const ownerId = res?.ownerId ?? null;
        if (ownerId) return String(ownerId);
      } catch (err) {
        // One module being down must not deny a seller whose account lives in
        // the other, so this is logged and the next lookup still runs.
        this.logger.error(
          `Ownership lookup (${label}) failed for seller=${sellerId}: ${(err as Error).message}`,
        );
      }
    }
    return null;
  }
}
