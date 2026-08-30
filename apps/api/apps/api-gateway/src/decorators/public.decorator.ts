/**
 * @Public() Decorator — Marks an endpoint as publicly accessible.
 *
 * When used on a method in a controller that has a class-level
 * JwtAuthGuard, this decorator tells the guard to skip authentication
 * for this specific route (e.g., health checks, hotel search, reviews).
 *
 * Usage:
 *   @Public()
 *   @Get('health')
 *   health() { ... }
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
