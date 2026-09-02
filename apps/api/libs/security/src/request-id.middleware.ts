import {
  Injectable,
  type NestMiddleware,
} from '@nestjs/common';
import { type Request, type Response, type NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * RequestIdMiddleware — Assigns a unique correlation ID to every request.
 *
 * If the client sends a valid X-Request-ID header, it is preserved.
 * Otherwise, a new UUID v4 is generated. The ID is:
 *  - Set on the request object (req.requestId) for downstream use
 *  - Echoed back in the response via X-Request-ID header
 *  - Available for audit logging, distributed tracing, and error correlation
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  use(req: Request, res: Response, next: NextFunction): void {
    const clientId = req.headers['x-request-id'];
    let requestId: string;

    // Accept client-provided ID if it's a valid UUID v4 (prevents injection)
    if (typeof clientId === 'string' && this.UUID_REGEX.test(clientId)) {
      requestId = clientId;
    } else {
      requestId = crypto.randomUUID();
    }

    // Attach to request for downstream services (audit interceptor, loggers)
    (req as any).requestId = requestId;
    
    // Echo back in response headers for client correlation
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
