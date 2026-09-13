/**
 * Is a TCP port already taken on this host?
 *
 *   import { portsInUse } from '../lib/ports.mjs';
 *   const busy = await portsInUse([3001, 3000], { host: '127.0.0.1' });
 *   //  → [{ port: 3001, pid: '24680', tool: 'netstat -ano', reason: 'EADDRINUSE' }]
 *
 * ── The contract ────────────────────────────────────────────────────────────
 *
 * `portsInUse(ports, { host, probe, name })` resolves to one row per port that
 * is **not** bindable, `[]` when every port is free:
 *
 *   { port: number, pid: string | null, tool: string | null,
 *     reason: string, service?: string }
 *
 * `ports` may be plain numbers or `{ port, service }` objects; `service` is
 * carried through untouched so a caller can say which of its services wanted
 * the port. `pid` and `tool` are `null` when nothing on this machine could name
 * the owner — which is information, never permission to continue.
 *
 * ── Why the answer comes from a bind, not from a command ────────────────────
 *
 * The first version of this check shelled out to `netstat` and looked for
 * LISTENING rows. That reads as "every port is free" on any machine where the
 * command is missing or speaks a different dialect — `net-tools` is not
 * installed by default on Debian 12, Ubuntu 22.04+ or Fedora, and macOS's BSD
 * `netstat` rejects `-tlnp` — so a check written specifically to remove a silent
 * pass had one of its own, invisible from Windows where `netstat` is built in.
 *
 * So the verdict is a real `net.createServer().listen(port, host)`:
 *
 *   - it binds        → the port is free, and the probe closes immediately;
 *   - `EADDRINUSE`    → something holds it, on every operating system;
 *   - any other error → still reported, with the code as the reason. `EACCES`
 *                       on a privileged port is not "in use", but it is not
 *                       "and therefore Docker will bind it" either.
 *
 * It probes the same address the caller will publish on, because that is the
 * bind that has to succeed: a listener on one specific interface does not stop
 * a bind on another.
 *
 * Node does not set `SO_REUSEADDR` on Windows (libuv sets it only elsewhere),
 * and on Linux `SO_REUSEADDR` does not let two sockets listen on one
 * address:port — that needs `SO_REUSEPORT`. So the probe cannot silently
 * succeed alongside an existing listener on either platform.
 *
 * The shell tools below are used for ONE thing: putting a PID next to a port
 * that the bind already proved is taken. If none of them exists, or the one
 * that does exits non-zero, the row still comes back — with `pid: null`.
 */
import net from 'node:net';
import { spawnSync } from 'node:child_process';

/**
 * A shell one-liner, with its exit status kept.
 *
 * Every caller decides what a non-zero `code` means for it. The helper this
 * replaces returned `stdout + stderr` concatenated and threw the status away,
 * which is how "command not found" came to read as "no listeners".
 * `code` is `null` when the command could not be spawned at all; `error` then
 * carries the reason.
 */
export function shResult(command, opts = {}) {
  const r = spawnSync(command, {
    encoding: 'utf8',
    shell: true,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
    ...opts,
  });
  return {
    code: r.error ? null : (r.status ?? null),
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
    error: r.error ? (r.error.message ?? String(r.error)) : null,
  };
}

/**
 * Try to bind `port` on `host`. Resolves `{ inUse, reason }` and never throws.
 *
 * The listening socket is closed before the promise settles, so the caller can
 * hand the port straight to whatever wanted it.
 */
export function probePort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    let settled = false;
    const settle = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    server.once('error', (err) =>
      settle({ inUse: true, reason: err?.code ?? String(err?.message ?? 'bind failed') }),
    );
    server.once('listening', () => server.close(() => settle({ inUse: false, reason: null })));
    try {
      server.listen({ port, host, exclusive: true });
    } catch (err) {
      settle({ inUse: true, reason: err?.code ?? 'listen threw' });
    }
  });
}

const portOf = (p) => Number(p?.port ?? p);

/**
 * `netstat -ano` (Windows), `netstat -tlnp` (Linux) and `ss -ltnp` all put the
 * local address in a column of its own and the PID either as a bare trailing
 * number, as `<pid>/<name>`, or inside `users:(("name",pid=N,fd=M))`.
 *
 * The local address is found as the first token ending in `:<port>` rather than
 * by a fixed index: Windows puts it second, `netstat -tlnp` fourth behind two
 * queue counters, and `ss` fourth behind three. The peer column is `0.0.0.0:0`
 * on Windows and `0.0.0.0:*` elsewhere, and the local one always precedes it,
 * so taking the first match cannot pick the wrong one. Only LISTEN rows count —
 * a TIME_WAIT on the same port does not stop a bind.
 */
export function parseColumnarOwners(text, ports) {
  const wanted = new Set(ports.map(portOf));
  const found = new Map();
  for (const line of String(text ?? '').split(/\r?\n/)) {
    if (!/\bLISTEN(?:ING)?\b/.test(line)) continue;
    const cols = line.trim().split(/\s+/);
    const local = cols.find((c) => /:\d+$/.test(c));
    if (!local) continue;
    const port = Number(/:(\d+)$/.exec(local)[1]);
    if (!wanted.has(port) || found.has(port)) continue;
    const pid =
      /\bpid=(\d+)/.exec(line)?.[1] ??
      /(?:^|\s)(\d+)\/\S+\s*$/.exec(line)?.[1] ??
      /(?:^|\s)(\d+)\s*$/.exec(line)?.[1] ??
      null;
    found.set(port, pid);
  }
  return found;
}

/**
 * `lsof -nP -iTCP -sTCP:LISTEN` is the odd one out: the PID is the SECOND
 * column and the address is near the end, after the file descriptor and type.
 *
 *   node    1234 me   20u  IPv4 0x… 0t0  TCP 127.0.0.1:3001 (LISTEN)
 */
export function parseLsofOwners(text, ports) {
  const wanted = new Set(ports.map(portOf));
  const found = new Map();
  for (const line of String(text ?? '').split(/\r?\n/)) {
    if (!/\(LISTEN\)/.test(line)) continue;
    const cols = line.trim().split(/\s+/);
    const address = cols.find((c, i) => i > 1 && /:\d+$/.test(c));
    if (!address) continue;
    const port = Number(/:(\d+)$/.exec(address)[1]);
    if (!wanted.has(port) || found.has(port)) continue;
    found.set(port, /^\d+$/.test(cols[1]) ? cols[1] : null);
  }
  return found;
}

/** The tools that can name a listener's owner, best first, per platform. */
export const OWNER_TOOLS = {
  win32: [{ command: 'netstat -ano', parse: parseColumnarOwners }],
  linux: [
    { command: 'ss -ltnp', parse: parseColumnarOwners },
    { command: 'netstat -tlnp', parse: parseColumnarOwners },
    { command: 'lsof -nP -iTCP -sTCP:LISTEN', parse: parseLsofOwners },
  ],
  darwin: [
    { command: 'lsof -nP -iTCP -sTCP:LISTEN', parse: parseLsofOwners },
    { command: 'netstat -anv -p tcp', parse: parseColumnarOwners },
  ],
};

/**
 * Who holds these ports? Best effort, and explicitly so.
 *
 * Returns `Map<port, { pid, tool }>` covering only the ports a tool could
 * actually name. A tool that is missing (`code === null`), fails (`code !== 0`)
 * or prints nothing is skipped and the next one tried; when they all fail the
 * map is empty, and the caller's row says `pid: null`. That is the whole point:
 * naming is a courtesy, the bind is the evidence.
 */
export function namePortOwners(ports, { platform = process.platform, run = shResult } = {}) {
  const owners = new Map();
  const wanted = ports.map(portOf);
  for (const tool of OWNER_TOOLS[platform] ?? OWNER_TOOLS.linux) {
    if (wanted.every((p) => owners.has(p))) break;
    const r = run(tool.command);
    if (r.code !== 0 || !String(r.stdout ?? '').trim()) continue;
    for (const [port, pid] of tool.parse(r.stdout, wanted))
      if (!owners.has(port)) owners.set(port, { pid, tool: tool.command });
  }
  return owners;
}

export async function portsInUse(
  ports,
  { host = '127.0.0.1', probe = probePort, name = namePortOwners } = {},
) {
  const rows = [];
  for (const entry of ports ?? []) {
    const port = portOf(entry);
    const verdict = await probe(port, host);
    if (!verdict.inUse) continue;
    const row = { port, pid: null, tool: null, reason: verdict.reason ?? 'in use' };
    if (entry && typeof entry === 'object' && entry.service) row.service = entry.service;
    rows.push(row);
  }
  if (!rows.length) return [];
  // Only now, and only to put a name to what the bind already proved.
  const owners = name(
    rows.map((r) => r.port),
    {},
  );
  for (const row of rows) {
    const owner = owners.get(row.port);
    if (owner) {
      row.pid = owner.pid ?? null;
      row.tool = owner.tool ?? null;
    }
  }
  return rows.sort((a, b) => a.port - b.port);
}
