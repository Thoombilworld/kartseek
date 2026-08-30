import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentOrchestratorService } from './payment.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { Payment, PaymentStatus, PaymentModule, PaymentGateway } from './entities/payment.entity';
import { GatewayAdapterFactory } from './adapters/gateway-adapter.factory';
import { RealTimeBillingService } from './services/realtime-billing.service';

describe('PaymentOrchestratorService', () => {
  let service: PaymentOrchestratorService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let paymentRepo: any;
  let gatewayFactory: jest.Mocked<GatewayAdapterFactory>;
  let billingService: jest.Mocked<RealTimeBillingService>;

  const mockAdapter = {
    gatewayName: 'stripe',
    initiate: jest.fn().mockResolvedValue({
      transactionId: 'txn-123',
      redirectUrl: 'https://pay.stripe.com/session/123',
      status: 'PENDING',
    }),
    verify: jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      transactionId: 'txn-123',
      gatewayResponse: { chargeId: 'ch_123' },
    }),
    refund: jest.fn().mockResolvedValue({
      success: true, refundId: 'ref-123',
    }),
  };

  beforeEach(async () => {
    // `mockAdapter` is built once at describe scope, so its call history
    // accumulated across every test in the file. Any assertion of the form
    // "the gateway was never called" silently passed on a previous test's
    // call. Clears history only — `mockResolvedValue` implementations survive.
    jest.clearAllMocks();

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
    const gatewayFactoryMock: Partial<jest.Mocked<GatewayAdapterFactory>> = {
      getAdapter: jest.fn().mockResolvedValue(mockAdapter),
      getAdapterByName: jest.fn().mockReturnValue(mockAdapter),
    };
    const billingMock: Partial<jest.Mocked<RealTimeBillingService>> = {
      preAuthorize: jest.fn().mockResolvedValue({ success: true }),
      getBillingState: jest.fn().mockResolvedValue(null),
    };
    const paymentRepoMock = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((dto) => ({ id: 'pay-1', ...dto })),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        getCount: jest.fn().mockResolvedValue(0),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ sum: '0', count: '0' }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentOrchestratorService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        { provide: GatewayAdapterFactory, useValue: gatewayFactoryMock },
        { provide: RealTimeBillingService, useValue: billingMock },
        { provide: getRepositoryToken(Payment), useValue: paymentRepoMock },
      ],
    }).compile();

    service = module.get<PaymentOrchestratorService>(PaymentOrchestratorService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    paymentRepo = module.get(getRepositoryToken(Payment));
    gatewayFactory = module.get(GatewayAdapterFactory);
    billingService = module.get(RealTimeBillingService);
  });

  describe('initiatePayment', () => {
    it('should create payment and resolve gateway adapter', async () => {
      const result = await service.initiatePayment({
        module: 'MARKETPLACE' as PaymentModule,
        orderId: 'ORD-001',
        customerId: 'u1',
        amount: 1500,
        currency: 'INR',
        countryCode: 'IN',
        methodType: 'card',
      });
      expect(result).toBeDefined();
      expect(result.paymentNumber).toMatch(/^PAY-/);
      expect(gatewayFactory.getAdapter).toHaveBeenCalledWith('IN', 'card');
      expect(paymentRepo.save).toHaveBeenCalled();
      expect(kafka.publish).toHaveBeenCalled();
    });

    it('should reject zero/negative amount', async () => {
      await expect(service.initiatePayment({
        module: 'MARKETPLACE' as PaymentModule,
        orderId: 'ORD-002',
        customerId: 'u1',
        amount: 0,
        currency: 'INR',
        countryCode: 'IN',
        methodType: 'card',
      })).rejects.toThrow('Amount must be positive');
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment via gateway adapter', async () => {
      paymentRepo.findOne.mockResolvedValue({
        id: 'pay-1', paymentNumber: 'PAY-123', status: PaymentStatus.INITIATED,
        gateway: PaymentGateway.STRIPE, transactionId: 'txn-123',
        // A payment at INITIATED has been registered with the gateway, so it
        // has the gateway's own order id. The fixture omitted it, which is not
        // a state this payment could really be in.
        gatewayOrderId: 'order_stripe_1',
        module: 'MARKETPLACE', countryCode: 'IN',
      });
      const result = await service.verifyPayment({ paymentId: 'PAY-123', gatewayPaymentId: 'txn-123' });
      expect(result).toBeDefined();
      expect(mockAdapter.verify).toHaveBeenCalled();
    });

    it('refuses to verify a payment that never reached the gateway', async () => {
      paymentRepo.findOne.mockResolvedValue({
        id: 'pay-2', paymentNumber: 'PAY-404', status: PaymentStatus.INITIATED,
        gateway: PaymentGateway.STRIPE, gatewayOrderId: null,
        module: 'MARKETPLACE', countryCode: 'IN',
      });
      await expect(
        service.verifyPayment({ paymentId: 'PAY-404', gatewayPaymentId: 'txn-x' }),
      ).rejects.toThrow('never registered');
      expect(mockAdapter.verify).not.toHaveBeenCalled();
    });

    it('should throw when payment not found', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      await expect(service.verifyPayment({ paymentId: 'MISSING', gatewayPaymentId: 'txn-x' })).rejects.toThrow();
    });
  });

  describe('getPaymentById', () => {
    it('should return payment details', async () => {
      paymentRepo.findOne.mockResolvedValue({
        id: 'pay-1', paymentNumber: 'PAY-123', status: PaymentStatus.SUCCESS,
      });
      const result = await service.getPaymentById('PAY-123');
      expect(result.paymentNumber).toBe('PAY-123');
    });

    it('should throw when not found', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      await expect(service.getPaymentById('NOPE')).rejects.toThrow();
    });
  });

  describe('initiateRefund', () => {
    it('should process refund through gateway', async () => {
      paymentRepo.findOne.mockResolvedValue({
        id: 'pay-1', paymentNumber: 'PAY-123', status: PaymentStatus.SUCCESS,
        gateway: PaymentGateway.STRIPE, transactionId: 'txn-123',
        // SUCCESS means the charge went through, which is exactly when the
        // gateway payment id is written.
        gatewayPaymentId: 'ch_stripe_1',
        amount: 1500, refundedAmount: 0, countryCode: 'IN',
      });
      const result = await service.initiateRefund({ paymentId: 'PAY-123', amount: 1500, reason: 'Customer return', initiatedBy: 'u1' });
      expect(result).toBeDefined();
      expect(mockAdapter.refund).toHaveBeenCalled();
    });

    it('refuses to refund a payment with no gateway charge', async () => {
      paymentRepo.findOne.mockResolvedValue({
        id: 'pay-3', paymentNumber: 'PAY-777', status: PaymentStatus.SUCCESS,
        gateway: PaymentGateway.STRIPE, gatewayPaymentId: null,
        amount: 1500, refundedAmount: 0, countryCode: 'IN',
      });
      await expect(
        service.initiateRefund({ paymentId: 'PAY-777', amount: 1500, reason: 'Customer return', initiatedBy: 'u1' }),
      ).rejects.toThrow('no gateway charge');
      // The point of the guard: no money movement is attempted at all.
      expect(mockAdapter.refund).not.toHaveBeenCalled();
    });
  });

  describe('getCustomerPayments', () => {
    it('should return paginated payment history', async () => {
      paymentRepo.findAndCount.mockResolvedValue([
        [{ id: 'pay-1', status: PaymentStatus.SUCCESS }], 1,
      ]);
      const result = await service.getCustomerPayments('u1');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
