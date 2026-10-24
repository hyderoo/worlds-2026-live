/**
 * Predictor series assembly: merge official Swiss pairings from the schedule
 * into the user's own prediction run.
 */
import type { Match } from "./types";
import { hasTbd } from "./match-state";
import { pairKey, swissOfficialFlow } from "./rematch";

/** One predictor series. round is 0-based inside its stage. official=true only for pairings copied from the official schedule. */
export type PredictorSeries = { id: string; stage: "swiss" | "ko"; round: number; a: string; b: string; w?: string; official?: boolean; shadowed?: boolean };

const SWISS_ROUNDS = 5;

/**
 * Every announced Swiss pairing is always part of the run, whatever the user
 * picked in earlier rounds. Official series are keyed by match id, so winner
 * picks saved on them persist. A user's own pairing identical to an official
 * one is absorbed and its winner pick carried over. A user's own pairing that
 * clashes with an official one (same team, different opponent, same round) is
 * never deleted: it stays in storage but is flagged `shadowed`, so the UI
 * hides it while the official pairing is the reality for that team.
 */
export function buildPredictorSeries(matches: readonly Match[], mine: readonly PredictorSeries[]): PredictorSeries[] {
  const { roundOf } = swissOfficialFlow(matches);
  const user = mine.filter((s) => !s.id.startsWith("off-"));
  const savedOff = new Map(mine.filter((s) => s.id.startsWith("off-")).map((s) => [s.id, s] as const));
  const absorbed = new Set<string>();
  const shadowed = new Set<string>();
  const migratedW = new Map<string, string>();
  const off: PredictorSeries[] = [];
  const officialMs = matches
    .filter((m) => m.stage === "Swiss" && !hasTbd(m) && roundOf.has(m.id))
    .map((m) => ({ m, round: roundOf.get(m.id)! }))
    .filter((x) => x.round < SWISS_ROUNDS)
    .sort((x, y) => x.round - y.round || x.m.startTime.localeCompare(y.m.startTime) || x.m.id.localeCompare(y.m.id));
  for (const { m, round } of officialMs) {
    const a = m.teams[0].code;
    const b = m.teams[1].code;
    const key = `off-${m.id}`;
    if (round > 0) {
      for (const u of user) {
        if (absorbed.has(u.id) || u.stage !== "swiss" || u.round !== round) continue;
        if (u.a !== a && u.b !== a && u.a !== b && u.b !== b) continue;
        if (pairKey(u.a, u.b) === pairKey(a, b)) {
          absorbed.add(u.id);
          if (u.w) migratedW.set(key, u.w);
        } else shadowed.add(u.id);
      }
    }
    off.push({ id: key, stage: "swiss", round, a, b, w: savedOff.get(key)?.w ?? migratedW.get(key), official: true });
  }
  return [...off, ...user.filter((u) => !absorbed.has(u.id)).map((u) => (shadowed.has(u.id) ? { ...u, shadowed: true } : u))];
}
