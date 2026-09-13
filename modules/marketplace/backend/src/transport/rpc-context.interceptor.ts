import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { REQUEST_ID_FIELD, readRequestId, requestContext } from './request-context';

/**
 * Runs every TCP handler inside the request context the gateway forwarded.
 *
 * The gateway adds `_requestId` to object payloads (see `sendToMarketplace`).
 * This interceptor reads it, removes it from the payload so no handler or
 * repository ever sees a field the client did not send, and runs the handler
 * inside `requestContext` so `currentRequestId()` answers correctly from any
 * depth of the call — cache reads, query logs, invalidations.
 *
 * `next.handle()` is called inside `run()` on purpose: Nest defers the actual
 * handler call to subscription time but binds the async context at the point
 * `handle()` is invoked, so the store set here is the one the handler sees.
 */
@Injectable()
export class RpcContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'rpc') return next.handle();

    const payload = context.switchToRpc().getData();
    const requestId = readRequestId(payload);
    if (payload && typeof payload === 'object' && REQUEST_ID_FIELD in payload) {
      delete (payload as Record<string, unknown>)[REQUEST_ID_FIELD];
    }
    if (!requestId) return next.handle();

    const pattern = context.switchToRpc().getContext()?.getPattern?.();
    const cmd =
      pattern && typeof pattern === 'object' && 'cmd' in pattern
        ? String((pattern as { cmd: unknown }).cmd)
        : typeof pattern === 'string'
          ? pattern
          : undefined;

    return requestContext.run({ requestId, cmd }, () => next.handle());
  }
}
