import { Injectable, ValidationPipe, type ArgumentMetadata } from '@nestjs/common';
import { isForwardedBody } from '../decorators/forwarded-body.decorator';
import { ForwardingValidationPipe } from './forwarding-validation.pipe';

/**
 * The gateway's global validation pipe.
 *
 * Strict for bodies the gateway owns (unknown properties are rejected), and
 * forwarding for bodies marked `@ForwardedBody()` (the named fields are
 * validated, the rest travels on to the owning service). One pipe rather than
 * two, because Nest runs every applicable pipe: a permissive route-level pipe
 * cannot undo a strict global one that has already thrown.
 */
@Injectable()
export class GatewayValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });
  }

  override async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    if (isForwardedBody(metadata.metatype)) {
      return ForwardingValidationPipe.transform(value, metadata);
    }
    return super.transform(value, metadata);
  }
}
