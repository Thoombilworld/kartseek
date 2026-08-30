/**
 * Auth Tools — Login, Register, Status
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KartseekClient } from '../client.js';

export function registerAuthTools(server: McpServer, client: KartseekClient) {
  server.tool(
    'auth_login',
    'Login with email and password. Returns JWT access token + refresh token.',
    {
      email: z.string().email().describe('User email address'),
      password: z.string().describe('User password'),
    },
    async ({ email, password }) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: '/auth/login',
          body: { email, password },
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Login failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'auth_register',
    'Register a new user account.',
    {
      name: z.string().describe('Full name'),
      email: z.string().email().describe('Email address'),
      password: z.string().min(6).describe('Password (min 6 chars)'),
      phone: z.string().optional().describe('Phone number'),
      role: z.enum(['CUSTOMER', 'SELLER', 'DRIVER']).optional().describe('User role (defaults to CUSTOMER)'),
    },
    async (params) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: '/auth/register',
          body: params,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Registration failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'auth_status',
    'Check auth service health status.',
    {},
    async () => {
      try {
        const data = await client.request({ path: '/auth/status' });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Health check failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
