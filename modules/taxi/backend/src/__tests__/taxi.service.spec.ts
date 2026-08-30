import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaxiService } from '../taxi.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { RideMatchingService } from '../services/ride-matching.service';
import { FareCalculationService } from '../services/fare-calculation.service';
import { DriverDispatchService } from '../services/driver-dispatch.service';
import { TaxiRideEntity } from '../entities/taxi-ride.entity';

describe('TaxiService', () => {
  let service: TaxiService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let matching: jest.Mocked<RideMatchingService>;
  let fare: jest.Mocked<FareCalculationService>;
  let dispatch: jest.Mocked<DriverDispatchService>;
  let rideRepo: any;

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    const matchingMock: Partial<jest.Mocked<RideMatchingService>> = {
      getActiveSessionStats: jest.fn().mockReturnValue({ activeMatches: 0, pendingRequests: 0 }),
      findAndMatchDriver: jest.fn().mockResolvedValue({
        matched: true, driverId: 'DRV-100', driverName: 'John', vehicleType: 'sedan',
        eta: 5, distance: 2.3,
      }),
      cancelMatch: jest.fn().mockResolvedValue({ cancelled: true }),
      cancelMatching: jest.fn().mockResolvedValue({ cancelled: true }),
      startMatching: jest.fn().mockResolvedValue({ matched: true, driverId: 'DRV-100' }),
    } as any;
    const fareMock: Partial<jest.Mocked<FareCalculationService>> = {
      estimateAllVehicleTypes: jest.fn().mockResolvedValue([
        { vehicleType: 'sedan', fare: 350, eta: 5 },
        { vehicleType: 'suv', fare: 500, eta: 7 },
      ]),
      estimateSingleVehicleType: jest.fn().mockResolvedValue({
        vehicleType: 'sedan', fare: 350, baseFare: 100, distanceFare: 200, timeFare: 50,
      }),
    };
    const dispatchMock: Partial<jest.Mocked<DriverDispatchService>> = {
      getOnlineDriverCount: jest.fn().mockResolvedValue(25),
      updateDriverLocation: jest.fn().mockResolvedValue({ success: true }),
      goOnline: jest.fn().mockResolvedValue({ success: true }),
      goOffline: jest.fn().mockResolvedValue({ success: true }),
      getActiveTrip: jest.fn().mockResolvedValue(null),
      generateRideOtp: jest.fn().mockResolvedValue('1234'),
    } as any;
    const rideRepoMock = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'ride-1', ...e })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getRawOne: jest.fn().mockResolvedValue({ avg: '0', count: '0', sum: '0' }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxiService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        { provide: RideMatchingService, useValue: matchingMock },
        { provide: FareCalculationService, useValue: fareMock },
        { provide: DriverDispatchService, useValue: dispatchMock },
        { provide: getRepositoryToken(TaxiRideEntity), useValue: rideRepoMock },
      ],
    }).compile();

    service = module.get<TaxiService>(TaxiService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    matching = module.get(RideMatchingService);
    fare = module.get(FareCalculationService);
    dispatch = module.get(DriverDispatchService);
    rideRepo = module.get(getRepositoryToken(TaxiRideEntity));
  });

  describe('healthCheck', () => {
    it('should return health with driver and match stats', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('taxi-service');
      expect(result.status).toBe('ok');
      expect(result.onlineDrivers).toBe(25);
      expect(result.activeMatches).toBe(0);
    });
  });

  describe('estimateFare', () => {
    it('should return all vehicle type estimates', async () => {
      const result = await service.estimateFare({
        pickupLat: -1.28, pickupLng: 36.82, dropLat: -1.30, dropLng: 36.85,
      });
      expect(result).toHaveLength(2);
      expect((result as any[])[0].vehicleType).toBe('sedan');
    });

    it('should estimate for single vehicle type', async () => {
      const result = await service.estimateFare({
        pickupLat: -1.28, pickupLng: 36.82, dropLat: -1.30, dropLng: 36.85,
        vehicleType: 'sedan',
      });
      expect((result as any).vehicleType).toBe('sedan');
      expect((result as any).fare).toBe(350);
    });
  });

  describe('requestRide', () => {
    it('should request ride and find driver', async () => {
      const result = await service.requestRide({
        passengerId: 'u1',
        pickupLat: -1.28, pickupLng: 36.82,
        dropLat: -1.30, dropLng: 36.85,
        vehicleType: 'sedan',
      } as any);
      expect(result.success).toBe(true);
      expect(result.ride).toBeDefined();
      expect(kafka.publish).toHaveBeenCalled();
    });
  });

  describe('cancelRide', () => {
    it('should cancel an active ride', async () => {
      redis.getJson.mockResolvedValue({
        id: 'ride-1', passengerId: 'u1', status: 'SEARCHING',
      });
      const result = await (service as any).cancelRide('ride-1', 'Changed plans');
      expect(result.success).toBe(true);
    });
  });

  describe('getRideHistory', () => {
    it('should return paginated ride history', async () => {
      rideRepo.findAndCount.mockResolvedValue([
        [{ id: 'ride-1', status: 'COMPLETED' }], 1,
      ]);
      const result = await service.getRideHistory('u1');
      expect(result.data).toHaveLength(1);
    });
  });

});
