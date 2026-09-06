import { of } from 'rxjs';
import { MarketplaceGatewayController } from './marketplace.controller';

/**
 * The gateway is a pass-through: its job is to forward query parameters to the
 * marketplace service untouched. That contract broke silently once already —
 * `/marketplace/products?category=electronics` forwarded only page/limit, so
 * every category page received the unfiltered catalog.
 */
describe('MarketplaceGatewayController', () => {
  let controller: MarketplaceGatewayController;
  let send: jest.Mock;

  beforeEach(() => {
    send = jest.fn().mockReturnValue(of({ data: [], total: 0 }));
    const client: any = { send };
    const repo: any = { find: jest.fn(), findOne: jest.fn() };
    // gRPC catalogue client stubbed to return null on every call, which is the
    // "channel unavailable" signal — the controller then falls back to TCP, which
    // is the path these tests assert on.
    const catalogGrpc: any = {
      getHome: jest.fn().mockResolvedValue(null),
      getCategories: jest.fn().mockResolvedValue(null),
      searchProducts: jest.fn().mockResolvedValue(null),
    };
    controller = new MarketplaceGatewayController(client, client, client, catalogGrpc);
  });

  /** Payload sent downstream, minus the optional internal-auth field. */
  function sentPayload() {
    const [, payload] = send.mock.calls[0];
    const { _internalSecret, ...rest } = payload;
    return rest;
  }

  /** Request as RegionMiddleware leaves it — `regionCode` already resolved. */
  const reqIn = (regionCode?: string): any => ({ regionCode });

  describe('getProducts', () => {
    it('forwards catalog filters to the marketplace service', async () => {
      await controller.getProducts(
        reqIn(),
        2,
        48,
        'IN',
        'electronics',
        'electronics-laptops',
        'apple',
        'slr-1',
        '500',
        '90000',
        'price_asc',
      );

      expect(sentPayload()).toEqual({
        page: 2,
        limit: 48,
        country: 'IN',
        category: 'electronics',
        subcategory: 'electronics-laptops',
        brand: 'apple',
        seller: 'slr-1',
        minPrice: 500,
        maxPrice: 90000,
        sort: 'price_asc',
      });
    });

    it('forwards the category slug the web app actually sends', async () => {
      await controller.getProducts(reqIn(), 1, 48, undefined, 'electronics');

      const payload = sentPayload();
      expect(payload.category).toBe('electronics');
      // Regression guard: dropping this made every category look empty.
      expect(payload).toHaveProperty('category');
    });

    it('omits filters that were not supplied', async () => {
      await controller.getProducts(reqIn());

      expect(sentPayload()).toEqual({ page: 1, limit: 20 });
    });

    it('coerces numeric filters', async () => {
      // Positional: req, page, limit, country, category, subcategory, brand,
      // seller, minPrice, maxPrice.
      await controller.getProducts(
        reqIn(),
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '1000',
        '2000',
      );

      const payload = sentPayload();
      expect(payload.minPrice).toBe(1000);
      expect(payload.maxPrice).toBe(2000);
    });

    it('scopes to the detected region when no country is supplied', async () => {
      // Without this the catalogue read is unscoped, so a Doha customer is
      // served products no Qatari seller lists.
      await controller.getProducts(reqIn('QA'), 1, 20);

      expect(sentPayload().country).toBe('QA');
    });

    it('lets an explicit country override the detected region', async () => {
      await controller.getProducts(reqIn('QA'), 1, 20, 'AE');

      expect(sentPayload().country).toBe('AE');
    });
  });

  describe('addToCart', () => {
    /**
     * cart-service's `safeSubtotal` throws on a non-finite total, so a line with
     * no `price` rejects — and with the gateway forwarding only the request body,
     * that was every add-to-cart. It surfaced as 503, so it read as an outage.
     */
    /**
     * The line is priced by `price_order_items` — the same authority checkout
     * uses — so the cart quotes exactly what the order will charge, including
     * the selected variant. The product itself is still fetched for its image.
     */
    function build(product: any, pricing: any = PRICING) {
      const cartSend = jest.fn().mockReturnValue(of({ success: true }));
      const marketplaceSend = jest.fn((pattern: unknown) =>
        JSON.stringify(pattern).includes('price_order_items') ? of(pricing) : of(product),
      );
      const repo: any = { find: jest.fn(), findOne: jest.fn() };
      const catalogGrpc: any = {
        getHome: jest.fn().mockResolvedValue(null),
        getCategories: jest.fn().mockResolvedValue(null),
        searchProducts: jest.fn().mockResolvedValue(null),
      };
      const ctrl = new MarketplaceGatewayController(
        { send: marketplaceSend } as any,
        { send: cartSend } as any,
        { send: cartSend } as any,
        catalogGrpc,
      );
      return { ctrl, cartSend };
    }

    const PRICING = {
      ok: true,
      items: [
        {
          ok: true,
          productId: 'p1',
          quantity: 2,
          unitPrice: 115900,
          name: 'iPhone 15 Pro',
          listingId: 'L1',
        },
      ],
      subtotal: 231800,
    };

    const PRODUCT = {
      id: 'p1',
      name: 'iPhone 15 Pro',
      mrp: '134900.00',
      images: [{ url: 'b.jpg' }, { url: 'primary.jpg', isPrimary: true }],
      listings: [
        { sellingPrice: '120000.00' },
        { sellingPrice: '115900.00', isBuyBoxWinner: true },
      ],
    };

    it('sends cart-service a priced line, not just the product id', async () => {
      const { ctrl, cartSend } = build(PRODUCT);

      await ctrl.addToCart({ user: { id: 'u1' } }, { productId: 'p1', quantity: 2 } as any);

      const [, line] = cartSend.mock.calls[0];
      // Decimal columns arrive as strings; unconverted they make the subtotal
      // string-concatenate instead of adding.
      expect(line.price).toBe(115900);
      expect(typeof line.price).toBe('number');
      expect(line.name).toBe('iPhone 15 Pro');
      expect(line.quantity).toBe(2);
      expect(line.userId).toBe('u1');
      expect(line.serviceType).toBe('marketplace');
    });

    it("uses the pricer's unit price and name, never the listing it happens to see", async () => {
      const { ctrl, cartSend } = build(PRODUCT, {
        ...PRICING,
        items: [{ ...PRICING.items[0], unitPrice: 125900, name: 'iPhone 15 Pro — 256GB / Silver' }],
      });

      await ctrl.addToCart({ user: { id: 'u1' } }, {
        productId: 'p1',
        quantity: 1,
        variantId: 'v-256-silver',
      } as any);

      const [, line] = cartSend.mock.calls[0];
      expect(line.price).toBe(125900);
      expect(line.name).toBe('iPhone 15 Pro — 256GB / Silver');
      expect(line.variantId).toBe('v-256-silver');
    });

    it('prefers the primary image', async () => {
      const { ctrl, cartSend } = build(PRODUCT);

      await ctrl.addToCart({ user: { id: 'u1' } }, { productId: 'p1', quantity: 1 } as any);

      expect(cartSend.mock.calls[0][1].imageUrl).toBe('primary.jpg');
    });

    it("refuses the line with the pricer's reason when it cannot be priced", async () => {
      const { ctrl, cartSend } = build(PRODUCT, {
        ok: false,
        reason: 'Please choose an option (size, colour…) for this product (p1)',
        items: [
          {
            ok: false,
            productId: 'p1',
            quantity: 1,
            reason: 'Please choose an option (size, colour…) for this product',
          },
        ],
      });

      await expect(
        ctrl.addToCart({ user: { id: 'u1' } }, { productId: 'p1', quantity: 1 } as any),
      ).rejects.toThrow(/choose an option/);
      expect(cartSend).not.toHaveBeenCalled();
    });

    it('refuses an unpriceable product instead of adding a NaN line', async () => {
      const { ctrl, cartSend } = build(
        { id: 'p1', name: 'Broken', mrp: null, listings: [] },
        {
          ok: false,
          reason: 'Product has no valid price (p1)',
          items: [
            { ok: false, productId: 'p1', quantity: 1, reason: 'Product has no valid price' },
          ],
        },
      );

      await expect(
        ctrl.addToCart({ user: { id: 'u1' } }, { productId: 'p1', quantity: 1 } as any),
      ).rejects.toThrow();
      expect(cartSend).not.toHaveBeenCalled();
    });

    it('rejects a body with no productId', async () => {
      const { ctrl, cartSend } = build(PRODUCT);

      await expect(ctrl.addToCart({ user: { id: 'u1' } }, {} as any)).rejects.toThrow();
      expect(cartSend).not.toHaveBeenCalled();
    });
  });

  describe('getMarketplaceHome', () => {
    /**
     * proto/marketplace.proto's HomeResponse is a strict subset of the storefront
     * home feed — it has no `trending`, `newArrivals`, `bestSellers`, `dealsOfDay`,
     * `recommended` or `sponsored`. Preferring it returned a truthy-but-truncated
     * object, so those six sections arrived undefined, the web client substituted
     * its bundled demo products, and every one of those cards linked to a product
     * id that is not in the database — a 404 on the product detail page.
     */
    it('serves the full feed over TCP even when the gRPC channel is up', async () => {
      const grpcHome = {
        banners: [] as unknown[],
        flashDeals: [] as unknown[],
        categories: [] as unknown[],
        topBrands: [] as unknown[],
        featured: [] as unknown[],
        topSellers: [] as unknown[],
      };
      const catalogGrpc: any = {
        getHome: jest.fn().mockResolvedValue(grpcHome),
        getCategories: jest.fn().mockResolvedValue(null),
        searchProducts: jest.fn().mockResolvedValue(null),
      };
      const fullFeed = {
        flashDeals: [] as unknown[],
        dealsOfDay: [] as unknown[],
        newArrivals: [] as unknown[],
        bestSellers: [] as unknown[],
        trending: [] as unknown[],
        recommended: [] as unknown[],
        sponsored: [] as unknown[],
        heroBanners: [] as unknown[],
        brandPromos: {},
      };
      const tcp = jest.fn().mockReturnValue(of(fullFeed));
      const client: any = { send: tcp };
      const repo: any = { find: jest.fn(), findOne: jest.fn() };
      const ctrl = new MarketplaceGatewayController(client, client, client, catalogGrpc);

      const result = await ctrl.getMarketplaceHome({ regionCode: 'QA' } as any);

      expect(catalogGrpc.getHome).not.toHaveBeenCalled();
      expect(tcp).toHaveBeenCalledWith({ cmd: 'get_home' }, expect.anything());
      // The sections the truncated gRPC response would have dropped.
      for (const key of [
        'trending',
        'newArrivals',
        'bestSellers',
        'dealsOfDay',
        'recommended',
        'sponsored',
      ]) {
        expect(result).toHaveProperty(key);
      }
    });

    it('composes the feed for the detected market', async () => {
      // The home cache is keyed on this. Dropping it made every market share
      // one cached feed, so Doha was served India's banners and sellers.
      const catalogGrpc: any = {
        getHome: jest.fn().mockResolvedValue(null),
        getCategories: jest.fn().mockResolvedValue(null),
        searchProducts: jest.fn().mockResolvedValue(null),
      };
      const tcp = jest.fn().mockReturnValue(of({}));
      const client: any = { send: tcp };
      const repo: any = { find: jest.fn(), findOne: jest.fn() };
      const ctrl = new MarketplaceGatewayController(client, client, client, catalogGrpc);

      await ctrl.getMarketplaceHome({ regionCode: 'QA' } as any);

      expect(tcp.mock.calls[0][1]).toEqual(expect.objectContaining({ country: 'QA' }));
    });
  });
});
