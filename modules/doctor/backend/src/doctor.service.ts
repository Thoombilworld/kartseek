import { applyMarketFilter, assertInMarket, refuseUnattributable } from '@app/common';
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

import { Doctor } from './entities/doctor.entity';
import { Appointment } from './entities/appointment.entity';
import { DoctorAvailability } from './entities/doctor-availability.entity';
import { Hospital } from './entities/hospital.entity';
import { Clinic } from './entities/clinic.entity';
import { Specialty } from './entities/specialty.entity';
import { Department } from './entities/department.entity';
import { Review } from './entities/review.entity';
import { Document } from './entities/document.entity';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionItem } from './entities/prescription-item.entity';
import { FamilyMember } from './entities/family-member.entity';
import { IntakeForm } from './entities/intake-form.entity';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
  CreatePrescriptionDto,
} from './dto/doctor.dto';
import { KAFKA_TOPICS } from '@app/kafka';

/**
 * Doctor Service — Business logic for the healthcare module.
 *
 * All data operations use TypeORM repositories backed by PostgreSQL.
 * Redis is used for ephemeral appointment caching and Kafka for event publishing.
 */
@Injectable()
export class DoctorService {
  private readonly logger = new Logger(DoctorService.name);

  constructor(
    @InjectRepository(Doctor) private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(DoctorAvailability)
    private readonly availabilityRepo: Repository<DoctorAvailability>,
    @InjectRepository(Hospital) private readonly hospitalRepo: Repository<Hospital>,
    @InjectRepository(Clinic) private readonly clinicRepo: Repository<Clinic>,
    @InjectRepository(Specialty) private readonly specialtyRepo: Repository<Specialty>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Document) private readonly documentRepo: Repository<Document>,
    @InjectRepository(Prescription) private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(PrescriptionItem)
    private readonly prescriptionItemRepo: Repository<PrescriptionItem>,
    @InjectRepository(FamilyMember) private readonly familyMemberRepo: Repository<FamilyMember>,
    @InjectRepository(IntakeForm) private readonly intakeFormRepo: Repository<IntakeForm>,
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ── Health Check ──────────────────────────────────────────────────────────
  async healthCheck() {
    return { service: 'doctor-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  // ── Specialties ───────────────────────────────────────────────────────────
  async getSpecialties() {
    const data = await this.specialtyRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return { data, total: data.length };
  }

  // ── Hospitals ─────────────────────────────────────────────────────────────
  async getHospitals(city?: string, specialty?: string, page = 1, limit = 20) {
    const qb = this.hospitalRepo
      .createQueryBuilder('h')
      .where('h.status = :status', { status: 'active' });

    if (city) {
      qb.andWhere('h.city ILIKE :city', { city: `%${city}%` });
    }
    if (specialty) {
      // specialties is stored as simple-json (JSON text); use LIKE for filtering
      qb.andWhere('h.specialties LIKE :spec', { spec: `%${specialty}%` });
    }

    qb.orderBy('h.rating', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getHospitalById(id: string) {
    const h = await this.hospitalRepo.findOne({ where: { id } });
    if (!h) throw new NotFoundException(`Hospital ${id} not found`);
    return h;
  }

  // ── Clinics ───────────────────────────────────────────────────────────────
  /**
   * `regionCode` is the caller's market, forwarded by the gateway as `scope`
   * for a region-locked administrator and left undefined for a global one.
   * Without it the Qatar admin's clinic list was the whole platform's.
   */
  async getClinics(city?: string, specialty?: string, page = 1, limit = 20, regionCode?: string) {
    const qb = this.clinicRepo
      .createQueryBuilder('c')
      .where('c.status = :status', { status: 'active' });

    if (city) {
      qb.andWhere('c.city ILIKE :city', { city: `%${city}%` });
    }
    if (specialty) {
      qb.andWhere('c.specialties LIKE :spec', { spec: `%${specialty}%` });
    }
    if (regionCode) {
      applyMarketFilter(qb, 'c.regionCode', regionCode);
    }

    qb.orderBy('c.rating', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getClinicById(id: string) {
    const c = await this.clinicRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Clinic ${id} not found`);
    return c;
  }

  // ── Doctors ───────────────────────────────────────────────────────────────
  async getDoctors(specialty?: string, page = 1, limit = 20) {
    const qb = this.doctorRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.hospital', 'hospital')
      .leftJoinAndSelect('d.clinic', 'clinic')
      .where('d.status = :status', { status: 'active' });

    if (specialty) {
      qb.andWhere('d.specialty ILIKE :spec', { spec: `%${specialty}%` });
    }

    qb.orderBy('d.rating', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getDoctorById(id: string) {
    const d = await this.doctorRepo.findOne({
      where: { id },
      relations: ['hospital', 'clinic'],
    });
    if (!d) throw new NotFoundException(`Doctor ${id} not found`);
    return d;
  }

  async getDoctorsByHospital(hospitalId: string, specialty?: string) {
    const where: Record<string, unknown> = { hospitalId, status: 'active' as const };
    if (specialty) where.specialty = ILike(`%${specialty}%`);

    const data = await this.doctorRepo.find({ where, order: { rating: 'DESC' } });
    return { data, total: data.length };
  }

  async getDoctorsByClinic(clinicId: string, specialty?: string) {
    const where: Record<string, unknown> = { clinicId, status: 'active' as const };
    if (specialty) where.specialty = ILike(`%${specialty}%`);

    const data = await this.doctorRepo.find({ where, order: { rating: 'DESC' } });
    return { data, total: data.length };
  }

  // ── Availability & Slots ──────────────────────────────────────────────────
  async getAvailableSlots(doctorId: string, date: string) {
    // Determine the day of week from the requested date
    const dayOfWeek = new Date(date).getDay();

    const availability = await this.availabilityRepo.find({
      where: { doctorId, dayOfWeek, isActive: true },
      order: { startTime: 'ASC' },
    });

    // Generate slots from availability windows
    const slots: { id: string; time: string; available: boolean }[] = [];
    for (const avail of availability) {
      const [startH, startM] = avail.startTime.split(':').map(Number);
      const [endH, endM] = avail.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const duration = avail.slotDurationMinutes || 30;

      for (let m = startMinutes; m < endMinutes; m += duration) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        slots.push({
          id: `${avail.id}-${hh}${mm}`,
          time: `${hh}:${mm}`,
          available: true, // TODO: cross-check with booked appointments
        });
      }
    }

    // Cross-check with existing appointments to mark unavailable slots
    const bookedAppointments = await this.appointmentRepo.find({
      where: { doctorId, date, status: 'CONFIRMED' as any },
      select: ['timeSlot'],
    });
    const bookedTimes = new Set(bookedAppointments.map((a) => a.timeSlot));
    for (const slot of slots) {
      if (bookedTimes.has(slot.time)) {
        slot.available = false;
      }
    }

    return { doctorId, date, slots };
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  async bookAppointment(dto: CreateAppointmentDto) {
    // The gateway sets this from the verified token. Refusing an absent one
    // stops an appointment being written with no owner, which is a medical
    // record nobody can retrieve and nobody is accountable for.
    if (!dto.customerId) throw new BadRequestException('customerId is required');

    const doctor = await this.doctorRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor) throw new NotFoundException(`Doctor ${dto.doctorId} not found`);

    const appointment = this.appointmentRepo.create({
      doctorId: dto.doctorId,
      customerId: dto.customerId,
      patientName: dto.patientName || 'Patient',
      patientAge: dto.patientAge,
      patientGender: dto.patientGender,
      date: dto.date,
      timeSlot: dto.time,
      type: dto.type,
      symptoms: dto.symptoms,
      status: 'CONFIRMED',
      fee: dto.type === 'video' ? doctor.videoFee : doctor.fee,
      platformFee: 25,
    });

    const saved = await this.appointmentRepo.save(appointment);

    // Auto-assign token number for in-clinic appointments
    if (dto.type === 'in-clinic') {
      await this.assignToken(saved.id);
    }

    // Schedule 30-min-before reminder
    await this.scheduleAppointmentReminder(
      saved.id,
      dto.date,
      dto.time,
      dto.customerId,
      doctor.name,
    );

    // Cache in Redis for fast lookup
    const refreshed = await this.appointmentRepo.findOne({ where: { id: saved.id } });
    await this.redis.setJson(
      `appointment:${saved.id}`,
      {
        ...refreshed,
        doctorName: doctor.name,
        specialty: doctor.specialty,
      },
      86400 * 30,
    );

    // Publish Kafka event
    await this.kafka.publish('doctor.appointment.booked', {
      id: saved.id,
      doctorId: dto.doctorId,
      customerId: dto.customerId,
      date: dto.date,
      type: dto.type,
      tokenNumber: refreshed?.tokenNumber,
    });

    this.logger.log(
      `✅ Appointment booked: ${saved.id} (Token #${refreshed?.tokenNumber || 'N/A'})`,
    );
    return { success: true, appointment: refreshed || saved };
  }

  async getAppointmentById(id: string) {
    // Try Redis cache first
    const cached = await this.redis.getJson(`appointment:${id}`);
    if (cached) return cached;

    // Fall back to database
    const appointment = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['doctor'],
    });
    if (!appointment) throw new NotFoundException(`Appointment ${id} not found`);
    return appointment;
  }

  async getAppointmentsByDoctor(doctorId: string) {
    const [data, total] = await this.appointmentRepo.findAndCount({
      where: { doctorId },
      order: { date: 'DESC', timeSlot: 'ASC' },
    });
    return { data, total };
  }

  async getAppointmentsByCustomer(customerId: string) {
    const [data, total] = await this.appointmentRepo.findAndCount({
      where: { customerId },
      relations: ['doctor'],
      order: { date: 'DESC', timeSlot: 'ASC' },
    });
    return { data, total };
  }

  async updateAppointmentStatus(appointmentId: string, status: string, reason?: string) {
    const appointment = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException(`Appointment ${appointmentId} not found`);

    appointment.status = status as any;
    await this.appointmentRepo.save(appointment);

    // Update Redis cache
    const cached = await this.redis.getJson(`appointment:${appointmentId}`);
    if (cached) {
      (cached as any).status = status;
      if (reason) (cached as any).statusReason = reason;
      (cached as any).updatedAt = new Date().toISOString();
      await this.redis.setJson(`appointment:${appointmentId}`, cached, 86400 * 30);
    }

    // Publish appropriate Kafka event
    const topicMap: Record<string, string> = {
      CANCELLED: 'doctor.appointment.cancelled',
      COMPLETED: 'doctor.appointment.completed',
    };
    const topic = topicMap[status] || 'doctor.appointment.updated';
    await this.kafka.publish(topic, { id: appointmentId, status });

    return { success: true, id: appointmentId, status };
  }

  // ── Reviews ───────────────────────────────────────────────────────────────
  async getReviews(targetType: string, targetId: string) {
    const data = await this.reviewRepo.find({
      where: { targetType: targetType as any, targetId, isVisible: true },
      order: { createdAt: 'DESC' },
    });
    return { data };
  }

  // ── Admin / Provider Methods ──────────────────────────────────────────────
  /**
   * `doctors` carries no market column of its own (see `tcpAdminGetDoctors`'s
   * own note) — resolve one through the clinic the practitioner is attached
   * to, the same relation `getDoctorsByClinic` reads. A doctor attached only
   * to a hospital (which itself carries no market yet, below) or to neither
   * cannot be attributed, so a locked caller is refused rather than shown a
   * check against nothing.
   */
  async updateDoctorStatus(doctorId: string, status: string, scope?: string) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException(`Doctor ${doctorId} not found`);
    if (scope) {
      const clinic = doctor.clinicId
        ? await this.clinicRepo.findOne({ where: { id: doctor.clinicId } })
        : null;
      if (clinic) {
        assertInMarket(clinic.regionCode, scope, 'doctor', this.logger);
      } else {
        refuseUnattributable(scope, 'doctor', this.logger);
      }
    }

    doctor.status = status as any;
    await this.doctorRepo.save(doctor);

    await this.kafka.publish('doctor.status_changed', { doctorId, status });
    this.logger.log(`Doctor ${doctorId} status → ${status}`);
    return { success: true, doctorId, status };
  }

  /**
   * `hospitals` has no market column at all — unlike `clinics.regionCode`,
   * there is no dimension to check a locked caller's scope against yet, so a
   * locked caller is refused outright (`refuseUnattributable`) rather than
   * silently allowed to edit a hospital in every market.
   */
  async updateHospitalStatus(hospitalId: string, status: string, scope?: string) {
    const hospital = await this.hospitalRepo.findOne({ where: { id: hospitalId } });
    if (!hospital) throw new NotFoundException(`Hospital ${hospitalId} not found`);
    refuseUnattributable(scope, 'hospital', this.logger);

    hospital.status = status as any;
    await this.hospitalRepo.save(hospital);

    this.logger.log(`Hospital ${hospitalId} status → ${status}`);
    return { success: true, hospitalId, status };
  }

  async updateClinicStatus(clinicId: string, status: string, scope?: string) {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException(`Clinic ${clinicId} not found`);
    assertInMarket(clinic.regionCode, scope, 'clinic', this.logger);

    clinic.status = status as any;
    await this.clinicRepo.save(clinic);

    this.logger.log(`Clinic ${clinicId} status → ${status}`);
    return { success: true, clinicId, status };
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  async getAllAppointments(status?: string, date?: string) {
    const qb = this.appointmentRepo.createQueryBuilder('a').leftJoinAndSelect('a.doctor', 'doctor');

    if (status) {
      qb.andWhere('a.status = :status', { status: status.toUpperCase() });
    }
    if (date) {
      qb.andWhere('a.date = :date', { date });
    }

    qb.orderBy('a.date', 'DESC').addOrderBy('a.timeSlot', 'ASC');

    const [appointments, total] = await qb.getManyAndCount();
    return { appointments, total };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Token Queue System
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Assigns the next sequential token number for a doctor on a given date.
   * Tokens are sequential per doctor per day: 1, 2, 3, ...
   */
  async assignToken(appointmentId: string): Promise<number> {
    const appointment = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException(`Appointment ${appointmentId} not found`);

    // Get max token for this doctor on this date
    const result = await this.appointmentRepo
      .createQueryBuilder('a')
      .select('MAX(a.tokenNumber)', 'maxToken')
      .where('a.doctorId = :doctorId', { doctorId: appointment.doctorId })
      .andWhere('a.date = :date', { date: appointment.date })
      .getRawOne();

    const nextToken = (result?.maxToken || 0) + 1;
    appointment.tokenNumber = nextToken;
    appointment.queuePosition = nextToken; // Initial position equals token number
    await this.appointmentRepo.save(appointment);

    this.logger.log(`🎫 Token #${nextToken} assigned to appointment ${appointmentId}`);
    return nextToken;
  }

  /**
   * Advances the doctor's current serving token to the next patient.
   * Recalculates queue positions and estimated wait times for all waiting patients.
   */
  async advanceToken(doctorId: string, date?: string) {
    const today = date || new Date().toISOString().slice(0, 10);
    const redisKey = `doctor:queue:${doctorId}:${today}`;

    // Get current token from Redis (or calculate from DB)
    let currentToken = parseInt((await this.redis.get(redisKey)) || '0', 10);
    currentToken += 1;

    // Persist in Redis
    await this.redis.set(redisKey, String(currentToken), 86400);

    // Recalculate queue positions for all remaining appointments
    const avgWait = await this.calculateEstimatedWait(doctorId);
    const waitingAppointments = await this.appointmentRepo.find({
      where: { doctorId, date: today },
      order: { tokenNumber: 'ASC' },
    });

    const queueData: Array<{
      id: string;
      tokenNumber: number;
      queuePosition: number;
      estimatedWaitMinutes: number;
      status: string;
    }> = [];

    for (const appt of waitingAppointments) {
      if (!appt.tokenNumber) continue;

      if (appt.tokenNumber < currentToken) {
        // Already served
        appt.queuePosition = 0;
        appt.estimatedWaitMinutes = 0;
      } else if (appt.tokenNumber === currentToken) {
        // Currently being served
        appt.queuePosition = 0;
        appt.estimatedWaitMinutes = 0;
      } else {
        // Still waiting
        const position = appt.tokenNumber - currentToken;
        appt.queuePosition = position;
        appt.estimatedWaitMinutes = Math.round(position * avgWait);
      }

      await this.appointmentRepo.save(appt);
      queueData.push({
        id: appt.id,
        tokenNumber: appt.tokenNumber,
        queuePosition: appt.queuePosition,
        estimatedWaitMinutes: appt.estimatedWaitMinutes,
        status: appt.status,
      });
    }

    // Publish events
    await this.kafka.publish('doctor.token.advanced', {
      doctorId,
      date: today,
      currentToken,
      avgWaitMinutes: avgWait,
    });
    await this.kafka.publish('doctor.queue.updated', {
      doctorId,
      date: today,
      currentToken,
      appointments: queueData,
    });

    this.logger.log(`🔔 Token advanced to #${currentToken} for doctor ${doctorId}`);

    return {
      success: true,
      doctorId,
      date: today,
      currentToken,
      totalTokens: waitingAppointments.length,
      avgWaitMinutes: avgWait,
      appointments: queueData,
    };
  }

  /**
   * Returns the live queue status for a doctor on a given date.
   */
  async getQueueStatus(doctorId: string, date?: string) {
    const today = date || new Date().toISOString().slice(0, 10);
    const redisKey = `doctor:queue:${doctorId}:${today}`;

    const currentToken = parseInt((await this.redis.get(redisKey)) || '0', 10);
    const avgWait = await this.calculateEstimatedWait(doctorId);

    const appointments = await this.appointmentRepo.find({
      where: { doctorId, date: today },
      order: { tokenNumber: 'ASC' },
    });

    const totalTokens = appointments.filter((a) => a.tokenNumber != null).length;
    const waitingCount = appointments.filter(
      (a) =>
        a.tokenNumber != null &&
        a.tokenNumber > currentToken &&
        a.status !== 'CANCELLED' &&
        a.status !== 'NO_SHOW',
    ).length;
    const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

    return {
      doctorId,
      date: today,
      currentToken,
      totalTokens,
      waitingCount,
      completedCount,
      avgWaitMinutes: avgWait,
      appointments: appointments.map((a) => ({
        id: a.id,
        patientName: a.patientName,
        tokenNumber: a.tokenNumber,
        queuePosition: a.queuePosition,
        estimatedWaitMinutes: a.estimatedWaitMinutes,
        status: a.status,
        type: a.type,
        timeSlot: a.timeSlot,
        checkedInAt: a.checkedInAt,
        consultationStartedAt: a.consultationStartedAt,
      })),
    };
  }

  /**
   * Calculates the average consultation duration for a doctor
   * based on the last 20 completed appointments with timing data.
   * Returns minutes (default: 15 if no historical data).
   */
  async calculateEstimatedWait(doctorId: string): Promise<number> {
    const completed = await this.appointmentRepo.find({
      where: { doctorId, status: 'COMPLETED' as any },
      order: { updatedAt: 'DESC' },
      take: 20,
    });

    const durations = completed
      // A type predicate rather than a plain boolean: `.filter()` cannot narrow
      // the element type on its own, so the `.map()` below still saw
      // `Date | null` even though the guard above had excluded it.
      .filter((a): a is typeof a & { consultationStartedAt: Date; consultationEndedAt: Date } =>
        Boolean(a.consultationStartedAt && a.consultationEndedAt),
      )
      .map((a) => {
        const start = new Date(a.consultationStartedAt).getTime();
        const end = new Date(a.consultationEndedAt).getTime();
        return (end - start) / 60000; // Convert ms to minutes
      })
      .filter((d) => d > 0 && d < 120); // Sanity check: 0-120 min range

    if (durations.length === 0) return 15; // Default 15 min per patient

    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    return Math.round(avg);
  }

  /**
   * Marks a patient as checked in (arrived at the facility).
   */
  async checkInPatient(appointmentId: string) {
    const appointment = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException(`Appointment ${appointmentId} not found`);

    appointment.checkedInAt = new Date();
    await this.appointmentRepo.save(appointment);

    this.logger.log(`📋 Patient checked in: ${appointmentId}`);
    return { success: true, appointmentId, checkedInAt: appointment.checkedInAt };
  }

  /**
   * Starts a consultation — sets the appointment to IN_PROGRESS.
   */
  async startConsultation(appointmentId: string) {
    const appointment = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException(`Appointment ${appointmentId} not found`);

    appointment.status = 'IN_PROGRESS';
    appointment.consultationStartedAt = new Date();
    await this.appointmentRepo.save(appointment);

    await this.kafka.publish('doctor.appointment.updated', {
      id: appointmentId,
      status: 'IN_PROGRESS',
    });

    this.logger.log(`🩺 Consultation started: ${appointmentId}`);
    return {
      success: true,
      appointmentId,
      status: 'IN_PROGRESS',
      startedAt: appointment.consultationStartedAt,
    };
  }

  /**
   * Ends a consultation — marks COMPLETED, records timing, and auto-advances token.
   */
  async endConsultation(appointmentId: string) {
    const appointment = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException(`Appointment ${appointmentId} not found`);

    appointment.status = 'COMPLETED';
    appointment.consultationEndedAt = new Date();
    appointment.queuePosition = 0;
    appointment.estimatedWaitMinutes = 0;
    await this.appointmentRepo.save(appointment);

    await this.kafka.publish('doctor.appointment.completed', {
      id: appointmentId,
      status: 'COMPLETED',
    });

    // Auto-advance token to next patient
    const advanceResult = await this.advanceToken(appointment.doctorId, appointment.date);

    this.logger.log(`✅ Consultation ended: ${appointmentId}`);
    return {
      success: true,
      appointmentId,
      status: 'COMPLETED',
      endedAt: appointment.consultationEndedAt,
      nextToken: advanceResult.currentToken,
    };
  }

  /**
   * Schedules a push notification 30 minutes before the appointment.
   * Uses Redis key expiration as a lightweight timer mechanism.
   */
  async scheduleAppointmentReminder(
    appointmentId: string,
    date: string,
    time: string,
    customerId: string,
    doctorName: string,
  ) {
    try {
      // Calculate seconds until 30 minutes before appointment
      const appointmentDateTime = new Date(`${date}T${time}:00`);
      const reminderTime = new Date(appointmentDateTime.getTime() - 30 * 60000);
      const now = new Date();
      const secondsUntilReminder = Math.floor((reminderTime.getTime() - now.getTime()) / 1000);

      if (secondsUntilReminder <= 0) {
        // Appointment is less than 30 min away — send immediately
        await this.sendAppointmentReminder(appointmentId, customerId, doctorName, date, time);
        return;
      }

      // Store reminder data in Redis with TTL (will be picked up by a cron/listener)
      const reminderKey = `doctor:reminder:${appointmentId}`;
      await this.redis.setJson(
        reminderKey,
        {
          appointmentId,
          customerId,
          doctorName,
          date,
          time,
          scheduledFor: reminderTime.toISOString(),
        },
        secondsUntilReminder,
      );

      this.logger.log(
        `⏰ Reminder scheduled for ${appointmentId} in ${Math.round(secondsUntilReminder / 60)} min`,
      );
    } catch (err) {
      this.logger.warn(`Could not schedule reminder for ${appointmentId}: ${err}`);
    }
  }

  /**
   * Sends the actual push notification for an upcoming appointment.
   */
  async sendAppointmentReminder(
    appointmentId: string,
    customerId: string,
    doctorName: string,
    date: string,
    time: string,
  ) {
    // Check if already sent
    const appointment = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appointment || appointment.notificationSentAt) return;

    // Publish to notification service via Kafka
    await this.kafka.publish('doctor.appointment.reminder', {
      appointmentId,
      customerId,
      title: '🩺 Appointment Reminder',
      body: `Your appointment with ${doctorName} is in 30 minutes (${time})`,
      type: 'appointment',
      data: { appointmentId, doctorName, date, time },
    });

    // Also publish to the generic push notification topic
    await this.kafka.publish('notification.push', {
      userId: customerId,
      title: '🩺 Appointment Reminder',
      body: `Your appointment with ${doctorName} is in 30 minutes (${time})`,
      type: 'appointment',
      data: { appointmentId, date, time },
    });

    // Mark as sent to prevent duplicates
    appointment.notificationSentAt = new Date();
    await this.appointmentRepo.save(appointment);

    this.logger.log(`📲 Reminder sent for appointment ${appointmentId} to ${customerId}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRESCRIPTIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new prescription for an appointment.
   * Pre-fills patient info from the appointment record.
   */
  async createPrescription(doctorId: string, dto: CreatePrescriptionDto) {
    const appointment = await this.appointmentRepo.findOne({ where: { id: dto.appointmentId } });
    if (!appointment) throw new NotFoundException(`Appointment ${dto.appointmentId} not found`);

    const prescription = this.prescriptionRepo.create({
      appointmentId: dto.appointmentId,
      doctorId,
      customerId: appointment.customerId,
      patientName: appointment.patientName,
      patientAge: appointment.patientAge ? parseInt(appointment.patientAge as any) : undefined,
      patientGender: appointment.patientGender,
      diagnosis: dto.diagnosis,
      notes: dto.notes,
      followUpDate: dto.followUpDate,
      status: 'DRAFT',
      items: dto.items.map((item, idx) => ({
        ...item,
        quantity: item.quantity ?? 1,
        order: idx,
      })) as any,
    });

    const saved = await this.prescriptionRepo.save(prescription);
    this.logger.log(`📝 Prescription ${saved.id} created for appointment ${dto.appointmentId}`);
    return saved;
  }

  /**
   * Issue a prescription — sets status to ISSUED, timestamps it,
   * publishes event + sends notification to patient.
   */
  async issuePrescription(prescriptionId: string) {
    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId },
      relations: ['items'],
    });
    if (!rx) throw new NotFoundException(`Prescription ${prescriptionId} not found`);

    rx.status = 'ISSUED';
    rx.issuedAt = new Date();
    const saved = await this.prescriptionRepo.save(rx);

    // Publish Kafka event
    await this.kafka.publish(KAFKA_TOPICS.DOCTOR_PRESCRIPTION_ISSUED, {
      prescriptionId: saved.id,
      appointmentId: saved.appointmentId,
      customerId: saved.customerId,
      doctorId: saved.doctorId,
      patientName: saved.patientName,
      itemCount: saved.items.length,
      // Nullable until the prescription is issued. `.toISOString()` on `null`
      // threw inside the event publish — after the row had already been
      // written, so the record existed and the event never fired.
      issuedAt: saved.issuedAt?.toISOString() ?? null,
    });

    // Push notification
    await this.kafka.publish('notification.push', {
      userId: saved.customerId,
      title: '📋 Prescription Ready',
      body: `Dr. has issued a prescription with ${saved.items.length} medication(s).`,
      type: 'prescription',
      data: { prescriptionId: saved.id, appointmentId: saved.appointmentId },
    });

    this.logger.log(`✅ Prescription ${prescriptionId} issued`);
    return saved;
  }

  /** Get a single prescription with all items. */
  async getPrescription(prescriptionId: string) {
    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId },
      relations: ['items', 'doctor'],
    });
    if (!rx) throw new NotFoundException(`Prescription ${prescriptionId} not found`);
    return rx;
  }

  /** Get all prescriptions for a patient. */
  async getPrescriptionsByPatient(customerId: string) {
    return this.prescriptionRepo.find({
      where: { customerId, status: 'ISSUED' as any },
      relations: ['items', 'doctor'],
      order: { issuedAt: 'DESC' },
    });
  }

  /** Get all prescriptions issued by a doctor. */
  async getPrescriptionsByDoctor(doctorId: string, params?: { limit?: number; offset?: number }) {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    const [data, total] = await this.prescriptionRepo.findAndCount({
      where: { doctorId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  /** Link a prescription to a pharmacy order (cross-sell). */
  async linkToPharmacy(prescriptionId: string, pharmacyOrderId: string) {
    const rx = await this.prescriptionRepo.findOne({ where: { id: prescriptionId } });
    if (!rx) throw new NotFoundException(`Prescription ${prescriptionId} not found`);

    rx.pharmacyOrderId = pharmacyOrderId;
    rx.status = 'DISPENSED';
    const saved = await this.prescriptionRepo.save(rx);

    await this.kafka.publish(KAFKA_TOPICS.PHARMACY_ORDER_FROM_PRESCRIPTION, {
      prescriptionId: saved.id,
      pharmacyOrderId,
      customerId: saved.customerId,
      items: (await this.prescriptionItemRepo.find({ where: { prescriptionId } })).map((i) => ({
        drugName: i.drugName,
        genericName: i.genericName,
        dosage: i.dosage,
        quantity: i.quantity,
      })),
    });

    this.logger.log(
      `💊 Prescription ${prescriptionId} linked to pharmacy order ${pharmacyOrderId}`,
    );
    return saved;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FAMILY MEMBERS
  // ══════════════════════════════════════════════════════════════════════════

  /** Get all family members for a user. */
  async getFamilyMembers(userId: string) {
    return this.familyMemberRepo.find({
      where: { userId, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  /** Add a new family member. */
  async addFamilyMember(userId: string, data: Partial<FamilyMember>) {
    const member = this.familyMemberRepo.create({ ...data, userId });
    const saved = await this.familyMemberRepo.save(member);
    this.logger.log(`👨‍👩‍👦 Family member ${saved.name} added for user ${userId}`);
    return saved;
  }

  /** Update a family member. */
  async updateFamilyMember(memberId: string, userId: string, data: Partial<FamilyMember>) {
    const member = await this.familyMemberRepo.findOne({ where: { id: memberId, userId } });
    if (!member) throw new NotFoundException(`Family member ${memberId} not found`);
    Object.assign(member, data);
    return this.familyMemberRepo.save(member);
  }

  /** Soft-delete a family member. */
  async deleteFamilyMember(memberId: string, userId: string) {
    const member = await this.familyMemberRepo.findOne({ where: { id: memberId, userId } });
    if (!member) throw new NotFoundException(`Family member ${memberId} not found`);
    member.isActive = false;
    await this.familyMemberRepo.save(member);
    return { success: true, deleted: memberId };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESCHEDULE
  // ══════════════════════════════════════════════════════════════════════════

  /** Reschedule an appointment to a new date/time slot. */
  async rescheduleAppointment(appointmentId: string, newDate: string, newTime: string) {
    const apt = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!apt) throw new NotFoundException(`Appointment ${appointmentId} not found`);

    const oldDate = apt.date;
    const oldTime = apt.timeSlot;
    apt.date = newDate;
    apt.timeSlot = newTime;
    const saved = await this.appointmentRepo.save(apt);

    // Re-assign token for the new day
    await this.assignToken(appointmentId);

    // Publish event
    await this.kafka.publish(KAFKA_TOPICS.DOCTOR_APPOINTMENT_RESCHEDULED, {
      appointmentId,
      doctorId: apt.doctorId,
      customerId: apt.customerId,
      oldDate,
      oldTime,
      newDate,
      newTime,
    });

    // Notify patient
    await this.kafka.publish('notification.push', {
      userId: apt.customerId,
      title: '📅 Appointment Rescheduled',
      body: `Your appointment has been moved to ${newDate} at ${newTime}.`,
      type: 'appointment',
      data: { appointmentId, newDate, newTime },
    });

    this.logger.log(
      `🔄 Appointment ${appointmentId} rescheduled: ${oldDate} ${oldTime} → ${newDate} ${newTime}`,
    );
    return saved;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INTAKE FORMS
  // ══════════════════════════════════════════════════════════════════════════

  /** Submit or update an intake form for an appointment. */
  async submitIntakeForm(appointmentId: string, customerId: string, data: Partial<IntakeForm>) {
    let form = await this.intakeFormRepo.findOne({ where: { appointmentId } });
    if (form) {
      Object.assign(form, data);
    } else {
      form = this.intakeFormRepo.create({ ...data, appointmentId, customerId });
    }
    form.completedAt = new Date();
    const saved = await this.intakeFormRepo.save(form);
    this.logger.log(`📋 Intake form submitted for appointment ${appointmentId}`);
    return saved;
  }

  /** Get intake form for an appointment (for doctor to view during consultation). */
  async getIntakeForm(appointmentId: string) {
    const form = await this.intakeFormRepo.findOne({ where: { appointmentId } });
    if (!form) throw new NotFoundException(`No intake form for appointment ${appointmentId}`);
    return form;
  }
}
