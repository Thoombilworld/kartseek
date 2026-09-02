import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DoctorService } from '../doctor.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { Doctor } from '../entities/doctor.entity';
import { Appointment } from '../entities/appointment.entity';
import { DoctorAvailability } from '../entities/doctor-availability.entity';
import { Hospital } from '../entities/hospital.entity';
import { Clinic } from '../entities/clinic.entity';
import { Specialty } from '../entities/specialty.entity';
import { Department } from '../entities/department.entity';
import { Review } from '../entities/review.entity';
import { Document } from '../entities/document.entity';
import { Prescription } from '../entities/prescription.entity';
import { PrescriptionItem } from '../entities/prescription-item.entity';
import { FamilyMember } from '../entities/family-member.entity';
import { IntakeForm } from '../entities/intake-form.entity';

describe('DoctorService', () => {
  let service: DoctorService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let doctorRepo: any;
  let appointmentRepo: any;
  let hospitalRepo: any;
  let specialtyRepo: any;

  const mockRepoFactory = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'mock-uuid', ...e })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ avg: '0', count: '0' }),
    }),
  });

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        { provide: getRepositoryToken(Doctor), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Appointment), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(DoctorAvailability), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Hospital), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Clinic), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Specialty), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Department), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Review), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Document), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Prescription), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(PrescriptionItem), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(FamilyMember), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(IntakeForm), useFactory: mockRepoFactory },
      ],
    }).compile();

    service = module.get<DoctorService>(DoctorService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    doctorRepo = module.get(getRepositoryToken(Doctor));
    appointmentRepo = module.get(getRepositoryToken(Appointment));
    hospitalRepo = module.get(getRepositoryToken(Hospital));
    specialtyRepo = module.get(getRepositoryToken(Specialty));
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('doctor-service');
      expect(result.status).toBe('ok');
    });
  });

  describe('getDoctors', () => {
    it('should return paginated doctor list', async () => {
      const result = await service.getDoctors(undefined, 1, 10);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter by specialty', async () => {
      await service.getDoctors('Cardiology', 1, 10);
      const qb = doctorRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalled();
    });
  });

  describe('getDoctorById', () => {
    it('should throw when doctor not found', async () => {
      doctorRepo.findOne.mockResolvedValue(null);
      await expect(service.getDoctorById('missing')).rejects.toThrow();
    });

    it('should return doctor profile', async () => {
      doctorRepo.findOne.mockResolvedValue({ id: 'd1', name: 'Dr. Smith', specialtyId: 's1' });
      const result = await service.getDoctorById('d1');
      expect(result.id).toBe('d1');
    });
  });

  describe('bookAppointment', () => {
    it('should create appointment', async () => {
      doctorRepo.findOne.mockResolvedValue({ id: 'd1', name: 'Dr. Smith', consultationFee: 500 });
      appointmentRepo.create.mockImplementation((dto: any) => dto);
      appointmentRepo.save.mockResolvedValue({ id: 'apt-1' });
      appointmentRepo.findOne.mockResolvedValue({ id: 'apt-1', tokenNumber: 1 });
      const result = await service.bookAppointment({
        doctorId: 'd1', customerId: 'u1',
        date: '2026-08-01', time: '10:00',
        type: 'video', symptoms: 'Checkup',
      });
      expect(result.success).toBe(true);
      expect(kafka.publish).toHaveBeenCalled();
    });

    it('should throw when doctor not found', async () => {
      doctorRepo.findOne.mockResolvedValue(null);
      await expect(service.bookAppointment({
        doctorId: 'missing', customerId: 'u1', date: '2026-08-01', time: '10:00', type: 'in-clinic',
      })).rejects.toThrow();
    });
  });

  describe('getAppointmentsByCustomer', () => {
    it('should return patient appointments', async () => {
      appointmentRepo.findAndCount.mockResolvedValue([
        [{ id: 'apt-1', doctorId: 'd1', status: 'CONFIRMED' }], 1,
      ]);
      const result = await service.getAppointmentsByCustomer('u1');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getSpecialties', () => {
    it('should return specialties wrapped in data/total', async () => {
      specialtyRepo.find.mockResolvedValue([{ id: 's1', name: 'Cardiology' }]);
      const result = await service.getSpecialties();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return empty data when none active', async () => {
      specialtyRepo.find.mockResolvedValue([]);
      const result = await service.getSpecialties();
      expect(result.data).toEqual([]);
    });
  });

  describe('getHospitals', () => {
    it('should return hospitals', async () => {
      hospitalRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([[{ id: 'h1', name: 'City Hospital' }], 1]);
      const result = await service.getHospitals();
      expect(result.data).toHaveLength(1);
    });
  });
});
