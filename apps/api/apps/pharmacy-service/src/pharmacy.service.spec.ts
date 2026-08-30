import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PharmacyService } from './pharmacy.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import {
  PharmacyStore, PharmacyCategory, PharmacyItem, PharmacyOrder,
  Prescription, PharmacyReview, PharmacyStaff, PharmacyPromotion,
} from './entities';

describe('PharmacyService', () => {
  let service: PharmacyService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let storeRepo: any;
  let itemRepo: any;
  let orderRepo: any;
  let prescriptionRepo: any;

  const mockRepoFactory = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'mock-uuid', ...e })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
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
        PharmacyService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        { provide: getRepositoryToken(PharmacyStore), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(PharmacyCategory), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(PharmacyItem), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(PharmacyOrder), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Prescription), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(PharmacyReview), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(PharmacyStaff), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(PharmacyPromotion), useFactory: mockRepoFactory },
      ],
    }).compile();

    service = module.get<PharmacyService>(PharmacyService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    storeRepo = module.get(getRepositoryToken(PharmacyStore));
    itemRepo = module.get(getRepositoryToken(PharmacyItem));
    orderRepo = module.get(getRepositoryToken(PharmacyOrder));
    prescriptionRepo = module.get(getRepositoryToken(Prescription));
  });

  describe('healthCheck', () => {
    it('should return ok when DB is connected', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('pharmacy-service');
      expect(result.status).toBe('ok');
      expect(result.dbConnected).toBe(true);
    });

    it('should return degraded when DB fails', async () => {
      storeRepo.query.mockRejectedValue(new Error('DB down'));
      const result = await service.healthCheck();
      expect(result.status).toBe('degraded');
      expect(result.dbConnected).toBe(false);
    });
  });

  describe('listStores', () => {
    it('should return paginated stores', async () => {
      const result = await service.listStores({ page: 1, limit: 10 });
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getStoreById', () => {
    it('should throw when store not found', async () => {
      storeRepo.findOne.mockResolvedValue(null);
      await expect(service.getStoreById('missing')).rejects.toThrow();
    });

    it('should return store with categories', async () => {
      storeRepo.findOne.mockResolvedValue({ id: 's1', name: 'HealthPlus' });
      const result = await service.getStoreById('s1');
      expect(result.id).toBe('s1');
    });
  });

  describe('searchMedicines', () => {
    it('should search pharmacy items', async () => {
      itemRepo.findAndCount.mockResolvedValue([[{ id: 'i1', name: 'Paracetamol' }], 1]);
      const result = await service.searchMedicines('Paracetamol');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('placeOrder', () => {
    it('should create pharmacy order', async () => {
      storeRepo.findOneBy.mockResolvedValue({ id: 's1', name: 'Test' });
      itemRepo.find.mockResolvedValue([{ id: 'i1', price: 150, name: 'Cough Syrup', requiresPrescription: false }]);
      const result = await service.placeOrder({
        storeId: 's1', customerId: 'u1',
        items: [{ itemId: 'i1', quantity: 1 }],
        paymentMethod: 'CARD',
      });
      expect(result.success).toBe(true);
      expect(kafka.publish).toHaveBeenCalled();
    });
  });

  describe('uploadPrescription', () => {
    it('should create prescription record', async () => {
      prescriptionRepo.create.mockImplementation((dto: any) => dto);
      prescriptionRepo.save.mockResolvedValue({ id: 'rx-1' });
      const result = await service.uploadPrescription({
        customerId: 'u1', patientName: 'John Doe', fileUrl: 'https://cdn.example.com/rx.jpg', notes: 'Fever medication',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getCategories', () => {
    it('should return a categories list', async () => {
      const result = await service.getCategories();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
