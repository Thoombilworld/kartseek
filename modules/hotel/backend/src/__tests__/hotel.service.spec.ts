import { Test, type TestingModule } from '@nestjs/testing';
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
import { HotelMarketSettings } from '../entities/hotel-market-settings.entity';

describe('HotelService', () => {
  let service: HotelService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let hotelRepo: any;
  let settingsRepo: any;
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
        { provide: getRepositoryToken(HotelMarketSettings), useFactory: mockRepoFactory },
      ],
    }).compile();

    service = module.get<HotelService>(HotelService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    hotelRepo = module.get(getRepositoryToken(Hotel));
    settingsRepo = module.get(getRepositoryToken(HotelMarketSettings));
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
        id: 'h1',
        name: 'Grand Hotel',
        rooms: [{ id: 'rm1', type: 'Deluxe' }],
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
        customerId: 'u1',
        roomId: 'rm1',
        checkin: '2026-08-01',
        checkout: '2026-08-03',
        guests: 2,
        rooms: 1,
        paymentMethod: HotelPaymentMethod.CARD,
      });
      expect(result.success).toBe(true);
      expect(kafka.publish).toHaveBeenCalled();
    });
  });

  describe('getBookingById', () => {
    it('should return booking details', async () => {
      bookingRepo.findOne.mockResolvedValue({
        id: 'bk-1',
        hotelId: 'h1',
        status: 'CONFIRMED',
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
      hotelRepo.findOne.mockResolvedValue({
        id: 'h1',
        name: 'Grand Hotel',
        rating: 4.2,
        totalReviews: 20,
      });
      reviewRepo.create.mockImplementation((dto: any) => dto);
      reviewRepo.save.mockResolvedValue({ id: 'rev-1' });
      const result = await service.submitReview('h1', {
        userId: 'u1',
        bookingId: 'bk-1',
        rating: 5,
        comment: 'Excellent stay!',
      });
      expect(result.success).toBe(true);
    });
  });

  /**
   * A market's configuration, ENFORCED on registration (M5 review, Important 1).
   *
   * `hotel_market_settings` was stored, scoped and reported back as
   * `configured: true` while nothing on the platform read it. Two of its keys
   * act here now, and these tests pin both branches of each — because the
   * failure this closes is a screen that says a market auto-approves while
   * registration goes on queueing properties for a human.
   */
  describe('createHotel applies the market configuration', () => {
    /** Make `HotelService.marketSettings` answer with a row, or with none. */
    const marketSays = (row: Record<string, unknown> | null) => {
      settingsRepo.createQueryBuilder.mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(row),
      });
    };

    const dto: any = {
      name: 'M5 Probe Hotel',
      description: 'probe',
      address: '1 Probe Road',
      city: 'Mumbai',
      country: 'IN',
      starRating: 3,
      location: { lat: 19.07, lng: 72.87 },
    };

    it('queues a property for a human when the market does not auto-approve', async () => {
      marketSays({ countryCode: 'IN', autoApproveHotels: false, defaultCommissionRate: null });
      const out: any = await service.createHotel('owner-1', dto);

      expect(hotelRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PENDING_APPROVAL',
          isAcceptingBookings: false,
          approvedBy: null,
          approvedAt: null,
          countryCode: 'IN',
        }),
      );
      expect(out.autoApproved).toBe(false);
      expect(kafka.publish).not.toHaveBeenCalledWith('hotel.approved', expect.anything());
    });

    it('puts it straight into ACTIVE when the market does auto-approve', async () => {
      marketSays({ countryCode: 'IN', autoApproveHotels: true, defaultCommissionRate: null });
      const out: any = await service.createHotel('owner-1', dto);

      expect(hotelRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // The state `approveHotel` writes, not the unused `APPROVED` — an
          // auto-approved property must not land in a lifecycle the manual path
          // never produces.
          status: 'ACTIVE',
          isAcceptingBookings: true,
          approvedBy: 'system:auto-approve:IN',
        }),
      );
      expect(out.autoApproved).toBe(true);
    });

    it('publishes the SAME approval event a human decision publishes', async () => {
      marketSays({ countryCode: 'IN', autoApproveHotels: true, defaultCommissionRate: null });
      await service.createHotel('owner-1', dto);

      expect(kafka.publish).toHaveBeenCalledWith(
        'hotel.approved',
        expect.objectContaining({ market: 'IN', approvedBy: 'system:auto-approve:IN' }),
      );
    });

    it("stamps the market's default commission on a property with no negotiated rate", async () => {
      marketSays({ countryCode: 'IN', autoApproveHotels: false, defaultCommissionRate: '12.50' });
      await service.createHotel('owner-1', dto);

      expect(hotelRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ commissionRate: 12.5 }),
      );
    });

    it('leaves the column default alone for a market nobody has configured', async () => {
      marketSays(null);
      await service.createHotel('owner-1', dto);

      const created = hotelRepo.create.mock.calls[0][0];
      expect(created.status).toBe('PENDING_APPROVAL');
      expect('commissionRate' in created).toBe(false);
    });

    it('writes the three NOT NULL columns the old spread left empty', async () => {
      marketSays(null);
      await service.createHotel('owner-1', dto);

      const created = hotelRepo.create.mock.calls[0][0];
      // `country` is the DTO's name for the market and is not a column; the old
      // spread handed it to TypeORM, which discarded it, leaving countryCode
      // NULL on a NOT NULL column.
      expect(created.countryCode).toBe('IN');
      expect(created.slug).toBe('m5-probe-hotel');
      expect(created.latitude).toBe(19.07);
      expect(created.longitude).toBe(72.87);
      expect('country' in created).toBe(false);
    });

    it('refuses a country this platform does not operate in, writing nothing', async () => {
      marketSays(null);
      await expect(
        service.createHotel('owner-1', { ...dto, country: 'NOT-A-COUNTRY' }),
      ).rejects.toThrow();
      expect(hotelRepo.save).not.toHaveBeenCalled();
    });
  });
});
