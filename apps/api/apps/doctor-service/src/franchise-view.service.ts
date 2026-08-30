import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinic } from './entities/clinic.entity';
import { Doctor } from './entities/doctor.entity';
import { Appointment } from './entities/appointment.entity';

/**
 * FranchiseViewService — the ONLY sanctioned read path into Doctor's data for
 * the Franchise module.
 *
 * Franchise previously joined `appointments a JOIN clinics c ON a.clinic_id = c.id`.
 * `appointments` has no `clinic_id` column — an appointment reaches its clinic through
 * `doctorId → doctors.clinicId → clinics.franchise_id`. Every one of those queries threw
 * and was swallowed by a catch block returning zeros. That traversal is expressed here,
 * once, against the entities that define it.
 */
@Injectable()
export class FranchiseViewService {
  private readonly logger = new Logger(FranchiseViewService.name);

  private static readonly CLINIC_STATUSES = ['pending', 'active', 'suspended', 'blocked', 'rejected'];

  constructor(
    @InjectRepository(Clinic) private readonly clinicRepo: Repository<Clinic>,
    @InjectRepository(Doctor) private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
  ) {}

  async getKpis(franchiseId: string) {
    const clinics = await this.clinicRepo.find({
      where: { franchiseId },
      select: ['id', 'status'],
    });
    const clinicIds = clinics.map((c) => c.id);

    if (!clinicIds.length) {
      return { activeClinics: 0, totalClinics: 0, totalDoctors: 0, todayAppointments: 0, revenue: 0 };
    }

    const totalDoctors = await this.doctorRepo
      .createQueryBuilder('d')
      .where('d.clinicId IN (:...clinicIds)', { clinicIds })
      .getCount();

    const today = new Date().toISOString().slice(0, 10);
    const todayAppointments = await this.appointmentRepo
      .createQueryBuilder('a')
      .innerJoin(Doctor, 'd', 'd.id = a.doctorId')
      .where('d.clinicId IN (:...clinicIds)', { clinicIds })
      .andWhere('a.date = :today', { today })
      .getCount();

    const revenueRow = await this.appointmentRepo
      .createQueryBuilder('a')
      .innerJoin(Doctor, 'd', 'd.id = a.doctorId')
      .select('COALESCE(SUM(a.fee), 0)', 'sum')
      .where('d.clinicId IN (:...clinicIds)', { clinicIds })
      .andWhere('a.status = :status', { status: 'COMPLETED' })
      .getRawOne<{ sum: string }>();

    return {
      activeClinics: clinics.filter((c) => c.status === 'active').length,
      totalClinics: clinics.length,
      totalDoctors,
      todayAppointments,
      revenue: Number(revenueRow?.sum ?? 0),
    };
  }

  async getClinics(franchiseId: string, search?: string, status?: string) {
    const qb = this.clinicRepo
      .createQueryBuilder('c')
      .where('c.franchiseId = :franchiseId', { franchiseId });

    if (search) {
      qb.andWhere('(LOWER(c.name) LIKE :q OR LOWER(c.location) LIKE :q OR LOWER(c.city) LIKE :q)', {
        q: `%${search.toLowerCase()}%`,
      });
    }
    if (status && status !== 'All') {
      qb.andWhere('c.status = :status', { status });
    }

    const [clinics, total] = await qb
      .orderBy('c.createdAt', 'DESC')
      .take(20)
      .getManyAndCount();

    return { clinics, total };
  }

  async getAppointments(franchiseId: string, page = 1, status?: string) {
    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .innerJoin(Doctor, 'd', 'd.id = a.doctorId')
      .innerJoin(Clinic, 'c', 'c.id = d.clinicId')
      .where('c.franchiseId = :franchiseId', { franchiseId });

    if (status && status !== 'All') {
      qb.andWhere('a.status = :status', { status });
    }

    const [appointments, total] = await qb
      .orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * 20)
      .take(20)
      .getManyAndCount();

    return { appointments, total, page };
  }

  async getDoctors(franchiseId: string, search?: string) {
    const qb = this.doctorRepo
      .createQueryBuilder('d')
      .innerJoin(Clinic, 'c', 'c.id = d.clinicId')
      .where('c.franchiseId = :franchiseId', { franchiseId });

    if (search) {
      qb.andWhere('LOWER(d.name) LIKE :q', { q: `%${search.toLowerCase()}%` });
    }

    const [doctors, total] = await qb.take(50).getManyAndCount();
    return { doctors, total };
  }

  async getAnalytics(franchiseId: string, period?: string) {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 86_400_000);

    const row = await this.appointmentRepo
      .createQueryBuilder('a')
      .innerJoin(Doctor, 'd', 'd.id = a.doctorId')
      .innerJoin(Clinic, 'c', 'c.id = d.clinicId')
      .select('COALESCE(SUM(a.fee), 0)', 'revenue')
      .addSelect('COUNT(a.id)', 'orders')
      .where('c.franchiseId = :franchiseId', { franchiseId })
      .andWhere('a.createdAt >= :since', { since })
      .getRawOne<{ revenue: string; orders: string }>();

    return {
      revenue: Number(row?.revenue ?? 0),
      orders: Number(row?.orders ?? 0),
      period: period ?? '30d',
    };
  }

  async updateClinicStatus(franchiseId: string, clinicId: string, status: string) {
    if (!FranchiseViewService.CLINIC_STATUSES.includes(status)) {
      return {
        success: false,
        message: `Invalid status '${status}'. Expected one of ${FranchiseViewService.CLINIC_STATUSES.join(', ')}.`,
      };
    }

    const result = await this.clinicRepo.update(
      { id: clinicId, franchiseId },
      { status: status as Clinic['status'] },
    );
    if (!result.affected) {
      return { success: false, message: `Clinic ${clinicId} not found under franchise ${franchiseId}.` };
    }

    this.logger.log(`Franchise ${franchiseId} set clinic ${clinicId} → ${status}`);
    return { success: true, message: `Status updated to ${status}`, clinicId, status };
  }
}
