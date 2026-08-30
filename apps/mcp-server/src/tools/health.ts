/**
 * Health Tools — Liveness, Readiness, Metrics, Service Catalog
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { KartseekClient } from '../client.js';

export function registerHealthTools(server: McpServer, client: KartseekClient) {
  server.tool(
    'health_check',
    'API Gateway liveness probe — returns 200 if the process is running, includes uptime and node version.',
    {},
    async () => {
      try {
        const data = await client.request({ path: '/health' });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Health check failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'health_readiness',
    'Readiness probe — checks all infrastructure dependencies (Redis, Kafka, PostgreSQL).',
    {},
    async () => {
      try {
        const data = await client.request({ path: '/health/ready' });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Readiness check failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'health_metrics',
    'Get runtime memory and CPU metrics for the API Gateway.',
    {},
    async () => {
      try {
        const data = await client.request({ path: '/health/metrics' });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Metrics failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'health_services',
    'Get the catalog of all 27 configured microservices with their ports and protocols.',
    {},
    async () => {
      try {
        const data = await client.request({ path: '/health/services' });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Service catalog failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
