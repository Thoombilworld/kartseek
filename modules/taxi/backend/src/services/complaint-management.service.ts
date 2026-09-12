import { applyMarketFilter, requireMarket } from '@app/common';
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, ILike } from 'typeorm';
import { TaxiComplaintEntity } from '../entities/taxi-complaint.entity';
import { TaxiDisciplinaryActionEntity } from '../entities/taxi-disciplinary-action.entity';
import { TaxiDriverEntity } from '../entities/taxi-driver.entity';
import { TaxiVendorEntity } from '../entities/taxi-vendor.entity';

/**
 * ComplaintManagementService — Handles the full complaint lifecycle.
 *
 * Responsibilities:
 * - Filing complaints with automatic accountability assignment
 * - Investigation and escalation workflows
 * - Resolution with disciplinary action enforcement
 * - SLA tracking and breach detection
 * - Accountability tracing (vendor vs platform)
 * - Disciplinary action management with appeal support
 */
@Injectable()
export class ComplaintManagementService {
  private readonly logger = new Logger(ComplaintManagementService.name);

  constructor(
    @InjectRepository(TaxiComplaintEntity)
    private readonly complaintRepo: Repository<TaxiComplaintEntity>,
    @InjectRepository(TaxiDisciplinaryActionEntity)
    private readonly actionRepo: Repository<TaxiDisciplinaryActionEntity>,
    @InjectRepository(TaxiDriverEntity)
    private readonly driverRepo: Repository<TaxiDriverEntity>,
    @InjectRepository(TaxiVendorEntity)
    private readonly vendorRepo: Repository<TaxiVendorEntity>,
  ) {}

  // ─── Complaint Filing ───────────────────────────────────────────────────────

  /**
   * File a new complaint. Automatically determines accountability chain
   * (vendor or platform) based on the driver's vendor affiliation.
   */
  async fileComplaint(dto: {
    tripId: string;
    countryCode: string;
    filedBy: 'customer' | 'driver' | 'vendor' | 'internal';
    filerId: string;
    filerName: string;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence?: { type: string; url: string; uploadedAt: string }[];
    driverId?: string;
    tripContext?: TaxiComplaintEntity['tripContext'];
  }): Promise<TaxiComplaintEntity> {
    const complaint = this.complaintRepo.create({
      tripId: dto.tripId,
      countryCode: dto.countryCode,
      filedBy: dto.filedBy,
      filerId: dto.filerId,
      filerName: dto.filerName,
      category: dto.category,
      severity: dto.severity,
      description: dto.description,
      evidence: dto.evidence ?? [],
      tripContext: dto.tripContext,
      status: 'open',
    });

    // Resolve accountability chain if a driver is specified
    if (dto.driverId) {
      const driver = await this.driverRepo.findOne({
        where: { id: dto.driverId },
        relations: { vendor: true },
      });

      if (driver) {
        complaint.driverId = driver.id;
        complaint.driverName = driver.fullName;

        if (driver.vendor) {
          // Vendor-managed driver — vendor bears accountability
          complaint.vendorId = driver.vendor.id;
          complaint.vendorName = driver.vendor.name;
          complaint.accountability = 'vendor';
        } else {
          // Independent driver — platform bears accountability
          complaint.accountability = 'platform';
        }
      }
    }

    // Set SLA deadline based on severity
    const slaHours: Record<string, number> = {
      critical: 4,
      high: 24,
      medium: 72,
      low: 168, // 1 week
    };
    complaint.slaDeadline = new Date(Date.now() + (slaHours[dto.severity] || 72) * 60 * 60 * 1000);

    const saved = await this.complaintRepo.save(complaint);
    this.logger.log(
      `Complaint filed: ${saved.id} | Trip: ${saved.tripId} | Severity: ${saved.severity} | Accountability: ${saved.accountability}`,
    );

    // Auto-escalate critical complaints
    if (dto.severity === 'critical') {
      await this.escalateComplaint(saved.id, 'system', 'Auto-escalated: critical severity');
    }

    return saved;
  }

  // ─── Complaint Queries ──────────────────────────────────────────────────────

  /** List complaints with filters — used by Super Admin dashboard */
  async listComplaints(filters: {
    countryCode?: string;
    status?: string;
    category?: string;
    severity?: string;
    accountability?: 'vendor' | 'platform';
    vendorId?: string;
    driverId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TaxiComplaintEntity[]; total: number }> {
    const qb = this.complaintRepo.createQueryBuilder('c');

    applyMarketFilter(qb, 'c.countryCode', filters.countryCode);
    if (filters.status) qb.andWhere('c.status = :status', { status: filters.status });
    if (filters.category) qb.andWhere('c.category = :cat', { cat: filters.category });
    if (filters.severity) qb.andWhere('c.severity = :sev', { sev: filters.severity });
    if (filters.accountability)
      qb.andWhere('c.accountability = :acc', { acc: filters.accountability });
    if (filters.vendorId) qb.andWhere('c.vendorId = :vid', { vid: filters.vendorId });
    if (filters.driverId) qb.andWhere('c.driverId = :did', { did: filters.driverId });
    if (filters.search) {
      qb.andWhere(
        '(c.tripId ILIKE :s OR c.filerName ILIKE :s OR c.driverName ILIKE :s OR c.description ILIKE :s)',
        { s: `%${filters.search}%` },
      );
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    qb.orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /** Get a single complaint with full details */
  async getComplaint(id: string): Promise<TaxiComplaintEntity> {
    const complaint = await this.complaintRepo.findOne({
      where: { id },
      relations: { driver: true, vendor: true },
    });
    if (!complaint) throw new NotFoundException(`Complaint ${id} not found`);
    return complaint;
  }

  /** Get complaints scoped to a vendor (vendor portal view) */
  async getVendorComplaints(
    vendorId: string,
    filters?: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: TaxiComplaintEntity[]; total: number }> {
    return this.listComplaints({ ...filters, vendorId });
  }

  /** Get complaint history for a specific driver */
  async getDriverComplaintHistory(driverId: string): Promise<TaxiComplaintEntity[]> {
    return this.complaintRepo.find({
      where: { driverId },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Complaint Lifecycle ────────────────────────────────────────────────────

  /** Assign a complaint to an admin for investigation */
  async assignComplaint(
    id: string,
    assignedTo: string,
    assignedToName: string,
  ): Promise<TaxiComplaintEntity> {
    const complaint = await this.getComplaint(id);
    complaint.assignedTo = assignedTo;
    complaint.assignedToName = assignedToName;
    complaint.status = 'investigating';
    return this.complaintRepo.save(complaint);
  }

  /** Escalate a complaint to higher priority */
  async escalateComplaint(
    id: string,
    escalatedBy: string,
    reason: string,
  ): Promise<TaxiComplaintEntity> {
    const complaint = await this.getComplaint(id);
    complaint.escalationLevel += 1;
    complaint.escalatedAt = new Date();
    complaint.status = 'escalated';
    complaint.internalNotes = [
      complaint.internalNotes,
      `[ESCALATED L${complaint.escalationLevel} by ${escalatedBy}] ${reason}`,
    ]
      .filter(Boolean)
      .join('\n');
    return this.complaintRepo.save(complaint);
  }

  /** Resolve a complaint with an action */
  async resolveComplaint(
    id: string,
    dto: {
      resolution: string;
      actionTaken: string;
      compensationAmount?: number;
      resolvedBy: string;
    },
  ): Promise<TaxiComplaintEntity> {
    const complaint = await this.getComplaint(id);
    complaint.status = 'resolved';
    complaint.resolution = dto.resolution;
    complaint.actionTaken = dto.actionTaken;
    complaint.compensationAmount = dto.compensationAmount ?? null;
    complaint.resolvedAt = new Date();
    complaint.resolvedBy = dto.resolvedBy;
    const saved = await this.complaintRepo.save(complaint);

    this.logger.log(`Complaint ${id} resolved: ${dto.actionTaken} | by ${dto.resolvedBy}`);
    return saved;
  }

  /** Dismiss a complaint */
  async dismissComplaint(
    id: string,
    reason: string,
    dismissedBy: string,
  ): Promise<TaxiComplaintEntity> {
    const complaint = await this.getComplaint(id);
    complaint.status = 'dismissed';
    complaint.resolution = `DISMISSED: ${reason}`;
    complaint.resolvedAt = new Date();
    complaint.resolvedBy = dismissedBy;
    return this.complaintRepo.save(complaint);
  }

  // ─── Disciplinary Actions ───────────────────────────────────────────────────

  /** Issue a disciplinary action against a driver or vendor */
  async issueDisciplinaryAction(dto: {
    complaintId?: string;
    countryCode: string;
    targetType: 'driver' | 'vendor';
    driverId?: string;
    vendorId?: string;
    targetName: string;
    actionType: string;
    reason: string;
    legalReference?: string;
    fineAmount?: number;
    fineCurrency?: string;
    suspensionDays?: number;
    issuedBy: string;
    issuedByName: string;
    autoTriggered?: boolean;
  }): Promise<TaxiDisciplinaryActionEntity> {
    const action = this.actionRepo.create({
      complaintId: dto.complaintId,
      countryCode: dto.countryCode,
      targetType: dto.targetType,
      driverId: dto.driverId,
      vendorId: dto.vendorId,
      targetName: dto.targetName,
      actionType: dto.actionType,
      reason: dto.reason,
      legalReference: dto.legalReference,
      fineAmount: dto.fineAmount,
      fineCurrency: dto.fineCurrency,
      suspensionDays: dto.suspensionDays,
      effectiveFrom: new Date(),
      effectiveUntil: dto.suspensionDays
        ? new Date(Date.now() + dto.suspensionDays * 24 * 60 * 60 * 1000)
        : null,
      status: 'active',
      issuedBy: dto.issuedBy,
      issuedByName: dto.issuedByName,
      autoTriggered: dto.autoTriggered ?? false,
    });

    const saved = await this.actionRepo.save(action);

    // Apply the action to the target entity
    if (dto.targetType === 'driver' && dto.driverId) {
      await this.applyDriverDiscipline(dto.driverId, dto.actionType);
    } else if (dto.targetType === 'vendor' && dto.vendorId) {
      await this.applyVendorDiscipline(dto.vendorId, dto.actionType);
    }

    this.logger.log(
      `Disciplinary action issued: ${saved.id} | ${dto.actionType} → ${dto.targetType} ${dto.targetName}`,
    );
    return saved;
  }

  /** List all disciplinary actions with filters */
  async listDisciplinaryActions(filters?: {
    countryCode?: string;
    targetType?: 'driver' | 'vendor';
    status?: string;
    driverId?: string;
    vendorId?: string;
  }): Promise<TaxiDisciplinaryActionEntity[]> {
    const where: any = {};
    // `requireMarket`: a truthiness gate on a `where`-object assignment DROPS
    // the key for a market it cannot read, and a `findAndCount` with no market
    // key returns every market. Same class as the five R2-1 sites, found by the
    // uniqueness spec's new where-object test rather than by review.
    const market = requireMarket(filters?.countryCode, 'disciplinary actions', this.logger);
    if (market) where.countryCode = market;
    if (filters?.targetType) where.targetType = filters.targetType;
    if (filters?.status) where.status = filters.status;
    if (filters?.driverId) where.driverId = filters.driverId;
    if (filters?.vendorId) where.vendorId = filters.vendorId;

    return this.actionRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: { complaint: true },
    });
  }

  /** Handle an appeal */
  async handleAppeal(
    actionId: string,
    appealReason: string,
  ): Promise<TaxiDisciplinaryActionEntity> {
    const action = await this.actionRepo.findOne({ where: { id: actionId } });
    if (!action) throw new NotFoundException(`Action ${actionId} not found`);
    action.status = 'appealed';
    action.appealReason = appealReason;
    action.appealedAt = new Date();
    return this.actionRepo.save(action);
  }

  /** Resolve an appeal */
  async resolveAppeal(
    actionId: string,
    resolution: string,
    overturn: boolean,
  ): Promise<TaxiDisciplinaryActionEntity> {
    const action = await this.actionRepo.findOne({ where: { id: actionId } });
    if (!action) throw new NotFoundException(`Action ${actionId} not found`);
    action.appealResolution = resolution;
    action.status = overturn ? 'overturned' : 'active';

    if (overturn && action.targetType === 'driver' && action.driverId) {
      // Reinstate the driver
      await this.driverRepo.update(action.driverId, { status: 'active' });
    } else if (overturn && action.targetType === 'vendor' && action.vendorId) {
      await this.vendorRepo.update(action.vendorId, { status: 'active' });
    }

    return this.actionRepo.save(action);
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  /** Get complaint stats for the dashboard */
  async getComplaintStats(countryCode?: string): Promise<{
    total: number;
    open: number;
    investigating: number;
    escalated: number;
    resolved: number;
    dismissed: number;
    slaBreached: number;
    bySeverity: Record<string, number>;
    byAccountability: { vendor: number; platform: number };
  }> {
    const where: any = {};
    // `requireMarket`: a truthiness gate on a `where`-object assignment DROPS
    // the key for a market it cannot read, and a `findAndCount` with no market
    // key returns every market. Same class as the five R2-1 sites, found by the
    // uniqueness spec's new where-object test rather than by review.
    const market = requireMarket(countryCode, 'complaint statistics', this.logger);
    if (market) where.countryCode = market;

    const all = await this.complaintRepo.find({
      where,
      select: { status: true, severity: true, accountability: true, slaBreached: true },
    });

    const stats = {
      total: all.length,
      open: all.filter((c) => c.status === 'open').length,
      investigating: all.filter((c) => c.status === 'investigating').length,
      escalated: all.filter((c) => c.status === 'escalated').length,
      resolved: all.filter((c) => c.status === 'resolved').length,
      dismissed: all.filter((c) => c.status === 'dismissed').length,
      slaBreached: all.filter((c) => c.slaBreached).length,
      bySeverity: {
        critical: all.filter((c) => c.severity === 'critical').length,
        high: all.filter((c) => c.severity === 'high').length,
        medium: all.filter((c) => c.severity === 'medium').length,
        low: all.filter((c) => c.severity === 'low').length,
      },
      byAccountability: {
        vendor: all.filter((c) => c.accountability === 'vendor').length,
        platform: all.filter((c) => c.accountability === 'platform').length,
      },
    };

    return stats;
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private async applyDriverDiscipline(driverId: string, actionType: string) {
    const suspendActions = [
      'temporary_suspension',
      'permanent_suspension',
      'platform_ban',
      'license_revocation',
    ];
    if (suspendActions.includes(actionType)) {
      await this.driverRepo.update(driverId, { status: 'suspended' });
      this.logger.warn(`Driver ${driverId} suspended due to disciplinary action: ${actionType}`);
    }
  }

  private async applyVendorDiscipline(vendorId: string, actionType: string) {
    const suspendActions = ['temporary_suspension', 'permanent_suspension', 'platform_ban'];
    if (suspendActions.includes(actionType)) {
      await this.vendorRepo.update(vendorId, { status: 'suspended' });
      this.logger.warn(`Vendor ${vendorId} suspended due to disciplinary action: ${actionType}`);
    }
  }
}
