import seedTeams from "@/data/teams-seed.json";
import seedGames from "@/data/games-seed.json";
import { normalizeState } from "./match-state";
import { runSync } from "./sync";
import { getStore, type Override, type Store } from "./store";
import { config } from "./config";
import type { GameStats, Match, Snapshot, SyncRun, Team } from "./types";

export function applyOverrides(matches: Match[], overrides: Override[]): { matches: Match[]; stale: string[] } {
  const ov = new Map(overrides.map((o) => [o.matchId, o]));
  const stale: string[] = [];
  const out = matches.map((m) => {
    const o = ov.get(m.id);
    if (!o) return m;
    // never silently overwrite newer verified upstream data
    if (o.createdAt < m.upstreamChangedAt) {
      stale.push(m.id);
      return m;
    }
    const p = o.patch;
    const teams = m.teams.map((t, i) => ({ ...t })) as Match["teams"];
    if (p.wins) {
      teams[0].wins = p.wins[0];
      teams[1].wins = p.wins[1];
      teams[0].outcome = p.wins[0] === p.wins[1] ? null : p.wins[0] > p.wins[1] ? "win" : "loss";
      teams[1].outcome = p.wins[0] === p.wins[1] ? null : p.wins[1] > p.wins[0] ? "win" : "loss";
    }
    return { ...m, teams, startTime: p.startTime ?? m.startTime, bestOf: p.bestOf ?? m.bestOf, source: "manual" as const };
  });
  return { matches: out, stale };
}

function seedTeamList(): Team[] {
  return (seedTeams as Team[]).map((t) => ({ ...t }));
}

/** Teams: seed roster data (from Riot's official team data) enriched with logos seen in matches. */
function buildTeams(matches: Match[]): Team[] {
  const teams = seedTeamList();
  const img = new Map<string, string>();
  for (const m of matches) for (const t of m.teams) if (t.image && t.code !== "TBD") img.set(t.code, t.image);
  return teams.map((t) => ({ ...t, image: img.get(t.code) ?? null }));
}

function mergeStats(fromStore: Record<string, GameStats[]>): Record<string, GameStats[]> {
  const seed = seedGames as unknown as Record<string, GameStats[]>;
  return { ...seed, ...fromStore };
}

let lazy: { at: number; promise: Promise<void> } | null = null;

/** Cache-only mode has no cron-fed database, so refresh lazily (rate limited by the cache TTL). */
async function lazyRefresh(store: Store) {
  const now = Date.now();
  if (lazy && now - lazy.at < config.cacheTtlMs) return lazy.promise;
  lazy = { at: now, promise: runSync(store, "lazy").then(() => undefined) };
  return lazy.promise;
}

export function deriveSync(runs: SyncRun[], storage: "supabase" | "memory"): Snapshot["sync"] {
  const lastOk = runs.find((r) => r.ok);
  const last = runs[0];
  let connection: Snapshot["sync"]["connection"] = "unknown";
  if (last) {
    if (last.ok) connection = "ok";
    else connection = lastOk ? "degraded" : "down";
  }
  return {
    lastSuccessAt: lastOk?.finishedAt ?? null,
    lastAttemptAt: last?.startedAt ?? null,
    lastError: last && !last.ok ? last.error : null,
    connection,
    storage,
    upstream: "Riot Games LoL Esports (lolesports.com)",
  };
}

export async function buildSnapshot(opts: { refresh?: boolean } = {}): Promise<Snapshot> {
  const store = getStore();
  if (store.kind === "memory" && opts.refresh !== false) await lazyRefresh(store);
  const [raw, overrides, recaps, stats, runs] = await Promise.all([
    store.loadMatches(), store.loadOverrides(), store.loadRecaps(), store.loadGameStats(), store.recentRuns(10),
  ]);
  const now = new Date();
  const { matches, stale } = applyOverrides(raw, overrides);
  const live = matches
    .map((m) => ({ ...m, state: normalizeState(m.upstreamState, m.startTime, m.teams, now) }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));
  const notes: string[] = [];
  if (live.some((m) => m.state === "unverified")) notes.push("Some matches report a status that does not fit their schedule. They are shown as unverified until the source confirms them.");
  if (live.length === 0) notes.push("No match data is available yet. The first successful sync will populate this page.");
  return {
    generatedAt: now.toISOString(),
    matches: live,
    teams: buildTeams(live),
    gameStats: mergeStats(stats),
    recaps,
    sync: deriveSync(runs, store.kind),
    staleOverrides: stale,
    dataNotes: notes,
  };
}
