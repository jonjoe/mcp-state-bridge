# state-bridge-mcp

MCP server + client SDK for bridging [Zustand](https://github.com/pmndrs/zustand) stores over WebSocket. Lets any MCP-capable AI inspect and manipulate your app's live state.

## How it works

```
┌─────────────┐   WebSocket   ┌──────────────┐   stdio   ┌──────────┐
│  Your App   │──────────────▶│  MCP Server  │◀─────────▶│  Claude  │
│  (client)   │◀──────────────│  (server)    │           │          │
└─────────────┘               └──────────────┘           └──────────┘
```

The **server** runs as an MCP server (launched by Claude, Cursor, etc.) and opens a WebSocket port. Your **app** connects as a client and exposes its Zustand stores. The AI can then list stores, read state, write state, and call actions.

## Installation

```bash
npm install state-bridge-mcp
```

## Server Setup

Add to your `.mcp.json` (or equivalent MCP config):

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

### Custom port

```json
{
  "mcpServers": {
    "app-state": {
      "command": "npx",
      "args": ["state-bridge-mcp", "--port", "9000"]
    }
  }
}
```

Or via environment variable: `STATE_BRIDGE_PORT=9000`

Default port: `8098`

## Client Usage

```typescript
import { createStateBridge } from 'state-bridge-mcp/client';
import { useSessionStore, useAppStore } from './store';

const bridge = createStateBridge({
  stores: {
    session: useSessionStore,
    app: useAppStore,
  },
  url: 'ws://localhost:8098',
});

// Later, to tear down:
bridge.stop();
```

### React Native (Android emulator)

For Android emulator, use `10.0.2.2` to reach the host machine:

```typescript
const bridge = createStateBridge({
  stores: { session: useSessionStore, app: useAppStore },
  url: 'ws://10.0.2.2:8098',
});
```

## Client Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stores` | `Record<string, StoreEntry>` | *required* | Named map of Zustand stores |
| `url` | `string` | `ws://localhost:8098` | WebSocket URL of the MCP server |
| `reconnectInterval` | `number` | `3000` | Auto-reconnect interval in ms. `0` to disable. |
| `onConnect` | `() => void` | — | Called when WebSocket opens |
| `onDisconnect` | `() => void` | — | Called when WebSocket closes |

## MCP Tools

Once connected, the AI has access to these tools:

| Tool | Description |
|------|-------------|
| `connection_status` | Check if a client app is connected |
| `list_stores` | List all stores and their top-level state keys |
| `get_state` | Read state from a store (supports dot-paths like `settings.theme`) |
| `set_state` | Write a value at a dot-path (supports arbitrary depth) |
| `call_action` | Invoke a store action function by name |

## Store Compatibility

Any object with `getState()` and `setState()` works. Zustand stores satisfy this out of the box:

```typescript
type StoreEntry = {
  getState: () => Record<string, unknown>;
  setState: (partial: Record<string, unknown>) => void;
};
```

## License

MIT
