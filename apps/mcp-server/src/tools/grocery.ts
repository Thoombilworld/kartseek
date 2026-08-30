/**
 * Grocery Tools — Categories, Stores, Products, Orders
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KartseekClient } from '../client.js';

export function registerGroceryTools(server: McpServer, client: KartseekClient) {
  server.tool(
    'grocery_categories',
    'List all active grocery categories.',
    {
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken }) => {
      try {
        const data = await client.request({ path: '/grocery/categories', authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'grocery_stores',
    'List nearby grocery stores filtered by GPS location (10km radius).',
    {
      lat: z.number().optional().describe('Latitude'),
      lng: z.number().optional().describe('Longitude'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Items per page'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...query }) => {
      try {
        const data = await client.request({
          path: '/grocery/stores',
          query: query as Record<string, string | number | boolean | undefined>,
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'grocery_products',
    'Browse grocery store inventory with category and search filters.',
    {
      storeId: z.string().optional().describe('Store ID to browse'),
      category: z.string().optional().describe('Category slug'),
      search: z.string().optional().describe('Search keyword'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Items per page'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...query }) => {
      try {
        const data = await client.request({
          path: '/grocery/products',
          query: query as Record<string, string | number | boolean | undefined>,
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'grocery_place_order',
    'Place a grocery order with delivery slot selection.',
    {
      storeId: z.string().describe('Grocery store ID'),
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.number(),
      })).describe('Items to order'),
      deliverySlot: z.string().optional().describe('Delivery slot (e.g. "10:00-12:00")'),
      addressId: z.string().optional().describe('Delivery address ID'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...body }) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: '/grocery/orders',
          body,
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Order failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
