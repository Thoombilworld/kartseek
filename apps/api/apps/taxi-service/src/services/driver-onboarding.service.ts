import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KafkaProducerService } from '@app/kafka';
import { TaxiDriverEntity } from '../entities/taxi-driver.entity';
import { TaxiDocumentEntity } from '../entities/taxi-document.entity';
import { TaxiCountryConfigEntity } from '../entities/taxi-country-config.entity';

/**
 * DriverOnboardingService — Driver registration and document management.
 *
 * Handles:
 *  - Independent driver self-registration
 *  - Document submission and review lifecycle
 *  - Onboarding progress tracking (% of required docs approved)
 *  - Admin approval workflow
 *  - Document expiry monitoring
 */
@Injectable()
export class DriverOnboardingService {
  private readonly logger = new Logger(DriverOnboardingService.name);

  constructor(
    @InjectRepository(TaxiDriverEntity)
    private readonly driverRepo: Repository<TaxiDriverEntity>,
    @InjectRepository(TaxiDocumentEntity)
    private readonly documentRepo: Repository<TaxiDocumentEntity>,
    @InjectRepository(TaxiCountryConfigEntity)
    private readonly configRepo: Repository<TaxiCountryConfigEntity>,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ─── Driver Registration ──────────────────────────────────────────────────

  /**
   * Register an independent driver (not through a vendor).
   */
  async registerIndependentDriver(dto: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    countryCode: string;
    vehicleType?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    licenseNumber?: string;
    bankDetails?: TaxiDriverEntity['bankDetails'];
  }): Promise<TaxiDriverEntity> {
    const driver = this.driverRepo.create({
      ...dto,
      status: 'pending',
      vendorId: null,
    });

    const saved = await this.driverRepo.save(driver);

    await this.kafka.publish('taxi.driver.registered', {
      driverId: saved.id,
      name: saved.fullName,
      countryCode: saved.countryCode,
      isIndependent: true,
    });

    this.logger.log(`📋 Independent driver "${saved.fullName}" registered (${saved.id})`);
    return saved;
  }

  // ─── Document Management ──────────────────────────────────────────────────

  /**
   * Submit a document for a driver or vendor.
   */
  async submitDocument(dto: {
    ownerType: 'vendor' | 'driver';
    ownerId: string;
    documentType: string;
    fileUrl: string;
    fileName: string;
    displayName: string;
    mimeType?: string;
    fileSizeBytes?: number;
    documentNumber?: string;
    expiresAt?: Date;
    issuingCountry?: string;
  }): Promise<TaxiDocumentEntity> {
    // Check for existing document of same type — replace if rejected/expired
    const existing = await this.documentRepo.findOne({
      where: {
        ownerType: dto.ownerType,
        ownerId: dto.ownerId,
        documentType: dto.documentType,
      },
    });

    if (existing && existing.status === 'approved') {
      throw new BadRequestException(
        `An approved ${dto.documentType} document already exists. Contact support to replace it.`,
      );
    }

    // If resubmitting after rejection, update the existing record
    if (existing) {
      existing.fileUrl = dto.fileUrl;
      existing.fileName = dto.fileName;
      existing.displayName = dto.displayName;
      existing.mimeType = dto.mimeType ?? existing.mimeType;
      existing.fileSizeBytes = dto.fileSizeBytes ?? existing.fileSizeBytes;
      existing.documentNumber = dto.documentNumber ?? existing.documentNumber;
      existing.expiresAt = dto.expiresAt ?? existing.expiresAt;
      existing.issuingCountry = dto.issuingCountry ?? existing.issuingCountry;
      existing.status = 'pending';
      existing.rejectionReason = null;
      existing.reviewedBy = null;
      existing.reviewedAt = null;

      const saved = await this.documentRepo.save(existing);

      await this.kafka.publish('taxi.driver.document.resubmitted', {
        documentId: saved.id,
        ownerType: dto.ownerType,
        ownerId: dto.ownerId,
        documentType: dto.documentType,
      });

      this.logger.log(`📄 Document resubmitted: ${dto.documentType} for ${dto.ownerType} ${dto.ownerId}`);
      return saved;
    }

    // Create new document record
    const doc = this.documentRepo.create({
      ...dto,
      status: 'pending',
    });

    const saved = await this.documentRepo.save(doc);

    await this.kafka.publish('taxi.driver.document.submitted', {
      documentId: saved.id,
      ownerType: dto.ownerType,
      ownerId: dto.ownerId,
      documentType: dto.documentType,
    });

    // Recalculate onboarding progress
    if (dto.ownerType === 'driver') {
      await this.recalculateOnboardingProgress(dto.ownerId);
    }

    this.logger.log(`📄 Document submitted: ${dto.documentType} for ${dto.ownerType} ${dto.ownerId}`);
    return saved;
  }

  /**
   * Admin reviews a document — approve or reject.
   */
  async reviewDocument(
    documentId: string,
    adminId: string,
    decision: 'approved' | 'rejected',
    rejectionReason?: string,
  ): Promise<TaxiDocumentEntity> {
    const doc = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    doc.status = decision;
    doc.reviewedBy = adminId;
    doc.reviewedAt = new Date();
    doc.rejectionReason = decision === 'rejected' ? (rejectionReason || 'Document rejected') : null;

    const saved = await this.documentRepo.save(doc);

    await this.kafka.publish(`taxi.document.${decision}`, {
      documentId: saved.id,
      ownerType: saved.ownerType,
      ownerId: saved.ownerId,
      documentType: saved.documentType,
      reviewedBy: adminId,
      rejectionReason: saved.rejectionReason,
    });

    // Recalculate onboarding progress for drivers
    if (doc.ownerType === 'driver') {
      await this.recalculateOnboardingProgress(doc.ownerId);
    }

    this.logger.log(`${decision === 'approved' ? '✅' : '❌'} Document ${doc.documentType} ${decision} for ${doc.ownerType} ${doc.ownerId}`);
    return saved;
  }

  /**
   * Get all documents for a driver or vendor.
   */
  async getDocuments(ownerType: 'vendor' | 'driver', ownerId: string): Promise<TaxiDocumentEntity[]> {
    return this.documentRepo.find({
      where: { ownerType, ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get documents pending review across all vendors/drivers.
   */
  async getPendingDocuments(filters: {
    countryCode?: string;
    ownerType?: 'vendor' | 'driver';
    page?: number;
    limit?: number;
  }): Promise<{ data: TaxiDocumentEntity[]; total: number }> {
    const qb = this.documentRepo.createQueryBuilder('d')
      .where('d.status IN (:...statuses)', { statuses: ['pending', 'under_review'] });

    if (filters.ownerType) {
      qb.andWhere('d.ownerType = :ot', { ot: filters.ownerType });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('d.createdAt', 'ASC'); // Oldest first for review queue

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  // ─── Onboarding Progress ──────────────────────────────────────────────────

  /**
   * Check if a driver's onboarding is complete (all required docs approved).
   */
  async checkOnboardingComplete(driverId: string): Promise<{
    isComplete: boolean;
    progress: number;
    requiredDocuments: string[];
    approvedDocuments: string[];
    missingDocuments: string[];
    rejectedDocuments: string[];
  }> {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    // Get required docs for this country
    const config = await this.configRepo.findOne({
      where: { countryCode: driver.countryCode },
    });
    const requiredDocuments = config?.requiredDriverDocuments || [
      'driving_license', 'vehicle_registration', 'vehicle_insurance', 'identity_proof',
    ];

    // Get submitted docs
    const docs = await this.documentRepo.find({
      where: { ownerType: 'driver', ownerId: driverId },
    });

    const approvedDocuments = docs
      .filter(d => d.status === 'approved')
      .map(d => d.documentType);

    const rejectedDocuments = docs
      .filter(d => d.status === 'rejected')
      .map(d => d.documentType);

    const missingDocuments = requiredDocuments.filter(
      r => !approvedDocuments.includes(r),
    );

    const progress = requiredDocuments.length > 0
      ? Math.round((approvedDocuments.length / requiredDocuments.length) * 100)
      : 100;

    return {
      isComplete: missingDocuments.length === 0,
      progress,
      requiredDocuments,
      approvedDocuments,
      missingDocuments,
      rejectedDocuments,
    };
  }

  /**
   * Recalculate and persist onboarding progress for a driver.
   */
  private async recalculateOnboardingProgress(driverId: string): Promise<void> {
    try {
      const result = await this.checkOnboardingComplete(driverId);
      await this.driverRepo.update(driverId, {
        onboardingProgress: result.progress,
        ...(result.isComplete ? { status: 'onboarding' as const } : {}),
      });

      if (result.isComplete) {
        await this.kafka.publish('taxi.driver.onboarding.complete', {
          driverId,
          progress: result.progress,
        });
        this.logger.log(`🎉 Driver ${driverId} onboarding complete — ready for admin approval`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to recalculate onboarding for ${driverId}: ${err.message}`);
    }
  }

  // ─── Admin Approval ───────────────────────────────────────────────────────

  /**
   * Approve a driver — sets status to 'active'.
   */
  async approveDriver(driverId: string, adminId: string): Promise<TaxiDriverEntity> {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException(`Driver ${driverId} not found`);

    driver.status = 'active';
    driver.approvedBy = adminId;
    driver.approvedAt = new Date();
    driver.suspensionReason = null;

    const saved = await this.driverRepo.save(driver);

    await this.kafka.publish('taxi.driver.approved', {
      driverId: saved.id,
      name: saved.fullName,
      vendorId: saved.vendorId,
      approvedBy: adminId,
    });

    this.logger.log(`✅ Driver "${saved.fullName}" approved by ${adminId}`);
    return saved;
  }

  /**
   * Suspend a driver.
   */
  async suspendDriver(driverId: string, reason: string): Promise<TaxiDriverEntity> {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException(`Driver ${driverId} not found`);

    driver.status = 'suspended';
    driver.suspensionReason = reason;

    const saved = await this.driverRepo.save(driver);

    await this.kafka.publish('taxi.driver.suspended', {
      driverId: saved.id, name: saved.fullName, reason,
    });

    this.logger.log(`⚠️ Driver "${saved.fullName}" suspended: ${reason}`);
    return saved;
  }

  /**
   * Block a driver permanently.
   */
  async blockDriver(driverId: string, reason: string): Promise<TaxiDriverEntity> {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException(`Driver ${driverId} not found`);

    driver.status = 'blocked';
    driver.suspensionReason = reason;

    return this.driverRepo.save(driver);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  /**
   * Get drivers with filters.
   */
  async getDrivers(filters: {
    countryCode?: string;
    vendorId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TaxiDriverEntity[]; total: number }> {
    const qb = this.driverRepo.createQueryBuilder('d')
      .leftJoinAndSelect('d.vendor', 'vendor');

    if (filters.countryCode) {
      qb.andWhere('d.countryCode = :cc', { cc: filters.countryCode });
    }
    if (filters.vendorId) {
      qb.andWhere('d.vendorId = :vid', { vid: filters.vendorId });
    }
    if (filters.vendorId === null || filters.vendorId === 'independent') {
      qb.andWhere('d.vendorId IS NULL');
    }
    if (filters.status) {
      qb.andWhere('d.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere('(d.firstName ILIKE :s OR d.lastName ILIKE :s OR d.email ILIKE :s OR d.vehiclePlate ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('d.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * Get a single driver by ID.
   */
  async getDriverById(driverId: string): Promise<TaxiDriverEntity> {
    const driver = await this.driverRepo.findOne({
      where: { id: driverId },
      relations: { vendor: true, documents: true },
    });
    if (!driver) throw new NotFoundException(`Driver ${driverId} not found`);
    return driver;
  }
}
