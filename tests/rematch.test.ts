import { describe, expect, it } from "vitest";
import { metEarlier, officialSwissMeetings, pairKey, swissOfficialFlow } from "@/lib/rematch";
import type { Match, TeamSide } from "@/lib/types";

const t = (code: string, outcome: "win" | "loss" | null = null): TeamSide => ({ code, name: code, wins: null, outcome });
const mk = (id: string, a: string, b: string, startTime: string, state: "scheduled" | "completed" = "scheduled", wa?: "a" | "b"): Match => ({
  id, startTime, stage: "Swiss", block: "Swiss", previous: [], bestOf: 1, state,
  upstreamState: state === "completed" ? "completed" : "unstarted",
  teams: state === "completed" && wa ? [t(a, wa === "a" ? "win" : "loss"), t(b, wa === "a" ? "loss" : "win")] : [t(a), t(b)],
  games: [], source: "lolesports", updatedAt: "", upstreamChangedAt: "",
});

describe("pairKey", () => {
  it("is order-independent", () => {
    expect(pairKey("GEN", "DK")).toBe(pairKey("DK", "GEN"));
  });
});

describe("metEarlier", () => {
  const series = [
    { round: 0, a: "GEN", b: "IG" },
    { round: 1, a: "GEN", b: "DK" },
  ];
  it("blocks teams that met in an earlier round", () => {
    expect(metEarlier(series, "IG", "GEN", 2)).toBe(true);
    expect(metEarlier(series, "DK", "GEN", 2)).toBe(true);
  });
  it("allows teams that never met", () => {
    expect(metEarlier(series, "IG", "DK", 2)).toBe(false);
  });
  it("ignores meetings in the same or a later round", () => {
    expect(metEarlier(series, "GEN", "DK", 1)).toBe(false);
    expect(metEarlier(series, "GEN", "IG", 0)).toBe(false);
  });
  it("treats pairing a team with itself as met", () => {
    expect(metEarlier(series, "GEN", "GEN", 3)).toBe(true);
  });
});

describe("swissOfficialFlow", () => {
  it("derives rounds from completed-series counts, not calendar days", () => {
    const ms = [
      // both R1 series on the same UTC day, then R2 the next day: day-mapping would collapse the first two
      mk("r1a", "GEN", "IG", "2026-10-23T17:00:00Z", "completed", "a"),
      mk("r1b", "DK", "G2", "2026-10-23T18:00:00Z", "completed", "a"),
      mk("r2a", "GEN", "DK", "2026-10-24T17:00:00Z"),
      mk("r2b", "G2", "IG", "2026-10-24T18:00:00Z"),
    ];
    const { roundOf, recBefore } = swissOfficialFlow(ms);
    expect(roundOf.get("r1a")).toBe(0);
    expect(roundOf.get("r1b")).toBe(0);
    expect(roundOf.get("r2a")).toBe(1);
    expect(roundOf.get("r2b")).toBe(1);
    expect(recBefore.get("r2a")).toEqual({ a: { w: 1, l: 0 }, b: { w: 1, l: 0 } });
    expect(recBefore.get("r2b")).toEqual({ a: { w: 0, l: 1 }, b: { w: 0, l: 1 } });
  });
  it("keeps a midnight-straddling matchday in one round", () => {
    const ms = [
      mk("r1a", "GEN", "IG", "2026-10-23T23:00:00Z", "completed", "a"),
      mk("r1b", "DK", "G2", "2026-10-24T01:00:00Z", "completed", "b"),
    ];
    const { roundOf } = swissOfficialFlow(ms);
    expect(roundOf.get("r1a")).toBe(0);
    expect(roundOf.get("r1b")).toBe(0);
  });
});

describe("officialSwissMeetings", () => {
  it("maps pairs to their earliest official round via the result flow", () => {
    const ms = [
      mk("r1", "GEN", "IG", "2026-10-23T17:00:00Z", "completed", "a"),
      mk("r1b", "DK", "G2", "2026-10-23T18:00:00Z", "completed", "a"),
      mk("r2", "GEN", "DK", "2026-10-24T17:00:00Z"),
      mk("r2b", "DK", "GEN", "2026-10-25T17:00:00Z"), // same pair again later, earliest kept
    ];
    const met = officialSwissMeetings(ms);
    expect(met.get(pairKey("GEN", "IG"))).toBe(0);
    expect(met.get(pairKey("GEN", "DK"))).toBe(1);
  });
  it("ignores series with a TBD side and non-Swiss stages", () => {
    const ms = [
      mk("tbd", "TBD", "GEN", "2026-10-23T17:00:00Z"),
      { ...mk("ko", "GEN", "DK", "2026-10-30T17:00:00Z"), stage: "Knockouts" },
    ];
    const met = officialSwissMeetings(ms);
    expect(met.size).toBe(0);
  });
});
