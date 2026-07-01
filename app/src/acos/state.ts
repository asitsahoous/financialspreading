import { useCallback, useEffect, useRef, useState } from "react";

const store = new Map<string, unknown>();
const subscribers = new Map<string, Set<(value: unknown) => void>>();

const TOAST_KEY = "actionToast";
let toastClearTimer: ReturnType<typeof setTimeout> | null = null;
let toastGeneration = 0;

// Ephemeral toasts must not survive reload — clear any legacy persisted value.
try {
  sessionStorage.removeItem(`acos:${TOAST_KEY}`);
} catch {
  /* ignore */
}

function readStored<T>(key: string, initial: T): T {
  if (key === TOAST_KEY) {
    return (store.has(key) ? store.get(key) : initial) as T;
  }
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

function notify(key: string, value: unknown) {
  const subs = subscribers.get(key);
  if (!subs) return;
  for (const listener of subs) listener(value);
}

function clearActionToast() {
  store.set(TOAST_KEY, "");
  notify(TOAST_KEY, "");
}

/**
 * Canvas-compatible persisted state for demo interactions.
 * Shared across every component that uses the same key — updating the
 * value from one component re-renders all other subscribers of that key,
 * matching the reactive semantics of the real cursor/canvas useCanvasState.
 */
export function useCanvasState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readStored(key, initial));

  // Ref so `set` never needs `initial` in its dep array — many call sites pass
  // fresh array/object literals each render, which would otherwise recreate
  // `set` every render and break referential stability for consumers.
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    let subs = subscribers.get(key);
    if (!subs) {
      subs = new Set();
      subscribers.set(key, subs);
    }
    const listener = (next: unknown) => setValue(next as T);
    subs.add(listener);
    return () => {
      subs!.delete(listener);
      if (subs!.size === 0) subscribers.delete(key);
    };
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = store.has(key) ? (store.get(key) as T) : initialRef.current;
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      store.set(key, resolved);
      if (key !== TOAST_KEY) {
        try {
          sessionStorage.setItem(`acos:${key}`, JSON.stringify(resolved));
        } catch {
          /* ignore */
        }
      }
      notify(key, resolved);
    },
    [key],
  );

  return [value, set];
}

/** Ephemeral toast — auto-clears after 2.8s; not persisted to sessionStorage. */
export function showActionToast(message: string) {
  const gen = ++toastGeneration;
  store.set(TOAST_KEY, message);
  notify(TOAST_KEY, message);
  if (toastClearTimer) clearTimeout(toastClearTimer);
  toastClearTimer = window.setTimeout(() => {
    if (gen !== toastGeneration) return;
    clearActionToast();
    toastClearTimer = null;
  }, 2800);
}
