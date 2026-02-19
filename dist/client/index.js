// src/client/utils.ts
function stripFunctions(obj) {
  if (obj === null || obj === void 0) return obj;
  if (typeof obj === "function") return void 0;
  if (Array.isArray(obj)) return obj.map(stripFunctions);
  if (typeof obj === "object") {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val !== "function") {
        result[key] = stripFunctions(val);
      }
    }
    return result;
  }
  return obj;
}
function resolve(obj, path) {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === void 0 || typeof current !== "object") return void 0;
    current = current[part];
  }
  return current;
}
function deepSet(obj, path, value) {
  const parts = path.split(".");
  if (parts.length === 1) {
    return { ...obj, [parts[0]]: value };
  }
  const [head, ...rest] = parts;
  const child = obj[head];
  const nextObj = typeof child === "object" && child !== null ? child : {};
  return {
    ...obj,
    [head]: deepSet(nextObj, rest.join("."), value)
  };
}

// src/client/handlers.ts
function handleListStores(stores) {
  const result = {};
  for (const [name, store] of Object.entries(stores)) {
    const state = store.getState();
    result[name] = Object.keys(state).filter((k) => typeof state[k] !== "function");
  }
  return result;
}
function handleGetState(stores, storeName, path) {
  const store = stores[storeName];
  if (!store) return { error: `Unknown store: ${storeName}` };
  const state = store.getState();
  if (path) {
    return stripFunctions(resolve(state, path));
  }
  return stripFunctions(state);
}
function handleSetState(stores, storeName, path, value) {
  const store = stores[storeName];
  if (!store) return { error: `Unknown store: ${storeName}` };
  const parts = path.split(".");
  if (parts.length === 1) {
    store.setState({ [path]: value });
    return { updated: path };
  }
  const topKey = parts[0];
  const state = store.getState();
  const updated = deepSet(state, path, value);
  store.setState({ [topKey]: updated[topKey] });
  return { updated: path };
}
function handleCallAction(stores, storeName, action, args) {
  const store = stores[storeName];
  if (!store) return { error: `Unknown store: ${storeName}` };
  const state = store.getState();
  const fn = state[action];
  if (typeof fn !== "function") return { error: `Not a function: ${storeName}.${action}` };
  const result = fn(...args ?? []);
  if (result instanceof Promise) {
    result.catch((err) => console.warn(`[state-bridge] Action ${action} failed:`, err));
    return { called: action, async: true };
  }
  return { called: action, result: stripFunctions(result) };
}

// src/client/index.ts
var DEFAULT_URL = "ws://localhost:8098";
var DEFAULT_RECONNECT = 3e3;
function createStateBridge(config) {
  const url = config.url ?? DEFAULT_URL;
  const reconnectInterval = config.reconnectInterval ?? DEFAULT_RECONNECT;
  const { stores } = config;
  let ws = null;
  let reconnectTimer = null;
  let stopped = false;
  function handleMessage(data) {
    try {
      const req = JSON.parse(data);
      let responseData;
      switch (req.type) {
        case "list_stores":
          responseData = handleListStores(stores);
          break;
        case "get_state":
          responseData = req.store ? handleGetState(stores, req.store, req.path) : { error: "store required" };
          break;
        case "set_state":
          responseData = req.store && req.path != null ? handleSetState(stores, req.store, req.path, req.value) : { error: "store and path required" };
          break;
        case "call_action":
          responseData = req.store && req.action ? handleCallAction(stores, req.store, req.action, req.args) : { error: "store and action required" };
          break;
        default:
          responseData = { error: `Unknown type: ${req.type}` };
      }
      const hasError = typeof responseData === "object" && responseData !== null && "error" in responseData;
      const response = {
        id: req.id,
        type: "response",
        ok: !hasError,
        data: hasError ? void 0 : responseData,
        error: hasError ? responseData.error : void 0
      };
      ws?.send(JSON.stringify(response));
    } catch (err) {
      console.warn("[state-bridge] Failed to handle message:", err);
    }
  }
  function connect() {
    if (ws || stopped) return;
    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        console.log("[state-bridge] Connected to MCP server");
        config.onConnect?.();
      };
      ws.onmessage = (event) => {
        handleMessage(typeof event.data === "string" ? event.data : String(event.data));
      };
      ws.onclose = () => {
        console.log("[state-bridge] Disconnected");
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
  function scheduleReconnect() {
    if (reconnectTimer || stopped || reconnectInterval === 0) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectInterval);
  }
  function stop() {
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
  connect();
  return { stop };
}
export {
  createStateBridge
};
