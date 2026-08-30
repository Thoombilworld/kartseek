/**
 * Loyalty Tools — Points, Preview, Redeem, Order Points
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KartseekClient } from '../client.js';

export function registerLoyaltyTools(server: McpServer, client: KartseekClient) {
  // NOTE: The loyalty controller uses path prefix "api/loyalty" (extra api/ prefix),
  // but the global prefix is already "api" with version "v1", so the full path
  // from the gateway is /api/v1/api/loyalty/... — we match that here.
  // If the controller path changes to just "loyalty", update paths below.

  server.tool(
    'loyalty_points',
    'Get current loyalty points and tier for the authenticated user.',
    {
      authToken: z.string().describe('JWT auth token (required — points are user-specific)'),
    },
    async ({ authToken }) => {
      try {
        const data = await client.request({ path: '/api/loyalty/points', authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'loyalty_preview',
    'Preview how many loyalty points would be earned for a given order total.',
    {
      orderTotal: z.number().describe('Order total amount'),
      authToken: z.string().describe('JWT auth token'),
    },
    async ({ orderTotal, authToken }) => {
      try {
        const data = await client.request({
          path: '/api/loyalty/preview',
          query: { orderTotal },
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'loyalty_redeem',
    'Redeem loyalty points for a discount.',
    {
      points: z.number().min(1).describe('Number of points to redeem'),
      authToken: z.string().describe('JWT auth token'),
    },
    async ({ points, authToken }) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: '/api/loyalty/redeem',
          body: { points },
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Redemption failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'loyalty_order_points',
    'Get loyalty points awarded for a specific order.',
    {
      orderId: z.string().describe('Order ID (e.g. ORD-1234)'),
      authToken: z.string().describe('JWT auth token'),
    },
    async ({ orderId, authToken }) => {
      try {
        const data = await client.request({ path: `/api/loyalty/order/${orderId}`, authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
