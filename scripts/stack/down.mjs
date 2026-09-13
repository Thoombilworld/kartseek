#!/usr/bin/env node
/**
 * Stop and remove the APPLICATION tier — and only that.
 *
 *   npm run stack:down
 *
 * ── Why this is not `docker compose down` ────────────────────────────────────
 *
 * Profiles gate `up`, not `down`. `docker compose --profile admin --profile full
 * down` is project-wide: it removes Postgres, Redis, Kafka, MongoDB,
 * Elasticsearch, nginx and the `kartseek-network` along with the 35 application
 * containers, because they are all one Compose project. A `--dry-run` of the
 * previous one-line script listed exactly that.
 *
 * That is the wrong shape for this stack. `npm run infra:up` has to run FIRST —
 * it creates the network and the 166 Kafka topics — so a developer who brings
 * the application tier down between two `stack:up:admin` runs would silently
 * lose the datastores and have to start over, with data in the volumes but no
 * containers to serve it.
 *
 * So this names the services instead. The list comes from `services.yaml`, the
 * same registry that generates `infra/docker/compose.services.yml`, so a new
 * deployable is torn down by this script the moment it is added to the registry
 * — there is no second list to keep in step.
 *
 * To take the infrastructure down as well, that is `npm run infra:down`, and it
 * says so on the tin.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry, repoRoot } from '../registry/lib.mjs';

/**
 * `docker <these>`. Both profiles, because a service carrying `profiles:` is
 * invisible to Compose without one of its profiles enabled — naming it would be
 * "no such service". `rm -s` stops before removing; `-f` skips the prompt.
 */
export function downArgs(reg) {
  const names = reg.services.map((s) => s.name);
  return [
    'compose',
    '--profile',
    'admin',
    '--profile',
    'full',
    'rm',
    '--stop',
    '--force',
    ...names,
  ];
}

function main() {
  const reg = loadRegistry();
  const args = downArgs(reg);
  console.log(`stack:down: removing ${reg.services.length} application containers.`);
  console.log('stack:down: the infrastructure tier stays up — `npm run infra:down` takes it down.');
  const r = spawnSync('docker', args, { cwd: repoRoot(), stdio: 'inherit', shell: false });
  if (r.error) {
    console.error(`stack:down: could not run docker — ${r.error.message}`);
    process.exit(1);
  }
  process.exit(r.status ?? 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
