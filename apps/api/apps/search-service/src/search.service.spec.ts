import { Test, TestingModule } from '@nestjs/testing';
import { SearchService, SearchableModule } from './search.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

// Mock global fetch
global.fetch = jest.fn();

describe('SearchService', () => {
  let service: SearchService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;

  beforeEach(async () => {
    // Ensure ES is marked unavailable for unit tests
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      keys: jest.fn().mockResolvedValue([]),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('search-service');
      expect(result.status).toBe('ok');
      expect(result.elasticsearch).toBe('unavailable');
    });
  });

  describe('search', () => {
    it('should return cached results if available', async () => {
      const cachedResult = { query: 'phone', results: [{ id: '1', title: 'iPhone' }], total: 1 };
      redis.getJson.mockResolvedValue(cachedResult);

      const result = await service.search('phone', {});
      expect(result).toEqual(cachedResult);
    });

    it('should use Redis fallback when ES is unavailable', async () => {
      redis.getJson
        .mockResolvedValueOnce(null) // cache miss
        .mockResolvedValueOnce(null) // popular searches
        .mockResolvedValue([]); // module doc sets

      const result = await service.search('laptop', {});
      expect(result.query).toBe('laptop');
      expect(result.results).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(kafka.publish).toHaveBeenCalledWith('search.performed', expect.any(Object));
    });

    it('should filter by service type', async () => {
      redis.getJson
        .mockResolvedValueOnce(null) // cache miss
        .mockResolvedValueOnce(['item-1']) // grocery doc set
        .mockResolvedValueOnce({ id: 'item-1', title: 'Fresh Milk', module: 'grocery' }); // doc

      const result = await service.search('milk', { serviceType: 'grocery' });
      expect(result.query).toBe('milk');
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return empty for short prefix', async () => {
      const result = await service.getSearchSuggestions('a');
      expect(result.suggestions).toEqual([]);
    });

    it('should return suggestions for valid prefix', async () => {
      redis.getJson.mockResolvedValueOnce(null); // cache miss
      redis.getJson.mockResolvedValueOnce([ // popular searches
        { query: 'iphone 15', count: 50 },
        { query: 'iphone case', count: 30 },
      ]);

      const result = await service.getSearchSuggestions('iphone');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions).toContain('iphone 15');
    });
  });

  describe('indexDocument', () => {
    it('should store document in Redis index', async () => {
      const result = await service.indexDocument(SearchableModule.MARKETPLACE, 'prod-1', {
        name: 'Samsung Galaxy',
        description: 'Latest smartphone',
        price: 45000,
      });

      expect(result.success).toBe(true);
      expect(result.indexed.title).toBe('Samsung Galaxy');
      expect(redis.setJson).toHaveBeenCalled();
    });
  });

  describe('removeDocument', () => {
    it('should remove document from Redis', async () => {
      redis.getJson.mockResolvedValue(['prod-1', 'prod-2']);
      const result = await service.removeDocument(SearchableModule.MARKETPLACE, 'prod-1');
      expect(result.success).toBe(true);
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('getPopularSearches', () => {
    it('should return sorted popular searches', async () => {
      redis.getJson.mockResolvedValue([
        { query: 'iphone', count: 100 },
        { query: 'samsung', count: 50 },
        { query: 'laptop', count: 200 },
      ]);

      const result = await service.getPopularSearches(2);
      expect(result.queries.length).toBe(2);
      expect(result.queries[0].query).toBe('laptop');
    });
  });
});
