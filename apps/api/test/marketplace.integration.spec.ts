import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken, getConnectionToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { Seller } from '../apps/marketplace-service/src/entities/seller.entity';
import { Category } from '../apps/marketplace-service/src/entities/category.entity';
import { Brand } from '../apps/marketplace-service/src/entities/brand.entity';
import { Product } from '../apps/marketplace-service/src/entities/product.entity';
import { ProductListing } from '../apps/marketplace-service/src/entities/product-listing.entity';
import { MarketplaceOrder } from '../apps/marketplace-service/src/entities/marketplace-order.entity';
import { Review } from '../apps/marketplace-service/src/entities/review.entity';

/**
 * Integration tests with real PostgreSQL database.
 *
 * REQUIRES: PostgreSQL running on localhost:5432
 * Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME env vars or use defaults.
 */
describe('Marketplace Integration Tests', () => {
  let module: TestingModule;
  let ds: DataSource;
  let sellerRepo: Repository<Seller>;
  let categoryRepo: Repository<Category>;
  let brandRepo: Repository<Brand>;
  let productRepo: Repository<Product>;
  let listingRepo: Repository<ProductListing>;
  let orderRepo: Repository<MarketplaceOrder>;
  let reviewRepo: Repository<Review>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: +(process.env.DB_PORT || 5432),
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'kartseek123',
          database: process.env.DB_NAME || 'kartseek_test',
          entities: [Seller, Category, Brand, Product, ProductListing, MarketplaceOrder, Review],
          synchronize: true,
          dropSchema: true, // fresh DB for each test run
        }),
        TypeOrmModule.forFeature([Seller, Category, Brand, Product, ProductListing, MarketplaceOrder, Review]),
      ],
    }).compile();

    ds = module.get<DataSource>(getConnectionToken());
    sellerRepo = module.get<Repository<Seller>>(getRepositoryToken(Seller));
    categoryRepo = module.get<Repository<Category>>(getRepositoryToken(Category));
    brandRepo = module.get<Repository<Brand>>(getRepositoryToken(Brand));
    productRepo = module.get<Repository<Product>>(getRepositoryToken(Product));
    listingRepo = module.get<Repository<ProductListing>>(getRepositoryToken(ProductListing));
    orderRepo = module.get<Repository<MarketplaceOrder>>(getRepositoryToken(MarketplaceOrder));
    reviewRepo = module.get<Repository<Review>>(getRepositoryToken(Review));
  }, 30000);

  afterAll(async () => {
    await ds?.destroy();
  });

  // ── Categories ────────────────────────────────────────────────────
  describe('Category CRUD', () => {
    it('should create and retrieve a category', async () => {
      const cat = categoryRepo.create({ name: 'Electronics', slug: 'electronics', is_active: true });
      const saved = await categoryRepo.save(cat);
      expect(saved.id).toBeDefined();

      const found = await categoryRepo.findOne({ where: { slug: 'electronics' } });
      expect(found).toBeDefined();
      expect(found!.name).toBe('Electronics');
    });

    it('should enforce unique slugs', async () => {
      const dup = categoryRepo.create({ name: 'Electronics 2', slug: 'electronics', is_active: true });
      await expect(categoryRepo.save(dup)).rejects.toThrow();
    });
  });

  // ── Brands ────────────────────────────────────────────────────────
  describe('Brand CRUD', () => {
    it('should create a brand', async () => {
      const brand = brandRepo.create({ name: 'Apple', slug: 'apple', isVerified: true });
      const saved = await brandRepo.save(brand);
      expect(saved.id).toBeDefined();
      expect(saved.isVerified).toBe(true);
    });
  });

  // ── Sellers ────────────────────────────────────────────────────────
  describe('Seller CRUD', () => {
    it('should create a seller with region code', async () => {
      const seller = sellerRepo.create({
        businessName: 'Test Store',
        storeSlug: 'test-store',
        verificationStatus: 'VERIFIED',
        regionCode: 'IN',
      });
      const saved = await sellerRepo.save(seller);
      expect(saved.regionCode).toBe('IN');
    });
  });

  // ── Products & Listings ─────────────────────────────────────────
  describe('Product & Listing', () => {
    let savedProduct: Product;
    let savedSeller: Seller;

    beforeAll(async () => {
      savedSeller = await sellerRepo.findOne({ where: { storeSlug: 'test-store' } }) as Seller;
      const cat = await categoryRepo.findOne({ where: { slug: 'electronics' } });
      const brand = await brandRepo.findOne({ where: { slug: 'apple' } });

      const product = productRepo.create({
        name: 'MacBook Pro M3',
        slug: 'macbook-pro-m3',
        globalTradeItemNumber: `GTIN-${Date.now()}`,
        mrp: 249999,
        status: 'ACTIVE',
        approval_status: 'APPROVED',
        is_active: true,
        seller_id: savedSeller?.id,
        category: cat!,
        brand: brand!,
      });
      savedProduct = await productRepo.save(product);
    });

    it('should create a product with category and brand', async () => {
      expect(savedProduct.id).toBeDefined();
      expect(savedProduct.name).toBe('MacBook Pro M3');
    });

    it('should create a listing linking product to seller', async () => {
      const listing = listingRepo.create({
        sellerSku: 'MBP-M3-001',
        sellingPrice: 239999,
        stockQuantity: 15,
        product: savedProduct,
        seller: savedSeller,
        isActive: true,
      });
      const saved = await listingRepo.save(listing);
      expect(saved.id).toBeDefined();
      expect(saved.sellingPrice).toBe(239999);
    });

    it('should enforce unique product-seller combination', async () => {
      const dup = listingRepo.create({
        sellerSku: 'MBP-DUP',
        sellingPrice: 249999,
        stockQuantity: 5,
        product: savedProduct,
        seller: savedSeller,
      });
      await expect(listingRepo.save(dup)).rejects.toThrow();
    });
  });

  // ── Orders ──────────────────────────────────────────────────────
  describe('Marketplace Orders', () => {
    it('should create and query an order', async () => {
      const seller = await sellerRepo.findOne({ where: { storeSlug: 'test-store' } });
      const order = orderRepo.create({
        orderNumber: `ORD-${Date.now()}`,
        customerId: 'customer-1',
        sellerId: seller!.id,
        items: [{ productId: 'p1', listingId: 'l1', name: 'Test', sellerSku: 'sku1', quantity: 2, unitPrice: 1000, subtotal: 2000 }],
        itemTotal: 2000,
        grandTotal: 2100,
        status: 'PENDING',
        paymentMethod: 'ONLINE',
        paymentStatus: 'PAID',
      });
      const saved = await orderRepo.save(order);
      expect(saved.orderNumber).toBeDefined();

      const found = await orderRepo.findOne({ where: { id: saved.id } });
      expect(parseFloat(found!.grandTotal as any)).toBe(2100);
    });
  });

  // ── Reviews ─────────────────────────────────────────────────────
  describe('Reviews', () => {
    it('should create a review with rating constraints', async () => {
      const product = await productRepo.findOne({ where: { slug: 'macbook-pro-m3' } });
      const review = reviewRepo.create({
        productId: product!.id,
        customerId: 'customer-1',
        customerName: 'Jane',
        rating: 5,
        title: 'Excellent',
        comment: 'Best laptop ever',
        isVerifiedPurchase: true,
        status: 'PUBLISHED',
      });
      const saved = await reviewRepo.save(review);
      expect(saved.rating).toBe(5);
    });
  });
});
