/**
 * `RolesGuard` lives in `@app/guards` now.
 *
 * This file held the platform's only real implementation — role AND every
 * `perm:` key — while `libs/guards` held a weaker one that read the same
 * metadata key and reached a different verdict. `libs/gdpr`, a LIBRARY, had to
 * import this guard by relative path (`../../../apps/api-gateway/src/guards/...`)
 * to get the right behaviour on its three personal-data routes: a library
 * reaching up into an application, which is a dependency the module graph
 * cannot express and the opposite of the direction everything else points
 * (dispatch addendum item 5).
 *
 * The implementation moved into `libs/guards`, replacing the weak duplicate, so
 * there is exactly one of them and both an application and a library can name
 * it. This file stays as the gateway's import path: thirty-four controllers
 * bind it from here, and several source-scanning regression specs read those
 * controllers.
 */
export { RolesGuard } from '@app/guards';
