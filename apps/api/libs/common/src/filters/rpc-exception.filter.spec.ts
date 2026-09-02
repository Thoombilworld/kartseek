import { Controller, NotFoundException, BadRequestException, Module, UseFilters } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ClientProxy, ClientProxyFactory, MessagePattern, type MicroserviceOptions,
  Payload, Transport,
} from '@nestjs/microservices';
import { type INestApplication } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { RpcAwareExceptionsFilter } from './rpc-exception.filter';

/**
 * Pins the contract the API gateway depends on: an HttpException thrown inside a
 * message handler must reach the caller with its numeric status intact.
 *
 * Nest's default RPC handler replaces it with `{ status: 'error', message:
 * 'Internal server error' }`, which the gateway cannot map back to an HTTP code —
 * so it answered 503 for every failure, and a deleted product was indistinguishable
 * from a catalogue outage.
 *
 * The binding below is `@UseFilters` on the controller, and that is deliberate:
 * neither `app.useGlobalFilters()` nor an `APP_FILTER` provider reaches handlers
 * served over `connectMicroservice()`. Both were tried against this test and both
 * left the default `{ status: 'error' }` payload in place. Run it over a real TCP
 * transport rather than a mocked ArgumentsHost for the same reason — the bug lived
 * entirely in how the filter was wired up, not in what it computed.
 */
@Controller()
@UseFilters(RpcAwareExceptionsFilter)
class ProbeController {
  @MessagePattern({ cmd: 'probe_missing' })
  missing(@Payload() id: string) {
    throw new NotFoundException(`Product ${id} not found`);
  }

  @MessagePattern({ cmd: 'probe_bad' })
  bad() {
    throw new BadRequestException('Invalid product ID format');
  }

  @MessagePattern({ cmd: 'probe_boom' })
  boom() {
    throw new Error('unexpected');
  }

  /** What TypeORM's `findOneOrFail` throws: a plain Error with this name. */
  @MessagePattern({ cmd: 'probe_entity_missing' })
  entityMissing() {
    const err = new Error('Could not find any entity of type "BankOffer" matching:\n {\n  "id": "abc"\n }');
    err.name = 'EntityNotFoundError';
    throw err;
  }

  /** Postgres not-null violation, as the driver surfaces it. */
  @MessagePattern({ cmd: 'probe_not_null' })
  notNull() {
    const err: any = new Error('null value in column "code" violates not-null constraint');
    err.code = '23502';
    err.detail = 'Failing row contains (null).';
    throw err;
  }

  /** Postgres foreign-key violation. */
  @MessagePattern({ cmd: 'probe_fk' })
  fk() {
    const err: any = new Error('insert or update violates foreign key constraint');
    err.code = '23503';
    err.detail = 'Key (brand_id) is not present in table "brands".';
    throw err;
  }

  @MessagePattern({ cmd: 'probe_ok' })
  ok() {
    return { id: 'p1' };
  }
}

@Module({
  controllers: [ProbeController],
  providers: [],
})
class ProbeModule {}

describe('RpcAwareExceptionsFilter (over a real TCP transport)', () => {
  const PORT = 47021;
  let app: INestApplication;
  let client: ClientProxy;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication();
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: PORT },
    });
    await app.startAllMicroservices();
    await app.init();

    client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: PORT },
    });
    await client.connect();
  });

  afterAll(async () => {
    await client?.close();
    await app?.close();
  });

  /** The rejection value the gateway's catchError receives. */
  const callAndCatch = async (cmd: string, payload: any = 'x') => {
    try {
      await lastValueFrom(client.send({ cmd }, payload));
      throw new Error(`${cmd} unexpectedly succeeded`);
    } catch (e) {
      return e as any;
    }
  };

  it('passes successful responses through untouched', async () => {
    await expect(lastValueFrom(client.send({ cmd: 'probe_ok' }, {}))).resolves.toEqual({ id: 'p1' });
  });

  it('preserves 404 for a missing record', async () => {
    const err = await callAndCatch('probe_missing', 'abc');

    // Regression guard: this was `{ status: 'error', message: 'Internal server
    // error' }`, which the gateway coerced to 503.
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('not found');
  });

  it('preserves 400 for a malformed request', async () => {
    const err = await callAndCatch('probe_bad');

    expect(err.statusCode).toBe(400);
  });

  it('reports an unexpected error as 500, not as a missing record', async () => {
    const err = await callAndCatch('probe_boom');

    expect(err.statusCode).toBe(500);
  });

  it('maps a TypeORM EntityNotFoundError to 404', async () => {
    const err = await callAndCatch('probe_entity_missing');

    // `findOneOrFail` throws a plain Error, so this used to arrive as a 500 and
    // "no such bank offer" was indistinguishable from a crashed service.
    expect(err.statusCode).toBe(404);
    expect(err.message).not.toMatch(/\n/);          // criteria collapsed to one line
    expect(err.message).toContain('BankOffer');
  });

  it('maps a not-null violation to 400 with the offending detail', async () => {
    const err = await callAndCatch('probe_not_null');

    expect(err.statusCode).toBe(400);
    expect(err.errorCode).toBe('MISSING_REQUIRED_FIELD');
  });

  it('maps a foreign-key violation to 400 naming the missing reference', async () => {
    const err = await callAndCatch('probe_fk');

    expect(err.statusCode).toBe(400);
    expect(err.errorCode).toBe('REFERENCED_RECORD_NOT_FOUND');
    expect(err.message).toContain('brand_id');
  });
});
