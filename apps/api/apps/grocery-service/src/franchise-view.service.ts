import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { GroceryStore } from './entities/grocery-store.entity';
import { GroceryItem } from './entities/grocery-item.entity';
import { GroceryOrder } from './entities/grocery-order.entity';

/**
 * FranchiseViewService — the ONLY sanctioned read path into Grocery's data for
 * the Franchise module.
 *
 * Franchise previously hand-wrote SQL against `grocery_stores` / `grocery_orders` /
 * `grocery_items` from inside franchise-service. Because it did not own these tables
 * it guessed at the schema and every query threw at runtime (wrong status enum value,
 * columns `total_products` / `revenue` that never existed), silently returning zeros.
 *
 * Going through this service means the queries are checked against the real entities
 * at compile time, and Grocery owns the shape of what it exposes.
 */
@Injectable()
export class FranchiseViewService {
  private readonly logger = new Logger(FranchiseViewService.name);

  constructor(
    @InjectRepository(GroceryStore) private readonly storeRepo: Repository<GroceryStore>,
    @InjectRepository(GroceryItem) private readonly itemRepo: Repository<GroceryItem>,
    @InjectRepository(GroceryOrder) private readonly orderRepo: Repository<GroceryOrder>,
  ) {}

  /** Aggregate KPIs for a franchise's grocery stores. */
  async getKpis(franchiseId: string) {
    const stores = await this.storeRepo.find({
      where: { franchiseId },
      select: ['id', 'status', 'totalOrders'],
    });
    const storeIds = stores.map((s) => s.id);

    const activeStores = stores.filter((s) => s.status === 'APPROVED').length;
    const totalOrders = stores.reduce((sum, s) => sum + (s.totalOrders ?? 0), 0);

    // `grocery_stores` carries no product count or revenue column — both are derived
    // from the tables that actually own those facts.
    const totalProducts = storeIds.length
      ? await this.itemRepo
          .createQueryBuilder('item')
          .where('item.storeId IN (:...storeIds)', { storeIds })
          .getCount()
      : 0;

    const revenueRow = storeIds.length
      ? await this.orderRepo
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.grandTotal), 0)', 'sum')
          .where('o.storeId IN (:...storeIds)', { storeIds })
          .getRawOne<{ sum: string }>()
      : null;

    return {
      activeStores,
      totalStores: stores.length,
      totalProducts,
      totalOrders,
      revenue: Number(revenueRow?.sum ?? 0),
    };
  }

  async getStores(franchiseId: string, search?: string, status?: string) {
    const qb = this.storeRepo
      .createQueryBuilder('store')
      .where('store.franchiseId = :franchiseId', { franchiseId });

    if (search) {
      qb.andWhere('(LOWER(store.name) LIKE :q OR LOWER(store.address) LIKE :q)', {
        q: `%${search.toLowerCase()}%`,
      });
    }
    if (status && status !== 'All') {
      qb.andWhere('store.status = :status', { status });
    }

    const [stores, total] = await qb
      .orderBy('store.createdAt', 'DESC')
      .take(20)
      .getManyAndCount();

    return { stores, total };
  }

  async getOrders(franchiseId: string, page = 1, status?: string) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.store', 'store')
      .where('store.franchiseId = :franchiseId', { franchiseId });

    if (status && status !== 'All') {
      qb.andWhere('o.status = :status', { status });
    }

    const [orders, total] = await qb
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * 20)
      .take(20)
      .getManyAndCount();

    return { orders, total, page };
  }

  async getProducts(franchiseId: string, search?: string, category?: string) {
    const qb = this.itemRepo
      .createQueryBuilder('item')
      .innerJoin('item.store', 'store')
      .where('store.franchiseId = :franchiseId', { franchiseId });

    if (search) {
      qb.andWhere('LOWER(item.name) LIKE :q', { q: `%${search.toLowerCase()}%` });
    }
    if (category && category !== 'All') {
      qb.andWhere('item.category = :category', { category });
    }

    const [products, total] = await qb
      .orderBy('item.createdAt', 'DESC')
      .take(50)
      .getManyAndCount();

    return { products, total };
  }

  async getAnalytics(franchiseId: string, period?: string) {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 86_400_000);

    const row = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.store', 'store')
      .select('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
      .addSelect('COUNT(o.id)', 'orders')
      .where('store.franchiseId = :franchiseId', { franchiseId })
      .andWhere('o.createdAt >= :since', { since })
      .getRawOne<{ revenue: string; orders: string }>();

    return {
      revenue: Number(row?.revenue ?? 0),
      orders: Number(row?.orders ?? 0),
      period: period ?? '30d',
    };
  }

  /**
   * Status changes are applied by Grocery, scoped to the franchise that owns the store,
   * so a franchise can never mutate a store outside its own estate.
   */
  async updateStoreStatus(franchiseId: string, storeId: string, status: string) {
    const allowed = ['PENDING_KYC', 'APPROVED', 'SUSPENDED'];
    if (!allowed.includes(status)) {
      return { success: false, message: `Invalid status '${status}'. Expected one of ${allowed.join(', ')}.` };
    }

    const result = await this.storeRepo.update({ id: storeId, franchiseId }, { status });
    if (!result.affected) {
      return { success: false, message: `Store ${storeId} not found under franchise ${franchiseId}.` };
    }

    this.logger.log(`Franchise ${franchiseId} set grocery store ${storeId} → ${status}`);
    return { success: true, message: `Status updated to ${status}`, storeId, status };
  }
}
