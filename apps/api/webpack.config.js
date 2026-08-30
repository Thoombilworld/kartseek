
/**
 * Custom Webpack configuration for NestJS watch mode.
 *
 * 1. @nestjs/microservices dynamically requires transport drivers (mqtt, nats,
 *    amqplib, amqp-connection-manager, kafkajs, @grpc/grpc-js, @grpc/proto-loader)
 *    even when they are not used. This config marks unused ones as externals so
 *    Webpack doesn't fail trying to resolve them.
 *
 * 2. Force ts-loader into `transpileOnly` mode. Type-checking is handled
 *    separately by `tsc --noEmit` (which passes). This avoids a ts-loader /
 *    TypeScript version mismatch on the `ignoreDeprecations` compiler option
 *    (TS5103) that otherwise blocks the webpack build. This matches the
 *    `typeCheck: false` intent already declared in nest-cli.json.
 */
module.exports = function (options) {
  const path = require('path');
  const webpack = require('webpack');
  // Resolve @app/* monorepo lib aliases explicitly. The base tsconfig no longer
  // sets `baseUrl` (it triggered a TS6/ts-loader `ignoreDeprecations` conflict),
  // so webpack's TsconfigPaths resolution needs these aliases to find the libs.
  const appLibs = ['common', 'database', 'guards', 'decorators', 'validators', 'dto', 'events', 'logger', 'security', 'grpc', 'kafka', 'redis', 'gdpr', 'region', 'storage'];
  const appAliases = Object.fromEntries(appLibs.map((l) => [`@app/${l}`, path.resolve(__dirname, `libs/${l}/src`)]));
  const setTranspileOnly = (loaderEntry) => {
    if (!loaderEntry) return loaderEntry;
    if (typeof loaderEntry === 'string') return loaderEntry;
    if (typeof loaderEntry.loader === 'string' && loaderEntry.loader.includes('ts-loader')) {
      return { ...loaderEntry, options: { ...(loaderEntry.options || {}), transpileOnly: true } };
    }
    return loaderEntry;
  };

  const rules = ((options.module && options.module.rules) || []).map((rule) => {
    if (!rule) return rule;
    const next = { ...rule };
    if (typeof rule.loader === 'string' && rule.loader.includes('ts-loader')) {
      next.options = { ...(rule.options || {}), transpileOnly: true };
    }
    if (Array.isArray(rule.use)) {
      next.use = rule.use.map(setTranspileOnly);
    } else if (rule.use) {
      next.use = setTranspileOnly(rule.use);
    }
    return next;
  });

  return {
    ...options,
    module: { ...options.module, rules },
    resolve: {
      ...(options.resolve || {}),
      alias: { ...((options.resolve && options.resolve.alias) || {}), ...appAliases },
    },
    plugins: [
      ...(options.plugins || []),
      /**
       * Keep `ws` on its pure-JS mask/unmask path — this prevents a crash, it is
       * not a tuning knob.
       *
       * `ws` guards its optional native accelerators like this:
       *
       *   if (!process.env.WS_NO_BUFFER_UTIL) {
       *     try { const bufferUtil = require('bufferutil');
       *           module.exports.unmask = (buf, mask) => buf.length < 32
       *             ? _unmask(buf, mask) : bufferUtil.unmask(buf, mask);
       *     } catch { /* fall back to JS *\/ }
       *   }
       *
       * Neither `bufferutil` nor `utf-8-validate` is installed in this repo, so
       * that require is expected to throw and the catch is expected to restore
       * the JS path. Bundled, it does not: the require is emitted as an external
       * (`module.exports = require("bufferutil")`) and comes back without
       * throwing, so `ws` installs a fast path that calls a function which does
       * not exist. The first client frame of 32+ bytes then kills the process
       * with `TypeError: bufferUtil.unmask is not a function` — one WebSocket
       * message from any browser was enough to take the gateway down.
       *
       * Defining the flag at build time makes the guard statically true, so the
       * native branch is never entered and cannot be re-armed by a missing or
       * mistyped environment variable. (`ws` only tests for truthiness, so an
       * env of `WS_NO_BUFFER_UTIL=false` would read as "yes, skip" — another
       * reason not to leave this to configuration.)
       *
       * To actually use the native accelerators, install both packages and drop
       * this plugin plus their `externals` entries below.
       */
      new webpack.DefinePlugin({
        'process.env.WS_NO_BUFFER_UTIL': JSON.stringify('true'),
        'process.env.WS_NO_UTF_8_VALIDATE': JSON.stringify('true'),
      }),
    ],
    externals: [
      // Preserve any existing externals
      ...(Array.isArray(options.externals) ? options.externals : options.externals ? [options.externals] : []),
      // Mark unused @nestjs/microservices optional transport deps as external
      {
        'mqtt': 'commonjs mqtt',
        'nats': 'commonjs nats',
        'amqplib': 'commonjs amqplib',
        'amqp-connection-manager': 'commonjs amqp-connection-manager',
        '@apollo/subgraph': 'commonjs @apollo/subgraph',
        '@apollo/subgraph/package.json': 'commonjs @apollo/subgraph/package.json',
        '@apollo/subgraph/dist/directives': 'commonjs @apollo/subgraph/dist/directives',
        '@apollo/gateway': 'commonjs @apollo/gateway',
        '@as-integrations/fastify': 'commonjs @as-integrations/fastify',
        'ts-morph': 'commonjs ts-morph',
        // geoip-lite reads binary .dat data files relative to its own package
        // dir at runtime; bundling breaks that path resolution. Keep it external.
        'geoip-lite': 'commonjs geoip-lite',
        // swagger-ui-dist ships the Swagger UI static assets as files. @nestjs/swagger
        // locates them via `swagger-ui-dist/absolute-path.js`, which returns its own
        // __dirname — once bundled that resolves to the dist bundle dir instead of the
        // package dir, so express.static serves an empty root and every asset 404s.
        'swagger-ui-dist': 'commonjs swagger-ui-dist',
        'swagger-ui-dist/absolute-path.js': 'commonjs swagger-ui-dist/absolute-path.js',
        // Native (.node) modules — node-gyp-build resolves the prebuilt binary
        // relative to the package dir at runtime; bundling breaks that. Keep external.
        'bcrypt': 'commonjs bcrypt',
        // These two are neither installed nor reachable at runtime. They stay
        // listed only so the build resolves if the DefinePlugin above ever stops
        // pruning the branch that requires them; the plugin, not this entry, is
        // what keeps the gateway from crashing. See the note on it.
        'bufferutil': 'commonjs bufferutil',
        'utf-8-validate': 'commonjs utf-8-validate',
        // Optional storage-provider SDKs — loaded lazily via dynamic import() in
        // libs/storage/src/storage.service.ts and only required when the matching
        // STORAGE_PROVIDER (s3 / gcs) is actually used at runtime.
        '@aws-sdk/client-s3': 'commonjs @aws-sdk/client-s3',
        '@aws-sdk/s3-request-presigner': 'commonjs @aws-sdk/s3-request-presigner',
        '@google-cloud/storage': 'commonjs @google-cloud/storage',
        // Add others here if needed in the future:
        // 'kafkajs': 'commonjs kafkajs',
        // '@grpc/grpc-js': 'commonjs @grpc/grpc-js',
        // '@grpc/proto-loader': 'commonjs @grpc/proto-loader',
      },
    ],
  };
};
