/**
 * Swiss-stage rematch rule: two teams that already met (in the official
 * schedule or in the user's own predicted run) may not be paired again in a
 * later Swiss round. Knockouts are intentionally not covered here.
 */
import type { Match } from "./types";
import { hasTbd } from "./match-state";
import { dayKey } from "./format";

export type SwissSeriesLike = { round: number; a: string; b: string };

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

/**
 * Official Swiss meetings from the schedule snapshot, mapped to a round index
 * by matchday order (earliest matchday = round 0). Returns the earliest
 * official round in which each pair met, so a user pairing is blocked only by
 * official meetings from earlier rounds. Series with a TBD side are ignored.
 */
export function officialSwissMeetings(matches: readonly Match[], tz: string): Map<string, number> {
  const swiss = matches.filter((m) => m.stage === "Swiss" && !hasTbd(m));
  const days = [...new Set(swiss.map((m) => dayKey(m.startTime, tz)))].sort();
  const roundOf = new Map(days.map((d, i) => [d, i] as const));
  const met = new Map<string, number>();
  for (const m of swiss) {
    const key = pairKey(m.teams[0].code, m.teams[1].code);
    const r = roundOf.get(dayKey(m.startTime, tz))!;
    const prev = met.get(key);
    if (prev === undefined || r < prev) met.set(key, r);
  }
  return met;
}
