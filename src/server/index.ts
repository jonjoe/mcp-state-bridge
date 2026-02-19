import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createConnection } from './connection.js';

function parsePort(): number {
  // --port <n> from argv
  const portIdx = process.argv.indexOf('--port');
  if (portIdx !== -1 && process.argv[portIdx + 1]) {
    const n = parseInt(process.argv[portIdx + 1], 10);
    if (!isNaN(n) && n > 0 && n < 65536) return n;
  }
  // STATE_BRIDGE_PORT env var
  const envPort = process.env.STATE_BRIDGE_PORT;
  if (envPort) {
    const n = parseInt(envPort, 10);
    if (!isNaN(n) && n > 0 && n < 65536) return n;
  }
  return 8098;
}

const port = parsePort();
const conn = createConnection({ port });

const server = new McpServer({
  name: 'state-bridge',
  version: '1.0.0',
});

server.tool('connection_status', 'Check if a client app is connected via WebSocket', {}, async () => {
  const connected = conn.isConnected();
  return {
    content: [{ type: 'text', text: JSON.stringify({ connected }, null, 2) }],
  };
});

server.tool(
  'list_stores',
  'List all Zustand stores and their top-level state keys',
  {},
  async () => {
    const res = await conn.sendRequest({ type: 'list_stores' });
    if (!res.ok) {
      return { content: [{ type: 'text', text: `Error: ${res.error}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
  },
);

server.tool(
  'get_state',
  'Read state from a Zustand store. Optionally provide a dot-path to read a specific slice.',
  {
    store: z.string().describe('Store name (e.g. "app", "session")'),
    path: z.string().optional().describe('Dot-path to a specific value (e.g. "activeSessionId")'),
  },
  async ({ store, path }) => {
    const res = await conn.sendRequest({ type: 'get_state', store, path });
    if (!res.ok) {
      return { content: [{ type: 'text', text: `Error: ${res.error}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
  },
);

server.tool(
  'set_state',
  'Write a value to a Zustand store at the given path',
  {
    store: z.string().describe('Store name'),
    path: z.string().describe('Dot-path to set (e.g. "settings.theme")'),
    value: z.any().describe('Value to set'),
  },
  async ({ store, path, value }) => {
    const res = await conn.sendRequest({ type: 'set_state', store, path, value });
    if (!res.ok) {
      return { content: [{ type: 'text', text: `Error: ${res.error}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
  },
);

server.tool(
  'call_action',
  'Invoke a store action function by name (e.g. "clearHistory", "setActiveTab")',
  {
    store: z.string().describe('Store name'),
    action: z.string().describe('Action function name'),
    args: z.array(z.any()).optional().describe('Arguments to pass to the action'),
  },
  async ({ store, action, args }) => {
    const res = await conn.sendRequest({ type: 'call_action', store, action, args });
    if (!res.ok) {
      return { content: [{ type: 'text', text: `Error: ${res.error}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(res.data ?? { ok: true }, null, 2) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[state-bridge] MCP server running (WS port: ${port})`);
