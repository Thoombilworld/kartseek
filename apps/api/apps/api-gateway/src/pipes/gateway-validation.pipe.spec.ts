import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Test } from '@nestjs/testing';
import { Body, Controller, HttpCode, type INestApplication, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import request from 'supertest';
import { GatewayValidationPipe } from './gateway-validation.pipe';
import { ForwardedBody, isForwardedBody } from '../decorators/forwarded-body.decorator';
import * as Dtos from '../dto/gateway.dto';

/**
 * Forwarded bodies must survive the global pipe.
 *
 * The regression: every route that declared `@UsePipes(ForwardingValidationPipe)`
 * still went through the strict global pipe first, so `POST /marketplace/orders`
 * rejected the web checkout's `items`, `shippingAddress` and `paymentMethod`
 * with "property … should not exist". The global pipe now defers to the
 * `@ForwardedBody()` marker; this pins both halves — the behaviour, and that
 * every forwarding route's DTO actually carries the marker.
 */

class OwnedDto {
  @IsString() name!: string;
}

@ForwardedBody()
class RelayedDto {
  @IsOptional() @IsString() reason?: string;
}

@Controller('probe')
class ProbeController {
  @Post('owned')
  @HttpCode(200)
  owned(@Body() body: OwnedDto) {
    return { got: body };
  }

  @Post('relayed')
  @HttpCode(200)
  relayed(@Body() body: RelayedDto) {
    return { got: body };
  }
}

describe('GatewayValidationPipe', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new GatewayValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unknown properties on a body the gateway owns', async () => {
    const res = await request(app.getHttpServer())
      .post('/probe/owned')
      .send({ name: 'x', extra: 1 })
      .expect(400);
    expect(JSON.stringify(res.body)).toContain('extra should not exist');
  });

  it('still validates the named fields of a forwarded body', async () => {
    // An object, not a number: implicit conversion turns 42 into '42', which is
    // a valid string. Nothing turns an object into one.
    await request(app.getHttpServer())
      .post('/probe/relayed')
      .send({ reason: { nested: true } })
      .expect(400);
  });

  it('passes the unnamed fields of a forwarded body through untouched', async () => {
    const res = await request(app.getHttpServer())
      .post('/probe/relayed')
      .send({ reason: 'r', items: [{ productId: 'p', quantity: 1 }], paymentMethod: 'COD' })
      .expect(200);
    expect(res.body.got).toEqual({
      reason: 'r',
      items: [{ productId: 'p', quantity: 1 }],
      paymentMethod: 'COD',
    });
  });

  it('every DTO used on a ForwardingValidationPipe route is marked @ForwardedBody()', () => {
    const dir = path.join(__dirname, '..', 'controllers');
    const missing: string[] = [];
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.controller.ts'))) {
      const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!line.includes('@UsePipes(ForwardingValidationPipe)')) return;
        const window = lines.slice(i, i + 8).join('\n');
        const m = window.match(/@Body\(\)\s*\w+:\s*([A-Za-z]+)/);
        if (!m) return;
        const dto = (Dtos as Record<string, unknown>)[m[1]];
        if (!isForwardedBody(dto)) missing.push(`${file}:${i + 1} ${m[1]}`);
      });
    }
    expect(missing).toEqual([]);
  });
});
