import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RestaurantService } from '../restaurant.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import {
  Restaurant, MenuCategory, MenuItem, RestaurantOrder, Reservation,
  RestaurantReview, RestaurantTable, RestaurantPromotion, RestaurantStaff,
  RestaurantOrderType, RestaurantPaymentMethod,
} from '../entities';

describe('RestaurantService', () => {
  let service: RestaurantService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let restaurantRepo: any;
  let menuItemRepo: any;
  let orderRepo: any;
  let reservationRepo: any;
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
    increment: jest.fn().mockResolvedValue({ affected: 1 }),
    query: jest.fn().mockResolvedValue([]),
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
      getRawOne: jest.fn().mockResolvedValue({ avg: '0', count: '0', sum: '0' }),
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
        RestaurantService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        { provide: getRepositoryToken(Restaurant), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(MenuCategory), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(MenuItem), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(RestaurantOrder), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Reservation), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(RestaurantReview), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(RestaurantTable), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(RestaurantPromotion), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(RestaurantStaff), useFactory: mockRepoFactory },
      ],
    }).compile();

    service = module.get<RestaurantService>(RestaurantService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    restaurantRepo = module.get(getRepositoryToken(Restaurant));
    menuItemRepo = module.get(getRepositoryToken(MenuItem));
    orderRepo = module.get(getRepositoryToken(RestaurantOrder));
    reservationRepo = module.get(getRepositoryToken(Reservation));
    reviewRepo = module.get(getRepositoryToken(RestaurantReview));
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('restaurant-service');
      expect(result.status).toBe('ok');
    });
  });

  describe('listRestaurants', () => {
    it('should return paginated restaurants', async () => {
      const result = await service.listRestaurants({ page: 1, limit: 10 });
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should apply cuisine and rating filters', async () => {
      await service.listRestaurants({ cuisine: 'Italian', minRating: 4.0, page: 1, limit: 10 });
      const qb = restaurantRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalled();
    });
  });

  describe('searchRestaurants', () => {
    it('should search by name', async () => {
      restaurantRepo.find.mockResolvedValue([{ id: 'r1', name: 'Pizza Palace' }]);
      const result = await service.searchRestaurants('Pizza');
      expect(result).toBeDefined();
    });
  });

  describe('getRestaurantById', () => {
    it('should throw when restaurant not found', async () => {
      restaurantRepo.findOne.mockResolvedValue(null);
      await expect(service.getRestaurantById('missing')).rejects.toThrow();
    });

    it('should return restaurant with menu', async () => {
      restaurantRepo.findOne.mockResolvedValue({ id: 'r1', name: 'Test', ownerId: 'o1' });
      const result = await service.getRestaurantById('r1');
      expect(result.id).toBe('r1');
    });
  });

  describe('getMenuByRestaurant', () => {
    it('should return menu grouped by category', async () => {
      const result = await service.getMenuByRestaurant('r1');
      expect(result.restaurantId).toBe('r1');
      expect(result.categories).toEqual([]);
    });
  });

  describe('placeOrder', () => {
    it('should create restaurant order', async () => {
      restaurantRepo.findOne.mockResolvedValue({ id: 'r1', name: 'Test', isOnline: true });
      // `isAvailable` is load-bearing: placeOrder re-reads each item from the
      // menu and refuses one the restaurant has switched off, rather than
      // trusting the price and availability the request claimed. The fixture
      // predates that check, so it was ordering an item the service correctly
      // treats as unavailable.
      menuItemRepo.find.mockResolvedValue([
        { id: 'mi-1', price: 250, name: 'Burger', isAvailable: true },
      ]);
      const result = await service.placeOrder({
        restaurantId: 'r1',
        customerId: 'u1',
        items: [{ itemId: 'mi-1', name: 'Burger', quantity: 2, price: 250, isVeg: false }],
        orderType: RestaurantOrderType.DELIVERY,
        paymentMethod: RestaurantPaymentMethod.ONLINE,
      });
      expect(result.success).toBe(true);
      expect(kafka.publish).toHaveBeenCalled();
    });
  });

  describe('submitReview', () => {
    it('should submit and recalculate restaurant rating', async () => {
      restaurantRepo.findOne.mockResolvedValue({ id: 'r1', rating: 4.0, totalReviews: 10 });
      reviewRepo.create.mockImplementation((dto: any) => dto);
      reviewRepo.save.mockResolvedValue({ id: 'rev-1' });
      const result = await service.submitReview({
        restaurantId: 'r1', customerId: 'u1', customerName: 'Test User', rating: 5, comment: 'Excellent!',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('bookTable', () => {
    it('should create table reservation', async () => {
      restaurantRepo.findOne.mockResolvedValue({ id: 'r1', name: 'Test', acceptsReservations: true });
      reservationRepo.create.mockImplementation((dto: any) => dto);
      reservationRepo.save.mockResolvedValue({ id: 'res-1' });
      const result = await service.bookTable('r1', {
        customerId: 'u1', customerName: 'Test User', date: '2026-08-01', time: '19:00', guests: 4,
      });
      expect(result.success).toBe(true);
    });
  });
});
