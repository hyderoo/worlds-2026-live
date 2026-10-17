"use client";
import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_TZ } from "./format";

export type Prefs = { tz: string; watch: string[]; reminders: string[]; spoiler: boolean; revealed: string[] };
const KEY = "w26:prefs:v1";
const DEFAULTS: Prefs = { tz: DEFAULT_TZ, watch: [], reminders: [], spoiler: false, revealed: [] };
const listeners = new Set<() => void>();
let cached: Prefs | null = null;

function read(): Prefs {
  if (cached) return cached;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    cached = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULTS;
    if (cached && "picks" in cached) delete (cached as Record<string, unknown>).picks; // removed feature: drop leftovers
  } catch {
    cached = DEFAULTS;
  }
  return cached;
}
function write(next: Prefs) {
  cached = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage may be blocked */ }
  listeners.forEach((l) => l());
}

export function usePrefs() {
  const prefs = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    read,
    () => DEFAULTS,
  );
  const set = useCallback((patch: Partial<Prefs>) => write({ ...read(), ...patch }), []);
  const toggleWatch = useCallback((code: string) => {
    const p = read();
    set({ watch: p.watch.includes(code) ? p.watch.filter((c) => c !== code) : [...p.watch, code] });
  }, [set]);
  return { prefs, set, toggleWatch };
}

// Spoiler-free mode. `spoiler` and per-match `revealed` persist on this device; "show everything" lasts for the browser session only.
let sessionAll = false;
const sessionListeners = new Set<() => void>();
export function useSpoiler() {
  const { prefs, set } = usePrefs();
  const all = useSyncExternalStore(
    (cb) => { sessionListeners.add(cb); return () => sessionListeners.delete(cb); },
    () => sessionAll,
    () => false,
  );
  const on = prefs.spoiler && !all;
  return {
    enabled: prefs.spoiler,
    on,
    /** True when a finished or live match result must stay hidden. */
    hidden: (id: string) => on && !prefs.revealed.includes(id),
    reveal: (id: string) => set({ revealed: [...new Set([...prefs.revealed, id])] }),
    revealSession: () => { sessionAll = true; sessionListeners.forEach((l) => l()); },
    toggle: () => { sessionAll = false; sessionListeners.forEach((l) => l()); set({ spoiler: !prefs.spoiler, revealed: [] }); },
  };
}
