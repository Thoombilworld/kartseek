import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMainDefaults, findDuplicatePorts } from './validate.mjs';

test('parseMainDefaults reads ?? and || defaults for process.env reads', () => {
  const src = `
    const tcpPort = +(process.env.ORDER_TCP_PORT ?? 4004);
    const httpPort = +(process.env.ORDER_SERVICE_PORT ?? 3014);
    const port = process.env.API_GATEWAY_PORT || 3001;
    const other = process.env.NOT_A_PORT ?? 'x';
  `;
  assert.deepEqual([...parseMainDefaults(src)], [
    ['ORDER_TCP_PORT', 4004], ['ORDER_SERVICE_PORT', 3014], ['API_GATEWAY_PORT', 3001],
  ]);
});

test('findDuplicatePorts names both services and the port kind', () => {
  const reg = { services: [
    { name: 'a', ports: { http: 3000 } },
    { name: 'b', ports: { http: 3001, tcp: 3000 } },
  ] };
  assert.deepEqual(findDuplicatePorts(reg), ['port 3000 is bound by a (http) and b (tcp)']);
});
