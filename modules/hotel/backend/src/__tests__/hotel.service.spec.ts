import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HotelService } from '../hotel.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { HotelPaymentMethod } from '../dto/create-booking.dto';
import { Hotel } from '../entities/hotel.entity';
import { HotelRoom } from '../entities/hotel-room.entity';
import { HotelBooking } from '../entities/hotel-booking.entity';
import { HotelReview } from '../entities/hotel-review.entity';
import { HotelOwner } from '../entities/hotel-owner.entity';
import { HotelGuest } from '../entities/hotel-guest.entity';
import { HotelPayout } from '../entities/hotel-payout.entity';
import { HotelStaff } from '../entities/hotel-staff.entity';
import { HotelSeasonalPricing } from '../entities/hotel-seasonal-pricing.entity';

describe('HotelService', () => {
  let service: HotelService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let hotelRepo: any;
  let roomRepo: any;
  let bookingRepo: any;
  let reviewRepo: any;

  const mockRepoFactory = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
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
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ avg: '0', count: '0', sum: '0', min: '0' }),
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
        HotelService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        { provide: getRepositoryToken(Hotel), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(HotelRoom), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(HotelBooking), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(HotelReview), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(HotelOwner), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(HotelGuest), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(HotelPayout), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(HotelStaff), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(HotelSeasonalPricing), useFactory: mockRepoFactory },
      ],
    }).compile();

    service = module.get<HotelService>(HotelService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    hotelRepo = module.get(getRepositoryToken(Hotel));
    roomRepo = module.get(getRepositoryToken(HotelRoom));
    bookingRepo = module.get(getRepositoryToken(HotelBooking));
    reviewRepo = module.get(getRepositoryToken(HotelReview));
  });

  describe('healthCheck', () => {
    it('should return ok when DB connected', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('hotel-service');
      expect(result.status).toBe('ok');
      expect(result.db).toBe(true);
    });

    it('should return degraded when DB fails', async () => {
      hotelRepo.query.mockRejectedValue(new Error('DB down'));
      const result = await service.healthCheck();
      expect(result.status).toBe('degraded');
      expect(result.db).toBe(false);
    });
  });

  describe('searchHotels', () => {
    it('should return paginated search results', async () => {
      const result = await service.searchHotels({ page: 1, limit: 10 });
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getHotelById', () => {
    it('should throw when hotel not found', async () => {
      hotelRepo.findOne.mockResolvedValue(null);
      await expect(service.getHotelById('missing')).rejects.toThrow();
    });

    it('should return hotel with rooms', async () => {
      hotelRepo.findOne.mockResolvedValue({
        id: 'h1', name: 'Grand Hotel', rooms: [{ id: 'rm1', type: 'Deluxe' }],
      });
      const result = await service.getHotelById('h1');
      expect(result.name).toBe('Grand Hotel');
    });
  });

  describe('createBooking', () => {
    it('should create hotel booking', async () => {
      hotelRepo.findOne.mockResolvedValue({ id: 'h1', name: 'Grand Hotel' });
      roomRepo.findOne.mockResolvedValue({ id: 'rm1', pricePerNight: 5000, isAvailable: true });
      bookingRepo.create.mockImplementation((dto: any) => dto);
      bookingRepo.save.mockResolvedValue({ id: 'bk-1' });
      const result = await service.createBooking('h1', {
        customerId: 'u1', roomId: 'rm1',
        checkin: '2026-08-01', checkout: '2026-08-03', guests: 2, rooms: 1,
        paymentMethod: HotelPaymentMethod.CARD,
      });
      expect(result.success).toBe(true);
      expect(kafka.publish).toHaveBeenCalled();
    });
  });

  describe('getBookingById', () => {
    it('should return booking details', async () => {
      bookingRepo.findOne.mockResolvedValue({
        id: 'bk-1', hotelId: 'h1', status: 'CONFIRMED',
      });
      // A requester is mandatory: findBookingFor scopes the lookup to the
      // booking's own customer unless the caller holds a privileged role, so a
      // guest cannot read someone else's reservation by id. The spec predates
      // that scoping and called it with no requester at all.
      const result = await service.getBookingById('bk-1', { requesterId: 'u1' });
      expect(result.id).toBe('bk-1');
    });

    it('should throw when booking not found', async () => {
      bookingRepo.findOne.mockResolvedValue(null);
      // Also passes a requester: without one this would throw on the missing
      // requester rather than the missing booking, and pass for the wrong reason.
      await expect(service.getBookingById('missing', { requesterId: 'u1' })).rejects.toThrow();
    });
  });

  describe('submitReview', () => {
    it('should submit hotel review', async () => {
      hotelRepo.findOne.mockResolvedValue({ id: 'h1', name: 'Grand Hotel', rating: 4.2, totalReviews: 20 });
      reviewRepo.create.mockImplementation((dto: any) => dto);
      reviewRepo.save.mockResolvedValue({ id: 'rev-1' });
      const result = await service.submitReview('h1', {
        userId: 'u1', bookingId: 'bk-1',
        rating: 5, comment: 'Excellent stay!',
      });
      expect(result.success).toBe(true);
    });
  });

});
