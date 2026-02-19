import type { StoreEntry } from '../shared/types.js';
import { stripFunctions, resolve, deepSet } from './utils.js';

type StoreRegistry = Record<string, StoreEntry>;

export function handleListStores(stores: StoreRegistry): unknown {
  const result: Record<string, string[]> = {};
  for (const [name, store] of Object.entries(stores)) {
    const state = store.getState();
    result[name] = Object.keys(state).filter((k) => typeof state[k] !== 'function');
  }
  return result;
}

export function handleGetState(stores: StoreRegistry, storeName: string, path?: string): unknown {
  const store = stores[storeName];
  if (!store) return { error: `Unknown store: ${storeName}` };
  const state = store.getState();
  if (path) {
    return stripFunctions(resolve(state, path));
  }
  return stripFunctions(state);
}

export function handleSetState(stores: StoreRegistry, storeName: string, path: string, value: unknown): unknown {
  const store = stores[storeName];
  if (!store) return { error: `Unknown store: ${storeName}` };

  const parts = path.split('.');
  if (parts.length === 1) {
    store.setState({ [path]: value });
    return { updated: path };
  }

  // Deep set: rebuild from the top-level key down
  const topKey = parts[0];
  const state = store.getState();
  const updated = deepSet(state, path, value);
  store.setState({ [topKey]: updated[topKey] });
  return { updated: path };
}

export function handleCallAction(stores: StoreRegistry, storeName: string, action: string, args?: unknown[]): unknown {
  const store = stores[storeName];
  if (!store) return { error: `Unknown store: ${storeName}` };
  const state = store.getState();
  const fn = state[action];
  if (typeof fn !== 'function') return { error: `Not a function: ${storeName}.${action}` };
  const result = fn(...(args ?? []));
  if (result instanceof Promise) {
    result.catch((err: Error) => console.warn(`[state-bridge] Action ${action} failed:`, err));
    return { called: action, async: true };
  }
  return { called: action, result: stripFunctions(result) };
}
