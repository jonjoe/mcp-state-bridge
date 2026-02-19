import type { BridgeRequest, BridgeResponse, StateBridgeConfig, StateBridgeHandle } from '../shared/types.js';
import { handleListStores, handleGetState, handleSetState, handleCallAction } from './handlers.js';

export type { StateBridgeConfig, StateBridgeHandle, StoreEntry } from '../shared/types.js';

const DEFAULT_URL = 'ws://localhost:8098';
const DEFAULT_RECONNECT = 3000;

export function createStateBridge(config: StateBridgeConfig): StateBridgeHandle {
  const url = config.url ?? DEFAULT_URL;
  const reconnectInterval = config.reconnectInterval ?? DEFAULT_RECONNECT;
  const { stores } = config;

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  function handleMessage(data: string): void {
    try {
      const req: BridgeRequest = JSON.parse(data);
      let responseData: unknown;

      switch (req.type) {
        case 'list_stores':
          responseData = handleListStores(stores);
          break;
        case 'get_state':
          responseData = req.store ? handleGetState(stores, req.store, req.path) : { error: 'store required' };
          break;
        case 'set_state':
          responseData = req.store && req.path != null
            ? handleSetState(stores, req.store, req.path, req.value)
            : { error: 'store and path required' };
          break;
        case 'call_action':
          responseData = req.store && req.action
            ? handleCallAction(stores, req.store, req.action, req.args)
            : { error: 'store and action required' };
          break;
        default:
          responseData = { error: `Unknown type: ${req.type}` };
      }

      const hasError = typeof responseData === 'object' && responseData !== null && 'error' in responseData;
      const response: BridgeResponse = {
        id: req.id,
        type: 'response',
        ok: !hasError,
        data: hasError ? undefined : responseData,
        error: hasError ? (responseData as { error: string }).error : undefined,
      };

      ws?.send(JSON.stringify(response));
    } catch (err) {
      console.warn('[state-bridge] Failed to handle message:', err);
    }
  }

  function connect(): void {
    if (ws || stopped) return;

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[state-bridge] Connected to MCP server');
        config.onConnect?.();
      };

      ws.onmessage = (event) => {
        handleMessage(typeof event.data === 'string' ? event.data : String(event.data));
      };

      ws.onclose = () => {
        console.log('[state-bridge] Disconnected');
        ws = null;
        config.onDisconnect?.();
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws?.close();
        ws = null;
      };
    } catch {
      ws = null;
      scheduleReconnect();
    }
  }

  function scheduleReconnect(): void {
    if (reconnectTimer || stopped || reconnectInterval === 0) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectInterval);
  }

  function stop(): void {
    stopped = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
  }

  // Auto-connect
  connect();

  return { stop };
}
