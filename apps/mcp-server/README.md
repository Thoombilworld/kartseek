# KARTSEEK MCP Server

## What this is

An MCP (Model Context Protocol) server that exposes KARTSEEK's REST API
gateway as a set of tools an AI agent can call — list marketplace products,
place an order, check a wallet balance — instead of the agent having to know
the gateway's HTTP contract itself. It speaks the stdio transport, for IDE
integrations such as VS Code or Cursor.

`apps/mcp-server` is **not** an npm workspace: the root `package.json`'s
`workspaces` list does not include it, and it ships its own
`package-lock.json`. That is deliberate — it depends only on the MCP SDK and
`zod`, an entirely different dependency set from the Nest/Next workspaces,
and it is not built by Turbo alongside them; `npm install` here installs
independently of the root install.

## Run

From `apps/mcp-server`:

- `npm install` (its own install, separate from the root).
- `npm run dev` — runs `src/index.ts` directly with `tsx`, no build step.
- `npm run build` — compiles with `tsc` to `dist/`.
- `npm start` — runs the compiled `dist/index.js`.

## Test

No test script is defined in `package.json` today.

## Configuration

Two environment variables, read by `KartseekClient`
(`src/client.ts`) and loaded from a local `.env` file if one exists next to
the package (falling back to the process environment otherwise):

- `KARTSEEK_API_URL` — the gateway's base URL, **including** the `/api/v1`
  prefix; defaults to the local gateway origin if unset.
- `KARTSEEK_AUTH_TOKEN` — a bearer token attached to every request as
  `Authorization: Bearer <token>`, unless a tool call overrides it with its
  own `authToken`. There is no login flow in this package — the token has to
  come from somewhere else (for example `auth-service`'s login endpoint).

## Layout

```
apps/mcp-server/
├── src/
│   ├── index.ts    # entry point: registers every tool module, connects stdio
│   ├── client.ts   # KartseekClient — the one HTTP client every tool uses
│   └── tools/       # one file per domain
└── package.json
```

`src/tools/` has one registration module per domain — `auth`, `users`,
`marketplace`, `orders`, `grocery`, `restaurant`, `taxi`, `wallet`,
`pharmacy`, `loyalty`, `search`, `health` — 12 modules totalling around 35
tools, each a thin wrapper that calls `KartseekClient.request()` with a
fixed path and forwards its arguments as the query, body, or both.
