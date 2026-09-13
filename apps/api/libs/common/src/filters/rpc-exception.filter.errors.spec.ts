import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { RpcAwareExceptionsFilter } from './rpc-exception.filter';

/**
 * The RPC mirror of the HTTP envelope's `errors` pass-through: a 4xx thrower's
 * `errors` array rides the flat `{ statusCode, message, errorCode }` error the
 * gateway rebuilds, and a 5xx never carries one.
 */
const rpcHost = { getType: () => 'rpc' } as unknown as ArgumentsHost;

async function thrown(exception: unknown): Promise<any> {
  const filter = new RpcAwareExceptionsFilter();
  const observable = filter.catch(exception, rpcHost);
  return lastValueFrom(observable).then(
    () => {
      throw new Error('expected the filter to produce an error');
    },
    (err) => err,
  );
}

describe('RpcAwareExceptionsFilter errors pass-through', () => {
  it('carries a 400 thrower’s errors array beside the flat fields', async () => {
    const err = await thrown(
      new BadRequestException({
        message: '1 attribute could not be saved.',
        errors: [{ slug: 'ram', message: 'RAM must be a number GB.' }],
      }),
    );
    expect(err).toEqual({
      statusCode: 400,
      message: '1 attribute could not be saved.',
      errorCode: 'HTTP_400',
      errors: [{ slug: 'ram', message: 'RAM must be a number GB.' }],
    });
  });

  it('stays flat when the thrower attached none', async () => {
    const err = await thrown(new BadRequestException('A product name is required.'));
    expect(err).toEqual({
      statusCode: 400,
      message: 'A product name is required.',
      errorCode: 'HTTP_400',
    });
  });

  it('never attaches detail to a 5xx', async () => {
    const err = await thrown(
      new InternalServerErrorException({ message: 'boom', details: ['internal'] }),
    );
    expect(err.statusCode).toBe(500);
    expect(err).not.toHaveProperty('errors');
  });
});
