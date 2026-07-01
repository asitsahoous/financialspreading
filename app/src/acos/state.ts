import { useCallback, useState } from "react";

const store = new Map<string, unknown>();

function readStored<T>(key: string, initial: T): T {
  if (store.has(key)) return store.get(key) as T;
  try {
    const raw = sessionStorage.getItem(`acos:${key}`);
    if (raw != null) {
      const parsed = JSON.parse(raw) as T;
      store.set(key, parsed);
      return parsed;
    }
  } catch {
    /* ignore */
  }
  store.set(key, initial);
  return initial;
}

/** Canvas-compatible persisted state for demo interactions */
export function useCanvasState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readStored(key, initial));

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        store.set(key, resolved);
        try {
          sessionStorage.setItem(`acos:${key}`, JSON.stringify(resolved));
        } catch {
          /* ignore */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
