import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seller } from './entities/seller.entity';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { MarketplaceOrder } from './entities/marketplace-order.entity';

/**
 * FranchiseViewService — the ONLY sanctioned read path into Marketplace's data for
 * the Franchise module.
 *
 * Franchise previously mapped its own `FranchiseSeller` shadow entity onto the
 * `sellers` table. That shadow declared six columns the table has never had
 * (`total_products`, `total_orders`, `revenue`, `category`, `location`,
 * `returns_percentage`), so its queries failed outright.
 *
 * The real facts live in different places, and are assembled here:
 *   • product counts  → `products.seller_id`
 *   • revenue/orders  → `marketplace_orders.sellerId`
 *   • category mix    → the categories of each seller's products
 */
@Injectable()
export class FranchiseViewService {
  private readonly logger = new Logger(FranchiseViewService.name);

  private static readonly SELLER_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'];

  constructor(
    @InjectRepository(Seller) private readonly sellerRepo: Repository<Seller>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(MarketplaceOrder) private readonly orderRepo: Repository<MarketplaceOrder>,
  ) {}

  async getKpis(franchiseId: string) {
    const sellers = await this.sellerRepo.find({
      where: { franchiseId },
      select: ['id', 'verificationStatus', 'totalProducts', 'totalOrders'],
    });
    const sellerIds = sellers.map((s) => s.id);

    if (!sellerIds.length) {
      return {
        activeSellers: 0,
        totalSellers: 0,
        totalProducts: 0,
        totalOrders: 0,
        retailRevenue: 0,
        categoryDistribution: {},
      };
    }

    const revenueRow = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
      .addSelect('COUNT(o.id)', 'orders')
      .where('o.sellerId IN (:...sellerIds)', { sellerIds })
      .getRawOne<{ revenue: string; orders: string }>();

    const categoryRows = await this.productRepo
      .createQueryBuilder('p')
      .leftJoin(Category, 'c', 'c.id = p.category_id')
      .select('c.name', 'category')
      .addSelect('COUNT(p.id)', 'count')
      .where('p.seller_id IN (:...sellerIds)', { sellerIds })
      .groupBy('c.name')
      .getRawMany<{ category: string | null; count: string }>();

    const categoryDistribution: Record<string, number> = {};
    for (const row of categoryRows) {
      if (row.category) categoryDistribution[row.category] = Number(row.count);
    }

    const totalProducts = await this.productRepo
      .createQueryBuilder('p')
      .where('p.seller_id IN (:...sellerIds)', { sellerIds })
      .getCount();

    return {
      activeSellers: sellers.filter((s) => s.verificationStatus === 'VERIFIED').length,
      totalSellers: sellers.length,
      totalProducts,
      totalOrders: Number(revenueRow?.orders ?? 0),
      retailRevenue: Number(revenueRow?.revenue ?? 0),
      categoryDistribution,
    };
  }

  async getSellers(franchiseId: string, search?: string, category?: string, status?: string) {
    const qb = this.sellerRepo
      .createQueryBuilder('s')
      .where('s.franchiseId = :franchiseId', { franchiseId });

    if (search) {
      qb.andWhere('(LOWER(s.businessName) LIKE :q OR LOWER(s.storeSlug) LIKE :q)', {
        q: `%${search.toLowerCase()}%`,
      });
    }
    if (status && status !== 'All') {
      const dbStatus =
        status === 'active' ? 'VERIFIED' : status === 'pending' ? 'PENDING' : status === 'suspended' ? 'SUSPENDED' : status;
      qb.andWhere('s.verificationStatus = :status', { status: dbStatus });
    }
    // `sellers` carries no category column — a seller is filtered by the categories
    // of the products it actually lists.
    if (category && category !== 'All') {
      // `products.seller_id` is varchar while `sellers.id` is uuid — a pre-existing
      // schema inconsistency, so the correlation needs an explicit cast.
      // Both tables are named with their schema. A bare `products` in raw SQL
      // resolves against the session `search_path` (`public`), not the connection's
      // configured `marketplace` schema, so this filter matched nothing.
      const products = this.productRepo.metadata.tablePath;
      const categories = this.productRepo.manager.connection.getMetadata(Category).tablePath;
      qb.andWhere(
        `EXISTS (
           SELECT 1 FROM ${products} p
           LEFT JOIN ${categories} c ON c.id = p.category_id
           WHERE p.seller_id = s.id::text AND c.name = :category
         )`,
        { category },
      );
    }

    const [sellers, total] = await qb.take(20).getManyAndCount();

    return { sellers, total };
  }

  async updateSellerStatus(franchiseId: string, sellerId: string, status: string) {
    const dbStatus =
      status === 'active' ? 'VERIFIED' : status === 'pending' ? 'PENDING' : status === 'suspended' ? 'SUSPENDED' : status;

    if (!FranchiseViewService.SELLER_STATUSES.includes(dbStatus)) {
      return {
        success: false,
        message: `Invalid status '${status}'. Expected one of ${FranchiseViewService.SELLER_STATUSES.join(', ')}.`,
      };
    }

    const result = await this.sellerRepo.update(
      { id: sellerId, franchiseId },
      { verificationStatus: dbStatus },
    );
    if (!result.affected) {
      return { success: false, message: `Seller ${sellerId} not found under franchise ${franchiseId}.` };
    }

    this.logger.log(`Franchise ${franchiseId} set seller ${sellerId} → ${dbStatus}`);
    return { success: true, message: `Status updated to ${dbStatus}`, sellerId, status: dbStatus };
  }

  /** Store count + verified count, used by the franchise dashboard header. */
  async getSellerCounts(franchiseId: string) {
    const [total, verified] = await Promise.all([
      this.sellerRepo.count({ where: { franchiseId } }),
      this.sellerRepo.count({ where: { franchiseId, verificationStatus: 'VERIFIED' } }),
    ]);
    return { total, verified };
  }
}
