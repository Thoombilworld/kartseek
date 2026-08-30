/**
 * Pharmacy Tools — Home, Stores, Products, Prescriptions, Orders
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KartseekClient } from '../client.js';

export function registerPharmacyTools(server: McpServer, client: KartseekClient) {
  server.tool(
    'pharmacy_home',
    'Get pharmacy home screen data — featured stores, categories, and promotions.',
    {
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken }) => {
      try {
        const data = await client.request({ path: '/pharmacy/home', authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'pharmacy_stores',
    'List nearby pharmacies with optional 24hr and location filters.',
    {
      search: z.string().optional().describe('Search pharmacy name'),
      is24hr: z.boolean().optional().describe('Filter 24-hour pharmacies only'),
      lat: z.number().optional().describe('Latitude'),
      lng: z.number().optional().describe('Longitude'),
      radius: z.number().optional().describe('Search radius in km'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Items per page'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...query }) => {
      try {
        const data = await client.request({
          path: '/pharmacy/stores',
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
    'pharmacy_products',
    'Browse OTC pharmacy products.',
    {
      storeId: z.string().optional().describe('Pharmacy store ID'),
      category: z.string().optional().describe('Category filter'),
      search: z.string().optional().describe('Search keyword'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Items per page'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...query }) => {
      try {
        const data = await client.request({
          path: '/pharmacy/products',
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
    'pharmacy_place_order',
    'Place a pharmacy order with optional prescription validation.',
    {
      storeId: z.string().describe('Pharmacy store ID'),
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.number(),
      })).describe('Items to order'),
      prescriptionId: z.string().optional().describe('Prescription ID (required for RX drugs)'),
      addressId: z.string().optional().describe('Delivery address ID'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...body }) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: '/pharmacy/orders',
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
