import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, hasSupabase } from "./config";
import type { GameStats, Match, Recap, SyncRun } from "./types";

/** Reserved game_stats keys for unofficial extras (Liquipedia), so no extra migration is needed. */
export const EXTRA_PREFIX = "__extra:";

export type Override = {
  matchId: string;
  patch: { startTime?: string; bestOf?: number; wins?: [number, number]; note?: string };
  author: string;
  createdAt: string;
};

export interface Store {
  kind: "supabase" | "memory";
  loadMatches(): Promise<Match[]>;
  upsertMatches(m: Match[]): Promise<void>;
  loadOverrides(): Promise<Override[]>;
  saveOverride(o: Override): Promise<void>;
  deleteOverride(matchId: string): Promise<void>;
  loadRecaps(): Promise<Recap[]>;
  saveRecap(r: Recap): Promise<void>;
  loadGameStats(): Promise<Record<string, GameStats[]>>;
  saveGameStats(matchId: string, g: GameStats[]): Promise<void>;
  loadExtras(): Promise<Record<string, unknown>>;
  saveExtra(key: string, data: unknown): Promise<void>;
  deleteExtra(key: string): Promise<void>;
  recordRun(r: SyncRun): Promise<void>;
  recentRuns(n: number): Promise<SyncRun[]>;
}

type MemState = {
  matches: Map<string, Match>;
  overrides: Map<string, Override>;
  recaps: Map<string, Recap>;
  stats: Record<string, GameStats[]>;
  extras: Record<string, unknown>;
  runs: SyncRun[];
};

export function createMemoryStore(state?: MemState): Store & { state: MemState } {
  const s: MemState = state ?? { matches: new Map(), overrides: new Map(), recaps: new Map(), stats: {}, extras: {}, runs: [] };
  return {
    kind: "memory",
    state: s,
    async loadMatches() { return [...s.matches.values()]; },
    async upsertMatches(m) { for (const x of m) s.matches.set(x.id, x); },
    async loadOverrides() { return [...s.overrides.values()]; },
    async saveOverride(o) { s.overrides.set(o.matchId, o); },
    async deleteOverride(id) { s.overrides.delete(id); },
    async loadRecaps() { return [...s.recaps.values()]; },
    async saveRecap(r) { s.recaps.set(r.matchId, r); },
    async loadGameStats() { return s.stats; },
    async saveGameStats(id, g) { s.stats[id] = g; },
    async loadExtras() { return s.extras; },
    async saveExtra(k, d) { s.extras[k] = d; },
    async deleteExtra(k) { delete s.extras[k]; },
    async recordRun(r) { s.runs.unshift(r); s.runs = s.runs.slice(0, 50); },
    async recentRuns(n) { return s.runs.slice(0, n); },
  };
}

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(`supabase: ${r.error.message}`);
  return (r.data ?? ([] as unknown)) as T;
}

export function createSupabaseStore(client: SupabaseClient): Store {
  return {
    kind: "supabase",
    async loadMatches() {
      const rows = must(await client.from("matches").select("data")) as { data: Match }[];
      return rows.map((r) => r.data);
    },
    async upsertMatches(m) {
      if (m.length === 0) return;
      const rows = m.map((x) => ({ id: x.id, data: x, source: x.source, upstream_changed_at: x.upstreamChangedAt, updated_at: x.updatedAt }));
      must(await client.from("matches").upsert(rows, { onConflict: "id" }));
    },
    async loadOverrides() {
      const rows = must(await client.from("match_overrides").select("*")) as { match_id: string; patch: Override["patch"]; author: string; created_at: string }[];
      return rows.map((r) => ({ matchId: r.match_id, patch: r.patch, author: r.author, createdAt: r.created_at }));
    },
    async saveOverride(o) {
      must(await client.from("match_overrides").upsert({ match_id: o.matchId, patch: o.patch, author: o.author, created_at: o.createdAt }, { onConflict: "match_id" }));
    },
    async deleteOverride(id) {
      must(await client.from("match_overrides").delete().eq("match_id", id));
    },
    async loadRecaps() {
      const rows = must(await client.from("recaps").select("*")) as { match_id: string; title: string; body: string; kind: Recap["kind"]; author: string; updated_at: string }[];
      return rows.map((r) => ({ matchId: r.match_id, title: r.title, body: r.body, kind: r.kind, author: r.author, updatedAt: r.updated_at }));
    },
    async saveRecap(r) {
      must(await client.from("recaps").upsert({ match_id: r.matchId, title: r.title, body: r.body, kind: r.kind, author: r.author, updated_at: r.updatedAt }, { onConflict: "match_id" }));
    },
    async loadGameStats() {
      const rows = must(await client.from("game_stats").select("match_id,data")) as { match_id: string; data: GameStats[] }[];
      return Object.fromEntries(rows.filter((r) => !r.match_id.startsWith(EXTRA_PREFIX)).map((r) => [r.match_id, r.data]));
    },
    async loadExtras() {
      const rows = must(await client.from("game_stats").select("match_id,data").like("match_id", `${EXTRA_PREFIX}%`)) as { match_id: string; data: unknown }[];
      return Object.fromEntries(rows.map((r) => [r.match_id.slice(EXTRA_PREFIX.length), r.data]));
    },
    async saveExtra(key, data) {
      must(await client.from("game_stats").upsert({ match_id: EXTRA_PREFIX + key, data, updated_at: new Date().toISOString() }, { onConflict: "match_id" }));
    },
    async deleteExtra(key) {
      must(await client.from("game_stats").delete().eq("match_id", EXTRA_PREFIX + key));
    },
    async saveGameStats(id, g) {
      must(await client.from("game_stats").upsert({ match_id: id, data: g, updated_at: new Date().toISOString() }, { onConflict: "match_id" }));
    },
    async recordRun(r) {
      must(await client.from("sync_runs").upsert({ id: r.id, started_at: r.startedAt, finished_at: r.finishedAt, ok: r.ok, trigger: r.trigger, matches_seen: r.matchesSeen, matches_changed: r.matchesChanged, attempts: r.attempts, error: r.error }, { onConflict: "id" }));
    },
    async recentRuns(n) {
      const rows = must(await client.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(n)) as { id: string; started_at: string; finished_at: string | null; ok: boolean; trigger: string; matches_seen: number; matches_changed: number; attempts: number; error: string | null }[];
      return rows.map((r) => ({ id: r.id, startedAt: r.started_at, finishedAt: r.finished_at, ok: r.ok, trigger: r.trigger, matchesSeen: r.matches_seen, matchesChanged: r.matches_changed, attempts: r.attempts, error: r.error }));
    },
  };
}

export type ResilientStore = Store & { degradedReason: string | null };

/**
 * Wraps the database store. If the database is unreachable or its tables are missing (for example the
 * migration has not been run yet), every call falls back to the in-memory store instead of crashing the site.
 * The database is retried after RETRY_MS.
 */
export function createResilientStore(primary: Store, fallback: Store, now: () => number = Date.now, retryMs = 60_000): ResilientStore {
  let downUntil = 0;
  let reason: string | null = null;
  const run = async <T,>(fn: (s: Store) => Promise<T>): Promise<T> => {
    if (now() >= downUntil) {
      try {
        const v = await fn(primary);
        reason = null;
        return v;
      } catch (e) {
        downUntil = now() + retryMs;
        reason = e instanceof Error ? e.message.slice(0, 200) : "database error";
      }
    }
    return fn(fallback);
  };
  return {
    get kind() { return now() >= downUntil && reason === null ? primary.kind : "memory"; },
    get degradedReason() { return reason; },
    loadMatches: () => run((s) => s.loadMatches()),
    upsertMatches: (m) => run((s) => s.upsertMatches(m)),
    loadOverrides: () => run((s) => s.loadOverrides()),
    saveOverride: (o) => run((s) => s.saveOverride(o)),
    deleteOverride: (id) => run((s) => s.deleteOverride(id)),
    loadRecaps: () => run((s) => s.loadRecaps()),
    saveRecap: (r) => run((s) => s.saveRecap(r)),
    loadGameStats: () => run((s) => s.loadGameStats()),
    saveGameStats: (id, gs) => run((s) => s.saveGameStats(id, gs)),
    loadExtras: () => run((s) => s.loadExtras()),
    saveExtra: (k, d) => run((s) => s.saveExtra(k, d)),
    deleteExtra: (k) => run((s) => s.deleteExtra(k)),
    recordRun: (r) => run((s) => s.recordRun(r)),
    recentRuns: (n) => run((s) => s.recentRuns(n)),
  };
}

const g = globalThis as unknown as { __memStore?: ReturnType<typeof createMemoryStore>; __sb?: ResilientStore };

export function getStore(): Store & { degradedReason?: string | null } {
  g.__memStore ??= createMemoryStore();
  if (hasSupabase()) {
    g.__sb ??= createResilientStore(createSupabaseStore(createClient(config.supabaseUrl, config.supabaseServiceKey, { auth: { persistSession: false } })), g.__memStore);
    return g.__sb;
  }
  return g.__memStore;
}
