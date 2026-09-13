import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMainDefaults,
  findDuplicatePorts,
  parseConfigMapData,
  checkConfigMapPorts,
  portEnvNamesRead,
  undeclaredPortEnv,
} from './validate.mjs';

const order = {
  name: 'order-service',
  kind: 'core-service',
  path: 'apps/api/apps/order-service',
  ports: { http: 3014, tcp: 4004 },
  env: { http: 'ORDER_SERVICE_PORT', tcp: 'ORDER_TCP_PORT' },
};
const auth = {
  name: 'auth-service',
  kind: 'core-service',
  path: 'apps/api/apps/auth-service',
  ports: { http: 3010 },
  env: { http: 'AUTH_SERVICE_PORT' },
};
const reg = { services: [order, auth] };

const configMap = (body) => `---
apiVersion: v1
kind: ConfigMap
metadata:
  name: kartseek-config
  namespace: kartseek
data:
${body}
`;

test('parseMainDefaults reads ?? and || defaults for process.env reads', () => {
  const src = `
    const tcpPort = +(process.env.ORDER_TCP_PORT ?? 4004);
    const httpPort = +(process.env.ORDER_SERVICE_PORT ?? 3014);
    const port = process.env.API_GATEWAY_PORT || 3001;
    const other = process.env.NOT_A_PORT ?? 'x';
  `;
  assert.deepEqual(
    [...parseMainDefaults(src)],
    [
      ['ORDER_TCP_PORT', 4004],
      ['ORDER_SERVICE_PORT', 3014],
      ['API_GATEWAY_PORT', 3001],
    ],
  );
});

test('the ConfigMap gate reads a port whatever quotes it is written with', () => {
  // The regex this replaced accepted `"3010"` and not `'3010'`, so prettier's
  // normalisation silently turned the gate off: 0 of 26 services matched, and a
  // non-match was skipped rather than reported.
  const data = parseConfigMapData(
    configMap(
      '  ORDER_SERVICE_PORT: \'3014\'\n  ORDER_TCP_PORT: "4004"\n  AUTH_SERVICE_PORT: 3010',
    ),
  );
  assert.deepEqual(data, {
    ORDER_SERVICE_PORT: '3014',
    ORDER_TCP_PORT: '4004',
    AUTH_SERVICE_PORT: 3010,
  });
  assert.deepEqual(checkConfigMapPorts(reg, data), []);
  assert.equal(parseConfigMapData('kind: Secret\nmetadata:\n  name: x\n'), null);
});

test('the ConfigMap gate reports a port that disagrees with the registry', () => {
  const data = parseConfigMapData(
    configMap(
      "  ORDER_SERVICE_PORT: '3014'\n  ORDER_TCP_PORT: '4009'\n  AUTH_SERVICE_PORT: '3010'",
    ),
  );
  assert.deepEqual(checkConfigMapPorts(reg, data), [
    'infra/k8s/config.yaml: ORDER_TCP_PORT=4009, registry says 4004',
  ]);
});

test('the ConfigMap gate fails when it matches nothing, rather than passing', () => {
  // The anti-vacuity assertion: a check that silently looks at no service is
  // worse than no check, because it reports success.
  const failures = checkConfigMapPorts(
    reg,
    parseConfigMapData(configMap("  NODE_ENV: 'production'")),
  );
  assert.ok(
    failures.some((f) => /matched 0 of 2 services/.test(f)),
    failures.join('\n'),
  );
  assert.ok(failures.some((f) => /ORDER_SERVICE_PORT is missing/.test(f)));
  // And a ConfigMap this parser cannot find at all is a failure, not a skip.
  assert.deepEqual(checkConfigMapPorts(reg, null), [
    'infra/k8s/config.yaml: no ConfigMap named kartseek-config — the port gate cannot run',
  ]);
});

test('the tally has an absolute floor, not just a relative one', () => {
  // `matched < expected` is satisfied by 0 of 0: a registry with no Nest
  // services would pass this gate with no failures at all. loadRegistry refuses
  // an empty `services:` list, but a guard that depends on somebody else's
  // validation is not a guard.
  const data = parseConfigMapData(configMap("  NODE_ENV: 'production'"));
  for (const empty of [{ services: [] }, { services: [{ name: 'web', kind: 'web-shell' }] }]) {
    const failures = checkConfigMapPorts(empty, data);
    assert.ok(
      failures.some((f) => /matched 0 of 0 services/.test(f)),
      `a Nest-free registry passed the gate: ${JSON.stringify(failures)}`,
    );
  }
});

test('undeclaredPortEnv finds a port main.ts binds and the registry does not declare', () => {
  // audit-log-service bound AUDIT_LOG_TCP_PORT for months with the registry
  // listing only its HTTP port; every other check reads the registry INTO
  // main.ts and so could not see it.
  const src = `
    const tcpPort = +(process.env.ORDER_TCP_PORT ?? 4004);
    const extra = +(process.env.ORDER_ADMIN_PORT ?? 4444);
    const httpPort = +(process.env.ORDER_SERVICE_PORT ?? 3014);
    const redis = +(process.env.REDIS_PORT ?? 6379);
    const host = process.env.ORDER_HTTP_HOST ?? '127.0.0.1';
  `;
  // Only the service's own stem, only names ending _PORT: REDIS_PORT is
  // infrastructure, and ORDER_HTTP_HOST is a bind address whose '127.0.0.1'
  // parses as the number 127.
  assert.deepEqual(undeclaredPortEnv(order, src), ['ORDER_ADMIN_PORT']);
  assert.deepEqual(
    undeclaredPortEnv({ ...order, env: { ...order.env, x: 'ORDER_ADMIN_PORT' } }, src),
    [],
  );
});

test('a port read with no literal default is caught too', () => {
  // `parseMainDefaults` only sees a read it can put a number to, which is the
  // whole point of that function and a blind spot in this one: these three are
  // how a service would bind an undeclared port without tripping anything.
  const src = `
    const a = Number(process.env.ORDER_METRICS_PORT);
    const b = this.cfg.get('ORDER_DEBUG_PORT');
    const c = Joi.number().port().description("ORDER_ADMIN_PORT");
    const d = +(process.env.ORDER_SERVICE_PORT ?? 3014);
    const e = Number(process.env.REDIS_PORT);
  `;
  assert.deepEqual(parseMainDefaults(src).has('ORDER_METRICS_PORT'), false);
  assert.deepEqual([...portEnvNamesRead(src)].sort(), [
    'ORDER_ADMIN_PORT',
    'ORDER_DEBUG_PORT',
    'ORDER_METRICS_PORT',
    'ORDER_SERVICE_PORT',
    'REDIS_PORT',
  ]);
  // Own stem, undeclared, `_PORT`: the infrastructure name and the declared one
  // are not this entry's to answer for.
  assert.deepEqual(undeclaredPortEnv(order, src), [
    'ORDER_METRICS_PORT',
    'ORDER_DEBUG_PORT',
    'ORDER_ADMIN_PORT',
  ]);
});

test('findDuplicatePorts names both services and the port kind', () => {
  const reg = {
    services: [
      { name: 'a', ports: { http: 3000 } },
      { name: 'b', ports: { http: 3001, tcp: 3000 } },
    ],
  };
  assert.deepEqual(findDuplicatePorts(reg), ['port 3000 is bound by a (http) and b (tcp)']);
});
