/**
 * Wallet Tools — Balance, Top-up, Transactions, Debit
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KartseekClient } from '../client.js';

export function registerWalletTools(server: McpServer, client: KartseekClient) {
  server.tool(
    'wallet_balance',
    'Get the wallet balance for a user.',
    {
      userId: z.string().describe('User ID (e.g. USR-001)'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ userId, authToken }) => {
      try {
        const data = await client.request({ path: `/wallet/${userId}/balance`, authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'wallet_topup',
    'Top up wallet balance.',
    {
      userId: z.string().describe('User ID'),
      amount: z.number().min(1).describe('Amount to add'),
      method: z.string().describe('Payment method (e.g. UPI, card)'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ userId, authToken, ...body }) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: `/wallet/${userId}/topup`,
          body,
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Top-up failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'wallet_transactions',
    'Get wallet transaction history.',
    {
      userId: z.string().describe('User ID'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Items per page'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ userId, authToken, page, limit }) => {
      try {
        const data = await client.request({
          path: `/wallet/${userId}/transactions`,
          query: { page, limit },
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
