import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PharmacyStore, PharmacyStoreStatus } from '../entities/pharmacy-store.entity';
import { PharmacyOrder } from '../entities/pharmacy-order.entity';
import { PharmacyItem } from '../entities/pharmacy-item.entity';

/**
 * FranchiseViewService — the ONLY sanctioned read path into Pharmacy's data for
 * the Franchise module.
 *
 * Franchise previously ran raw SQL such as `SELECT * FROM pharmacy_stores WHERE
 * franchise_id = $1`. The column is actually `franchiseId`, so every one of those
 * queries threw `column "franchise_id" does not exist` and was swallowed by a catch
 * block that returned empty results. Pharmacy owns this shape now.
 */
@Injectable()
export class FranchiseViewService {
  private readonly logger = new Logger(FranchiseViewService.name);

  constructor(
    @InjectRepository(PharmacyStore) private readonly storeRepo: Repository<PharmacyStore>,
    @InjectRepository(PharmacyOrder) private readonly orderRepo: Repository<PharmacyOrder>,
    @InjectRepository(PharmacyItem) private readonly itemRepo: Repository<PharmacyItem>,
  ) {}

  async getKpis(franchiseId: string) {
    const stores = await this.storeRepo.find({
      where: { franchiseId },
      select: ['id', 'status', 'totalOrders'],
    });
    const ids = stores.map((s) => s.id);

    const totalProducts = ids.length
      ? await this.itemRepo
          .createQueryBuilder('item')
          .where('item.storeId IN (:...ids)', { ids })
          .getCount()
      : 0;

    // `pharmacy_stores` has no revenue column — revenue is derived from orders.
    const revenueRow = ids.length
      ? await this.orderRepo
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.grandTotal), 0)', 'sum')
          .where('o.storeId IN (:...ids)', { ids })
          .getRawOne<{ sum: string }>()
      : null;

    return {
      activeStores: stores.filter((s) => s.status === PharmacyStoreStatus.APPROVED).length,
      totalStores: stores.length,
      totalProducts,
      totalOrders: stores.reduce((sum, s) => sum + (s.totalOrders ?? 0), 0),
      revenue: Number(revenueRow?.sum ?? 0),
    };
  }

  async getStores(franchiseId: string, search?: string, status?: string) {
    const qb = this.storeRepo
      .createQueryBuilder('s')
      .where('s.franchiseId = :franchiseId', { franchiseId });

    if (search) {
      qb.andWhere('(LOWER(s.name) LIKE :q OR LOWER(s.address) LIKE :q OR LOWER(s.city) LIKE :q)', {
        q: `%${search.toLowerCase()}%`,
      });
    }
    if (status && status !== 'All') {
      qb.andWhere('s.status = :status', { status });
    }

    const [stores, total] = await qb
      .orderBy('s.createdAt', 'DESC')
      .take(20)
      .getManyAndCount();

    return { stores, total };
  }

  async getOrders(franchiseId: string, page = 1, status?: string) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.store', 's')
      .where('s.franchiseId = :franchiseId', { franchiseId });

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
      .innerJoin('item.store', 's')
      .where('s.franchiseId = :franchiseId', { franchiseId });

    if (search) {
      qb.andWhere('LOWER(item.name) LIKE :q', { q: `%${search.toLowerCase()}%` });
    }
    if (category && category !== 'All') {
      qb.andWhere('item.categoryId = :category', { category });
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
      .innerJoin('o.store', 's')
      .select('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
      .addSelect('COUNT(o.id)', 'orders')
      .where('s.franchiseId = :franchiseId', { franchiseId })
      .andWhere('o.createdAt >= :since', { since })
      .getRawOne<{ revenue: string; orders: string }>();

    return {
      revenue: Number(row?.revenue ?? 0),
      orders: Number(row?.orders ?? 0),
      period: period ?? '30d',
    };
  }

  /**
   * Low-stock items across the franchise's stores.
   * Franchise's old SQL filtered on `pi.stock_quantity` — the column is `stockLevel`.
   */
  async getLowStockInventory(franchiseId: string, threshold = 10) {
    const items = await this.itemRepo
      .createQueryBuilder('item')
      .innerJoin('item.store', 's')
      .where('s.franchiseId = :franchiseId', { franchiseId })
      .andWhere('item.stockLevel < :threshold', { threshold })
      .orderBy('item.stockLevel', 'ASC')
      .take(50)
      .getMany();

    return { items, lowStock: items.length };
  }

  /**
   * Drug-licence compliance across the franchise's stores.
   * Franchise's old SQL counted `license_verified = true` — no such column exists.
   * A store is compliant when it has a licence number that has not expired.
   */
  async getCompliance(franchiseId: string) {
    const stores = await this.storeRepo.find({
      where: { franchiseId },
      select: ['id', 'name', 'drugLicenseNumber', 'drugLicenseExpiry'],
    });

    const now = new Date();
    const issues = stores
      .filter((s) => !s.drugLicenseNumber || (s.drugLicenseExpiry && new Date(s.drugLicenseExpiry) < now))
      .map((s) => ({
        storeId: s.id,
        name: s.name,
        reason: !s.drugLicenseNumber ? 'MISSING_DRUG_LICENCE' : 'DRUG_LICENCE_EXPIRED',
        expiresAt: s.drugLicenseExpiry ?? null,
      }));

    return { compliant: stores.length - issues.length, total: stores.length, issues };
  }

  async updateStoreStatus(franchiseId: string, storeId: string, status: string) {
    if (!Object.values(PharmacyStoreStatus).includes(status as PharmacyStoreStatus)) {
      return {
        success: false,
        message: `Invalid status '${status}'. Expected one of ${Object.values(PharmacyStoreStatus).join(', ')}.`,
      };
    }

    const result = await this.storeRepo.update(
      { id: storeId, franchiseId },
      { status: status as PharmacyStoreStatus },
    );
    if (!result.affected) {
      return { success: false, message: `Store ${storeId} not found under franchise ${franchiseId}.` };
    }

    this.logger.log(`Franchise ${franchiseId} set pharmacy store ${storeId} → ${status}`);
    return { success: true, message: `Status updated to ${status}`, storeId, status };
  }
}
