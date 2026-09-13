import { describe, expect, it } from 'vitest';
import { resolveElasticsearchEndpoint } from './elasticsearch-endpoint';

describe('resolveElasticsearchEndpoint', () => {
  it('splits userinfo out of the node URL into a Basic header', () => {
    const { origin, authHeaders } = resolveElasticsearchEndpoint({
      ELASTICSEARCH_NODE: 'http://elastic:s3cret@elasticsearch:9200',
    } as NodeJS.ProcessEnv);

    expect(origin).toBe('http://elasticsearch:9200');
    expect(authHeaders).toEqual({
      Authorization: `Basic ${Buffer.from('elastic:s3cret').toString('base64')}`,
    });
  });

  it('leaves an origin `fetch` can actually build a Request from', () => {
    // The whole reason this module exists: Node's fetch throws outright on a
    // URL that carries credentials, so a service handed the documented
    // `http://elastic:…@host:9200` would never reach Elasticsearch at all.
    const raw = 'http://elastic:s3cret@elasticsearch:9200';
    expect(() => new Request(`${raw}/_cluster/health`)).toThrow(/credentials/i);

    const { origin } = resolveElasticsearchEndpoint({
      ELASTICSEARCH_NODE: raw,
    } as NodeJS.ProcessEnv);
    expect(() => new Request(`${origin}/_cluster/health`)).not.toThrow();
  });

  it('never leaves a trailing slash for call sites that append a path', () => {
    const { origin } = resolveElasticsearchEndpoint({
      ELASTICSEARCH_NODE: 'http://elasticsearch:9200/',
    } as NodeJS.ProcessEnv);
    expect(origin).toBe('http://elasticsearch:9200');
    expect(`${origin}/_cluster/health`).toBe('http://elasticsearch:9200/_cluster/health');
  });

  it('accepts separate username and password variables', () => {
    const { origin, authHeaders } = resolveElasticsearchEndpoint({
      ELASTICSEARCH_NODE: 'http://elasticsearch:9200',
      ELASTICSEARCH_USERNAME: 'elastic',
      ELASTICSEARCH_PASSWORD: 's3cret',
    } as NodeJS.ProcessEnv);

    expect(origin).toBe('http://elasticsearch:9200');
    expect(authHeaders.Authorization).toBe(
      `Basic ${Buffer.from('elastic:s3cret').toString('base64')}`,
    );
  });

  it("prefers the URL's own credentials when both forms are present", () => {
    const { authHeaders } = resolveElasticsearchEndpoint({
      ELASTICSEARCH_NODE: 'http://from_url:url_pw@elasticsearch:9200',
      ELASTICSEARCH_USERNAME: 'from_var',
      ELASTICSEARCH_PASSWORD: 'var_pw',
    } as NodeJS.ProcessEnv);

    expect(authHeaders.Authorization).toBe(
      `Basic ${Buffer.from('from_url:url_pw').toString('base64')}`,
    );
  });

  it('decodes percent-encoded credentials', () => {
    // A generated password can contain `@` or `/`, which have to be encoded in
    // userinfo; sending the encoded form as the password would 401.
    const password = 'p@ss/word';
    const { authHeaders } = resolveElasticsearchEndpoint({
      ELASTICSEARCH_NODE: `http://elastic:${encodeURIComponent(password)}@elasticsearch:9200`,
    } as NodeJS.ProcessEnv);

    expect(authHeaders.Authorization).toBe(
      `Basic ${Buffer.from(`elastic:${password}`).toString('base64')}`,
    );
  });

  it('sends no Authorization header when nothing is configured', () => {
    const { origin, authHeaders } = resolveElasticsearchEndpoint({} as NodeJS.ProcessEnv);
    expect(origin).toBe('http://localhost:9200');
    expect(authHeaders).toEqual({});
  });

  it('falls back to the local default rather than throwing on an unparseable value', () => {
    const { origin } = resolveElasticsearchEndpoint({
      ELASTICSEARCH_NODE: 'not a url',
    } as NodeJS.ProcessEnv);
    expect(origin).toBe('http://localhost:9200');
  });
});
