import { ValidationPipe } from '@nestjs/common';

/**
 * Validation for a body this service republishes rather than persists field by
 * field.
 *
 * The global pipe runs `whitelist: true`, which strips anything the DTO does not
 * declare. That is correct for a body mapped onto columns — an unknown property
 * is a client mistake and dropping it changes nothing. It is wrong for the admin
 * routes that pass their payload to `kafka.publish(topic, dto)`: the event is
 * the payload, so a partial DTO would quietly shrink what every consumer
 * downstream receives, and the shape of those events is set by the admin UI
 * rather than by this file.
 *
 * These routes therefore validate the fields that are known and let the rest
 * through untouched. The gain over `@Body() dto: any` is that the body must now
 * be an object of the declared shape, with the named fields type-checked, so a
 * string or an array can no longer be published as an event.
 *
 * When an event's schema is settled, move its fields into the DTO and drop this
 * pipe from that route so the global whitelist applies again.
 */
export const AdminForwardingValidationPipe = new ValidationPipe({
  whitelist: false,
  forbidNonWhitelisted: false,
  transform: true,
});
