/**
 * Order Tools — Checkout, Tracking, History, Cancel
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KartseekClient } from '../client.js';

export function registerOrderTools(server: McpServer, client: KartseekClient) {
  server.tool(
    'order_checkout',
    'Place a new order. Validates cart, applies coupon/wallet deductions, emits order.created event, and returns order ID + payment token.',
    {
      items: z.array(z.object({
        productId: z.string().describe('Product ID'),
        quantity: z.number().describe('Quantity'),
        price: z.number().optional().describe('Unit price'),
      })).describe('Items to order'),
      totalAmount: z.number().optional().describe('Total payable amount'),
      couponCode: z.string().optional().describe('Coupon code to apply'),
      paymentMethod: z.string().optional().describe('Payment method (wallet, card, upi, cod)'),
      deliveryAddressId: z.string().optional().describe('Delivery address ID'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...body }) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: '/orders/checkout',
          body,
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Checkout failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'order_tracking',
    'Get live order tracking — status, driver location, ETA, and full timeline.',
    {
      orderId: z.string().describe('Order ID (e.g. ORD-1685451234-4291)'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ orderId, authToken }) => {
      try {
        const data = await client.request({ path: `/orders/${orderId}/tracking`, authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'order_history',
    'Get order history for the authenticated user.',
    {
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Items per page'),
      status: z.string().optional().describe('Filter by status (pending, confirmed, delivered, cancelled)'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...query }) => {
      try {
        const data = await client.request({
          path: '/orders/history',
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
    'order_cancel',
    'Cancel an existing order.',
    {
      orderId: z.string().describe('Order ID to cancel'),
      reason: z.string().optional().describe('Cancellation reason'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ orderId, reason, authToken }) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: `/orders/${orderId}/cancel`,
          body: { reason },
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Cancellation failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
