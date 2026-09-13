import { applyMarketFilter, assertRecordMarket, requireUuid } from '@app/common';
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KafkaProducerService } from '@app/kafka';
import { TaxiVendorEntity } from '../entities/taxi-vendor.entity';
import { TaxiDriverEntity } from '../entities/taxi-driver.entity';
import { TaxiDocumentEntity } from '../entities/taxi-document.entity';

/**
 * VendorManagementService — Core vendor lifecycle management.
 *
 * Handles vendor registration, approval workflows, fleet oversight,
 * and vendor-level analytics. All vendor status changes are auditable
 * and emit Kafka events for cross-service notification.
 */
@Injectable()
export class VendorManagementService {
  private readonly logger = new Logger(VendorManagementService.name);

  constructor(
    @InjectRepository(TaxiVendorEntity)
    private readonly vendorRepo: Repository<TaxiVendorEntity>,
    @InjectRepository(TaxiDriverEntity)
    private readonly driverRepo: Repository<TaxiDriverEntity>,
    @InjectRepository(TaxiDocumentEntity)
    private readonly documentRepo: Repository<TaxiDocumentEntity>,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ─── Registration ──────────────────────────────────────────────────────────

  /**
   * Register a new vendor. Status defaults to 'pending' until admin approval.
   */
  async registerVendor(dto: {
    name: string;
    countryCode: string;
    city: string;
    ownerName: string;
    email: string;
    phone: string;
    businessLicenseNo?: string;
    maxDrivers?: number;
    bankDetails?: TaxiVendorEntity['bankDetails'];
    address?: TaxiVendorEntity['address'];
  }): Promise<TaxiVendorEntity> {
    // Check for duplicate email
    const existing = await this.vendorRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Vendor with email ${dto.email} already exists`);
    }

    const vendor = this.vendorRepo.create({
      ...dto,
      status: 'pending',
    });

    const saved = await this.vendorRepo.save(vendor);

    await this.kafka.publish('taxi.vendor.registered', {
      vendorId: saved.id,
      name: saved.name,
      countryCode: saved.countryCode,
      email: saved.email,
    });

    this.logger.log(`📋 Vendor "${saved.name}" registered (${saved.id}) — pending approval`);
    return saved;
  }

  // ─── Approval Workflow ─────────────────────────────────────────────────────

  /**
   * Approve a pending vendor, in the caller's own market.
   *
   * `scope` is asserted against the vendor's `countryCode` by `getVendorOrFail`
   * BEFORE anything is written, so a refused decision leaves the row and the
   * event stream untouched — `admin-scope.spec.ts` asserts exactly that.
   */
  async approveVendor(
    vendorId: string,
    adminId: string,
    scope?: string,
  ): Promise<TaxiVendorEntity> {
    const vendor = await this.getVendorOrFail(vendorId, scope);

    if (vendor.status === 'active') {
      throw new BadRequestException('Vendor is already active');
    }

    vendor.status = 'active';
    vendor.approvedBy = adminId;
    vendor.approvedAt = new Date();
    vendor.suspensionReason = null;

    const saved = await this.vendorRepo.save(vendor);

    await this.kafka.publish('taxi.vendor.approved', {
      vendorId: saved.id,
      name: saved.name,
      countryCode: saved.countryCode,
      approvedBy: adminId,
    });

    this.logger.log(`✅ Vendor "${saved.name}" approved by ${adminId}`);
    return saved;
  }

  /**
   * Reject a pending vendor application.
   */
  async rejectVendor(
    vendorId: string,
    adminId: string,
    reason: string,
    scope?: string,
  ): Promise<TaxiVendorEntity> {
    const vendor = await this.getVendorOrFail(vendorId, scope);

    vendor.status = 'rejected';
    vendor.suspensionReason = reason;

    const saved = await this.vendorRepo.save(vendor);

    await this.kafka.publish('taxi.vendor.rejected', {
      vendorId: saved.id,
      reason,
    });

    this.logger.log(`❌ Vendor "${saved.name}" rejected: ${reason}`);
    return saved;
  }

  /**
   * Suspend an active vendor. Their drivers will be prevented from going online.
   *
   * The actor is RECORDED, not merely logged. `adminId` used to reach this
   * method, appear in one log line and be discarded, so a fleet went off the
   * road with a record of why and none of who; `suspendedBy`/`suspendedAt` are
   * this task's one piece of new storage
   * (`migrations/1786503400000-TaxiAdminApprovals.ts`).
   */
  async suspendVendor(
    vendorId: string,
    adminId: string,
    reason: string,
    scope?: string,
  ): Promise<TaxiVendorEntity> {
    const vendor = await this.getVendorOrFail(vendorId, scope);

    vendor.status = 'suspended';
    vendor.suspensionReason = reason;
    vendor.suspendedBy = adminId;
    vendor.suspendedAt = new Date();

    const saved = await this.vendorRepo.save(vendor);

    await this.kafka.publish('taxi.vendor.suspended', {
      vendorId: saved.id,
      countryCode: saved.countryCode,
      reason,
      suspendedBy: adminId,
      driverCount: await this.driverRepo.count({ where: { vendorId: saved.id } }),
    });

    this.logger.log(`⚠️ Vendor "${saved.name}" suspended: ${reason}`);
    return saved;
  }

  /**
   * Block a vendor permanently. All associated drivers are also blocked.
   */
  async blockVendor(
    vendorId: string,
    adminId: string,
    reason: string,
    scope?: string,
  ): Promise<TaxiVendorEntity> {
    const vendor = await this.getVendorOrFail(vendorId, scope);

    vendor.status = 'blocked';
    vendor.suspensionReason = reason;
    vendor.suspendedBy = adminId;
    vendor.suspendedAt = new Date();

    const saved = await this.vendorRepo.save(vendor);

    // Block all associated drivers
    await this.driverRepo
      .createQueryBuilder()
      .update()
      .set({ status: 'blocked', suspensionReason: `Vendor blocked: ${reason}` })
      .where('vendorId = :vendorId', { vendorId: saved.id })
      .execute();

    await this.kafka.publish('taxi.vendor.blocked', {
      vendorId: saved.id,
      reason,
    });

    this.logger.log(`🚫 Vendor "${saved.name}" blocked: ${reason}`);
    return saved;
  }

  /**
   * Reactivate a suspended or blocked vendor.
   */
  async reactivateVendor(
    vendorId: string,
    adminId: string,
    scope?: string,
  ): Promise<TaxiVendorEntity> {
    const vendor = await this.getVendorOrFail(vendorId, scope);

    if (vendor.status === 'active') {
      throw new BadRequestException('Vendor is already active');
    }

    vendor.status = 'active';
    vendor.suspensionReason = null;
    vendor.suspendedBy = null;
    vendor.suspendedAt = null;

    const saved = await this.vendorRepo.save(vendor);

    await this.kafka.publish('taxi.vendor.reactivated', {
      vendorId: saved.id,
      reactivatedBy: adminId,
    });

    this.logger.log(`🟢 Vendor "${saved.name}" reactivated by ${adminId}`);
    return saved;
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  /**
   * Get vendors filtered by country, status, and search term.
   */
  async getVendors(filters: {
    countryCode?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TaxiVendorEntity[]; total: number }> {
    const qb = this.vendorRepo.createQueryBuilder('v').leftJoinAndSelect('v.drivers', 'drivers');

    applyMarketFilter(qb, 'v.countryCode', filters.countryCode);
    if (filters.status) {
      qb.andWhere('v.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere('(v.name ILIKE :s OR v.ownerName ILIKE :s OR v.email ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('v.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * Get a single vendor by ID with relations loaded.
   */
  async getVendorById(vendorId: string, scope?: string): Promise<TaxiVendorEntity> {
    return this.getVendorOrFail(vendorId, scope);
  }

  /**
   * Aggregated dashboard stats for a vendor.
   */
  async getVendorDashboard(
    vendorId: string,
    scope?: string,
  ): Promise<{
    vendor: TaxiVendorEntity;
    stats: {
      totalDrivers: number;
      activeDrivers: number;
      pendingDrivers: number;
      totalTrips: number;
      averageRating: number;
      totalDocuments: number;
      pendingDocuments: number;
    };
  }> {
    const vendor = await this.getVendorOrFail(vendorId, scope);
    const id = vendor.id;

    const totalDrivers = await this.driverRepo.count({ where: { vendorId: id } });
    const activeDrivers = await this.driverRepo.count({
      where: { vendorId, status: 'active' },
    });
    const pendingDrivers = await this.driverRepo.count({
      where: { vendorId, status: 'pending' },
    });

    // Aggregate trip counts from drivers
    const tripResult = await this.driverRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.totalTrips), 0)', 'totalTrips')
      .addSelect('COALESCE(AVG(d.rating), 0)', 'avgRating')
      .where('d.vendorId = :vendorId', { vendorId })
      .getRawOne();

    const totalDocuments = await this.documentRepo.count({
      where: { ownerType: 'vendor', ownerId: vendorId },
    });
    const pendingDocuments = await this.documentRepo.count({
      where: { ownerType: 'vendor', ownerId: vendorId, status: 'pending' },
    });

    return {
      vendor,
      stats: {
        totalDrivers,
        activeDrivers,
        pendingDrivers,
        totalTrips: parseInt(tripResult?.totalTrips || '0', 10),
        averageRating: parseFloat(tripResult?.avgRating || '0'),
        totalDocuments,
        pendingDocuments,
      },
    };
  }

  // ─── Driver Management (Vendor-Scoped) ────────────────────────────────────

  /**
   * Add a driver to a vendor's fleet.
   */
  async addDriverToVendor(
    vendorId: string,
    dto: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      vehicleType?: string;
      vehiclePlate?: string;
      vehicleModel?: string;
      vehicleColor?: string;
      licenseNumber?: string;
    },
    scope?: string,
  ): Promise<TaxiDriverEntity> {
    const vendor = await this.getVendorOrFail(vendorId, scope);

    if (vendor.status !== 'active') {
      throw new BadRequestException('Cannot add drivers to a non-active vendor');
    }

    // Check fleet capacity
    const currentCount = await this.driverRepo.count({ where: { vendorId: vendor.id } });
    if (currentCount >= vendor.maxDrivers) {
      throw new BadRequestException(
        `Vendor has reached maximum fleet capacity (${vendor.maxDrivers} drivers)`,
      );
    }

    const driver = this.driverRepo.create({
      ...dto,
      countryCode: vendor.countryCode,
      vendorId: vendor.id,
      status: 'pending',
    });

    const saved = await this.driverRepo.save(driver);

    await this.kafka.publish('taxi.driver.registered', {
      driverId: saved.id,
      vendorId: vendor.id,
      vendorName: vendor.name,
      countryCode: saved.countryCode,
      name: saved.fullName,
    });

    this.logger.log(`👤 Driver "${saved.fullName}" added to vendor "${vendor.name}"`);
    return saved;
  }

  /**
   * Remove a driver from a vendor's fleet.
   */
  async removeDriverFromVendor(vendorId: string, driverId: string, scope?: string): Promise<void> {
    // Load the vendor first so the caller's market is asserted before the
    // driver is touched — otherwise a locked admin could unseat a driver from
    // another market's fleet by naming both ids.
    const vendor = await this.getVendorOrFail(vendorId, scope);
    const driver = await this.driverRepo.findOne({
      where: { id: requireUuid(driverId, 'driver'), vendorId: vendor.id },
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found under vendor ${vendorId}`);
    }

    driver.vendorId = null;
    driver.status = 'suspended';
    driver.suspensionReason = 'Removed from vendor fleet';

    await this.driverRepo.save(driver);

    this.logger.log(`👤 Driver "${driver.fullName}" removed from vendor ${vendorId}`);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * The vendor a read or decision addresses, and the refusal when it is not the
   * caller's.
   *
   * ── `scope`, and why it is threaded through every caller ────────────────────
   *
   * `scope` is the caller's market lock, written only by the gateway and only
   * from the signed token (`{ scope, actorId, … }` — the plan's handler
   * contract). `undefined` means a genuinely global administrator and asserts
   * nothing; anything else must match the vendor's own `countryCode` or the
   * decision is refused with the platform's fixed backend copy and the
   * `[region-scope-denied]` log prefix.
   *
   * It is asserted HERE rather than in the admin service so that every path into
   * a vendor decision is covered by one check — the TCP handlers M7 added, and
   * the `/admin/vendors/*` routes on this service's own HTTP port, which are a
   * second, unscoped admin surface until M8 closes it.
   *
   * `assertRecordMarket` keeps "no such id" (404) and "not your market" (403)
   * apart: asserting on a row that was never checked for existence reports a
   * typo as a permission problem. `requireUuid` turns a malformed id into a 400
   * rather than letting Postgres answer `invalid input syntax for type uuid`
   * with a 500 carrying the column's type.
   */
  private async getVendorOrFail(vendorId: string, scope?: string): Promise<TaxiVendorEntity> {
    const id = requireUuid(vendorId, 'vendor');
    const vendor = await this.vendorRepo.findOne({
      where: { id },
      relations: { drivers: true },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor ${id} not found`);
    }
    assertRecordMarket(vendor, 'countryCode', scope, 'vendor', this.logger);

    // Polymorphic, same as on the driver side — loaded by discriminator rather
    // than through a relation.
    vendor.documents = await this.documentRepo.find({
      where: { ownerType: 'vendor', ownerId: id },
    });
    return vendor;
  }
}
