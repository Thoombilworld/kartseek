/**
 * Rspack build configuration for the grocery backend microservice.
 *
 * This delegates to the platform build config in apps/api rather than copying
 * it. That file carries a hundred lines of hard-won detail — the `ws`
 * bufferutil DefinePlugin that stops one WebSocket frame killing the process,
 * geoip-lite and swagger-ui-dist kept external because they resolve data and
 * asset paths against their own package directory, bcrypt kept external because
 * node-gyp-build resolves its prebuilt binary the same way. Duplicating that
 * list here would mean this service silently missing the next fix made to it;
 * the first attempt at this file did duplicate it, omitted geoip-lite, and the
 * service died on boot with ENOENT on `data/geoip-country.dat`.
 *
 * The @app/* aliases in that config are built from its own `__dirname`, so they
 * already resolve to apps/api/libs — correct from here too, since the platform
 * libraries stay shared.
 *
 * When the platform libraries are eventually extracted to packages/, this file
 * is the single place this service needs changing.
 */
const platformRspackConfig = require('../../../apps/api/rspack.config.js');

module.exports = function (options) {
  return platformRspackConfig(options);
};
