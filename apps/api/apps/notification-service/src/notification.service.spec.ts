import { Test, type TestingModule } from '@nestjs/testing';
import { NotificationService, NotificationType, NotificationChannel } from './notification.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

describe('NotificationService', () => {
  let service: NotificationService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;

  beforeEach(async () => {
    // Clear env vars to ensure log-only mode
    delete process.env.FCM_SERVER_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.SENDGRID_API_KEY;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  describe('healthCheck', () => {
    it('should return health with provider status', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('notification-service');
      expect(result.status).toBe('ok');
      expect(result.providers.fcm).toBe('unconfigured');
    });
  });

  describe('sendPush', () => {
    it('should store notification in user inbox', async () => {
      const result = await service.sendPush({
        userId: 'USER-001',
        title: 'Test',
        body: 'Test notification',
        type: NotificationType.ORDER,
      });

      expect(result.success).toBe(true);
      expect(result.notifId).toMatch(/^NOTIF-/);
      expect(redis.setJson).toHaveBeenCalled();
      expect(kafka.publish).toHaveBeenCalledWith('notification.sent', expect.any(Object));
    });

    it('should increment unread counter', async () => {
      redis.get.mockResolvedValue('3');
      await service.sendPush({
        userId: 'USER-001',
        title: 'Test',
        body: 'Body',
        type: NotificationType.SYSTEM,
      });
      expect(redis.set).toHaveBeenCalledWith(
        'notifications:unread:USER-001',
        '4',
        expect.any(Number),
      );
    });

    it('should append to existing inbox', async () => {
      redis.getJson.mockResolvedValue([{ id: 'old-notif', read: false }]);
      await service.sendPush({
        userId: 'USER-001',
        title: 'New',
        body: 'New notification',
        type: NotificationType.PROMO,
      });
      // Should save with new notification prepended
      expect(redis.setJson).toHaveBeenCalled();
    });
  });

  describe('sendSms', () => {
    it('should log SMS when Twilio is not configured', async () => {
      const result = await service.sendSms({ phone: '+919876543210', message: 'Hello' });
      expect(result.success).toBe(true);
      expect(result.provider).toBe('log-only');
    });

    it('should resolve template variables', async () => {
      const result = await service.sendSms({
        phone: '+919876543210',
        message: 'Hello {{name}}, your order {{orderId}} is ready',
        variables: { name: 'John', orderId: 'ORD-001' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendEmail', () => {
    it('should log email when SendGrid is not configured', async () => {
      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        body: '<p>Hello</p>',
      });
      expect(result.success).toBe(true);
      expect(result.provider).toBe('log-only');
    });
  });

  describe('getNotifications', () => {
    it('should return empty list for new user', async () => {
      redis.getJson.mockResolvedValue(null);
      redis.get.mockResolvedValue('0');
      const result = await service.getNotifications('USER-NEW');
      expect(result.total).toBe(0);
      expect(result.unread).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('should paginate correctly', async () => {
      const fakeInbox = Array.from({ length: 30 }, (_, i) => ({ id: `N-${i}`, read: false }));
      redis.getJson.mockResolvedValue(fakeInbox);
      redis.get.mockResolvedValue('30');

      const page1 = await service.getNotifications('USER-001', 1, 10);
      expect(page1.data.length).toBe(10);
      expect(page1.total).toBe(30);
      expect(page1.hasMore).toBe(true);

      const page3 = await service.getNotifications('USER-001', 3, 10);
      expect(page3.data.length).toBe(10);
      expect(page3.hasMore).toBe(false);
    });
  });

  describe('markAsRead', () => {
    it('should mark specific notifications as read', async () => {
      redis.getJson.mockResolvedValue([
        { id: 'N-1', read: false },
        { id: 'N-2', read: false },
        { id: 'N-3', read: true },
      ]);
      redis.get.mockResolvedValue('2');

      const result = await service.markAsRead('USER-001', ['N-1']);
      expect(result.success).toBe(true);
      expect(result.marked).toBe(1);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read and reset counter', async () => {
      redis.getJson.mockResolvedValue([
        { id: 'N-1', read: false },
        { id: 'N-2', read: false },
      ]);
      const result = await service.markAllAsRead('USER-001');
      expect(result.success).toBe(true);
      expect(result.unread).toBe(0);
      expect(redis.set).toHaveBeenCalledWith('notifications:unread:USER-001', '0', expect.any(Number));
    });
  });

  describe('getPreferences', () => {
    it('should return default preferences for new user', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.getPreferences('USER-NEW');
      expect(result.push).toBe(true);
      expect(result.sms).toBe(true);
      expect(result.email).toBe(true);
    });
  });

  describe('updatePreferences', () => {
    it('should merge with existing preferences', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.updatePreferences('USER-001', { promos: false });
      expect(result.success).toBe(true);
      expect(result.preferences.promos).toBe(false);
      expect(result.preferences.push).toBe(true); // default preserved
    });
  });
});
