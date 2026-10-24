import { describe, expect, it } from "vitest";
import { buildPredictorSeries, type PredictorSeries } from "@/lib/predictor";
import type { Match, TeamSide } from "@/lib/types";

const t = (code: string, outcome: "win" | "loss" | null = null): TeamSide => ({ code, name: code, wins: null, outcome });
let n = 0;
const mk = (a: string, b: string, day: string, hour: number, state: "scheduled" | "completed" = "scheduled", winner?: string): Match => ({
  id: `m${++n}`, startTime: `2026-10-${day}T${String(hour).padStart(2, "0")}:00:00Z`, stage: "Swiss", block: "Swiss",
  previous: [], bestOf: 1, state, upstreamState: state === "completed" ? "completed" : "unstarted",
  teams: [t(a, winner === a ? "win" : winner ? "loss" : null), t(b, winner === b ? "win" : winner ? "loss" : null)],
  games: [], source: "lolesports", updatedAt: "", upstreamChangedAt: "",
});

// Official Round 1 (completed) and Round 2 (scheduled) pairings, mirroring the feed shape.
const r1: [string, string][] = [["IG", "GEN"], ["TES", "HLE"], ["MKOI", "BLG"], ["KC", "AL"], ["DK", "G2"], ["TL", "CFO"], ["LOS", "T1"], ["LYON", "TSW"]];
const r1Winners = ["GEN", "HLE", "MKOI", "KC", "DK", "CFO", "T1", "LYON"];
const r2: [string, string][] = [["GEN", "HLE"], ["MKOI", "KC"], ["DK", "CFO"], ["T1", "LYON"], ["IG", "TES"], ["BLG", "AL"], ["G2", "TL"], ["LOS", "TSW"]];

function fixture(): Match[] {
  n = 0;
  const ms: Match[] = [];
  r1.forEach(([a, b], i) => ms.push(mk(a, b, "23", 17 + i, "completed", r1Winners[i])));
  r2.forEach(([a, b], i) => ms.push(mk(a, b, "24", 17 + i)));
  return ms;
}

const pickWinners = (matches: Match[], winners: string[]): PredictorSeries[] =>
  matches.filter((m) => m.state === "completed").map((m, i) => ({
    id: `off-${m.id}`, stage: "swiss", round: 0, a: m.teams[0].code, b: m.teams[1].code, w: winners[i], official: true,
  }));

const officialPicks = (matches: Match[]) => pickWinners(matches, r1Winners);

describe("buildPredictorSeries", () => {
  it("shows every announced round even before the user picks anything", () => {
    const out = buildPredictorSeries(fixture(), []);
    expect(out).toHaveLength(16);
    expect(out.every((s) => s.official)).toBe(true);
    expect(out.filter((s) => s.round === 1)).toHaveLength(8);
  });

  it("auto-fills announced pairings once picks match official results", () => {
    const matches = fixture();
    const out = buildPredictorSeries(matches, officialPicks(matches));
    const round2 = out.filter((s) => s.round === 1);
    expect(round2).toHaveLength(8);
    expect(round2.every((s) => s.official)).toBe(true);
    for (const [a, b] of r2) expect(round2.some((s) => s.a === a && s.b === b)).toBe(true);
  });

  it("still shows every official pairing when the run diverges from official results", () => {
    const matches = fixture();
    const diverged = [...r1Winners];
    diverged[0] = "IG"; // user says IG beat GEN; officially GEN won
    const out = buildPredictorSeries(matches, pickWinners(matches, diverged));
    const round2 = out.filter((s) => s.round === 1 && s.official);
    const pairs = round2.map((s) => [s.a, s.b].sort().join("-"));
    expect(pairs).toContain("GEN-HLE");
    expect(pairs).toContain("IG-TES");
    expect(round2).toHaveLength(8);
  });

  it("absorbs a manual pairing identical to the official one and carries the winner pick over", () => {
    const matches = fixture();
    const manual: PredictorSeries = { id: "u-9", stage: "swiss", round: 1, a: "GEN", b: "HLE", w: "GEN" };
    const out = buildPredictorSeries(matches, [...officialPicks(matches), manual]);
    expect(out.some((s) => s.id === "u-9")).toBe(false);
    const genHle = out.find((s) => s.round === 1 && s.a === "GEN" && s.b === "HLE");
    expect(genHle?.official).toBe(true);
    expect(genHle?.w).toBe("GEN");
    expect(out.filter((s) => s.round === 1)).toHaveLength(8);
  });

  it("keeps a conflicting manual pairing saved but shadowed, official pairings all shown", () => {
    const matches = fixture();
    const manual: PredictorSeries = { id: "u-7", stage: "swiss", round: 1, a: "GEN", b: "T1", w: "GEN" };
    const out = buildPredictorSeries(matches, [...officialPicks(matches), manual]);
    expect(out.some((s) => s.id === "u-7" && s.w === "GEN" && s.shadowed)).toBe(true);
    const official2 = out.filter((s) => s.round === 1 && s.official);
    const pairs = official2.map((s) => [s.a, s.b].sort().join("-"));
    expect(pairs).toContain("GEN-HLE");
    expect(pairs).toContain("LYON-T1");
    expect(official2).toHaveLength(8);
  });

  it("preserves a winner pick already saved under the official series id", () => {
    const matches = fixture();
    const r2match = matches.find((m) => m.teams[0].code === "GEN" && m.teams[1].code === "HLE")!;
    const saved: PredictorSeries = { id: `off-${r2match.id}`, stage: "swiss", round: 1, a: "GEN", b: "HLE", w: "HLE", official: true };
    const out = buildPredictorSeries(matches, [...officialPicks(matches), saved]);
    expect(out.find((s) => s.id === saved.id)?.w).toBe("HLE");
  });

  it("ignores TBD slots, knockout matches and rounds beyond the Swiss stage", () => {
    const matches = fixture();
    matches.push(mk("TBD", "TBD", "25", 17));
    matches.push({ ...mk("GEN", "T1", "30", 20), stage: "Knockouts" });
    const out = buildPredictorSeries(matches, officialPicks(matches));
    expect(out.every((s) => s.a !== "TBD" && s.b !== "TBD")).toBe(true);
    expect(out.every((s) => s.round < 5)).toBe(true);
  });
});
