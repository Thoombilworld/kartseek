import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

/**
 * LoggingInterceptor — structured request/response logging.
 *
 * Logs: method, path, userId, requestId, statusCode, duration (ms)
 * Format: JSON-compatible fields for log aggregators (Loki, Datadog, CloudWatch).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const userId = (req as any).user?.id ?? 'anonymous';
    const requestId = (req.headers['x-request-id'] as string) ?? 'none';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${res.statusCode} — ${duration}ms | user=${userId} reqId=${requestId}`,
          );
        },
        error: (err: unknown) => {
          const duration = Date.now() - start;
          /**
           * Print the status, not the word "ERROR".
           *
           * This logged `POST /… ERROR — 2ms` for every non-2xx, including the
           * ordinary 400s an API returns all day. Someone scanning the log for
           * trouble greps for "ERROR" and finds a wall of validation messages,
           * which is how a real fault goes unnoticed. The status says what
           * happened and is honest about whose fault it was.
           */
          const status = (err as { status?: number; getStatus?: () => number })?.getStatus?.()
            ?? (err as { status?: number })?.status
            ?? 500;
          const line = `${method} ${url} ${status} — ${duration}ms | user=${userId} reqId=${requestId}`;
          if (status >= 500) this.logger.error(line);
          else this.logger.warn(line);
        },
      }),
    );
  }
}
