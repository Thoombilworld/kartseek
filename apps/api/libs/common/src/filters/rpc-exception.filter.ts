import { type ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { AllExceptionsFilter } from './http-exception.filter';
import { BusinessException } from '../exceptions/business.exception';

/**
 * RpcAwareExceptionsFilter — keeps an exception's HTTP status alive across a
 * TCP/gRPC hop.
 *
 * Nest's default RPC handler replaces anything that is not an RpcException with
 * a flat `{ status: 'error', message: 'Internal server error' }`. The status is
 * the *RPC* status string, not an HTTP code, so a `NotFoundException` thrown by
 * a message handler reached the gateway with nothing numeric to read and was
 * coerced to 503. Every missing product therefore surfaced as "service
 * unavailable" instead of "not found" — an outage, from the client's point of
 * view, whenever someone opened a product that had been unpublished or deleted.
 *
 * Emitting `{ statusCode, message, errorCode }` lets the gateway rebuild the
 * original HttpException. HTTP requests are unaffected: they fall through to
 * AllExceptionsFilter's response envelope unchanged.
 */
@Catch()
export class RpcAwareExceptionsFilter extends AllExceptionsFilter {
  private readonly rpcLogger = new Logger(RpcAwareExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): any {
    if (host.getType() !== 'rpc') return super.catch(exception, host);

    const { statusCode, message, errorCode } = this.toRpcError(exception);
    // Same split as the HTTP filter: a 4xx is the service refusing a bad
    // request, which is it working. Only a 5xx is a fault worth an ERROR line.
    const line = `RPC ${statusCode} ${errorCode} — ${message}`;
    if (statusCode >= 500) {
      this.rpcLogger.error(line, exception instanceof Error ? exception.stack : undefined);
    } else {
      this.rpcLogger.warn(line);
    }

    // The client proxy rejects with this object verbatim, so it is the whole
    // contract the gateway has to work with. Keep it flat and JSON-safe.
    return throwError(() => ({ statusCode, message, errorCode })) as Observable<never>;
  }

  private toRpcError(exception: unknown): {
    statusCode: number;
    message: string;
    errorCode: string;
  } {
    if (exception instanceof BusinessException) {
      return {
        statusCode: exception.getStatus(),
        message: exception.message,
        errorCode: exception.errorCode ?? `HTTP_${exception.getStatus()}`,
      };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const raw =
        typeof response === 'string' ? response : ((response as any)?.message ?? exception.message);
      return {
        statusCode: exception.getStatus(),
        message: Array.isArray(raw) ? raw.join('; ') : String(raw),
        errorCode: `HTTP_${exception.getStatus()}`,
      };
    }

    // TypeORM's `findOneOrFail` throws EntityNotFoundError, which is a plain
    // Error — so "no such bank offer" arrived as a 500 and read as a crash. It
    // is a 404, and the caller needs to be able to tell "this id does not exist"
    // from "the service is broken". Matched by name because importing typeorm
    // here would pull a driver dependency into every consumer of @app/common.
    // A store this handler depends on is unavailable and there is no emulator to
    // answer from — `RedisService` throws this in production rather than serving
    // from a private in-process Map.
    //
    // The HTTP half of this filter learned the mapping and `toRpcError()` did
    // not, so the same outage answered 503 to a direct HTTP call and 500 —
    // "an unexpected error occurred" — through a `@MessagePattern`. cart-service
    // and order-service are both heavy Redis users reached over TCP, so that was
    // the common path. 503 is what tells a caller to retry and a load balancer
    // to look elsewhere; 500 says the code crashed. Matched by name for the same
    // reason as EntityNotFoundError above.
    if (exception instanceof Error && exception.name === 'RedisUnavailableError') {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'A required service is temporarily unavailable. Please retry.',
        errorCode: 'REDIS_UNAVAILABLE',
      };
    }

    if (exception instanceof Error && exception.name === 'EntityNotFoundError') {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        // The raw message embeds the whole criteria object across several lines;
        // collapse it so the client gets one readable sentence.
        message: exception.message.replace(/\s+/g, ' ').trim(),
        errorCode: 'HTTP_404',
      };
    }

    // SQLSTATE 22P02, "invalid input syntax for type uuid": a malformed id in the
    // request reached a uuid column. The HTTP filter has answered this with a 400
    // since the brands audit, but a message handler's copy of the same error
    // arrived here, fell through to the 500 branch below, and the gateway then
    // reported "<service> unavailable" for a typo in the URL. Same 400, same
    // wording, and the driver's text stays out of the response.
    if (this.isInvalidTextRepresentation(exception)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Malformed identifier in request.',
        errorCode: 'INVALID_IDENTIFIER',
      };
    }

    // Postgres not-null / foreign-key violations mean the request was missing or
    // referenced something that does not exist — a client error, not a server
    // fault. Surfacing them as 500 hid every missing-field bug behind "an
    // unexpected error occurred".
    const pgCode = (exception as any)?.code;
    if (pgCode === '23502' || pgCode === '23503') {
      const detail = (exception as any)?.detail ?? (exception as Error)?.message ?? '';
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message:
          String(detail).replace(/\s+/g, ' ').trim() ||
          'Required field missing or referenced record not found.',
        errorCode: pgCode === '23502' ? 'MISSING_REQUIRED_FIELD' : 'REFERENCED_RECORD_NOT_FOUND',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: exception instanceof Error ? exception.message : 'An unexpected error occurred.',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}
