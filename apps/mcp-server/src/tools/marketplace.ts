/**
 * Marketplace Tools — Home feed, Categories, Products, Cart
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KartseekClient } from '../client.js';

export function registerMarketplaceTools(server: McpServer, client: KartseekClient) {
  server.tool(
    'marketplace_home',
    'Get the marketplace home feed (banners, flash deals, categories, top brands). Cached 120s.',
    {
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken }) => {
      try {
        const data = await client.request({ path: '/marketplace/home', authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'marketplace_categories',
    'List all product categories with parent/child relationships and product counts.',
    {
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken }) => {
      try {
        const data = await client.request({ path: '/marketplace/categories', authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'marketplace_products',
    'Search and filter marketplace products.',
    {
      category: z.string().optional().describe('Category slug to filter by'),
      brand: z.string().optional().describe('Brand name to filter by'),
      minPrice: z.number().optional().describe('Minimum price'),
      maxPrice: z.number().optional().describe('Maximum price'),
      search: z.string().optional().describe('Search keyword'),
      sortBy: z.string().optional().describe('Sort field (price, rating, newest)'),
      page: z.number().optional().describe('Page number (default 1)'),
      limit: z.number().optional().describe('Items per page (default 20)'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...query }) => {
      try {
        const data = await client.request({
          path: '/marketplace/products',
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
    'marketplace_product_detail',
    'Get detailed information for a specific product by ID.',
    {
      productId: z.string().describe('Product ID (e.g. PRD-001)'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ productId, authToken }) => {
      try {
        const data = await client.request({ path: `/marketplace/products/${productId}`, authToken });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'marketplace_add_to_cart',
    'Add a product to the shopping cart.',
    {
      productId: z.string().describe('Product ID to add'),
      quantity: z.number().min(1).describe('Quantity to add'),
      variantId: z.string().optional().describe('Product variant ID (size, color, etc.)'),
      authToken: z.string().optional().describe('JWT auth token'),
    },
    async ({ authToken, ...body }) => {
      try {
        const data = await client.request({
          method: 'POST',
          path: '/marketplace/cart',
          body,
          authToken,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
