/**
 * The staff market-scope helpers live in `@app/common` now.
 *
 * `marketScopeOf`, `resolveMarket`, `resolveScope`, `assertRecordInScope` and
 * `refuseLockedAdmin` were declared here, in the application, and `libs/gdpr` —
 * a LIBRARY — imported `refuseLockedAdmin` by relative path
 * (`../../../apps/api-gateway/src/guards/market-scope`) to refuse a locked
 * administrator on its personal-data routes. A library reaching up into an
 * application is a dependency the module graph cannot express; it builds only
 * because both sit in one tsconfig (dispatch addendum item 5).
 *
 * They now sit beside the record half they were always paired with:
 * `libs/common/src/market/market-scope.ts` holds `normaliseMarket`,
 * `assertInMarket` and `marketPredicate`, and
 * `libs/common/src/market/http-market-scope.ts` holds these. Both halves of one
 * rule, in one place, which is also what stops them drifting apart again.
 *
 * This file stays as the gateway's import path for the twenty-eight controllers
 * that name it and for the regression specs that read those controllers.
 */
export {
  marketScopeOf,
  resolveMarket,
  resolveScope,
  assertRecordInScope,
  refuseLockedAdmin,
  type MarketScope,
} from '@app/common';
