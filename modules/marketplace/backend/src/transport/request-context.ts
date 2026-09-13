import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request context for the TCP transport.
 *
 * The gateway stamps every browser request with `X-Request-ID`
 * (`RequestIdMiddleware`) and logs it as `reqId=` on its own HTTP line, but the
 * id used to stop there: the TCP payload carried no correlation, so nothing in
 * this service could say which gateway request a cache miss or a slow query
 * belonged to. `RpcContextInterceptor` lifts `_requestId` off the incoming
 * payload into this store; `CatalogCache` and the catalogue reads log it.
 *
 * AsyncLocalStorage rather than a parameter threaded through every method:
 * the id is observability, not business input, and the read paths are shared
 * by three transports (HTTP, TCP, gRPC) that would each have to forward it.
 */
export interface RpcRequestContext {
  requestId: string;
  /** The `cmd` of the message pattern being handled, for log lines. */
  cmd?: string;
}

export const requestContext = new AsyncLocalStorage<RpcRequestContext>();

/** The correlation id of the request being served, or `-` outside one. */
export function currentRequestId(): string {
  return requestContext.getStore()?.requestId ?? '-';
}

/** The payload field the gateway uses to forward its request id over TCP. */
export const REQUEST_ID_FIELD = '_requestId';

/** Accepts the gateway's UUID and any short opaque id; rejects anything that could not be a header value. */
const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{1,64}$/;

/** The request id a payload carries, if it is well-formed. */
export function readRequestId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const raw = (payload as Record<string, unknown>)[REQUEST_ID_FIELD];
  return typeof raw === 'string' && REQUEST_ID_RE.test(raw) ? raw : undefined;
}
