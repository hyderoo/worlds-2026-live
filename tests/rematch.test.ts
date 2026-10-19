import { describe, expect, it } from "vitest";
import { metEarlier, officialSwissMeetings, pairKey } from "@/lib/rematch";
import type { Match, TeamSide } from "@/lib/types";

const t = (code: string): TeamSide => ({ code, name: code, wins: null, outcome: null });
const mk = (id: string, a: string, b: string, startTime: string): Match => ({
  id, startTime, stage: "Swiss", block: "Swiss", previous: [], bestOf: 1, state: "scheduled",
  upstreamState: "unstarted", teams: [t(a), t(b)], games: [], source: "lolesports", updatedAt: "", upstreamChangedAt: "",
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

describe("officialSwissMeetings", () => {
  const tz = "Asia/Jakarta";
  it("maps matchdays to round indices and keeps the earliest", () => {
    const ms = [
      mk("r1", "GEN", "IG", "2026-10-23T17:00:00Z"), // 24 Oct 00:00 WIB -> round 0
      mk("r2", "GEN", "DK", "2026-10-24T17:00:00Z"), // 25 Oct 00:00 WIB -> round 1
      mk("r2b", "DK", "GEN", "2026-10-25T17:00:00Z"), // same pair again later, earliest kept
    ];
    const met = officialSwissMeetings(ms, tz);
    expect(met.get(pairKey("GEN", "IG"))).toBe(0);
    expect(met.get(pairKey("GEN", "DK"))).toBe(1);
  });
  it("ignores series with a TBD side and non-Swiss stages", () => {
    const ms = [
      mk("tbd", "TBD", "GEN", "2026-10-23T17:00:00Z"),
      { ...mk("ko", "GEN", "DK", "2026-10-30T17:00:00Z"), stage: "Knockouts" },
    ];
    const met = officialSwissMeetings(ms, tz);
    expect(met.size).toBe(0);
  });
});
