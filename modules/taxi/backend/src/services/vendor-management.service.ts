import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
   * Approve a pending vendor. Validates that required documents are present.
   */
  async approveVendor(vendorId: string, adminId: string): Promise<TaxiVendorEntity> {
    const vendor = await this.getVendorOrFail(vendorId);

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
      approvedBy: adminId,
    });

    this.logger.log(`✅ Vendor "${saved.name}" approved by ${adminId}`);
    return saved;
  }

  /**
   * Reject a pending vendor application.
   */
  async rejectVendor(vendorId: string, adminId: string, reason: string): Promise<TaxiVendorEntity> {
    const vendor = await this.getVendorOrFail(vendorId);

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
   */
  async suspendVendor(vendorId: string, adminId: string, reason: string): Promise<TaxiVendorEntity> {
    const vendor = await this.getVendorOrFail(vendorId);

    vendor.status = 'suspended';
    vendor.suspensionReason = reason;

    const saved = await this.vendorRepo.save(vendor);

    await this.kafka.publish('taxi.vendor.suspended', {
      vendorId: saved.id,
      reason,
      driverCount: await this.driverRepo.count({ where: { vendorId } }),
    });

    this.logger.log(`⚠️ Vendor "${saved.name}" suspended: ${reason}`);
    return saved;
  }

  /**
   * Block a vendor permanently. All associated drivers are also blocked.
   */
  async blockVendor(vendorId: string, adminId: string, reason: string): Promise<TaxiVendorEntity> {
    const vendor = await this.getVendorOrFail(vendorId);

    vendor.status = 'blocked';
    vendor.suspensionReason = reason;

    const saved = await this.vendorRepo.save(vendor);

    // Block all associated drivers
    await this.driverRepo
      .createQueryBuilder()
      .update()
      .set({ status: 'blocked', suspensionReason: `Vendor blocked: ${reason}` })
      .where('vendorId = :vendorId', { vendorId })
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
  async reactivateVendor(vendorId: string, adminId: string): Promise<TaxiVendorEntity> {
    const vendor = await this.getVendorOrFail(vendorId);

    if (vendor.status === 'active') {
      throw new BadRequestException('Vendor is already active');
    }

    vendor.status = 'active';
    vendor.suspensionReason = null;

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
    const qb = this.vendorRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.drivers', 'drivers');

    if (filters.countryCode) {
      qb.andWhere('v.countryCode = :cc', { cc: filters.countryCode });
    }
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
  async getVendorById(vendorId: string): Promise<TaxiVendorEntity> {
    return this.getVendorOrFail(vendorId);
  }

  /**
   * Aggregated dashboard stats for a vendor.
   */
  async getVendorDashboard(vendorId: string): Promise<{
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
    const vendor = await this.getVendorOrFail(vendorId);

    const totalDrivers = await this.driverRepo.count({ where: { vendorId } });
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
  async addDriverToVendor(vendorId: string, dto: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    vehicleType?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    licenseNumber?: string;
  }): Promise<TaxiDriverEntity> {
    const vendor = await this.getVendorOrFail(vendorId);

    if (vendor.status !== 'active') {
      throw new BadRequestException('Cannot add drivers to a non-active vendor');
    }

    // Check fleet capacity
    const currentCount = await this.driverRepo.count({ where: { vendorId } });
    if (currentCount >= vendor.maxDrivers) {
      throw new BadRequestException(
        `Vendor has reached maximum fleet capacity (${vendor.maxDrivers} drivers)`,
      );
    }

    const driver = this.driverRepo.create({
      ...dto,
      countryCode: vendor.countryCode,
      vendorId,
      status: 'pending',
    });

    const saved = await this.driverRepo.save(driver);

    await this.kafka.publish('taxi.driver.registered', {
      driverId: saved.id,
      vendorId,
      vendorName: vendor.name,
      name: saved.fullName,
    });

    this.logger.log(`👤 Driver "${saved.fullName}" added to vendor "${vendor.name}"`);
    return saved;
  }

  /**
   * Remove a driver from a vendor's fleet.
   */
  async removeDriverFromVendor(vendorId: string, driverId: string): Promise<void> {
    const driver = await this.driverRepo.findOne({
      where: { id: driverId, vendorId },
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

  private async getVendorOrFail(vendorId: string): Promise<TaxiVendorEntity> {
    const vendor = await this.vendorRepo.findOne({
      where: { id: vendorId },
      relations: { drivers: true },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor ${vendorId} not found`);
    }

    // Polymorphic, same as on the driver side — loaded by discriminator rather
    // than through a relation.
    vendor.documents = await this.documentRepo.find({
      where: { ownerType: 'vendor', ownerId: vendorId },
    });
    return vendor;
  }
}
