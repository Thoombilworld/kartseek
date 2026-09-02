
/**
 * Rspack build configuration for every NestJS service in this repository.
 *
 * The Nest CLI deprecated its webpack builder in favour of rspack; this file
 * replaces webpack.config.js and keeps the same hard-won detail. The notes
 * below are the reasons each entry exists, not decoration.
 *
 * The eight module backends delegate to this file rather than copying it, so a
 * fix made here reaches all of them. That is deliberate: the first attempt at
 * those files duplicated the externals list, omitted geoip-lite, and the
 * service died on boot with ENOENT on `data/geoip-country.dat`.
 *
 * What changed in the move from webpack:
 *
 *   The CLI hands rspack `builtin:swc-loader` where webpack got the TypeScript
 *   loader, so the block that forced that loader into `transpileOnly` is gone —
 *   there is nothing left in the pipeline for it to match. The builder still
 *   type-checks: the CLI injects fork-ts-checker-webpack-plugin into every
 *   rspack build (node_modules/@nestjs/cli/lib/compiler/defaults/rspack-defaults.js),
 *   so a type error fails the build — nest-cli.json's `typeCheck: false` is
 *   read only by the swc builder. `tsc --noEmit` remains the gate for what a
 *   given build does not reach.
 *
 *   `webpack.DefinePlugin` became `rspack.DefinePlugin`; same semantics.
 *
 *   The `@app/*` aliases stay explicit even though apps/api/tsconfig.json
 *   declares `paths` for them and the CLI passes `resolve.tsConfig`: the
 *   eight module backends build with their own tsconfig, and these aliases
 *   resolve to apps/api/libs from any of them without depending on each
 *   workspace's `paths` staying in step. Verified on all 26 builds.
 */
module.exports = function (options) {
  const path = require('path');
  const rspack = require('@rspack/core');
  const nodeExternals = require('webpack-node-externals');
  // Resolve @app/* explicitly; see the note above on why these stay alongside
  // the tsconfig `paths`. `baseUrl` is deliberately absent: TypeScript 6
  // deprecates it and `tsc --noEmit` rejects it.
  const appLibs = ['common', 'database', 'guards', 'decorators', 'validators', 'dto', 'events', 'logger', 'security', 'grpc', 'kafka', 'redis', 'gdpr', 'region', 'storage'];
  const appAliases = Object.fromEntries(appLibs.map((l) => [`@app/${l}`, path.resolve(__dirname, `libs/${l}/src`)]));
  return {
    ...options,
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
      new rspack.DefinePlugin({
        'process.env.WS_NO_BUFFER_UTIL': JSON.stringify('true'),
        'process.env.WS_NO_UTF_8_VALIDATE': JSON.stringify('true'),
      }),
    ],
    externals: [
      /**
       * Every dependency is external, including the ones hoisted to the
       * repository root.
       *
       * The CLI's own default is `nodeExternals()` with no arguments, which
       * only recognises `apps/api/node_modules`. That was harmless while every
       * Nest package sat there. It stopped being harmless when @nestjs/core and
       * @nestjs/common moved to the root as direct devDependencies (the fix for
       * the duplicate-core problem): the builder no longer recognised them as
       * externals and bundled them, while the six packages still nested here —
       * apollo, graphql, microservices, platform-express, swagger, testing —
       * stayed external and loaded their own copy of @nestjs/core from disk.
       *
       * Two copies of @nestjs/core means two `HttpAdapterHost` classes, and
       * Nest's DI matches providers by class identity, so the container's
       * instance never satisfies the external module's token. It surfaced as
       * `Nest can't resolve dependencies of the GraphQLModule` at boot, and
       * @nestjs/microservices had the same split waiting behind it. The build
       * gives no warning of any of this — only starting the process does.
       *
       * `additionalModuleDirs` puts the root back in scope, so the whole
       * dependency set resolves once, at runtime, from disk.
       */
      nodeExternals({
        additionalModuleDirs: [path.resolve(__dirname, '../../node_modules')],
      }),
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
