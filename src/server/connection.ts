import { WebSocketServer, WebSocket } from 'ws';
import type { BridgeRequest, BridgeResponse, ServerConfig, ConnectionHandle } from '../shared/types.js';

type PendingRequest = {
  resolve: (response: BridgeResponse) => void;
  timer: ReturnType<typeof setTimeout>;
};

const DEFAULT_PORT = 8098;
const DEFAULT_TIMEOUT = 5000;

export function createConnection(config: ServerConfig = {}): ConnectionHandle {
  const port = config.port ?? DEFAULT_PORT;
  const timeout = config.timeout ?? DEFAULT_TIMEOUT;

  let client: WebSocket | null = null;
  const pending = new Map<string, PendingRequest>();
  let requestCounter = 0;
  let wss: WebSocketServer | null = null;

  function isConnected(): boolean {
    return client !== null && client.readyState === WebSocket.OPEN;
  }

  function sendRequest(request: Omit<BridgeRequest, 'id'>): Promise<BridgeResponse> {
    return new Promise((resolve) => {
      if (!isConnected()) {
        resolve({ id: '', type: 'response', ok: false, error: 'Client not connected' });
        return;
      }

      const id = `req_${++requestCounter}`;
      const message: BridgeRequest = { id, ...request };

      const timer = setTimeout(() => {
        pending.delete(id);
        resolve({ id, type: 'response', ok: false, error: `Request timed out (${timeout}ms)` });
      }, timeout);

      pending.set(id, { resolve, timer });
      client!.send(JSON.stringify(message));
    });
  }

  function close(): void {
    if (client) {
      client.close();
      client = null;
    }
    for (const [id, entry] of pending) {
      clearTimeout(entry.timer);
      entry.resolve({ id, type: 'response', ok: false, error: 'Server shutting down' });
    }
    pending.clear();
    if (wss) {
      wss.close();
      wss = null;
    }
  }

  wss = new WebSocketServer({ port });

  wss.on('listening', () => {
    console.error(`[state-bridge] WS server listening on :${port}`);
  });

  wss.on('connection', (ws) => {
    if (client) {
      console.error('[state-bridge] Replacing existing client connection');
      client.close();
    }
    client = ws;
    console.error('[state-bridge] Client connected');
    config.onConnect?.();

    ws.on('message', (raw) => {
      try {
        const response: BridgeResponse = JSON.parse(raw.toString());
        const entry = pending.get(response.id);
        if (entry) {
          clearTimeout(entry.timer);
          pending.delete(response.id);
          entry.resolve(response);
        }
      } catch {
        console.error('[state-bridge] Bad message from client:', raw.toString());
      }
    });

    ws.on('close', () => {
      if (client === ws) {
        client = null;
        console.error('[state-bridge] Client disconnected');
        config.onDisconnect?.();
      }
      for (const [id, entry] of pending) {
        clearTimeout(entry.timer);
        entry.resolve({ id, type: 'response', ok: false, error: 'Client disconnected' });
      }
      pending.clear();
    });

    ws.on('error', (err) => {
      console.error('[state-bridge] WS error:', err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('[state-bridge] WS server error:', err.message);
  });

  return { isConnected, sendRequest, close };
}
