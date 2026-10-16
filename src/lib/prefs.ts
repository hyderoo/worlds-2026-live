"use client";
import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_TZ } from "./format";

export type Prefs = { tz: string; watch: string[]; picks: Record<string, string>; reminders: string[] };
const KEY = "w26:prefs:v1";
const DEFAULTS: Prefs = { tz: DEFAULT_TZ, watch: [], picks: {}, reminders: [] };
const listeners = new Set<() => void>();
let cached: Prefs | null = null;

function read(): Prefs {
  if (cached) return cached;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    cached = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULTS;
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
