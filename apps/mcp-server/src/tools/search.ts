/**
 * Search Tools — Global cross-module search
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KartseekClient } from '../client.js';

export function registerSearchTools(server: McpServer, client: KartseekClient) {
  server.tool(
    'global_search',
    'Search across all KARTSEEK modules — Marketplace, Grocery, Restaurant, Pharmacy, Doctor. Returns GPS-filtered, Elasticsearch-backed results.',
    {
      query: z.string().describe('Search query (e.g. "apple" returns iPhone, Fresh Apples, Apple Pie)'),
      module: z.enum(['all', 'marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor']).optional()
        .describe('Limit search to a specific module (default: all)'),
      lat: z.number().optional().describe('Latitude for location-based filtering'),
      lng: z.number().optional().describe('Longitude for location-based filtering'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Items per page'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ query: q, authToken, ...rest }) => {
      try {
        const data = await client.request({
          path: '/search',
          query: { q, ...rest } as Record<string, string | number | boolean | undefined>,
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Search failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
