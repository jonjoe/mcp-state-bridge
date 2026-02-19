#!/usr/bin/env node

// src/server/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// src/server/connection.ts
import { WebSocketServer, WebSocket } from "ws";
var DEFAULT_PORT = 8098;
var DEFAULT_TIMEOUT = 5e3;
function createConnection(config = {}) {
  const port2 = config.port ?? DEFAULT_PORT;
  const timeout = config.timeout ?? DEFAULT_TIMEOUT;
  let client = null;
  const pending = /* @__PURE__ */ new Map();
  let requestCounter = 0;
  let wss = null;
  function isConnected() {
    return client !== null && client.readyState === WebSocket.OPEN;
  }
  function sendRequest(request) {
    return new Promise((resolve) => {
      if (!isConnected()) {
        resolve({ id: "", type: "response", ok: false, error: "Client not connected" });
        return;
      }
      const id = `req_${++requestCounter}`;
      const message = { id, ...request };
      const timer = setTimeout(() => {
        pending.delete(id);
        resolve({ id, type: "response", ok: false, error: `Request timed out (${timeout}ms)` });
      }, timeout);
      pending.set(id, { resolve, timer });
      client.send(JSON.stringify(message));
    });
  }
  function close() {
    if (client) {
      client.close();
      client = null;
    }
    for (const [id, entry] of pending) {
      clearTimeout(entry.timer);
      entry.resolve({ id, type: "response", ok: false, error: "Server shutting down" });
    }
    pending.clear();
    if (wss) {
      wss.close();
      wss = null;
    }
  }
  wss = new WebSocketServer({ port: port2 });
  wss.on("listening", () => {
    console.error(`[state-bridge] WS server listening on :${port2}`);
  });
  wss.on("connection", (ws) => {
    if (client) {
      console.error("[state-bridge] Replacing existing client connection");
      client.close();
    }
    client = ws;
    console.error("[state-bridge] Client connected");
    config.onConnect?.();
    ws.on("message", (raw) => {
      try {
        const response = JSON.parse(raw.toString());
        const entry = pending.get(response.id);
        if (entry) {
          clearTimeout(entry.timer);
          pending.delete(response.id);
          entry.resolve(response);
        }
      } catch {
        console.error("[state-bridge] Bad message from client:", raw.toString());
      }
    });
    ws.on("close", () => {
      if (client === ws) {
        client = null;
        console.error("[state-bridge] Client disconnected");
        config.onDisconnect?.();
      }
      for (const [id, entry] of pending) {
        clearTimeout(entry.timer);
        entry.resolve({ id, type: "response", ok: false, error: "Client disconnected" });
      }
      pending.clear();
    });
    ws.on("error", (err) => {
      console.error("[state-bridge] WS error:", err.message);
    });
  });
  wss.on("error", (err) => {
    console.error("[state-bridge] WS server error:", err.message);
  });
  return { isConnected, sendRequest, close };
}

// src/server/index.ts
function parsePort() {
  const portIdx = process.argv.indexOf("--port");
  if (portIdx !== -1 && process.argv[portIdx + 1]) {
    const n = parseInt(process.argv[portIdx + 1], 10);
    if (!isNaN(n) && n > 0 && n < 65536) return n;
  }
  const envPort = process.env.STATE_BRIDGE_PORT;
  if (envPort) {
    const n = parseInt(envPort, 10);
    if (!isNaN(n) && n > 0 && n < 65536) return n;
  }
  return 8098;
}
var port = parsePort();
var conn = createConnection({ port });
var server = new McpServer({
  name: "state-bridge",
  version: "1.0.0"
});
server.tool("connection_status", "Check if a client app is connected via WebSocket", {}, async () => {
  const connected = conn.isConnected();
  return {
    content: [{ type: "text", text: JSON.stringify({ connected }, null, 2) }]
  };
});
server.tool(
  "list_stores",
  "List all Zustand stores and their top-level state keys",
  {},
  async () => {
    const res = await conn.sendRequest({ type: "list_stores" });
    if (!res.ok) {
      return { content: [{ type: "text", text: `Error: ${res.error}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  }
);
server.tool(
  "get_state",
  "Read state from a Zustand store. Optionally provide a dot-path to read a specific slice.",
  {
    store: z.string().describe('Store name (e.g. "app", "session")'),
    path: z.string().optional().describe('Dot-path to a specific value (e.g. "activeSessionId")')
  },
  async ({ store, path }) => {
    const res = await conn.sendRequest({ type: "get_state", store, path });
    if (!res.ok) {
      return { content: [{ type: "text", text: `Error: ${res.error}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  }
);
server.tool(
  "set_state",
  "Write a value to a Zustand store at the given path",
  {
    store: z.string().describe("Store name"),
    path: z.string().describe('Dot-path to set (e.g. "settings.theme")'),
    value: z.any().describe("Value to set")
  },
  async ({ store, path, value }) => {
    const res = await conn.sendRequest({ type: "set_state", store, path, value });
    if (!res.ok) {
      return { content: [{ type: "text", text: `Error: ${res.error}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  }
);
server.tool(
  "call_action",
  'Invoke a store action function by name (e.g. "clearHistory", "setActiveTab")',
  {
    store: z.string().describe("Store name"),
    action: z.string().describe("Action function name"),
    args: z.array(z.any()).optional().describe("Arguments to pass to the action")
  },
  async ({ store, action, args }) => {
    const res = await conn.sendRequest({ type: "call_action", store, action, args });
    if (!res.ok) {
      return { content: [{ type: "text", text: `Error: ${res.error}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(res.data ?? { ok: true }, null, 2) }] };
  }
);
var transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[state-bridge] MCP server running (WS port: ${port})`);
