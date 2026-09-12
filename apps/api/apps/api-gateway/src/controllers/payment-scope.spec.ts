import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, type ArgumentMetadata } from '@nestjs/common';
import { of } from 'rxjs';
import { PaymentGatewayController } from './payment.controller';
import { GatewayValidationPipe } from '../pipes/gateway-validation.pipe';
import {
  PAYMENT_GATEWAYS,
  PAYMENT_MODULES,
  PAYMENT_STATUSES,
  PaymentDashboardFilterDto,
} from '../dto/payment.dto';
import {
  PaymentGateway,
  PaymentModule,
  PaymentStatus,
} from '../../../payment-service/src/entities/payment.entity';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

function build() {
  const client = { send: vi.fn(() => of({ data: [] })) };
  const ctrl = Object.create(PaymentGatewayController.prototype) as PaymentGatewayController;
  Object.assign(ctrl, { paymentClient: client, logger: { error: vi.fn() } });
  (ctrl as any).send = (cmd: string, payload: any) => {
    client.send({ cmd }, payload);
    return Promise.resolve({ data: [] });
  };
  return { ctrl, client };
}

describe('/payments/admin/* carries the caller market', () => {
  it('forwards the locked market on all six reads', async () => {
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(qaAdmin), {});
    await ctrl.getSettlementDashboard(req(qaAdmin), {});
    await ctrl.getSellerBalance(req(qaAdmin), 'seller-1');
    await ctrl.getFranchiseEarnings(req(qaAdmin), 'fr-1');
    await ctrl.getModuleRevenue(req(qaAdmin), 'marketplace', '2026-09-01', '2026-09-30');
    await ctrl.getReconciliation(req(qaAdmin), '2026-09-01');
    expect(client.send.mock.calls).toHaveLength(6);
    for (const call of client.send.mock.calls) {
      expect(call[1]).toMatchObject({ countryCode: 'QA', scope: 'QA' });
    }
  });

  it('refuses a locked admin who filters for another market', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.getDashboard(req(qaAdmin), { countryCode: 'IN' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it('leaves a global admin unscoped, and passes their own filter through', async () => {
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(globalAdmin), { countryCode: 'in' });
    expect(client.send.mock.calls[0][1]).toMatchObject({ countryCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });

  it('drops a client-supplied `scope` — only the gateway writes that key', async () => {
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(globalAdmin), { scope: 'IN', countryCode: 'QA' } as any);
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });

  it('forwards every filter the dashboard query actually reads', async () => {
    // A field declared on the DTO but dropped here is a control the console can
    // send and nothing acts on; a field the service reads but the DTO omits is
    // a 400 under `forbidNonWhitelisted`. Both halves have to agree, so this
    // names the whole set.
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(globalAdmin), {
      module: 'marketplace',
      status: 'SUCCESS',
      gateway: 'razorpay',
      sellerId: 'seller-1',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      page: 2,
      limit: 50,
      countryCode: 'QA',
    });
    expect(client.send.mock.calls[0][1]).toEqual({
      module: 'marketplace',
      status: 'SUCCESS',
      gateway: 'razorpay',
      sellerId: 'seller-1',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      page: 2,
      limit: 50,
      countryCode: 'QA',
      scope: undefined,
    });
  });
});

/**
 * The dashboard query, through the pipe that actually runs in production.
 *
 * `PaymentAdminFilterDto` first declared only the window and the market while
 * `getPaymentsDashboard` went on reading `module`, `status`, `gateway`,
 * `sellerId`, `page` and `limit` — so `forbidNonWhitelisted` turned six working
 * filters into 400s and pinned every caller to page 1 of 20 (review R6 I-1).
 * Asserting against `GatewayValidationPipe` itself rather than a hand-rolled
 * `validate()` is the point: it is the pipe's own `whitelist` +
 * `forbidNonWhitelisted` + implicit conversion that decides.
 */
describe('GET /payments/admin/dashboard accepts its whole filter surface', () => {
  const pipe = new GatewayValidationPipe();
  const meta = { type: 'query', metatype: PaymentDashboardFilterDto } as ArgumentMetadata;

  it('accepts every declared filter, converting the numbers', async () => {
    await expect(
      pipe.transform(
        {
          module: 'marketplace',
          status: 'SUCCESS',
          gateway: 'razorpay',
          sellerId: 'seller-1',
          startDate: '2026-09-01',
          endDate: '2026-09-30T23:59:59.000Z',
          countryCode: 'qa',
          // Query strings arrive as strings; the pipe converts them.
          page: '2',
          limit: '5',
        },
        meta,
      ),
    ).resolves.toEqual({
      module: 'marketplace',
      status: 'SUCCESS',
      gateway: 'razorpay',
      sellerId: 'seller-1',
      startDate: '2026-09-01',
      endDate: '2026-09-30T23:59:59.000Z',
      countryCode: 'qa',
      page: 2,
      limit: 5,
    });
  });

  it('refuses an undeclared field, `scope` included', async () => {
    await expect(pipe.transform({ foo: '1' }, meta)).rejects.toThrow(BadRequestException);
    // The field name is in the response body, not in `Error.message` — which is
    // the flat 'Bad Request Exception' — and the body is what the caller reads.
    const refused = await pipe
      .transform({ scope: 'IN' }, meta)
      .then(() => null)
      .catch((e: BadRequestException) => e.getResponse() as { message: string[] });
    expect(refused?.message).toContain('property scope should not exist');
  });

  it('bounds the page window and the enumerations', async () => {
    for (const bad of [
      { page: '0' },
      { page: '-1' },
      { limit: '0' },
      { limit: '201' },
      { module: 'not-a-module' },
      { status: 'not-a-status' },
      { gateway: 'not-a-gateway' },
      { countryCode: 'QAT' },
      { startDate: 'not-a-date' },
      { sellerId: '' },
    ]) {
      await expect(pipe.transform(bad, meta)).rejects.toThrow(BadRequestException);
    }
    // The top of the range is allowed, not just refused above it.
    await expect(pipe.transform({ limit: '200', page: '1' }, meta)).resolves.toEqual({
      limit: 200,
      page: 1,
    });
  });

  it('mirrors payment-service’s own enums exactly', () => {
    // The DTO cannot import the enums (they are runtime values in an entity
    // file on the other side of an app boundary), so this is the guard that the
    // copy has not drifted. A spec may import what a bundle may not.
    expect([...PAYMENT_MODULES]).toEqual(Object.values(PaymentModule));
    expect([...PAYMENT_STATUSES]).toEqual(Object.values(PaymentStatus));
    expect([...PAYMENT_GATEWAYS]).toEqual(Object.values(PaymentGateway));
  });
});
