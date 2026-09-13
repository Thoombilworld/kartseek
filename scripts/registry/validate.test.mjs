import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMainDefaults,
  findDuplicatePorts,
  parseConfigMapData,
  checkConfigMapPorts,
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

test('findDuplicatePorts names both services and the port kind', () => {
  const reg = {
    services: [
      { name: 'a', ports: { http: 3000 } },
      { name: 'b', ports: { http: 3001, tcp: 3000 } },
    ],
  };
  assert.deepEqual(findDuplicatePorts(reg), ['port 3000 is bound by a (http) and b (tcp)']);
});
