/**
 * Is a TCP port already taken on this host?
 *
 *   import { portsInUse } from '../lib/ports.mjs';
 *   const busy = await portsInUse([3001, 3000]);
 *   //  → [{ port: 3001, host: '0.0.0.0', pid: '24680',
 *   //       tool: 'netstat -ano', reason: 'EADDRINUSE' }]
 *
 * Run it directly to sweep every port the registry declares:
 *
 *   npm run ports:sweep                    # the registry's own ports
 *   npm run ports:sweep -- --offset 10000  # a SMOKE_PORT_OFFSET run's ports
 *
 * ── The contract ────────────────────────────────────────────────────────────
 *
 * `portsInUse(ports, { hosts, host, probe, name, sort })` resolves to one row
 * per port that is **not** bindable, `[]` when every port is free:
 *
 *   { port: number, host: string, pid: string | null, tool: string | null,
 *     reason: string, service?: string, kind?: string }
 *
 * `ports` may be plain numbers or `{ port, service, kind }` objects; `service`
 * and `kind` are carried through untouched so a caller can say which of its
 * services wanted the port and for what transport. `host` names the address the
 * conflict was found on. `pid` and `tool` are `null` when nothing on this
 * machine could name the owner — which is information, never permission to
 * continue.
 *
 * ── Why three addresses, not one ────────────────────────────────────────────
 *
 * `hosts` defaults to PROBE_HOSTS — `127.0.0.1`, `0.0.0.0`, `::` — because one
 * address is not enough on Windows, measured against this repo's own dev fleet:
 *
 *   127.0.0.1  3001,3012,3020
 *   0.0.0.0    4002,4004,4028,5001,5002
 *   ::         3010,3011
 *
 * Three different answers for one fleet. A bind to `127.0.0.1:4002` succeeds
 * while marketplace-service holds `0.0.0.0:4002`, so a loopback-only sweep calls
 * every TCP-microservice and gRPC port free and the caller then watches its
 * children die of EADDRINUSE. Reading the tool instead is wrong in the other
 * direction: a dual-stack `::` socket shows up in `netstat` as an `0.0.0.0` row
 * it does not actually reserve.
 *
 * EADDRINUSE on any address is busy. Another error code counts only on the
 * first address, where every service either binds or connects: an EACCES there
 * is not "in use", but it is not "and therefore the caller will bind it"
 * either. A caller that publishes on one specific address passes it as `host`;
 * it is probed first, and the other defaults still follow it.
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
 * It probes every address a listener could be hiding on, because a listener on
 * one specific interface does not stop a bind on another — see above.
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
import { pathToFileURL } from 'node:url';

/**
 * Bind addresses every sweep tries, loopback first.
 *
 * First is the address where a non-EADDRINUSE refusal still counts; the rest
 * catch the wildcard and dual-stack listeners a single probe walks straight
 * past. See the header for the measurement that put all three here.
 */
export const PROBE_HOSTS = ['127.0.0.1', '0.0.0.0', '::'];

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

/**
 * macOS's `netstat -anv -p tcp` lists listeners but ends its rows with socket
 * counters, not a PID — `parseColumnarOwners`' trailing-number rule would hand
 * back rxbytes as a process id and send someone to `kill` a number that means
 * nothing. It still proves *which* ports have a listener, so it stays as a
 * fallback that names no owner at all: `pid: null` is honest, a wrong PID is
 * not. (`lsof` ships with macOS, so this path is close to unreachable.)
 */
export function parseAddressesOnly(text, ports) {
  const found = new Map();
  for (const [port] of parseColumnarOwners(text, ports)) found.set(port, null);
  return found;
}

/**
 * The tools that can name a listener's owner, best first, per platform.
 *
 * `format` says how a row carries its PID, for callers that need every PID on a
 * port rather than the first owner of each: `columnar` is a bare trailing
 * number, `<pid>/<name>`, or `pid=N`; `lsof` puts it in the second column;
 * `addresses` carries none at all.
 *
 * None of these is guaranteed to exist. A machine with no `ss`, `netstat` or
 * `lsof` — a slim Debian or Alpine CI image without `iproute2` or `net-tools` —
 * can still say a port is taken, because the bind proves that; it just cannot
 * say by whom.
 */
export const OWNER_TOOLS = {
  win32: [{ command: 'netstat -ano', parse: parseColumnarOwners, format: 'columnar' }],
  linux: [
    { command: 'ss -ltnp', parse: parseColumnarOwners, format: 'columnar' },
    { command: 'netstat -tlnp', parse: parseColumnarOwners, format: 'columnar' },
    { command: 'lsof -nP -iTCP -sTCP:LISTEN', parse: parseLsofOwners, format: 'lsof' },
  ],
  darwin: [
    { command: 'lsof -nP -iTCP -sTCP:LISTEN', parse: parseLsofOwners, format: 'lsof' },
    { command: 'netstat -anv -p tcp', parse: parseAddressesOnly, format: 'addresses' },
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

/**
 * Every PID with a LISTENING socket on `port`, from one tool's output.
 *
 * `namePortOwners` above answers a different question — one owner per port, to
 * put a name next to a bind that already failed — and stops at the first match.
 * Proving that a socket belongs to a process you started needs all of them: on
 * Windows two processes can hold `127.0.0.1:P` and `[::]:P` separately, which is
 * the shape of the false pass this repo's smoke test was built to stop. The two
 * live next to each other so one tool's output is only ever parsed one way.
 */
export function listenerPidsFrom(text, port, { format = 'columnar' } = {}) {
  const lsof = format === 'lsof';
  const pids = new Set();
  if (format === 'addresses') return [];
  for (const line of String(text ?? '').split(/\r?\n/)) {
    if (lsof ? !/\(LISTEN\)/.test(line) : !/\bLISTEN(?:ING)?\b/.test(line)) continue;
    const cols = line.trim().split(/\s+/);
    const local = lsof
      ? cols.find((c, i) => i > 1 && /:\d+$/.test(c))
      : cols.find((c) => /:\d+$/.test(c));
    if (!local || Number(/:(\d+)$/.exec(local)[1]) !== Number(port)) continue;
    const pid = lsof
      ? /^\d+$/.test(cols[1])
        ? cols[1]
        : null
      : (/\bpid=(\d+)/.exec(line)?.[1] ??
        /(?:^|\s)(\d+)\/\S+\s*$/.exec(line)?.[1] ??
        /(?:^|\s)(\d+)\s*$/.exec(line)?.[1] ??
        null);
    if (pid) pids.add(Number(pid));
  }
  return [...pids];
}

/**
 * Ask this machine for every PID listening on `port`.
 *
 * `{ pids: [], tool: null }` means no tool could answer — either none is
 * installed or each exited non-zero. That is not "nobody is listening"; callers
 * that use this to prove ownership must treat it as a failure, not a pass.
 */
export function listenerPids(port, { platform = process.platform, run = shResult } = {}) {
  for (const tool of OWNER_TOOLS[platform] ?? OWNER_TOOLS.linux) {
    const r = run(tool.command);
    if (r.code !== 0 || !String(r.stdout ?? '').trim()) continue;
    const pids = listenerPidsFrom(r.stdout, port, { format: tool.format });
    if (pids.length) return { pids, tool: tool.command };
  }
  return { pids: [], tool: null };
}

/** Is any tool available at all to name a listener's owner on this machine? */
export function canNameOwners({ platform = process.platform, run = shResult } = {}) {
  return (OWNER_TOOLS[platform] ?? OWNER_TOOLS.linux).some((tool) => {
    const r = run(tool.command);
    return r.code === 0 && Boolean(String(r.stdout ?? '').trim());
  });
}

/**
 * The addresses to probe, given what the caller asked for.
 *
 * An explicit `hosts` wins outright. A caller that named one `host` — the
 * address it is about to publish on — gets it probed first and the remaining
 * defaults after it, so naming an address widens the sweep instead of narrowing
 * it to the single probe this helper used to do.
 */
export function probeHosts({ hosts, host } = {}) {
  if (hosts?.length) return [...hosts];
  if (!host) return [...PROBE_HOSTS];
  return [host, ...PROBE_HOSTS.filter((h) => h !== host)];
}

export async function portsInUse(
  ports,
  { hosts, host, probe = probePort, name = namePortOwners, sort = true } = {},
) {
  const addresses = probeHosts({ hosts, host });
  const rows = [];
  for (const entry of ports ?? []) {
    const port = portOf(entry);
    let hit = null;
    for (const address of addresses) {
      const verdict = await probe(port, address);
      if (!verdict.inUse) continue;
      // Anything other than EADDRINUSE counts only on the first address.
      if (verdict.reason === 'EADDRINUSE' || address === addresses[0]) {
        hit = { host: address, reason: verdict.reason ?? 'in use' };
        break;
      }
    }
    if (!hit) continue;
    const row = { port, host: hit.host, pid: null, tool: null, reason: hit.reason };
    if (entry && typeof entry === 'object') {
      if (entry.service) row.service = entry.service;
      if (entry.kind) row.kind = entry.kind;
    }
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
  return sort ? rows.sort((a, b) => a.port - b.port) : rows;
}

/** One line per busy port: address, who wanted it, who holds it, and why. */
export function formatPortRows(rows) {
  return rows
    .map((r) => {
      const who = r.service ? `${r.service}${r.kind ? ` (${r.kind})` : ''}` : '';
      const owner = r.pid ? `PID ${r.pid}${r.tool ? ` via ${r.tool}` : ''}` : 'PID unknown';
      return `  ${`${r.host}:${r.port}`.padEnd(22)} ${who.padEnd(30)} ${owner} [${r.reason}]`;
    })
    .join('\n');
}

/**
 * `npm run ports:sweep [-- --offset 10000]`
 *
 * What still holds a port this platform uses? The recovery tool for a smoke run
 * or a dev fleet that was killed and left children behind, and the reason
 * `docs/guides/running-services.md` no longer asks anyone to hand-type a port
 * list into PowerShell: the one it used to carry threw on its own array syntax
 * and printed nothing, which reads exactly like "all clear".
 *
 * The plan comes from `tests/smoke/boot-all.mjs`, deliberately: it is the one
 * definition of every port a fleet binds (http, tcp and gRPC, shifted by an
 * offset), so the sweep cannot drift from the thing it is sweeping up after.
 * Both modules are import-safe — neither runs anything unless it is the process
 * entry point — and the import is dynamic so this file stays a leaf for every
 * other caller.
 */
async function sweepMain(argv) {
  const raw =
    argv.find((a) => a.startsWith('--offset='))?.split('=')[1] ??
    argv[argv.indexOf('--offset') + 1];
  const offset = argv.some((a) => a.startsWith('--offset')) ? Number(raw) : 0;
  if (!Number.isInteger(offset) || offset < 0) {
    console.error(`ports:sweep: --offset must be a non-negative integer, got ${raw}`);
    return 2;
  }

  const [{ loadRegistry, nestEntries }, { portPlan }] = await Promise.all([
    import('../registry/lib.mjs'),
    import('../../tests/smoke/boot-all.mjs'),
  ]);
  const plan = portPlan(nestEntries(loadRegistry()), offset);

  console.log(
    `sweep: ${plan.length} port(s) from services.yaml` +
      (offset ? ` at offset ${offset} (registry port + ${offset})` : ' (registry ports)'),
  );
  const busy = await portsInUse(plan);
  if (!busy.length) {
    console.log('every port is free — nothing was left behind');
    return 0;
  }
  console.log(`\n${busy.length} port(s) still have a listener:\n\n${formatPortRows(busy)}\n`);
  console.log(
    '  A running `npm run dev` fleet holds all of them, which is not a leftover.\n' +
      '  Otherwise stop each owner — on Windows `taskkill /PID <pid> /T /F`, since a\n' +
      '  Nest process spawns workers; elsewhere `kill -TERM <pid>`, then -KILL.',
  );
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  sweepMain(process.argv.slice(2))
    .catch((err) => {
      // An unreadable registry must not exit 0 and read as "nothing is bound".
      console.error(`ports:sweep: ${err?.message ?? err}`);
      return 2;
    })
    .then((code) => process.exit(code));
