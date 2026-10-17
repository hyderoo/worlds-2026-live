import { fetchGameStats, fetchGames, fetchUpstream, fingerprint } from "./upstream";
import { refreshLiquipedia } from "./liquipedia";
import { sendDueNotifications } from "./push";
import type { Store } from "./store";
import type { Match, SyncRun } from "./types";

export type SyncDeps = {
  fetchUpstream: typeof fetchUpstream;
  fetchGames: typeof fetchGames;
  fetchGameStats: typeof fetchGameStats;
  now: () => Date;
  maxGameFetches: number;
};

const defaults: SyncDeps = { fetchUpstream, fetchGames, fetchGameStats, now: () => new Date(), maxGameFetches: 6 };

/**
 * One idempotent sync pass. Rules:
 * - Upstream is the only writer of match facts. Same input twice changes nothing (fingerprint compare).
 * - `upstreamChangedAt` only moves when the fingerprint changes; manual overrides compare against it.
 * - Any failure is recorded and the previously stored data stays in place (fallback to latest cache).
 */
export async function runSync(store: Store, trigger: string, deps: Partial<SyncDeps> = {}): Promise<SyncRun> {
  const d = { ...defaults, ...deps };
  const started = d.now();
  const run: SyncRun = {
    id: `run-${started.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    startedAt: started.toISOString(),
    finishedAt: null,
    ok: false,
    trigger,
    matchesSeen: 0,
    matchesChanged: 0,
    attempts: 0,
    error: null,
  };
  try {
    const up = await d.fetchUpstream(started);
    run.attempts = up.attempts;
    run.matchesSeen = up.matches.length;
    const existing = new Map((await store.loadMatches()).map((m) => [m.id, m]));
    const changed: Match[] = [];
    for (const m of up.matches) {
      const prev = existing.get(m.id);
      if (prev && fingerprint(prev) === fingerprint(m)) {
        // unchanged upstream: keep stored games/timestamps
        continue;
      }
      changed.push({ ...m, games: prev?.games ?? [], upstreamChangedAt: m.updatedAt });
    }
    // fetch games (VODs) for decided/live matches that have none or whose result changed
    let budget = d.maxGameFetches;
    const withGames: Match[] = [];
    const pool = [...changed, ...[...existing.values()].filter((e) => e.games.length === 0 && e.upstreamState === "completed" && !changed.some((c) => c.id === e.id))];
    for (const m of pool) {
      if (budget <= 0) break;
      if (m.upstreamState !== "completed" && m.upstreamState !== "inProgress") continue;
      try {
        const games = await d.fetchGames(m.id);
        budget--;
        withGames.push({ ...m, games });
      } catch {
        /* VOD details are optional; match facts are still stored */
      }
    }
    const byId = new Map(changed.map((m) => [m.id, m]));
    for (const m of withGames) byId.set(m.id, m);
    const toWrite = [...byId.values()];
    await store.upsertMatches(toWrite);
    await syncChampions(store, [...byId.values(), ...[...existing.values()].filter((e) => !byId.has(e.id))], d);
    run.matchesChanged = changed.length;
    run.ok = true;
    if (trigger !== "lazy" && !deps.fetchUpstream) await sendDueNotifications(store, [...byId.values()], d.now()).catch(() => undefined);
    // Unofficial secondary source, cron/manual ticks only; never affects the official sync result.
    if (trigger !== "lazy" && !deps.fetchUpstream) await refreshLiquipedia(store).catch(() => undefined);
  } catch (e) {
    run.error = e instanceof Error ? e.message.slice(0, 300) : "unknown error";
  }
  run.finishedAt = d.now().toISOString();
  try {
    await store.recordRun(run);
  } catch {
    /* history is best-effort */
  }
  return run;
}

/** Champion picks for games we have not stored yet (bounded per run). Failures here never fail the sync. */
async function syncChampions(store: Store, matches: Match[], d: SyncDeps, budget = 10) {
  try {
    const idToCode = new Map<string, string>();
    for (const m of matches) for (const t of m.teams) if (t.id && t.code !== "TBD") idToCode.set(t.id, t.code);
    const have = await store.loadGameStats();
    for (const m of matches) {
      if (m.upstreamState !== "completed" && m.upstreamState !== "inProgress") continue;
      const known = new Set((have[m.id] ?? []).map((g) => g.id));
      const byId = new Map((have[m.id] ?? []).map((g) => [g.id, g]));
      // New games, live games (every tick), and finished games whose last stored frame is not final yet.
      const todo = m.games.filter((g) => (g.state === "completed" || g.state === "inProgress") && (!known.has(g.id) || g.state === "inProgress" || byId.get(g.id)?.sum?.state !== "finished"));
      if (todo.length === 0) continue;
      const got = [...(have[m.id] ?? [])];
      let dirty = false;
      for (const g of todo) {
        if (budget <= 0) break;
        budget--;
        try {
          const s = await d.fetchGameStats(g.id, g.n, idToCode);
          if (s) { const i = got.findIndex((x) => x.id === s.id); const prev = i >= 0 ? got[i] : undefined; const next = { ...s, sum: s.sum ?? prev?.sum }; if (i >= 0) got[i] = next; else got.push(next); dirty = true; }
        } catch {
          /* try again next run */
        }
      }
      if (dirty) await store.saveGameStats(m.id, got.sort((a, b) => a.n - b.n));
    }
  } catch {
    /* optional enrichment */
  }
}
