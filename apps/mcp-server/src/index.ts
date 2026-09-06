#!/usr/bin/env node
/**
 * KARTSEEK MCP Server — Entry Point
 *
 * Exposes KARTSEEK REST API endpoints as MCP tools for AI agents.
 * Uses stdio transport for IDE integration (VS Code, Cursor, etc.)
 *
 * Usage:
 *   npx tsx src/index.ts          # Dev mode (no build)
 *   node dist/index.js            # Production (after `npm run build`)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { KartseekClient } from './client.js';

// Tool registration modules
import { registerAuthTools } from './tools/auth.js';
import { registerUserTools } from './tools/users.js';
import { registerMarketplaceTools } from './tools/marketplace.js';
import { registerOrderTools } from './tools/orders.js';
import { registerGroceryTools } from './tools/grocery.js';
import { registerRestaurantTools } from './tools/restaurant.js';
import { registerTaxiTools } from './tools/taxi.js';
import { registerWalletTools } from './tools/wallet.js';
import { registerPharmacyTools } from './tools/pharmacy.js';
import { registerLoyaltyTools } from './tools/loyalty.js';
import { registerSearchTools } from './tools/search.js';
import { registerHealthTools } from './tools/health.js';

// ── Load .env (for standalone runs outside of VS Code) ─────────────────────
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  // .env file not found — rely on environment variables
}

// ── Bootstrap ──────────────────────────────────────────────────────────────

async function main() {
  const server = new McpServer({
    name: 'kartseek-api',
    version: '1.0.0',
  });

  const client = new KartseekClient();

  // Register all tool modules
  registerAuthTools(server, client);
  registerUserTools(server, client);
  registerMarketplaceTools(server, client);
  registerOrderTools(server, client);
  registerGroceryTools(server, client);
  registerRestaurantTools(server, client);
  registerTaxiTools(server, client);
  registerWalletTools(server, client);
  registerPharmacyTools(server, client);
  registerLoyaltyTools(server, client);
  registerSearchTools(server, client);
  registerHealthTools(server, client);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP protocol)
  console.error('🚀 KARTSEEK MCP Server running on stdio');
  console.error(`   API URL: ${process.env.KARTSEEK_API_URL || 'http://localhost:3001/api/v1'}`);
  console.error(`   Tools registered: 12 modules, 45 tools`);
}

main().catch((err) => {
  console.error('Fatal error starting MCP server:', err);
  process.exit(1);
});
