import { HttpException, HttpStatus, Logger } from '@nestjs/common';

const logger = new Logger('RpcForward');

/**
 * Turn a rejected TCP/gRPC call into the HttpException it should have been.
 *
 * Two problems this solves, both of which were repeated by hand across the
 * gateway's controllers with slightly different behaviour in each:
 *
 *  1. **The status was lost.** Services throw through `RpcAwareExceptionsFilter`,
 *     which rejects with a flat `{ statusCode, message, errorCode }`. That object
 *     is not an `HttpException`, so a controller that rethrew it verbatim left
 *     the gateway's filter with nothing to read and every failure — a validation
 *     error, a missing record — became `500 "An unexpected error occurred."`.
 *
 *  2. **Transport detail leaked.** Passing `err.message` straight through
 *     published the internal topology to the client: a stopped service answered
 *     `connect ECONNREFUSED 127.0.0.1:4005`, naming the host and port of an
 *     internal service to anyone who could reach the endpoint.
 *
 * So: a numeric status from the service is a *domain* error and its message is
 * meant for the caller and is kept. Anything else is a transport failure, and the
 * caller gets `serviceLabel` with the underlying cause left for the logs.
 *
 * @param err          the rejection value from the client proxy
 * @param serviceLabel what to tell the client when the service could not be
 *                     reached, e.g. `'Wallet service unavailable'`
 */
export function toHttpException(err: any, serviceLabel: string): HttpException {
  const raw = err?.statusCode ?? err?.status;

  /**
   * Only a 4xx is a domain error whose message belongs to the caller.
   *
   * This accepted anything from 100 to 599, so a service's *own* 500 counted as
   * a domain error and its message was forwarded verbatim. Services wrap
   * unhandled failures as `{ statusCode: 500, message: <driver text> }`, so
   * `POST /marketplace/wishlist` with a non-uuid answered
   *
   *     500 invalid input syntax for type uuid: "12345"
   *
   * publishing the datastore and the column type to the client. The gateway's
   * exception filter has sanitisers for exactly this (SQLSTATE 22P02, 23502,
   * 23503) but never saw the error — it arrived already wrapped as an
   * HttpException carrying the raw text, which the filter is right to trust.
   *
   * 4xx means the service examined the request and rejected it; that text is
   * written for whoever sent it. 5xx means the service broke, and its message
   * describes our internals.
   */
  const isDomainStatus = typeof raw === 'number' && raw >= 400 && raw < 500;

  if (isDomainStatus) {
    return new HttpException(err?.message || serviceLabel, raw);
  }

  // A service that answered 5xx is reachable but failed, which is not the same
  // as unreachable — keep its status so monitoring can tell the two apart, and
  // replace the message. The cause is logged below either way.
  if (typeof raw === 'number' && raw >= 500 && raw < 600) {
    logger.error(`${serviceLabel} - internal failure ${raw}: ${err?.message ?? String(err)}`);
    return new HttpException(serviceLabel, raw);
  }

  // The client is told only `serviceLabel`, so the real cause has to be recorded
  // here or it is lost entirely — "Restaurant service unavailable" in the log
  // does not distinguish a stopped process from a message pattern no service
  // implements, and those need very different responses from whoever is on call.
  const cause = err?.message ?? String(err);
  logger.error(serviceLabel + ' - underlying cause: ' + cause);
  return new HttpException(serviceLabel, HttpStatus.SERVICE_UNAVAILABLE);
}

/**
 * `catchError` operator body for a gateway → service call.
 *
 * Usage:
 *   client.send({ cmd }, payload).pipe(timeout(5000), catchError(rpcCatch('Wallet service unavailable')))
 */
export function rpcCatch(serviceLabel: string) {
  return (err: any): never => {
    throw toHttpException(err, serviceLabel);
  };
}
