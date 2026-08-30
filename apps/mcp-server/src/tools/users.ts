/**
 * User Tools — Profiles, Addresses, Partner management
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KartseekClient } from '../client.js';

export function registerUserTools(server: McpServer, client: KartseekClient) {
  server.tool(
    'user_get_profile',
    'Get a user profile by user ID.',
    {
      userId: z.string().describe('User ID (e.g. USR-001)'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ userId, authToken }) => {
      try {
        const data = await client.request({ path: `/users/${userId}/profile`, authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'user_update_profile',
    'Update a user profile.',
    {
      userId: z.string().describe('User ID'),
      name: z.string().optional().describe('Full name'),
      email: z.string().optional().describe('Email'),
      phone: z.string().optional().describe('Phone number'),
      avatar: z.string().optional().describe('Avatar URL'),
      address: z.string().optional().describe('Default address'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ userId, authToken, ...body }) => {
      try {
        const data = await client.request({
          method: 'PUT',
          path: `/users/${userId}/profile`,
          body,
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'user_get_addresses',
    'Get all saved addresses for a user.',
    {
      userId: z.string().describe('User ID'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ userId, authToken }) => {
      try {
        const data = await client.request({ path: `/users/${userId}/addresses`, authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'user_add_address',
    'Add a new saved address for a user.',
    {
      userId: z.string().describe('User ID'),
      label: z.string().describe('Address label (e.g. Home, Work)'),
      address: z.string().describe('Full address text'),
      lat: z.number().optional().describe('Latitude'),
      lng: z.number().optional().describe('Longitude'),
      type: z.string().optional().describe('Address type (home, work, other)'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ userId, authToken, ...body }) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: `/users/${userId}/addresses`,
          body,
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'user_delete_address',
    'Delete a saved address.',
    {
      userId: z.string().describe('User ID'),
      addressId: z.string().describe('Address ID to delete'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ userId, addressId, authToken }) => {
      try {
        const data = await client.request({
          method: 'DELETE',
          path: `/users/${userId}/addresses/${addressId}`,
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
