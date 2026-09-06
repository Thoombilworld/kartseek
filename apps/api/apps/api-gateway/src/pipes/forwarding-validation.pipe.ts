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
 * No `transform`, deliberately. Transformation rebuilds the body from the DTO
 * class, and for a forwarded body that corrupts what it cannot describe:
 * `PlaceOrderDto.items` is typed `OrderItemDto[]` with no `@Type()`, so with
 * implicit conversion every element came back as an empty Array instance and
 * order-service was asked to price `[[]]` — "Invalid quantity ()". The named
 * fields are still validated; the body itself travels on exactly as sent.
 *
 * On its own this pipe could never deliver that: Nest runs every applicable
 * pipe, so the strict global one had already rejected the unknown fields by
 * the time this ran, and the web checkout's own payload was answered with
 * "property items should not exist". The decision is now made in one place —
 * `GatewayValidationPipe` applies these rules for DTOs marked
 * `@ForwardedBody()` — and this instance is what it applies. The route-level
 * `@UsePipes` declarations stay as documentation of intent.
 */
export const ForwardingValidationPipe = new ValidationPipe({
  whitelist: false,
  forbidNonWhitelisted: false,
  transform: false,
});
