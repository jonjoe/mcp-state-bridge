# state-bridge-mcp

## What Is This?

A standalone npm package that bridges Zustand stores to MCP-capable AI tools over WebSocket. Two sub-path exports from one package:

- `state-bridge-mcp/server` — MCP server binary (Node.js, ws, @modelcontextprotocol/sdk)
- `state-bridge-mcp/client` — Client SDK (platform-native WebSocket, zero Node deps)

**Repo**: `github.com/jonjoe/mcp-state-bridge`
**Path**: `~/Projects/state-bridge-mcp`
**Extracted from**: Yggdrasil's `services/huginn-state/` + `apps/huginn/src/dev/state-bridge.ts`

## Architecture

```
┌─────────────┐   WebSocket   ┌──────────────┐   stdio   ┌──────────┐
│  Any App    │──────────────▶│  MCP Server  │◀─────────▶│  Claude  │
│  (client)   │◀──────────────│  (server)    │           │          │
└─────────────┘               └──────────────┘           └──────────┘
```

The server is an MCP binary launched by the AI host. The client runs inside the app and exposes Zustand stores. The AI gets 5 tools: `connection_status`, `list_stores`, `get_state`, `set_state`, `call_action`.

## Project Structure

```
src/
├── shared/types.ts          # Wire protocol + config types
├── server/
│   ├── connection.ts        # createConnection() factory — WS server
│   └── index.ts             # MCP server binary + CLI arg parsing
└── client/
    ├── utils.ts             # stripFunctions, resolve, deepSet
    ├── handlers.ts          # Pure handler functions (list/get/set/call)
    └── index.ts             # createStateBridge() factory
```

## Build

- **Toolchain**: tsup (dual entry — server gets shebang, client doesn't)
- **Output**: `dist/server/index.js` (bin), `dist/client/index.js` (lib)
- **Types**: `dist/server/index.d.ts`, `dist/client/index.d.ts`
- **Build**: `npm run build`
- **Type check**: `npm run type-check`

## Key Patterns

- **Factory pattern throughout** — `createConnection(config)` on server, `createStateBridge(config)` on client. No module singletons.
- **`deepSet` for arbitrary path depth** — immutable recursive setter, no 1-2 level limitation.
- **Port config precedence**: `--port` CLI arg → `STATE_BRIDGE_PORT` env → `8098` default.
- **Client auto-reconnects** on disconnect (configurable interval, 0 to disable).
- **`stop()` method** on client handle for clean teardown.

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

- This is a **public npm package** — no Yggdrasil-specific references in code or docs.
- `zustand` is a **peer dependency** (optional) — the client only needs the duck-typed `getState()`/`setState()` interface.
- Server deps (`ws`, `@modelcontextprotocol/sdk`, `zod`) must stay as regular dependencies since it's a CLI binary.
- Keep the client zero-Node-dep — it must work in React Native, browser, and Node.
