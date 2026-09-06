import 'reflect-metadata';

export const FORWARDED_BODY_KEY = 'gateway:forwarded-body';

/**
 * Marks a body DTO as *forwarded*: the gateway validates the fields it names
 * and passes everything else through to the owning service untouched.
 *
 * The global pipe runs `whitelist: true, forbidNonWhitelisted: true`, which is
 * right for a body the gateway owns and wrong for one it relays. Global pipes
 * run in addition to route-level ones, not instead of them — so the
 * route-level `ForwardingValidationPipe` never had the effect its name
 * promised: the global pipe had already rejected the body. `POST
 * /marketplace/orders` answered "property items should not exist" to the web
 * checkout's own payload, and seventeen other forwarding routes did the same
 * for theirs. `GatewayValidationPipe` reads this marker and applies the
 * forwarding rules for these DTOs, at the one place that actually decides.
 */
export const ForwardedBody = (): ClassDecorator => (target) => {
  Reflect.defineMetadata(FORWARDED_BODY_KEY, true, target);
};

export const isForwardedBody = (metatype: unknown): boolean =>
  typeof metatype === 'function' && Reflect.getMetadata(FORWARDED_BODY_KEY, metatype) === true;
