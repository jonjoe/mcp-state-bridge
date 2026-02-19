# state-bridge-mcp — Architecture Reference

## Overview

A standalone npm package that bridges Zustand stores to MCP-capable AI tools over WebSocket. Two sub-path exports from one package:

- `state-bridge-mcp/server` — MCP server binary (Node.js, `ws`, `@modelcontextprotocol/sdk`)
- `state-bridge-mcp/client` — Client SDK (platform-native WebSocket, zero Node deps)

Extracted from Yggdrasil's `services/huginn-state/` (server) and `apps/huginn/src/dev/state-bridge.ts` (client).

## Data Flow

```
┌─────────────┐   WebSocket   ┌──────────────┐   stdio   ┌──────────┐
│  Any App    │──────────────▶│  MCP Server  │◀─────────▶│  Claude  │
│  (client)   │◀──────────────│  (server)    │           │          │
└─────────────┘               └──────────────┘           └──────────┘
```

5 MCP tools: `connection_status`, `list_stores`, `get_state`, `set_state`, `call_action`

## Project Structure

```
state-bridge-mcp/
├── src/
│   ├── shared/types.ts          # Wire protocol (BridgeRequest/Response) + config types
│   ├── server/
│   │   ├── connection.ts        # createConnection(config) factory — WS server
│   │   └── index.ts             # MCP server binary + CLI arg parsing (--port)
│   └── client/
│       ├── utils.ts             # stripFunctions, resolve, deepSet
│       ├── handlers.ts          # Pure handler functions (list/get/set/call)
│       └── index.ts             # createStateBridge(config) factory
├── skill/                       # Claude Code skill (symlinked to ~/.claude/skills/)
├── tsup.config.ts               # Dual entry — server gets shebang, client doesn't
├── tsconfig.json
├── package.json
└── README.md
```

## Key Patterns

- **Factory pattern** — `createConnection(config)` on server, `createStateBridge(config)` on client. No module singletons.
- **`deepSet`** — Immutable recursive path setter, arbitrary depth.
- **Port precedence**: `--port` CLI arg → `STATE_BRIDGE_PORT` env → `8098` default.
- **Client auto-reconnects** on disconnect (configurable interval, `0` to disable).
- **`stop()` method** on client handle for clean teardown.

## Build

- **Toolchain**: tsup (dual entry)
- **Output**: `dist/server/index.js` (bin with shebang), `dist/client/index.js` (lib)
- **Types**: `dist/server/index.d.ts`, `dist/client/index.d.ts`

```bash
cd ~/Projects/state-bridge-mcp
npm run build        # tsup → dist/server/index.js + dist/client/index.js
npm run type-check   # tsc --noEmit
npm run dev          # tsup --watch
```

## Consumer API

**Server** (`.mcp.json`):
```json
{
  "mcpServers": {
    "app-state": {
      "command": "npx",
      "args": ["state-bridge-mcp"]
    }
  }
}
```

**Client** (any Zustand app):
```typescript
import { createStateBridge } from 'state-bridge-mcp/client';

const bridge = createStateBridge({
  stores: { session: useSessionStore, app: useAppStore },
  url: 'ws://10.0.2.2:8098',
});
```

## Rules

- **Public npm package** — no Yggdrasil-specific references in code or docs.
- `zustand` is a **peer dependency** (optional) — only needs duck-typed `getState()`/`setState()`.
- Server deps (`ws`, `@modelcontextprotocol/sdk`, `zod`) stay as regular deps (CLI binary).
- Client must remain **zero-Node-dep** — works in React Native, browser, and Node.
