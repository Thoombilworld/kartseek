import { ValidationPipe } from '@nestjs/common';

/**
 * Validation for a body this service forwards rather than consumes.
 *
 * The global pipe runs `whitelist: true, forbidNonWhitelisted: true`, which is
 * right for a body we own: anything undeclared is a client mistake and is
 * rejected. It is wrong for a body we pass straight to another service.
 *
 * The gateway forwards many payloads verbatim — `sendToMarketplace(cmd, payload)`
 * — and the owning service has its own DTO describing the full shape. Applying
 * the global rules here would mean the gateway rejecting, or silently removing,
 * fields that the service downstream both accepts and requires. The gateway
 * would be enforcing a contract it does not own and cannot see.
 *
 * So these routes validate what they can name and let the rest through
 * untouched. Two things still improve over `@Body() payload: any`:
 *
 *   * the fields the gateway itself reads are typed and checked here, at the
 *     edge, before anything is forwarded; and
 *   * the body must be an object of the declared shape, so a string, an array
 *     or a null no longer reaches the RPC call.
 *
 * `transform` and `enableImplicitConversion` match the global pipe so a route
 * does not silently behave differently depending on which pipe applied.
 */
export const ForwardingValidationPipe = new ValidationPipe({
  whitelist: false,
  forbidNonWhitelisted: false,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});
