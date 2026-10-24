/**
 * Predictor series assembly: merge official Swiss pairings from the schedule
 * into the user's own prediction run.
 */
import type { Match } from "./types";
import { hasTbd } from "./match-state";
import { metEarlier, pairKey, swissOfficialFlow, type SwissRecord } from "./rematch";

/** One predictor series. round is 0-based inside its stage. official=true only for pairings copied from the official schedule. */
export type PredictorSeries = { id: string; stage: "swiss" | "ko"; round: number; a: string; b: string; w?: string; official?: boolean };

const SWISS_ROUNDS = 5;

function recAt(series: readonly PredictorSeries[], code: string, upto: number): SwissRecord {
  let w = 0;
  let l = 0;
  for (const s of series) {
    if (s.stage !== "swiss" || s.round >= upto || !s.w) continue;
    if (s.a !== code && s.b !== code) continue;
    if (s.w === code) w++;
    else l++;
  }
  return { w, l };
}

const sameRec = (x: SwissRecord, y: SwissRecord) => x.w === y.w && x.l === y.l;

/**
 * Round 1 always comes straight from the schedule. A later-round official
 * pairing is adopted only while it fits the user's own run: both teams must
 * carry exactly their official records into the round (every earlier result
 * picked and matching reality), and neither team may already be paired by the
 * user in that round. A manual pairing identical to the official one is
 * absorbed and its winner pick carried over; a conflicting manual pairing
 * stays and keeps the official series out of that run. Everything else is
 * left untouched, so a run that diverges from official results stays fully
 * hypothetical instead of mixing confirmed pairings into made-up standings.
 */
export function buildPredictorSeries(matches: readonly Match[], mine: readonly PredictorSeries[]): PredictorSeries[] {
  const { roundOf, recBefore } = swissOfficialFlow(matches);
  const user = mine.filter((s) => !s.id.startsWith("off-"));
  const savedOff = new Map(mine.filter((s) => s.id.startsWith("off-")).map((s) => [s.id, s] as const));
  const absorbed = new Set<string>();
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
    if (round > 0) {
      const cur: PredictorSeries[] = [...off, ...user.filter((u) => !absorbed.has(u.id))];
      const need = recBefore.get(m.id)!;
      if (!sameRec(recAt(cur, a, round), need.a) || !sameRec(recAt(cur, b, round), need.b)) continue;
      if (metEarlier(cur, a, b, round)) continue;
      const clash = user.find(
        (u) => !absorbed.has(u.id) && u.stage === "swiss" && u.round === round && (u.a === a || u.b === a || u.a === b || u.b === b),
      );
      if (clash) {
        if (pairKey(clash.a, clash.b) !== pairKey(a, b)) continue;
        absorbed.add(clash.id);
        if (clash.w) migratedW.set(`off-${m.id}`, clash.w);
      }
    }
    const key = `off-${m.id}`;
    off.push({ id: key, stage: "swiss", round, a, b, w: savedOff.get(key)?.w ?? migratedW.get(key), official: true });
  }
  return [...off, ...user.filter((u) => !absorbed.has(u.id))];
}