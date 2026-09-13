/**
 * `GlobalEntity` lives in `@app/decorators` now.
 *
 * It was declared here, in the application, and `libs/gdpr` — a LIBRARY — had
 * to import it by relative path (`../../../apps/api-gateway/src/decorators/...`)
 * to mark its three platform-wide routes. A library reaching up into an
 * application is a dependency the module graph cannot express: it builds only
 * because both happen to sit in one tsconfig, and it inverts the direction
 * everything else in this repository points (dispatch addendum item 5).
 *
 * This file stays as the gateway's import path so the fourteen controllers that
 * name it, and the source-scanning regression specs that read those controllers,
 * keep working unchanged. There is one implementation, and it is in the library.
 */
export { GlobalEntity, GLOBAL_ENTITY_KEY } from '@app/decorators';
