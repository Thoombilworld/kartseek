import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {
  namePortOwners,
  parseColumnarOwners,
  parseLsofOwners,
  portsInUse,
  probePort,
  shResult,
} from './ports.mjs';

/** Bind a real server and hand back its port and a closer. */
function listen(host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, host, () =>
      resolve({
        port: server.address().port,
        close: () => new Promise((done) => server.close(done)),
      }),
    );
  });
}

/** A port nothing is on: bind one, note it, give it back. */
async function freePort() {
  const s = await listen();
  const { port } = s;
  await s.close();
  return port;
}

// ── the verdict comes from a bind, on every OS ──────────────────────────────

test('a really bound port is reported, with the reason', async () => {
  const s = await listen();
  try {
    const busy = await portsInUse([s.port]);
    assert.equal(busy.length, 1, 'the port a live server holds must be reported');
    assert.equal(busy[0].port, s.port);
    assert.equal(busy[0].reason, 'EADDRINUSE');
  } finally {
    await s.close();
  }
});

test('a free port passes', async () => {
  assert.deepEqual(await portsInUse([await freePort()]), []);
  assert.deepEqual(await portsInUse([]), []);
});

test('probePort closes the socket it opened, so the caller can still have the port', async () => {
  const port = await freePort();
  assert.deepEqual(await probePort(port), { inUse: false, reason: null });
  // If the probe had leaked its listener, this second bind would fail.
  const again = await probePort(port);
  assert.equal(again.inUse, false);
});

test('a bind error that is not EADDRINUSE is still refused, never called free', async () => {
  // The rule the whole helper exists for: nothing that is not a clean bind may
  // read as "free". EACCES on a privileged port is the real-world case.
  const rows = await portsInUse([{ port: 80, service: 'nginx' }], {
    probe: async () => ({ inUse: true, reason: 'EACCES' }),
    name: () => new Map(),
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].reason, 'EACCES');
  assert.equal(rows[0].service, 'nginx', 'the service that wanted it is carried through');
});

// ── naming is a courtesy; a missing tool is never permission ────────────────

test('a naming tool that is missing leaves pid null and the port still reported', async () => {
  const s = await listen();
  try {
    // Every tool absent: spawn failed, so code is null. This is Debian 12 /
    // Ubuntu 22.04+ / Fedora with no net-tools, and macOS given -tlnp.
    const missing = () => ({ code: null, stdout: '', stderr: '', error: 'ENOENT' });
    const rows = await portsInUse([{ port: s.port, service: 'api-gateway' }], {
      name: (ports) => namePortOwners(ports, { platform: 'linux', run: missing }),
    });
    assert.equal(rows.length, 1, 'a missing naming tool can never read as "port free"');
    assert.equal(rows[0].pid, null);
    assert.equal(rows[0].tool, null);
  } finally {
    await s.close();
  }
});

test('a naming tool that exits non-zero is skipped, and the next one is tried', () => {
  const calls = [];
  const run = (command) => {
    calls.push(command);
    if (command.startsWith('ss')) return { code: 1, stdout: '', stderr: 'not found', error: null };
    if (command.startsWith('netstat')) return { code: 0, stdout: '', stderr: '', error: null }; // ran, said nothing
    return {
      code: 0,
      stderr: '',
      error: null,
      stdout: 'node    1234 me   20u  IPv4 0x1 0t0  TCP 127.0.0.1:3001 (LISTEN)',
    };
  };
  const owners = namePortOwners([3001], { platform: 'linux', run });
  assert.deepEqual(calls, ['ss -ltnp', 'netstat -tlnp', 'lsof -nP -iTCP -sTCP:LISTEN']);
  assert.deepEqual(owners.get(3001), { pid: '1234', tool: 'lsof -nP -iTCP -sTCP:LISTEN' });
});

test('namePortOwners stops as soon as every port has an owner', () => {
  const calls = [];
  const run = (command) => {
    calls.push(command);
    return {
      code: 0,
      stderr: '',
      error: null,
      stdout: 'LISTEN 0 511 127.0.0.1:3001 0.0.0.0:* users:(("node",pid=1234,fd=20))',
    };
  };
  namePortOwners([3001], { platform: 'linux', run });
  assert.deepEqual(calls, ['ss -ltnp'], 'no point running netstat once ss answered');
});

// ── the parsers, one per dialect ────────────────────────────────────────────

test('parseColumnarOwners reads Windows netstat -ano', () => {
  const text = [
    'Active Connections',
    '  Proto  Local Address          Foreign Address        State           PID',
    '  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       968',
    '  TCP    127.0.0.1:3001         0.0.0.0:0              LISTENING       24680',
    '  TCP    127.0.0.1:3018         0.0.0.0:0              TIME_WAIT       0',
    '  TCP    [::]:3000              [::]:0                 LISTENING       13579',
  ].join('\n');
  const owners = parseColumnarOwners(text, [3000, 3001, 3018]);
  assert.equal(owners.get(3001), '24680');
  assert.equal(owners.get(3000), '13579');
  // A TIME_WAIT does not stop a bind, so it is not an owner.
  assert.equal(owners.has(3018), false);
});

test('parseColumnarOwners reads netstat -tlnp, whose address sits behind two counters', () => {
  const text = [
    'Proto Recv-Q Send-Q Local Address     Foreign Address    State   PID/Program name',
    'tcp        0      0 127.0.0.1:3001    0.0.0.0:*          LISTEN  1234/node',
  ].join('\n');
  assert.equal(parseColumnarOwners(text, [3001]).get(3001), '1234');
});

test('parseColumnarOwners reads ss -ltnp, whose PID hides in users:(())', () => {
  const text = [
    'State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process',
    'LISTEN 0      511    127.0.0.1:3001     0.0.0.0:*         users:(("node",pid=4321,fd=20))',
  ].join('\n');
  assert.equal(parseColumnarOwners(text, [3001]).get(3001), '4321');
});

test('parseColumnarOwners reports the port with a null pid when the tool hides it', () => {
  // `ss -ltn` without -p, or netstat without the privilege to see other users'
  // processes: the row is there, the PID is not.
  const text = 'LISTEN 0 511 127.0.0.1:3001 0.0.0.0:*';
  const owners = parseColumnarOwners(text, [3001]);
  assert.equal(owners.has(3001), true);
  assert.equal(owners.get(3001), null);
});

test('parseLsofOwners takes the PID from the second column', () => {
  const text = [
    'COMMAND  PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME',
    'node    1234 me     20u  IPv4 0x1234      0t0  TCP 127.0.0.1:3001 (LISTEN)',
    'node    5678 me     21u  IPv6 0x5678      0t0  TCP [::1]:3000 (LISTEN)',
  ].join('\n');
  const owners = parseLsofOwners(text, [3000, 3001]);
  assert.equal(owners.get(3001), '1234');
  assert.equal(owners.get(3000), '5678');
});

// ── the shell helper keeps the exit status ──────────────────────────────────

test('shResult surfaces a non-zero exit and a command that does not exist', () => {
  const ok = shResult('node -e "process.stdout.write(\'hi\')"');
  assert.equal(ok.code, 0);
  assert.equal(ok.stdout.trim(), 'hi');

  const bad = shResult('node -e "process.exit(3)"');
  assert.equal(bad.code, 3, 'the status is kept, not thrown away with the output');

  const missing = shResult('kartseek-no-such-command-exists');
  assert.notEqual(missing.code, 0, 'a missing command must never look like success');
});
