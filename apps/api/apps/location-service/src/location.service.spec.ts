import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LocationService } from './location.service';
import { RedisService } from '@app/redis';
import { Region, State, District, City, Pincode, DeliveryZone, ServiceArea } from './entities';

describe('LocationService', () => {
  let service: LocationService;
  let redis: jest.Mocked<RedisService>;
  let regionRepo: any;
  let cityRepo: any;
  let deliveryZoneRepo: any;
  let serviceAreaRepo: any;

  const mockRepoFactory = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'mock-uuid', ...e })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
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
    }),
  });

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: RedisService, useValue: redisMock },
        { provide: getRepositoryToken(Region), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(State), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(District), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(City), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Pincode), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(DeliveryZone), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ServiceArea), useFactory: mockRepoFactory },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    redis = module.get(RedisService);
    regionRepo = module.get(getRepositoryToken(Region));
    cityRepo = module.get(getRepositoryToken(City));
    deliveryZoneRepo = module.get(getRepositoryToken(DeliveryZone));
    serviceAreaRepo = module.get(getRepositoryToken(ServiceArea));
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('location-service');
      expect(result.status).toBe('ok');
    });
  });

  describe('detectLocationContext', () => {
    it('should resolve city and region from GPS', async () => {
      const mockCity = {
        id: 'city-1', name: 'Mumbai',
        district: { state: { region: { id: 'r1', countryCode: 'IN', name: 'India', currency: 'INR', taxRate: 18 } } },
      };
      cityRepo.createQueryBuilder().getOne.mockResolvedValue(mockCity);
      deliveryZoneRepo.createQueryBuilder().getOne.mockResolvedValue({
        id: 'dz-1', name: 'CBD Zone', deliveryFee: 150,
      });

      const result = await service.detectLocationContext(-1.2921, 36.8219);
      expect(result.success).toBe(true);
      expect(result.countryCode).toBe('IN');
      expect(result.country).toBe('India');
    });

    it('should return fallback when location is outside bounds', async () => {
      cityRepo.createQueryBuilder().getOne.mockResolvedValue(null);
      const result = await service.detectLocationContext(0, 0);
      expect(result.success).toBe(false);
      expect(result.message).toContain('out of operational bounds');
    });

    it('should resolve India coordinates', async () => {
      cityRepo.createQueryBuilder().getOne.mockResolvedValue(null);
      const result = await service.detectLocationContext(28.6139, 77.2090); // Delhi
      expect(result.countryCode).toBe('IN');
    });
  });

  describe('getRegions', () => {
    it('should return cached regions', async () => {
      const regions = [{ id: 'r1', name: 'India', countryCode: 'IN' }];
      regionRepo.find.mockResolvedValue(regions);
      const result = await service.getRegions();
      expect(result).toEqual(regions);
    });

    it('should query DB when not cached', async () => {
      redis.getJson.mockResolvedValue(null);
      regionRepo.find.mockResolvedValue([{ id: 'r1', name: 'India' }]);
      const result = await service.getRegions();
      expect(result).toHaveLength(1);
    });
  });

  describe('getCities', () => {
    it('should return cities for region', async () => {
      cityRepo.find.mockResolvedValue([
        { id: 'c1', name: 'Mumbai' },
        { id: 'c2', name: 'Delhi' },
      ]);
      const result = await service.getCities('r1');
      expect(result).toHaveLength(2);
    });
  });

});
