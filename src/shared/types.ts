/** Wire protocol: server → client request */
export type BridgeRequest = {
  id: string;
  type: 'list_stores' | 'get_state' | 'set_state' | 'call_action';
  store?: string;
  path?: string;
  value?: unknown;
  action?: string;
  args?: unknown[];
};

/** Wire protocol: client → server response */
export type BridgeResponse = {
  id: string;
  type: 'response';
  ok: boolean;
  data?: unknown;
  error?: string;
};

/** Duck-typed Zustand store (getState/setState is all we need) */
export type StoreEntry = {
  getState: () => Record<string, unknown>;
  setState: (partial: Record<string, unknown>) => void;
};

/** Client SDK config */
export type StateBridgeConfig = {
  /** Named map of Zustand stores to expose */
  stores: Record<string, StoreEntry>;
  /** WebSocket URL of the MCP server (default: ws://localhost:8098) */
  url?: string;
  /** Auto-reconnect interval in ms (default: 3000). Set to 0 to disable. */
  reconnectInterval?: number;
  /** Called when WebSocket connection opens */
  onConnect?: () => void;
  /** Called when WebSocket connection closes */
  onDisconnect?: () => void;
};

/** Handle returned by createStateBridge() */
export type StateBridgeHandle = {
  /** Disconnect and stop reconnecting */
  stop: () => void;
};

/** Server-side connection config */
export type ServerConfig = {
  /** WebSocket port (default: 8098) */
  port?: number;
  /** Request timeout in ms (default: 5000) */
  timeout?: number;
  /** Called when a client connects */
  onConnect?: () => void;
  /** Called when a client disconnects */
  onDisconnect?: () => void;
};

/** Handle returned by createConnection() */
export type ConnectionHandle = {
  isConnected: () => boolean;
  sendRequest: (request: Omit<BridgeRequest, 'id'>) => Promise<BridgeResponse>;
  close: () => void;
};
