import type { Match, MatchState, TeamSide } from "./types";

/** If upstream says "inProgress" more than this many minutes before the scheduled start, we do not trust it. */
export const EARLY_LIVE_TOLERANCE_MIN = 30;
/** A match that claims to be live for longer than this is flagged unverified (a Bo5 rarely exceeds 5h). */
export const MAX_LIVE_HOURS = 8;

export function normalizeState(
  upstream: string,
  startTime: string,
  teams: readonly TeamSide[],
  now: Date = new Date(),
): MatchState {
  const start = new Date(startTime).getTime();
  const nowMs = now.getTime();
  switch (upstream) {
    case "completed": {
      const decided = teams.some((t) => t.outcome === "win");
      return decided ? "completed" : "unverified";
    }
    case "inProgress": {
      if (nowMs < start - EARLY_LIVE_TOLERANCE_MIN * 60_000) return "unverified";
      if (nowMs > start + MAX_LIVE_HOURS * 3_600_000) return "unverified";
      return "live";
    }
    case "unstarted":
      return "scheduled";
    default:
      return "unverified";
  }
}

export function isTbd(m: Pick<Match, "teams">): boolean {
  return m.teams.every((t) => t.code === "TBD");
}

export function hasTbd(m: Pick<Match, "teams">): boolean {
  return m.teams.some((t) => t.code === "TBD");
}

export function seriesWinsNeeded(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}

/**
 * The Play-In winner joins the Swiss field as its 16th team. Official signals only:
 * the Play-In team Riot actually scheduled into a Swiss series, else the winner of the
 * last completed Play-In series (the qualifying final). Null while undecided.
 */
export function playInWinner(matches: Match[], entries: { code: string; entry?: string }[]): string | null {
  const playIn = new Set(entries.filter((e) => e.entry === "Play-In").map((e) => e.code));
  for (const m of matches) {
    if (m.stage !== "Swiss") continue;
    const t = m.teams.find((x) => playIn.has(x.code));
    if (t) return t.code;
  }
  const lastCompleted = matches
    .filter((m) => m.stage === "Play-Ins" && m.state === "completed")
    .sort((a, b) => b.startTime.localeCompare(a.startTime))[0];
  return lastCompleted?.teams.find((t) => t.outcome === "win")?.code ?? null;
}

/** Swiss field = direct Swiss entries plus the Play-In winner once decided. */
export function swissField<T extends { code: string; entry?: string }>(matches: Match[], entries: T[]): T[] {
  const w = playInWinner(matches, entries);
  return entries.filter((e) => e.entry === "Swiss" || e.code === w);
}

/** Derive a W-L record per team using only completed, decided matches. */
export function computeRecords(matches: Match[], stage?: string) {
  const rec = new Map<string, { code: string; name: string; image?: string | null; w: number; l: number; gw: number; gl: number }>();
  for (const m of matches) {
    if (m.state !== "completed") continue;
    if (stage && m.stage !== stage) continue;
    for (const [i, t] of m.teams.entries()) {
      if (t.code === "TBD") continue;
      const o = m.teams[1 - i]!;
      const r = rec.get(t.code) ?? { code: t.code, name: t.name, image: t.image, w: 0, l: 0, gw: 0, gl: 0 };
      if (t.outcome === "win") r.w++;
      if (t.outcome === "loss") r.l++;
      r.gw += t.wins ?? 0;
      r.gl += o.wins ?? 0;
      rec.set(t.code, r);
    }
  }
  return [...rec.values()].sort((a, b) => b.w - a.w || a.l - b.l || b.gw - b.gl - (a.gw - a.gl) || a.code.localeCompare(b.code));
}

export function nextMatch(matches: Match[], now: Date = new Date()): Match | null {
  const upcoming = matches
    .filter((m) => m.state === "scheduled" && !hasTbd(m) && new Date(m.startTime).getTime() >= now.getTime())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  return upcoming[0] ?? null;
}

export function stageProgress(matches: Match[], stage: string) {
  const all = matches.filter((m) => m.stage === stage);
  const done = all.filter((m) => m.state === "completed").length;
  return { done, total: all.length };
}

export function currentStage(matches: Match[]): string {
  const live = matches.find((m) => m.state === "live");
  if (live) return live.stage;
  const next = matches.filter((m) => m.state === "scheduled").sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  if (next) return next.stage;
  return matches.at(-1)?.stage ?? "Worlds 2026";
}
