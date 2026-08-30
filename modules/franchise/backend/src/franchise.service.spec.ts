import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of, throwError } from 'rxjs';
import { FranchiseService } from './franchise.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { Franchise } from './entities/franchise.entity';

/**
 * franchise-service owns only the `franchises` table. Every other module's data
 * arrives over TCP, so these tests assert on the client calls rather than on SQL.
 */
describe('FranchiseService', () => {
  let service: FranchiseService;
  let franchiseRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let marketplace: { send: jest.Mock };
  let grocery: { send: jest.Mock };
  let restaurant: { send: jest.Mock };
  let pharmacy: { send: jest.Mock };
  let doctor: { send: jest.Mock };

  /** A ClientProxy stub whose `send` resolves to whatever the test queues up. */
  const clientMock = () => ({ send: jest.fn().mockReturnValue(of({})) });

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    const franchiseRepoMock = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'mock-uuid', ...e })),
    };

    const marketplaceMock = clientMock();
    const groceryMock = clientMock();
    const restaurantMock = clientMock();
    const pharmacyMock = clientMock();
    const doctorMock = clientMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FranchiseService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        { provide: getRepositoryToken(Franchise), useValue: franchiseRepoMock },
        { provide: 'MARKETPLACE_SERVICE', useValue: marketplaceMock },
        { provide: 'GROCERY_SERVICE', useValue: groceryMock },
        { provide: 'RESTAURANT_SERVICE', useValue: restaurantMock },
        { provide: 'PHARMACY_SERVICE', useValue: pharmacyMock },
        { provide: 'DOCTOR_SERVICE', useValue: doctorMock },
      ],
    }).compile();

    service = module.get<FranchiseService>(FranchiseService);
    franchiseRepo = module.get(getRepositoryToken(Franchise));
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    marketplace = module.get('MARKETPLACE_SERVICE');
    grocery = module.get('GROCERY_SERVICE');
    restaurant = module.get('RESTAURANT_SERVICE');
    pharmacy = module.get('PHARMACY_SERVICE');
    doctor = module.get('DOCTOR_SERVICE');
  });

  describe('getFranchiseByOwner', () => {
    // Every /franchise page opened with a hardcoded 'FRAN-123'. These four cases
    // are the contract that replaces it.
    it('resolves the estate owned by the caller', async () => {
      franchiseRepo.findOne.mockResolvedValueOnce({
        id: 'f-1', businessName: 'Colaba Estate', countryCode: 'IN', status: 'active', operationalZones: ['400001'],
      });
      const result = await service.getFranchiseByOwner('user-9');
      expect(franchiseRepo.findOne).toHaveBeenCalledWith({ where: { ownerId: 'user-9' } });
      expect(result).toMatchObject({
        id: 'f-1', businessName: 'Colaba Estate', countryCode: 'IN', status: 'active', operationalZones: ['400001'],
      });
      // The console's first call, and the one it formats every figure from.
      // An Indian estate settles in rupees; a Doha one must not.
      expect(result?.region.currency).toEqual({ code: 'INR', symbol: '₹', decimals: 2 });
      expect(result?.region.timezone).toBe('Asia/Kolkata');
    });

    it('returns null when the user owns no franchise', async () => {
      franchiseRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.getFranchiseByOwner('customer-1')).resolves.toBeNull();
    });

    it('returns null without querying when there is no owner id', async () => {
      franchiseRepo.findOne.mockClear();
      await expect(service.getFranchiseByOwner('')).resolves.toBeNull();
      expect(franchiseRepo.findOne).not.toHaveBeenCalled();
    });

    it('never reflects an ownerId the caller did not prove', async () => {
      // The lookup must be keyed on ownerId alone; a franchise id supplied by the
      // client must not be able to widen it.
      franchiseRepo.findOne.mockResolvedValueOnce({ id: 'f-2', businessName: 'B', countryCode: 'AE', status: 'active', operationalZones: [] });
      await service.getFranchiseByOwner('user-2');
      const where = franchiseRepo.findOne.mock.calls[0][0].where;
      expect(Object.keys(where)).toEqual(['ownerId']);
    });
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('franchise-service');
      expect(result.status).toBe('ok');
    });
  });

  describe('getFranchiseDashboard', () => {
    it('sources store counts from marketplace-service, not from a local table', async () => {
      marketplace.send.mockReturnValue(of({ total: 12, verified: 9 }));

      const result = await service.getFranchiseDashboard('FRAN-001');

      expect(marketplace.send).toHaveBeenCalledWith(
        { cmd: 'franchise_marketplace_seller_counts' },
        { franchiseId: 'FRAN-001' },
      );
      expect(result.totalStores).toBe(12);
      expect(result.activeStores).toBe(9);
    });
  });

  describe('getStorePerformance', () => {
    it('should return store performance metrics', async () => {
      const result = await service.getStorePerformance('FRAN-001', 'STORE-001', 'monthly');
      expect(result.franchiseId).toBe('FRAN-001');
      expect(result.storeId).toBe('STORE-001');
      expect(result.period).toBe('monthly');
    });
  });

  describe('submitComplianceReport', () => {
    it('should create compliance report', async () => {
      const result = await service.submitComplianceReport('FRAN-001', 'STORE-001', {
        hygieneScore: 95, staffTraining: true, lastInspection: '2026-06-15',
      });
      expect(result.success).toBe(true);
      expect(result.report.id).toMatch(/^COMP-/);
      expect(redis.setJson).toHaveBeenCalled();
      expect(kafka.publish).toHaveBeenCalledWith('franchise.compliance.submitted', expect.any(Object));
    });
  });

  describe('registerFranchise', () => {
    it('registers into a supported market', async () => {
      const result = await service.registerFranchise({
        businessName: 'Doha Retail Group', contactEmail: 'doha@test.com', countryCode: 'QA',
      });
      expect(result.success).toBe(true);
      expect(result.franchise?.businessName).toBe('Doha Retail Group');
      expect(result.franchise?.status).toBe('pending');
      expect(result.franchise?.countryCode).toBe('QA');
      // Qatar settles in riyals, and the reply says so — the console formats
      // from this rather than assuming the platform's home currency.
      expect(result.region?.currency).toEqual({ code: 'QAR', symbol: 'QR', decimals: 2 });
      expect(kafka.publish).toHaveBeenCalledWith('franchise.registered', expect.any(Object));
    });

    it('rejects a country that is not an active franchise market', async () => {
      // Used to default to 'IN' and save, so a typo produced a franchise
      // quietly settling in a currency nobody chose.
      const result = await service.registerFranchise({
        businessName: 'East Africa Foods', contactEmail: 'ea@test.com', countryCode: 'EA',
      });
      expect(result.success).toBe(false);
      expect(result.supportedMarkets).toContain('QA');
      expect(kafka.publish).not.toHaveBeenCalledWith('franchise.registered', expect.any(Object));
    });

    it('keeps commission rates only for modules the market runs', async () => {
      // Qatar does not enable doctor; a rate for it must not be stored.
      const result = await service.registerFranchise({
        businessName: 'Pearl Franchise', countryCode: 'QA',
        commissionRates: { grocery: 9, doctor: 14 },
      });
      expect(result.franchise?.commissionRates.grocery).toBe(9);
      expect(result.franchise?.commissionRates).not.toHaveProperty('doctor');
    });
  });

  describe('region settings', () => {
    it('resolves currency, tax and modules from the franchise country', () => {
      const kw = service.buildRegionSettings('KW');
      expect(kw.supported).toBe(true);
      // The Kuwaiti dinar divides into thousandths. Two decimals would round
      // away a real unit of money on every commission line.
      expect(kw.currency).toEqual({ code: 'KWD', symbol: 'KD', decimals: 3 });
      expect(kw.tax?.rate).toBe(0);
    });

    it('reports an unsupported country instead of guessing a currency', () => {
      const zz = service.buildRegionSettings('ZZ');
      expect(zz.supported).toBe(false);
      expect(zz).not.toHaveProperty('currency');
    });

    it('offers every active franchise market', () => {
      const codes = service.listSupportedMarkets().markets.map((m) => m.code);
      expect(codes).toEqual(
        expect.arrayContaining(['QA', 'AE', 'SA', 'BH', 'KW', 'OM', 'IN', 'GB', 'US']),
      );
    });
  });

  describe('per-module KPIs', () => {
    it('formats grocery revenue from the number grocery-service returns', async () => {
      grocery.send.mockReturnValue(
        of({ activeStores: 3, totalProducts: 40, totalOrders: 120, revenue: 250000 }),
      );

      const result = await service.getGroceryKpis('FRAN-001');

      expect(grocery.send).toHaveBeenCalledWith({ cmd: 'franchise_grocery_kpis' }, { franchiseId: 'FRAN-001' });
      expect(result.activeStores).toBe(3);
      // Revenue leaves the service as a number now. It used to arrive as
      // '₹2.5L' — rupees and Indian lakhs, formatted server-side for every
      // market. The client formats it against the viewer's region instead.
      expect(result.revenue).toBe(250000);
    });

    it('asks restaurant-service for its own KPIs', async () => {
      restaurant.send.mockReturnValue(
        of({ activeRestaurants: 2, totalOrders: 80, revenue: 100000, avgRating: 4.3 }),
      );

      const result = await service.getRestaurantKpis('FRAN-001');

      expect(restaurant.send).toHaveBeenCalledWith({ cmd: 'franchise_restaurant_kpis' }, { franchiseId: 'FRAN-001' });
      expect(result.avgRating).toBe(4.3);
      expect(result.revenue).toBe(100000);
    });

    it('asks doctor-service for clinic KPIs', async () => {
      doctor.send.mockReturnValue(
        of({ activeClinics: 4, totalDoctors: 11, todayAppointments: 6, revenue: 50000 }),
      );

      const result = await service.getDoctorKpis('FRAN-001');

      expect(doctor.send).toHaveBeenCalledWith({ cmd: 'franchise_doctor_kpis' }, { franchiseId: 'FRAN-001' });
      expect(result.totalDoctors).toBe(11);
    });

    it('asks pharmacy-service for compliance rather than querying a licence column', async () => {
      pharmacy.send.mockReturnValue(of({ compliant: 2, total: 3, issues: [{ storeId: 'S1' }] }));

      const result = await service.getPharmacyCompliance('FRAN-001');

      expect(pharmacy.send).toHaveBeenCalledWith({ cmd: 'franchise_pharmacy_compliance' }, { franchiseId: 'FRAN-001' });
      expect(result.total).toBe(3);
    });
  });

  describe('status updates', () => {
    it('delegates the write to the owning module and emits only on success', async () => {
      grocery.send.mockReturnValue(of({ success: true, message: 'Status updated to APPROVED' }));

      const result = await service.updateGroceryStoreStatus('FRAN-001', 'STORE-9', 'APPROVED');

      expect(grocery.send).toHaveBeenCalledWith(
        { cmd: 'franchise_grocery_update_store_status' },
        { franchiseId: 'FRAN-001', storeId: 'STORE-9', status: 'APPROVED' },
      );
      expect(result.success).toBe(true);
      expect(kafka.publish).toHaveBeenCalledWith(
        'franchise.grocery.store_status_updated',
        expect.objectContaining({ franchiseId: 'FRAN-001', entityId: 'STORE-9', status: 'APPROVED' }),
      );
    });

    it('does not emit an event when the owning module rejects the change', async () => {
      grocery.send.mockReturnValue(of({ success: false, message: 'Store not found under franchise' }));

      const result = await service.updateGroceryStoreStatus('FRAN-001', 'NOT-MINE', 'APPROVED');

      expect(result.success).toBe(false);
      expect(kafka.publish).not.toHaveBeenCalledWith('franchise.grocery.store_status_updated', expect.anything());
    });
  });

  describe('upstream failure handling', () => {
    it('degrades to a safe default when the owning module is unreachable', async () => {
      grocery.send.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));

      const result = await service.getGroceryStores('FRAN-001');

      expect(result).toEqual({ stores: [], total: 0 });
    });
  });
});
