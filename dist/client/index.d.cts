/** Duck-typed Zustand store (getState/setState is all we need) */
type StoreEntry = {
    getState: () => Record<string, unknown>;
    setState: (partial: Record<string, unknown>) => void;
};
/** Client SDK config */
type StateBridgeConfig = {
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
type StateBridgeHandle = {
    /** Disconnect and stop reconnecting */
    stop: () => void;
};

declare function createStateBridge(config: StateBridgeConfig): StateBridgeHandle;

export { type StateBridgeConfig, type StateBridgeHandle, type StoreEntry, createStateBridge };
