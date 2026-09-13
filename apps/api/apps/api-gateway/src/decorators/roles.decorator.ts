/**
 * `Roles` and `ROLES_KEY` live in `@app/decorators` now.
 *
 * Two copies of this decorator existed, typed differently — `UserRole[]` here
 * in the library, `(UserRole | string)[]` in the gateway — paired with two
 * guards that read the same `'roles'` metadata key and disagreed about what a
 * `perm:` entry means. `libs/gdpr` had to import the gateway's copy by relative
 * path to get a permission key that actually narrows, which is a library
 * reaching into an application (dispatch addendum item 5).
 *
 * There is one declaration now, in `@app/decorators`, with the wider type. This
 * file stays as the gateway's import path for the thirty-six files that name it.
 */
export { Roles, ROLES_KEY } from '@app/decorators';
