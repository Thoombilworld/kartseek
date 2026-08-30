import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { KafkaProducerService } from '@app/kafka';
import { TaxiPayoutRecordEntity } from '../entities/taxi-payout-record.entity';
import { TaxiCountryConfigEntity } from '../entities/taxi-country-config.entity';
import { TaxiVendorEntity } from '../entities/taxi-vendor.entity';
import { TaxiDriverEntity } from '../entities/taxi-driver.entity';

/**
 * TaxiPayoutService — Financial reconciliation for the taxi module.
 *
 * Generates payout records after each ride completion and manages
 * the settlement lifecycle. All payouts flow through Super Admin
 * approval before being processed via payment gateways.
 *
 * Payout flow:
 *   Ride completes → payout records generated → admin approves →
 *   system processes → payment gateway → settled / failed
 */
@Injectable()
export class TaxiPayoutService {
  private readonly logger = new Logger(TaxiPayoutService.name);

  constructor(
    @InjectRepository(TaxiPayoutRecordEntity)
    private readonly payoutRepo: Repository<TaxiPayoutRecordEntity>,
    @InjectRepository(TaxiCountryConfigEntity)
    private readonly configRepo: Repository<TaxiCountryConfigEntity>,
    @InjectRepository(TaxiVendorEntity)
    private readonly vendorRepo: Repository<TaxiVendorEntity>,
    @InjectRepository(TaxiDriverEntity)
    private readonly driverRepo: Repository<TaxiDriverEntity>,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ─── Payout Generation ────────────────────────────────────────────────────

  /**
   * Generate payout records for a completed ride.
   * Creates separate records for the driver and vendor (if applicable).
   */
  async generatePayoutForRide(params: {
    rideId: string;
    driverId: string;
    vendorId?: string;
    grossAmount: number;
    countryCode: string;
    currency: string;
  }): Promise<TaxiPayoutRecordEntity[]> {
    const { rideId, driverId, vendorId, grossAmount, countryCode, currency } = params;

    // Get commission rates
    const config = await this.configRepo.findOne({ where: { countryCode } });
    const platformRate = config ? Number(config.platformCommissionRate) : 0.15;
    let vendorRate = config ? Number(config.defaultVendorCommissionRate) : 0.05;
    const taxRate = config ? Number(config.taxRate) : 0;

    // Check for vendor-specific commission override
    let vendorName = '';
    if (vendorId) {
      const vendor = await this.vendorRepo.findOne({ where: { id: vendorId } });
      if (vendor) {
        vendorName = vendor.name;
        if (vendor.commissionRate != null) {
          vendorRate = Number(vendor.commissionRate) / 100; // Stored as percentage
        }
      }
    }

    // Get driver info
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    const driverName = driver ? driver.fullName : `Driver ${driverId.slice(0, 8)}`;

    // Calculate splits
    const platformCommission = Math.round(grossAmount * platformRate);
    const vendorCommission = vendorId ? Math.round(grossAmount * vendorRate) : 0;
    const taxAmount = Math.round(grossAmount * taxRate);
    const driverNetPayout = grossAmount - platformCommission - vendorCommission - taxAmount;

    const payouts: TaxiPayoutRecordEntity[] = [];

    // Driver payout record
    const driverPayout = this.payoutRepo.create({
      recipientType: 'driver',
      recipientId: driverId,
      recipientName: driverName,
      rideId,
      countryCode,
      grossAmount,
      platformCommission,
      vendorCommission,
      taxAmount,
      netPayout: driverNetPayout,
      currency,
      status: 'pending',
    });
    payouts.push(await this.payoutRepo.save(driverPayout));

    // Vendor payout record (if driver is vendor-managed)
    if (vendorId && vendorCommission > 0) {
      const vendorPayout = this.payoutRepo.create({
        recipientType: 'vendor',
        recipientId: vendorId,
        recipientName: vendorName,
        rideId,
        countryCode,
        grossAmount,
        platformCommission: 0,
        vendorCommission: 0,
        taxAmount: 0,
        netPayout: vendorCommission, // Vendor receives their commission cut
        currency,
        status: 'pending',
      });
      payouts.push(await this.payoutRepo.save(vendorPayout));
    }

    await this.kafka.publish('taxi.payout.generated', {
      rideId,
      driverId,
      vendorId,
      driverPayout: driverNetPayout,
      vendorPayout: vendorCommission,
      platformCommission,
      currency,
    });

    this.logger.log(`💰 Payouts generated for ride ${rideId}: driver=${driverNetPayout} ${currency}, vendor=${vendorCommission} ${currency}`);
    return payouts;
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  /**
   * Get payouts for a specific recipient (driver or vendor).
   */
  async getPayoutsByRecipient(
    recipientType: 'vendor' | 'driver',
    recipientId: string,
    filters: { status?: string; page?: number; limit?: number } = {},
  ): Promise<{ data: TaxiPayoutRecordEntity[]; total: number; summary: PayoutSummary }> {
    const qb = this.payoutRepo.createQueryBuilder('p')
      .where('p.recipientType = :type', { type: recipientType })
      .andWhere('p.recipientId = :id', { id: recipientId });

    if (filters.status) {
      qb.andWhere('p.status = :status', { status: filters.status });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('p.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();

    // Calculate summary
    const summary = await this.calculatePayoutSummary(recipientType, recipientId);

    return { data, total, summary };
  }

  /**
   * Get all payouts with admin filters.
   */
  async getAllPayouts(filters: {
    countryCode?: string;
    recipientType?: 'vendor' | 'driver';
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TaxiPayoutRecordEntity[]; total: number }> {
    const qb = this.payoutRepo.createQueryBuilder('p');

    if (filters.countryCode) {
      qb.andWhere('p.countryCode = :cc', { cc: filters.countryCode });
    }
    if (filters.recipientType) {
      qb.andWhere('p.recipientType = :rt', { rt: filters.recipientType });
    }
    if (filters.status) {
      qb.andWhere('p.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere('(p.recipientName ILIKE :s OR p.rideId ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('p.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  // ─── Approval & Processing ────────────────────────────────────────────────

  /**
   * Approve a batch of payouts.
   */
  async approvePayoutBatch(payoutIds: string[], adminId: string): Promise<number> {
    const result = await this.payoutRepo
      .createQueryBuilder()
      .update()
      .set({
        status: 'approved',
        approvedBy: adminId,
        approvedAt: new Date(),
      })
      .where('id IN (:...ids)', { ids: payoutIds })
      .andWhere('status = :status', { status: 'pending' })
      .execute();

    const count = result.affected || 0;

    await this.kafka.publish('taxi.payout.batch.approved', {
      payoutIds,
      approvedBy: adminId,
      count,
    });

    this.logger.log(`✅ ${count} payouts approved by ${adminId}`);
    return count;
  }

  /**
   * Process approved payouts (trigger payment gateway transfers).
   */
  async processPayouts(payoutIds: string[]): Promise<{
    processed: number;
    failed: number;
  }> {
    const payouts = await this.payoutRepo.find({
      where: { id: In(payoutIds), status: 'approved' },
    });

    let processed = 0;
    let failed = 0;
    const batchId = `BATCH-${Date.now()}`;

    for (const payout of payouts) {
      try {
        payout.status = 'processing';
        payout.batchId = batchId;
        await this.payoutRepo.save(payout);

        // In production, integrate with payment gateway here.
        // For now, simulate successful processing.
        payout.status = 'settled';
        payout.settledAt = new Date();
        payout.transactionRef = `TXN-${Date.now()}-${payout.id.slice(0, 8)}`;
        await this.payoutRepo.save(payout);

        processed++;

        await this.kafka.publish('taxi.payout.settled', {
          payoutId: payout.id,
          recipientType: payout.recipientType,
          recipientId: payout.recipientId,
          amount: payout.netPayout,
          currency: payout.currency,
          transactionRef: payout.transactionRef,
        });
      } catch (error: any) {
        payout.status = 'failed';
        payout.failureReason = error.message || 'Processing failed';
        payout.retryCount += 1;
        await this.payoutRepo.save(payout);
        failed++;

        this.logger.error(`Failed to process payout ${payout.id}: ${error.message}`);
      }
    }

    this.logger.log(`💳 Batch ${batchId}: ${processed} processed, ${failed} failed`);
    return { processed, failed };
  }

  /**
   * Retry a failed payout.
   */
  async retryPayout(payoutId: string): Promise<TaxiPayoutRecordEntity> {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);

    if (payout.status !== 'failed') {
      throw new Error('Can only retry failed payouts');
    }

    payout.status = 'approved';
    payout.failureReason = null;

    return this.payoutRepo.save(payout);
  }

  // ─── Summary & Analytics ──────────────────────────────────────────────────

  /**
   * Get aggregated payout summary for a recipient.
   */
  private async calculatePayoutSummary(
    recipientType: 'vendor' | 'driver',
    recipientId: string,
  ): Promise<PayoutSummary> {
    const result = await this.payoutRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.grossAmount), 0)', 'totalGross')
      .addSelect('COALESCE(SUM(p.netPayout), 0)', 'totalNet')
      .addSelect('COALESCE(SUM(p.platformCommission), 0)', 'totalPlatformCommission')
      .addSelect('COALESCE(SUM(p.vendorCommission), 0)', 'totalVendorCommission')
      .addSelect('COUNT(*)', 'totalRecords')
      .where('p.recipientType = :type', { type: recipientType })
      .andWhere('p.recipientId = :id', { id: recipientId })
      .getRawOne();

    const pendingResult = await this.payoutRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.netPayout), 0)', 'pendingAmount')
      .addSelect('COUNT(*)', 'pendingCount')
      .where('p.recipientType = :type', { type: recipientType })
      .andWhere('p.recipientId = :id', { id: recipientId })
      .andWhere('p.status IN (:...statuses)', { statuses: ['pending', 'approved'] })
      .getRawOne();

    return {
      totalGross: parseFloat(result?.totalGross || '0'),
      totalNet: parseFloat(result?.totalNet || '0'),
      totalPlatformCommission: parseFloat(result?.totalPlatformCommission || '0'),
      totalVendorCommission: parseFloat(result?.totalVendorCommission || '0'),
      totalRecords: parseInt(result?.totalRecords || '0', 10),
      pendingAmount: parseFloat(pendingResult?.pendingAmount || '0'),
      pendingCount: parseInt(pendingResult?.pendingCount || '0', 10),
    };
  }

  /**
   * Get platform-wide payout summary filtered by country and date range.
   */
  async getPlatformPayoutSummary(filters: {
    countryCode?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PayoutSummary & { settledAmount: number; failedAmount: number }> {
    const qb = this.payoutRepo.createQueryBuilder('p')
      .select('COALESCE(SUM(p.grossAmount), 0)', 'totalGross')
      .addSelect('COALESCE(SUM(p.netPayout), 0)', 'totalNet')
      .addSelect('COALESCE(SUM(p.platformCommission), 0)', 'totalPlatformCommission')
      .addSelect('COALESCE(SUM(p.vendorCommission), 0)', 'totalVendorCommission')
      .addSelect('COUNT(*)', 'totalRecords');

    if (filters.countryCode) {
      qb.andWhere('p.countryCode = :cc', { cc: filters.countryCode });
    }
    if (filters.startDate) {
      qb.andWhere('p.createdAt >= :start', { start: filters.startDate });
    }
    if (filters.endDate) {
      qb.andWhere('p.createdAt <= :end', { end: filters.endDate });
    }

    const result = await qb.getRawOne();

    // Pending breakdown
    const pendingQb = this.payoutRepo.createQueryBuilder('p')
      .select('COALESCE(SUM(p.netPayout), 0)', 'amount')
      .addSelect('COUNT(*)', 'count')
      .where('p.status IN (:...statuses)', { statuses: ['pending', 'approved'] });
    if (filters.countryCode) pendingQb.andWhere('p.countryCode = :cc', { cc: filters.countryCode });
    const pendingResult = await pendingQb.getRawOne();

    // Settled breakdown
    const settledQb = this.payoutRepo.createQueryBuilder('p')
      .select('COALESCE(SUM(p.netPayout), 0)', 'amount')
      .where('p.status = :status', { status: 'settled' });
    if (filters.countryCode) settledQb.andWhere('p.countryCode = :cc', { cc: filters.countryCode });
    const settledResult = await settledQb.getRawOne();

    // Failed breakdown
    const failedQb = this.payoutRepo.createQueryBuilder('p')
      .select('COALESCE(SUM(p.netPayout), 0)', 'amount')
      .where('p.status = :status', { status: 'failed' });
    if (filters.countryCode) failedQb.andWhere('p.countryCode = :cc', { cc: filters.countryCode });
    const failedResult = await failedQb.getRawOne();

    return {
      totalGross: parseFloat(result?.totalGross || '0'),
      totalNet: parseFloat(result?.totalNet || '0'),
      totalPlatformCommission: parseFloat(result?.totalPlatformCommission || '0'),
      totalVendorCommission: parseFloat(result?.totalVendorCommission || '0'),
      totalRecords: parseInt(result?.totalRecords || '0', 10),
      pendingAmount: parseFloat(pendingResult?.amount || '0'),
      pendingCount: parseInt(pendingResult?.count || '0', 10),
      settledAmount: parseFloat(settledResult?.amount || '0'),
      failedAmount: parseFloat(failedResult?.amount || '0'),
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayoutSummary {
  totalGross: number;
  totalNet: number;
  totalPlatformCommission: number;
  totalVendorCommission: number;
  totalRecords: number;
  pendingAmount: number;
  pendingCount: number;
}
