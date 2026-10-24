/**
 * Swiss-stage rematch rule: two teams that already met (in the official
 * schedule or in the user's own predicted run) may not be paired again in a
 * later Swiss round. Knockouts are intentionally not covered here.
 */
import type { Match } from "./types";
import { hasTbd } from "./match-state";

export type SwissSeriesLike = { round: number; a: string; b: string };
export type SwissRecord = { w: number; l: number };

/** Canonical key for an unordered pair of team codes. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * True when `a` and `b` already met in a Swiss round strictly before `round`.
 * `series` is the predictor's Swiss series list (official round 1 plus the
 * user's own pairings). Pairing a team with itself is always "met".
 */
export function metEarlier(series: readonly SwissSeriesLike[], a: string, b: string, round: number): boolean {
  if (a === b) return true;
  const key = pairKey(a, b);
  return series.some((s) => s.round < round && pairKey(s.a, s.b) === key);
}

export type SwissFlow = {
  /** Official 0-based round index per match id: how many official series each team had already completed. */
  roundOf: Map<string, number>;
  /** Official W-L record each team carried into the match, keyed by match id. */
  recBefore: Map<string, { a: SwissRecord; b: SwissRecord }>;
};

/**
 * Official Swiss round structure, derived from the result flow rather than
 * calendar days: a series belongs to round N when its teams had each completed
 * N official series before it. Matchdays that straddle midnight in the
 * viewer's timezone therefore stay in one round. Series with a TBD side are
 * skipped (their round follows once the slot is filled).
 */
export function swissOfficialFlow(matches: readonly Match[]): SwissFlow {
  const swiss = matches
    .filter((m) => m.stage === "Swiss" && !hasTbd(m))
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));
  const played = new Map<string, SwissRecord>();
  const recOf = (code: string): SwissRecord => played.get(code) ?? { w: 0, l: 0 };
  const roundOf = new Map<string, number>();
  const recBefore = new Map<string, { a: SwissRecord; b: SwissRecord }>();
  for (const m of swiss) {
    const [ta, tb] = m.teams;
    const a = recOf(ta.code);
    const b = recOf(tb.code);
    roundOf.set(m.id, Math.min(a.w + a.l, b.w + b.l));
    recBefore.set(m.id, { a, b });
    if (m.state === "completed") {
      played.set(ta.code, { w: a.w + (ta.outcome === "win" ? 1 : 0), l: a.l + (ta.outcome === "loss" ? 1 : 0) });
      played.set(tb.code, { w: b.w + (tb.outcome === "win" ? 1 : 0), l: b.l + (tb.outcome === "loss" ? 1 : 0) });
    }
  }
  return { roundOf, recBefore };
}

/**
 * Official Swiss meetings from the schedule snapshot, with each pair mapped to
 * the earliest official round in which the two teams met (or are paired to
 * meet), so a user pairing is blocked only by official meetings from earlier
 * rounds. Series with a TBD side are ignored.
 */
export function officialSwissMeetings(matches: readonly Match[]): Map<string, number> {
  const { roundOf } = swissOfficialFlow(matches);
  const met = new Map<string, number>();
  for (const m of matches) {
    if (m.stage !== "Swiss" || hasTbd(m)) continue;
    const r = roundOf.get(m.id);
    if (r === undefined) continue;
    const key = pairKey(m.teams[0].code, m.teams[1].code);
    const prev = met.get(key);
    if (prev === undefined || r < prev) met.set(key, r);
  }
  return met;
}
