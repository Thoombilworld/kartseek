import { BadRequestException, HttpException, InternalServerErrorException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

/**
 * The `errors` field of the HTTP error envelope: present only when a 4xx
 * thrower attached an `errors` (or `details`) array to its response object,
 * bounded, and never on a 5xx. Every other envelope field is untouched, which
 * the first case pins by listing the keys.
 */
function hostFor() {
  const body: { status?: number; json?: unknown } = {};
  const response = {
    status: (code: number) => {
      body.status = code;
      return { json: (payload: unknown) => (body.json = payload) };
    },
  };
  const request = { headers: { 'x-request-id': 'req-1' }, originalUrl: '/x', method: 'POST' };
  const host = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    getType: () => 'http',
  } as unknown as ArgumentsHost;
  return { host, body };
}

describe('AllExceptionsFilter errors pass-through', () => {
  const filter = new AllExceptionsFilter();

  it('carries a 400 thrower’s errors array and nothing else changes', () => {
    const { host, body } = hostFor();
    filter.catch(
      new BadRequestException({
        message: '2 attributes could not be saved.',
        errors: [
          { slug: 'ram', message: 'RAM must be a number GB.' },
          { slug: 'battery', message: 'Battery must be at least 100 mAh.' },
        ],
      }),
      host,
    );
    expect(body.status).toBe(400);
    expect(Object.keys(body.json as object)).toEqual([
      'success',
      'statusCode',
      'message',
      'errorCode',
      'errors',
      'timestamp',
      'requestId',
      'path',
    ]);
    expect(body.json).toMatchObject({
      success: false,
      statusCode: 400,
      message: '2 attributes could not be saved.',
      errorCode: 'HTTP_400',
      errors: [
        { slug: 'ram', message: 'RAM must be a number GB.' },
        { slug: 'battery', message: 'Battery must be at least 100 mAh.' },
      ],
      requestId: 'req-1',
      path: '/x',
    });
  });

  it('omits the field when the thrower attached none', () => {
    const { host, body } = hostFor();
    filter.catch(new BadRequestException('A product name is required.'), host);
    expect(body.json).not.toHaveProperty('errors');
    expect(body.json).toMatchObject({ statusCode: 400, message: 'A product name is required.' });
  });

  it('never attaches detail to a 5xx, whatever the thrower sent', () => {
    const { host, body } = hostFor();
    filter.catch(
      new InternalServerErrorException({ message: 'boom', details: ['SELECT * FROM secrets'] }),
      host,
    );
    expect(body.status).toBe(500);
    expect(body.json).not.toHaveProperty('errors');
  });

  it('accepts `details` as the array name and bounds the content', () => {
    const { host, body } = hostFor();
    const long = 'x'.repeat(2000);
    filter.catch(
      new HttpException(
        {
          message: 'nope',
          details: [
            ...Array.from({ length: 150 }, (_, i) => ({
              slug: `f${i}`,
              message: long,
              nested: { a: 1 },
            })),
            'plain text',
          ],
        },
        422,
      ),
      host,
    );
    const errors = (body.json as any).errors as any[];
    expect(errors).toHaveLength(100);
    expect(errors[0].message).toHaveLength(501); // 500 chars + ellipsis
    expect(errors[0]).not.toHaveProperty('nested');
  });
});
