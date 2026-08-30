import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant, RestaurantStatus } from './entities/restaurant.entity';
import { RestaurantOrder } from './entities/restaurant-order.entity';
import { MenuItem } from './entities/menu-item.entity';

/**
 * FranchiseViewService — the ONLY sanctioned read path into Restaurant's data for
 * the Franchise module.
 *
 * Franchise previously ran raw SQL such as `SELECT * FROM restaurants WHERE
 * franchise_id = $1`. The column is actually `franchiseId`, so every one of those
 * queries threw `column "franchise_id" does not exist` and was swallowed by a catch
 * block that returned empty results. Restaurant owns this shape now, so the mismatch
 * cannot recur.
 */
@Injectable()
export class FranchiseViewService {
  private readonly logger = new Logger(FranchiseViewService.name);

  constructor(
    @InjectRepository(Restaurant) private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(RestaurantOrder) private readonly orderRepo: Repository<RestaurantOrder>,
    @InjectRepository(MenuItem) private readonly menuItemRepo: Repository<MenuItem>,
  ) {}

  async getKpis(franchiseId: string) {
    const restaurants = await this.restaurantRepo.find({
      where: { franchiseId },
      select: ['id', 'status', 'totalOrders', 'rating'],
    });
    const ids = restaurants.map((r) => r.id);

    const rated = restaurants.filter((r) => Number(r.rating) > 0);
    const avgRating = rated.length
      ? rated.reduce((sum, r) => sum + Number(r.rating), 0) / rated.length
      : 0;

    // `restaurants` has no revenue column — revenue lives on the orders.
    const revenueRow = ids.length
      ? await this.orderRepo
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.grandTotal), 0)', 'sum')
          .where('o.restaurantId IN (:...ids)', { ids })
          .getRawOne<{ sum: string }>()
      : null;

    return {
      activeRestaurants: restaurants.filter((r) => r.status === RestaurantStatus.APPROVED).length,
      totalRestaurants: restaurants.length,
      totalOrders: restaurants.reduce((sum, r) => sum + (r.totalOrders ?? 0), 0),
      revenue: Number(revenueRow?.sum ?? 0),
      avgRating: Number(avgRating.toFixed(1)),
    };
  }

  async getRestaurants(franchiseId: string, search?: string, status?: string) {
    const qb = this.restaurantRepo
      .createQueryBuilder('r')
      .where('r.franchiseId = :franchiseId', { franchiseId });

    if (search) {
      qb.andWhere('(LOWER(r.name) LIKE :q OR LOWER(r.address) LIKE :q OR LOWER(r.city) LIKE :q)', {
        q: `%${search.toLowerCase()}%`,
      });
    }
    if (status && status !== 'All') {
      qb.andWhere('r.status = :status', { status });
    }

    const [restaurants, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .take(20)
      .getManyAndCount();

    return { restaurants, total };
  }

  async getOrders(franchiseId: string, page = 1, status?: string) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.restaurant', 'r')
      .where('r.franchiseId = :franchiseId', { franchiseId });

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

  async getMenuStats(franchiseId: string) {
    const rows = await this.menuItemRepo
      .createQueryBuilder('mi')
      .innerJoin('mi.category', 'mc')
      // `menu_items.restaurantId` is varchar while `restaurants.id` is uuid —
      // a pre-existing schema inconsistency, so the join needs an explicit cast.
      .innerJoin(Restaurant, 'r', 'r.id::text = mi.restaurantId')
      .select('mc.name', 'category')
      .addSelect('COUNT(mi.id)', 'total')
      .where('r.franchiseId = :franchiseId', { franchiseId })
      .groupBy('mc.name')
      .getRawMany<{ category: string; total: string }>();

    const categories = rows.map((r) => ({ category: r.category, total: Number(r.total) }));
    return {
      totalItems: categories.reduce((sum, c) => sum + c.total, 0),
      categories,
    };
  }

  async getAnalytics(franchiseId: string, period?: string) {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 86_400_000);

    const row = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.restaurant', 'r')
      .select('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
      .addSelect('COUNT(o.id)', 'orders')
      .where('r.franchiseId = :franchiseId', { franchiseId })
      .andWhere('o.createdAt >= :since', { since })
      .getRawOne<{ revenue: string; orders: string }>();

    return {
      revenue: Number(row?.revenue ?? 0),
      orders: Number(row?.orders ?? 0),
      period: period ?? '30d',
    };
  }

  async updateRestaurantStatus(franchiseId: string, restaurantId: string, status: string) {
    if (!Object.values(RestaurantStatus).includes(status as RestaurantStatus)) {
      return {
        success: false,
        message: `Invalid status '${status}'. Expected one of ${Object.values(RestaurantStatus).join(', ')}.`,
      };
    }

    const result = await this.restaurantRepo.update(
      { id: restaurantId, franchiseId },
      { status: status as RestaurantStatus },
    );
    if (!result.affected) {
      return { success: false, message: `Restaurant ${restaurantId} not found under franchise ${franchiseId}.` };
    }

    this.logger.log(`Franchise ${franchiseId} set restaurant ${restaurantId} → ${status}`);
    return { success: true, message: `Status updated to ${status}`, restaurantId, status };
  }
}
