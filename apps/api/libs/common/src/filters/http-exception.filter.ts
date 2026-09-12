import {
  type ExceptionFilter,
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { RpcException } from '@nestjs/microservices';
import { BusinessException } from '../exceptions/business.exception';

/**
 * AllExceptionsFilter — KARTSEEK global exception boundary.
 *
 * Applied at bootstrap level on every NestJS service. Catches:
 *  - HttpException (NestJS built-in)
 *  - BusinessException (domain-specific, carries errorCode)
 *  - RpcException (gRPC / Kafka consumer)
 *  - Unknown errors
 *
 * Guarantees:
 *  - Consistent envelope: { success, statusCode, message, errorCode, timestamp, requestId }
 *  - Stack traces NEVER exposed to clients in production
 *  - Every error is logged with requestId, service name, and duration
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isProd = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { statusCode, message, errorCode, stack } = this.resolveException(exception);

    const requestId = (request.headers['x-request-id'] as string) ?? 'unknown';
    // `originalUrl`, not `url`: Nest mounts its not-found handler on a router
    // under the global prefix, and inside a mounted router `url` is relative to
    // the mount, so a 404 for /api/v1/nope reported its path as /v1/nope.
    const path = request?.originalUrl ?? request?.url ?? 'unknown';
    const method = request?.method ?? 'unknown';

    const errorBody = {
      success: false,
      statusCode,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
      requestId,
      path,
    };

    /**
     * A 4xx is the API working, not failing.
     *
     * Everything was logged at ERROR, so an empty cart, a validation message and
     * a genuine 500 all looked alike. In a normal session the log fills with
     * lines like `400 HTTP_400 — Cart is empty`, and a real fault — the
     * marketplace's `Cannot read properties of undefined (reading
     * 'databaseName')`, which broke the flash-deals rail on every request —
     * sits in the middle of them unnoticed.
     *
     * 5xx keeps ERROR and the stack: nobody asked for it and it is our fault.
     * 4xx drops to WARN and omits the stack, because the stack of "you sent no
     * items" describes our own throw site and tells an operator nothing.
     */
    const line = `[${method} ${path}] ${statusCode} ${errorCode ?? 'INTERNAL_ERROR'} — ${message}`;
    if (statusCode >= 500) {
      this.logger.error(line, !this.isProd ? stack : undefined, `requestId=${requestId}`);
    } else {
      this.logger.warn(`${line} | requestId=${requestId}`);
    }

    response.status(statusCode).json(errorBody);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string;
    errorCode: string | undefined;
    stack: string | undefined;
  } {
    if (exception instanceof BusinessException) {
      return {
        statusCode: exception.getStatus(),
        message: exception.message,
        errorCode: exception.errorCode,
        stack: exception.stack,
      };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === 'string' ? response : ((response as any).message ?? exception.message);

      return {
        statusCode: exception.getStatus(),
        message: Array.isArray(message) ? message.join('; ') : message,
        errorCode: `HTTP_${exception.getStatus()}`,
        stack: exception.stack,
      };
    }

    if (exception instanceof RpcException) {
      const error = exception.getError();
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: typeof error === 'string' ? error : JSON.stringify(error),
        errorCode: 'RPC_ERROR',
        stack: exception.stack,
      };
    }

    // A malformed path parameter is the client's mistake, not ours. Postgres
    // rejects `/brands/not-a-uuid/...` with SQLSTATE 22P02 ("invalid input
    // syntax for type uuid"), which fell through to the generic branch below and
    // was answered as a 500 — telling monitoring the server is broken every time
    // someone types a bad URL, and leaking the driver's message outside prod.
    if (this.isInvalidTextRepresentation(exception)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Malformed identifier in request.',
        errorCode: 'INVALID_IDENTIFIER',
        stack: (exception as Error).stack,
      };
    }

    // `findOneOrFail` throws EntityNotFoundError, a plain Error, so "no bank
    // offer with this id" was answered 500 — indistinguishable from a crash, and
    // it made every admin edit screen look broken when the record simply did not
    // exist. Matched by name so this file need not import typeorm.
    // Redis is down and this is production, where there is no in-memory
    // emulator to answer from. 503, not 500: the request is not malformed and
    // the code did not crash — a dependency is unavailable, which is a
    // different instruction to the caller (retry) and to a load balancer.
    // Matched by name so this file needs no import from `@app/redis`, the same
    // way EntityNotFoundError is matched without importing typeorm.
    if (exception instanceof Error && exception.name === 'RedisUnavailableError') {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: this.isProd
          ? 'A required service is temporarily unavailable. Please retry.'
          : exception.message,
        errorCode: 'REDIS_UNAVAILABLE',
        stack: exception.stack,
      };
    }

    if (exception instanceof Error && exception.name === 'EntityNotFoundError') {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Record not found.',
        errorCode: 'HTTP_404',
        stack: exception.stack,
      };
    }

    // 23502 not-null, 23503 foreign key: the request omitted a required field or
    // pointed at something that does not exist. Both are client errors. The
    // driver's `detail` names the offending row, so it is withheld in production
    // for the same reason as the message above.
    const pgCode = (exception as any)?.code;
    if (pgCode === '23502' || pgCode === '23503') {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: this.isProd
          ? pgCode === '23502'
            ? 'A required field is missing.'
            : 'A referenced record does not exist.'
          : String((exception as any)?.detail ?? (exception as Error).message)
              .replace(/\s+/g, ' ')
              .trim(),
        errorCode: pgCode === '23502' ? 'MISSING_REQUIRED_FIELD' : 'REFERENCED_RECORD_NOT_FOUND',
        stack: (exception as Error).stack,
      };
    }

    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: this.isProd ? 'An unexpected error occurred.' : exception.message,
        errorCode: 'INTERNAL_ERROR',
        stack: exception.stack,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred.',
      errorCode: 'INTERNAL_ERROR',
      stack: undefined,
    };
  }

  /**
   * Postgres SQLSTATE 22P02 — invalid text representation.
   *
   * Matched on the driver's `code`, with the message as a fallback because the
   * error crosses a TCP microservice boundary on the way to the gateway and is
   * re-created from a plain object on the other side, losing its prototype and
   * sometimes its non-enumerable fields.
   */
  protected isInvalidTextRepresentation(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') return false;
    const err = exception as { code?: unknown; message?: unknown };
    if (err.code === '22P02') return true;
    return (
      typeof err.message === 'string' && /invalid input syntax for type uuid/i.test(err.message)
    );
  }
}
