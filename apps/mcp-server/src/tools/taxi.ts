/**
 * Taxi Tools — Fare Estimate, Request Ride, Ride Status
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KartseekClient } from '../client.js';

export function registerTaxiTools(server: McpServer, client: KartseekClient) {
  server.tool(
    'taxi_estimate',
    'Get a fare estimate for a ride with dynamic distance/surge calculations.',
    {
      pickupLat: z.number().describe('Pickup latitude'),
      pickupLng: z.number().describe('Pickup longitude'),
      dropLat: z.number().describe('Drop-off latitude'),
      dropLng: z.number().describe('Drop-off longitude'),
      vehicleType: z.enum(['economy', 'comfort', 'premium', 'bike', 'suv', 'delivery']).describe('Vehicle type'),
      zoneId: z.string().optional().describe('Fare zone ID (default: DEFAULT_ZONE)'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...body }) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: '/taxi/estimate',
          body,
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Estimate failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'taxi_request_ride',
    'Request a taxi ride. Matches a nearby driver and starts the ride lifecycle.',
    {
      pickupLat: z.number().describe('Pickup latitude'),
      pickupLng: z.number().describe('Pickup longitude'),
      dropLat: z.number().describe('Drop-off latitude'),
      dropLng: z.number().describe('Drop-off longitude'),
      vehicleType: z.enum(['economy', 'comfort', 'premium', 'bike', 'suv']).describe('Vehicle type'),
      pickupAddress: z.string().optional().describe('Pickup address text'),
      dropAddress: z.string().optional().describe('Drop-off address text'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...body }) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: '/taxi/rides',
          body,
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Ride request failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'taxi_ride_status',
    'Get the current status and details of a taxi ride.',
    {
      rideId: z.string().describe('Ride ID'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ rideId, authToken }) => {
      try {
        const data = await client.request({ path: `/taxi/rides/${rideId}`, authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'taxi_health',
    'Check taxi service health and database status.',
    {},
    async () => {
      try {
        const data = await client.request({ path: '/taxi/health' });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
