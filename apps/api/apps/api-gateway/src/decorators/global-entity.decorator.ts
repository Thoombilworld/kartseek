import { SetMetadata } from '@nestjs/common';

export const GLOBAL_ENTITY_KEY = 'admin:global-entity';

/**
 * Marks an admin route as deliberately market-free — catalogue taxonomy, static
 * pages, platform health. The market-scope regression spec allows only routes
 * that either resolve a market or carry this marker with a reason a reviewer
 * can read. A locked admin may still only READ a global entity; writes must
 * refuse `marketScopeOf(req).locked` themselves.
 */
export const GlobalEntity = (reason: string) => SetMetadata(GLOBAL_ENTITY_KEY, reason);
