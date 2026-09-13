/**
 * Where Elasticsearch is, and how to authenticate to it.
 *
 * Elasticsearch runs with `xpack.security.enabled=true` (AUD2-075), so every
 * request needs credentials. The conventional way to carry them is userinfo in
 * the URL — `http://elastic:<password>@elasticsearch:9200` — which is what the
 * Compose stack and `compose.services.yml` hand to the service in
 * `ELASTICSEARCH_NODE`.
 *
 * Node's `fetch` cannot take that URL. It does not ignore the credentials, it
 * throws before the request is made:
 *
 *   TypeError: Request cannot be constructed from a URL that includes
 *   credentials: http://elastic:…@localhost:9200/_cluster/health
 *
 * Every call here goes through `fetch`, so wiring the documented URL in without
 * this would not have degraded search — it would have thrown on the first call
 * and left the service permanently on its Redis fallback, reporting
 * `elasticsearch: unavailable` while a perfectly healthy cluster sat next to it.
 *
 * So: split the URL once. `origin` is what a request is built from, and
 * `authHeaders` is the Basic header the userinfo becomes. Separate
 * ELASTICSEARCH_USERNAME / ELASTICSEARCH_PASSWORD variables are honoured too,
 * for a deployment that would rather not put a password in a URL at all; the
 * URL's own userinfo wins when both are given.
 */
export interface ElasticsearchEndpoint {
  /** The node URL with any credentials removed, and no trailing slash. Safe to log. */
  readonly origin: string;
  /** `{ Authorization: 'Basic …' }`, or empty when no credentials are configured. */
  readonly authHeaders: Readonly<Record<string, string>>;
}

const DEFAULT_NODE = 'http://localhost:9200';

/**
 * Why the local default is a production failure.
 *
 * It is the right answer for a developer running one service on their own
 * machine. In a container it is a lie with no symptom: localhost is the
 * container, every request is refused, and search falls back to Redis for ever
 * while reporting a cluster that was never addressed. The manifests deployed
 * search-service with no Elasticsearch anywhere in them (AUD2-029), so this was
 * the live configuration rather than a hypothetical — and the fallback is good
 * enough that nobody would have noticed.
 *
 * So in production it throws, naming the variable, at construction. Degrading
 * to Redis stays the behaviour for a cluster that is configured and down; it is
 * not the behaviour for one that was never configured at all.
 */
function refuseLocalDefault(env: NodeJS.ProcessEnv, reason: string): void {
  if (env.NODE_ENV !== 'production') return;
  throw new Error(
    `ELASTICSEARCH_NODE ${reason}. Refusing to start in production rather than falling back ` +
      `to ${DEFAULT_NODE}, which inside a container is the container. infra/k8s/config.yaml ` +
      'and the generated Deployment assemble it from ELASTICSEARCH_HOST and the Secret.',
  );
}

export function resolveElasticsearchEndpoint(
  env: NodeJS.ProcessEnv = process.env,
): ElasticsearchEndpoint {
  if (!env.ELASTICSEARCH_NODE?.trim()) refuseLocalDefault(env, 'is not set');
  const raw = env.ELASTICSEARCH_NODE?.trim() || DEFAULT_NODE;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // An unparseable value is a configuration error, but throwing here would
    // take the whole service down at construction. Fall back to the local
    // default and let the connection check report the cluster as unavailable —
    // outside production, where that fallback is the failure itself.
    refuseLocalDefault(env, `is not a URL (${JSON.stringify(raw)})`);
    return { origin: DEFAULT_NODE, authHeaders: {} };
  }

  const username = url.username
    ? decodeURIComponent(url.username)
    : (env.ELASTICSEARCH_USERNAME ?? '');
  const password = url.password
    ? decodeURIComponent(url.password)
    : (env.ELASTICSEARCH_PASSWORD ?? '');

  url.username = '';
  url.password = '';
  // `new URL('http://h:9200').toString()` appends a slash; every call site
  // builds `${origin}/path`, so strip it rather than emit `//path`.
  const origin = url.toString().replace(/\/$/, '');

  // Both or neither. A password with no username would otherwise be sent as
  // `Basic base64(":password")` — a header that is always rejected, turning a
  // half-finished configuration into "Elasticsearch is down" rather than
  // "Elasticsearch has no credentials configured". Sending nothing gets the
  // same 401 from a secured cluster, but keeps working against an unsecured
  // one, which is what a half-set variable most often means.
  if (!username || !password) return { origin, authHeaders: {} };

  const basic = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
  return { origin, authHeaders: { Authorization: `Basic ${basic}` } };
}
