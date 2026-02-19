/** Recursively strip functions from an object (for serialization) */
export function stripFunctions(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'function') return undefined;
  if (Array.isArray(obj)) return obj.map(stripFunctions);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof val !== 'function') {
        result[key] = stripFunctions(val);
      }
    }
    return result;
  }
  return obj;
}

/** Resolve a dot-path on an object (e.g. "settings.theme" → obj.settings.theme) */
export function resolve(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Immutable deep-set: returns a new object with the value at the dot-path replaced */
export function deepSet(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.');
  if (parts.length === 1) {
    return { ...obj, [parts[0]]: value };
  }

  const [head, ...rest] = parts;
  const child = obj[head];
  const nextObj = (typeof child === 'object' && child !== null) ? child as Record<string, unknown> : {};

  return {
    ...obj,
    [head]: deepSet(nextObj, rest.join('.'), value),
  };
}
