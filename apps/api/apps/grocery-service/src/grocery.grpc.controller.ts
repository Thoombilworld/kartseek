import { Controller, UseFilters } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RpcAwareExceptionsFilter } from '@app/common';
import { GroceryService } from './grocery.service';
import { GroceryAdminService } from './admin.service';
import { CreateGroceryOrderDto } from './dto/create-order.dto';
import { GroceryPaymentMethod } from './entities/grocery-order.entity';
import type { GroceryStore } from './entities/grocery-store.entity';
import type { GroceryItem } from './entities/grocery-item.entity';

/**
 * GroceryService gRPC surface.
 *
 * `main.ts` has always bound a gRPC microservice on port 5010 advertising the
 * eight RPCs in `proto/grocery.proto`, and the gateway has always registered a
 * `GROCERY_GRPC` client for it — but not one `@GrpcMethod` existed. The port
 * accepted connections and answered UNIMPLEMENTED to every call, which is worse
 * than not listening at all: it looks like a working transport to anything
 * probing the estate, and the proto reads as a supported contract.
 *
 * `marketplace.grpc.controller.ts` is the house pattern for this and is what the
 * shape below follows. Handlers are thin: they translate between the proto
 * messages and the same service methods the TCP handlers call, so the two
 * transports cannot drift in behaviour.
 *
 * Two mapping rules worth stating, because the proto and the entities disagree
 * on both:
 *
 *  • Proto `ProductResponse` has a scalar `price`/`stock` while `grocery_items`
 *    stores an array of weight variants. The first variant is the headline —
 *    the same one the storefront tiles show — and the full set goes in `variants`.
 *  • Proto `PlaceGroceryOrderRequest.deliveryAddress` is a single string, while
 *    the DTO needs structured fields. It is parsed on commas, which is lossy, so
 *    gRPC order placement is best treated as a convenience path; the REST route
 *    takes the structured address.
 */
@UseFilters(RpcAwareExceptionsFilter)
@Controller()
export class GroceryGrpcController {
  constructor(
    private readonly svc: GroceryService,
    private readonly admin: GroceryAdminService,
  ) {}

  // ── Mappers ────────────────────────────────────────────────────────────────

  /** Entity → proto StoreResponse. `distKm` only when the caller gave a position. */
  private toStore(s: Omit<GroceryStore, 'ownerId'> & { productCount?: number }, distKm = 0) {
    return {
      id: s.id,
      name: s.name ?? '',
      slug: s.slug ?? '',
      address: s.address ?? '',
      location: { lat: Number(s.latitude ?? 0), lng: Number(s.longitude ?? 0) },
      distKm,
      // `isOpen` is whether the shop is taking orders now, which needs both the
      // lifecycle state and the online flag — `status` alone is not openness.
      isOpen: !!s.isOnline && s.status === 'APPROVED',
      openHours: s.openingHours ? JSON.stringify(s.openingHours) : '',
      rating: Number(s.rating ?? 0),
      ratingCount: Number(s.totalOrders ?? 0),
      imageUrl: s.logoUrl ?? '',
      deliveryTime: '',
      minOrder: Number(s.minOrderAmount ?? 0),
      deliveryFee: Number(s.deliveryFee ?? 0),
    };
  }

  private toProduct(p: GroceryItem) {
    const variants = (p.weightVariants as any[]) ?? [];
    const first = variants[0] ?? {};
    return {
      id: p.id,
      storeId: p.storeId,
      name: p.name ?? '',
      slug: '',
      category: p.category ?? '',
      description: p.description ?? '',
      // MRP is the list price and `price` the payable one; the proto's
      // `discountedPrice` is the latter.
      price: Number(first.mrp ?? first.price ?? 0),
      discountedPrice: Number(first.price ?? 0),
      unit: first.weight ?? '',
      stock: variants.reduce((sum, v) => sum + Number(v.stock ?? 0), 0),
      imageUrl: p.imageUrl ?? '',
      isAvailable: !!p.isAvailable,
      variants: variants.map((v, i) => ({
        id: v.sku ?? `${p.id}-${i}`,
        label: v.weight ?? '',
        price: Number(v.price ?? 0),
        weight: Number(String(v.weight ?? '').replace(/[^0-9.]/g, '')) || 0,
        stock: Number(v.stock ?? 0),
      })),
    };
  }

  // ── Catalogue ──────────────────────────────────────────────────────────────

  @GrpcMethod('GroceryService', 'GetCategories')
  async getCategories(req: { storeId?: string }) {
    // Store-scoped when asked for, otherwise the platform list — the proto's
    // optional `storeId` is what distinguishes the two.
    const res: any = req?.storeId
      ? await this.svc.getStoreCategoriesByStoreId(req.storeId)
      : await this.svc.getCategories();

    const categories = (res?.categories ?? []) as any[];
    return {
      data: categories.map((c) => ({
        id: c.id,
        name: c.name ?? '',
        slug: c.id,
        icon: c.emoji ?? '',
        imageUrl: c.imageUrl ?? '',
        itemCount: Number(c.productCount ?? 0),
      })),
    };
  }

  @GrpcMethod('GroceryService', 'GetNearbyStores')
  async getNearbyStores(req: { lat?: number; lng?: number; page?: number; limit?: number }) {
    const res = await this.svc.getStores(req?.lat, req?.lng, req?.page || 1, req?.limit || 20);
    return {
      data: (res.data as Omit<GroceryStore, 'ownerId'>[]).map((s) => this.toStore(s)),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @GrpcMethod('GroceryService', 'GetStoreById')
  async getStoreById(req: { storeId: string }) {
    const store = (await this.svc.getStoreById(req.storeId)) as any;
    return this.toStore(store);
  }

  @GrpcMethod('GroceryService', 'GetStoreProducts')
  async getStoreProducts(req: { storeId: string; category?: string; page?: number; limit?: number }) {
    // `getProducts` may return a Redis-cached payload, which is typed `unknown`
    // by `getJson`; the shape is the same either way.
    const res = (await this.svc.getProducts(
      req.storeId, req?.category, req?.page || 1, req?.limit || 30,
    )) as { data: GroceryItem[]; total: number; page: number; limit: number };
    return {
      data: (res.data as GroceryItem[]).map((p) => this.toProduct(p)),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @GrpcMethod('GroceryService', 'GetProductById')
  async getProductById(req: { productId: string }) {
    // The proto carries no storeId, which is exactly the store-agnostic lookup.
    const product = (await this.svc.getProductByIdAnyStore(req.productId)) as any;
    return this.toProduct(product);
  }

  @GrpcMethod('GroceryService', 'SearchProducts')
  async searchProducts(req: { query: string; storeId?: string; page?: number; limit?: number }) {
    const res = await this.svc.searchProducts(req.query, req?.storeId, undefined, req?.page || 1, req?.limit || 30);
    return {
      data: (res.results as GroceryItem[]).map((p) => this.toProduct(p)),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  @GrpcMethod('GroceryService', 'PlaceOrder')
  async placeOrder(req: {
    customerId: string;
    storeId: string;
    items: Array<{ productId: string; name?: string; quantity: number; price?: number; unit?: string }>;
    deliveryAddress: string;
    deliverySlotId?: string;
    paymentMethod?: string;
  }) {
    // "line1, line2, city, state, pincode" — the proto models the address as one
    // string, so this is the best that can be recovered from it.
    const parts = (req.deliveryAddress ?? '').split(',').map((p) => p.trim()).filter(Boolean);
    const dto: CreateGroceryOrderDto = {
      customerId: req.customerId,
      storeId: req.storeId,
      items: (req.items ?? []).map((i) => ({
        productId: i.productId,
        // `unit` carries the weight label; the service matches variants on it.
        weight: i.unit ?? '1 unit',
        quantity: Number(i.quantity) || 1,
      })),
      deliveryAddress: {
        line1: parts[0] ?? req.deliveryAddress ?? '',
        line2: parts.length > 3 ? parts[1] : undefined,
        city: parts.length > 2 ? parts[parts.length - 3] : (parts[1] ?? ''),
        state: parts.length > 2 ? parts[parts.length - 2] : undefined,
        pincode: parts[parts.length - 1] ?? '',
      },
      paymentMethod:
        (req.paymentMethod?.toUpperCase() as GroceryPaymentMethod) ?? GroceryPaymentMethod.COD,
    } as CreateGroceryOrderDto;

    const { order } = await this.svc.createGroceryOrder(dto);
    return {
      id: order.id,
      customerId: order.customerId,
      storeId: order.storeId,
      items: (order.items as any[]).map((i) => ({
        productId: i.productId,
        name: i.name ?? '',
        quantity: Number(i.quantity),
        price: Number(i.price),
        unit: i.weight ?? '',
        weight: 0,
      })),
      subtotal: Number(order.itemTotal),
      deliveryFee: Number(order.deliveryFee),
      totalAmount: Number(order.grandTotal),
      deliverySlot: order.deliverySlot ? JSON.stringify(order.deliverySlot) : '',
      status: order.status,
      placedAt: order.createdAt?.toISOString?.() ?? '',
      estimatedDelivery: order.estimatedDeliveryAt?.toISOString?.() ?? '',
    };
  }

  /**
   * Delivery slots for a store on a date.
   *
   * Built from the store's own opening hours and the platform's configured ETA
   * rather than invented: two-hour windows inside the shop's trading hours for
   * that weekday, with windows already past marked unavailable. A store with no
   * opening hours recorded returns no slots, which is the honest answer — the
   * customer then gets the default 45-minute estimate the order path applies.
   */
  @GrpcMethod('GroceryService', 'GetDeliverySlots')
  async getDeliverySlots(req: { storeId: string; date?: string }) {
    const store = (await this.svc.getStoreById(req.storeId)) as any;
    const date = req?.date || new Date().toISOString().split('T')[0];

    const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(date).getDay()];
    const hours = store?.openingHours?.[weekday];
    if (!hours?.open || !hours?.close) return { slots: [], date };

    const deliveryFee = Number(store?.deliveryFee ?? 0);
    const toHour = (hhmm: string) => Number(String(hhmm).split(':')[0]) || 0;
    const open = toHour(hours.open);
    const close = toHour(hours.close);

    const isToday = date === new Date().toISOString().split('T')[0];
    const nowHour = new Date().getHours();

    const slots = [];
    for (let h = open; h + 2 <= close; h += 2) {
      const label = `${String(h).padStart(2, '0')}:00 – ${String(h + 2).padStart(2, '0')}:00`;
      slots.push({
        id: `${req.storeId}:${date}:${h}`,
        label,
        startTime: `${String(h).padStart(2, '0')}:00`,
        endTime: `${String(h + 2).padStart(2, '0')}:00`,
        available: !isToday || h > nowHour,
        fee: deliveryFee,
      });
    }
    return { slots, date };
  }
}
