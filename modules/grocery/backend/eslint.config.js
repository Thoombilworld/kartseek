/**
 * ESLint configuration for the grocery backend.
 *
 * Delegates to the platform config in apps/api rather than copying it, for the
 * same reason rspack.config.js does: a rule added there must reach this
 * service without anyone remembering to copy it here.
 */
module.exports = require('../../../apps/api/eslint.base.js')(__dirname, ['src/**/*.ts']);
