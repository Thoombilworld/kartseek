/**
 * KARTSEEK — Activity Tracking Interceptor
 *
 * Global NestJS interceptor that captures user activity on every gateway request.
 * Publishes activity events to the RecommendationService asynchronously.
 *
 * Extracts:
 *  - userId: from request.user (set by JwtAuthGuard)
 *  - module: from route prefix (marketplace, grocery, etc.)
 *  - action: from HTTP method + path pattern
 *  - metadata: from request body/query (product ID, search query, etc.)
 *
 * Non-blocking: tracking runs in the background after the response is sent.
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RecommendationService } from '../services/recommendation.service';
import {
  UserActivityEvent,
  RecommendationModule,
  ActivityAction,
  ROUTE_MODULE_MAP,
} from '../services/recommendation.types';

// ─── Routes to skip (health checks, static, non-trackable) ─────────────────
const SKIP_PREFIXES = [
  '/health', '/api/docs', '/swagger', '/favicon',
  '/upload', '/admin/security', '/geo', '/regions',
  '/recommendations',  // Don't track recommendation API calls themselves
];

// ─── HTTP Method → Action Mapping ───────────────────────────────────────────
function inferAction(method: string, path: string): ActivityAction | null {
  // Specific path patterns
  if (path.includes('/search') || path.includes('/suggestions')) return 'search';
  if (path.includes('/cart') || path.includes('/add-to-cart')) return 'add_to_cart';
  if (path.includes('/wishlist') || path.includes('/favorite')) return 'wishlist';
  if (path.includes('/checkout') || path.includes('/place-order')) return 'order';
  if (path.includes('/booking') && method === 'POST') return 'book';
  if (path.includes('/review') && method === 'POST') return 'review';
  if (path.includes('/reorder')) return 'reorder';

  // Method-based fallback
  switch (method) {
    case 'GET': return 'view';
    case 'POST': return path.includes('/order') ? 'order' : null;
    default: return null;
  }
}

// ─── Extract module from route path ─────────────────────────────────────────
function extractModule(path: string): RecommendationModule | null {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const firstSegment = segments[0].toLowerCase();
  return ROUTE_MODULE_MAP[firstSegment] || null;
}

// ─── Extract entity info from path ──────────────────────────────────────────
function extractEntityInfo(path: string, module: RecommendationModule): { entityType: string; entityId?: string } {
  const MODULE_ENTITY_TYPES: Record<RecommendationModule, string> = {
    marketplace: 'product',
    grocery: 'grocery_item',
    pharmacy: 'medicine',
    hotel: 'hotel',
    restaurant: 'restaurant',
    doctor: 'doctor',
  };

  const entityType = MODULE_ENTITY_TYPES[module] || 'item';
  const segments = path.split('/').filter(Boolean);

  // Try to find an entity ID (UUID or slug pattern after the module prefix)
  // e.g., /marketplace/product/abc-123 → entityId = abc-123
  // e.g., /hotels/htl-001 → entityId = htl-001
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    // Skip common sub-routes
    if (['search', 'nearby', 'menu', 'reviews', 'offers', 'health', 'admin', 'owner', 'bookings'].includes(seg)) continue;
    // If it looks like an ID (contains a dash or is alphanumeric)
    if (seg.includes('-') || /^[a-zA-Z0-9]{6,}$/.test(seg)) {
      return { entityType, entityId: seg };
    }
  }

  return { entityType };
}

@Injectable()
export class ActivityTrackingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityTrackingInterceptor.name);

  constructor(private readonly recommendationService: RecommendationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (!request) return next.handle();

    const path: string = request.url?.split('?')[0] || '';
    const method: string = request.method;

    // Skip non-trackable routes
    if (SKIP_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return next.handle();
    }

    // Skip unauthenticated requests
    const userId = request.user?.id;
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
      return next.handle();
    }

    // Extract module
    const module = extractModule(path);
    if (!module) return next.handle();

    // Infer action
    const action = inferAction(method, path);
    if (!action) return next.handle();

    return next.handle().pipe(
      tap({
        // Track AFTER successful response (non-blocking)
        next: () => {
          const { entityType, entityId } = extractEntityInfo(path, module);
          const query = request.query || {};
          const body = request.body || {};

          const event: UserActivityEvent = {
            userId,
            module,
            action,
            entityType,
            entityId,
            category: query.category || query.cuisine || body.category,
            metadata: {
              query: query.q || query.query || query.search,
              price: body.price || query.price,
              path,
              ...(query.city && { city: query.city }),
              ...(query.specialization && { specialization: query.specialization }),
            },
            timestamp: new Date().toISOString(),
            region: request.headers['x-region'] || request.headers['x-country'],
            sessionId: request.headers['x-session-id'],
          };

          // Fire-and-forget — don't await
          this.recommendationService.trackActivity(event).catch((err) => {
            this.logger.debug(`Track activity failed: ${err.message}`);
          });
        },
      }),
    );
  }
}
