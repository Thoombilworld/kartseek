/**
 * Restaurant Tools — Discovery, Menu, Orders, Table Booking
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KartseekClient } from '../client.js';

export function registerRestaurantTools(server: McpServer, client: KartseekClient) {
  server.tool(
    'restaurant_list',
    'List nearby restaurants with filters for cuisine, rating, open status, and sorting.',
    {
      cuisine: z.string().optional().describe('Cuisine filter (e.g. biryani, pizza)'),
      minRating: z.number().optional().describe('Minimum rating filter'),
      isOpen: z.boolean().optional().describe('Filter only open restaurants'),
      sortBy: z.enum(['rating', 'distance', 'popularity', 'deliveryTime']).optional().describe('Sort field'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Items per page'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...query }) => {
      try {
        const data = await client.request({
          path: '/restaurants',
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
    'restaurant_detail',
    'Get detailed information for a specific restaurant.',
    {
      restaurantId: z.string().describe('Restaurant ID'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ restaurantId, authToken }) => {
      try {
        const data = await client.request({ path: `/restaurants/${restaurantId}`, authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'restaurant_menu',
    'Fetch the menu for a restaurant including modifiers and add-ons.',
    {
      restaurantId: z.string().describe('Restaurant ID'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ restaurantId, authToken }) => {
      try {
        const data = await client.request({ path: `/restaurants/${restaurantId}/menu`, authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'restaurant_place_order',
    'Place a food order from a restaurant.',
    {
      restaurantId: z.string().describe('Restaurant ID'),
      items: z.array(z.object({
        menuItemId: z.string(),
        quantity: z.number(),
        modifiers: z.array(z.string()).optional(),
      })).describe('Menu items to order'),
      orderType: z.enum(['delivery', 'takeaway']).optional().describe('Order type (default: delivery)'),
      addressId: z.string().optional().describe('Delivery address ID'),
      specialInstructions: z.string().optional().describe('Special instructions for the kitchen'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...body }) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: '/restaurants/orders',
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
