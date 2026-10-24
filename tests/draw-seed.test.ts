import { describe, expect, it } from "vitest";
import { applyDrawSeed } from "@/lib/snapshot";
import type { Match, TeamSide } from "@/lib/types";

const t = (code: string): TeamSide => ({ code, name: code, wins: null, outcome: null });
const mk = (id: string, startTime: string, a: TeamSide, b: TeamSide, state: Match["state"] = "scheduled"): Match => ({
  id, startTime, stage: "Swiss", block: "Swiss", previous: [], bestOf: 1, state, upstreamState: "unstarted", teams: [a, b], games: [], source: "lolesports", updatedAt: "", upstreamChangedAt: "",
});

describe("applyDrawSeed", () => {
  it("fills a TBD Swiss slot listed in the draw seed", () => {
    const { matches, applied } = applyDrawSeed([mk("1", "2026-10-24T17:00:00Z", t("TBD"), t("TBD"))]);
    expect(applied).toBe(true);
    expect(matches[0]!.teams.map((x) => x.code)).toEqual(["DK", "T1"]);
    expect(matches[0]!.teams[0]!.name).not.toBe("DK");
    expect(matches[0]!.source).toBe("seed");
  });
  it("never overwrites a slot the feed already filled", () => {
    const m = mk("1", "2026-10-24T17:00:00Z", t("GEN"), t("HLE"));
    const { matches, applied } = applyDrawSeed([m]);
    expect(applied).toBe(false);
    expect(matches[0]).toBe(m);
  });
  it("leaves slots outside the seed untouched", () => {
    const { matches, applied } = applyDrawSeed([mk("1", "2026-10-25T17:00:00Z", t("TBD"), t("TBD"))]);
    expect(applied).toBe(false);
    expect(matches[0]!.teams.map((x) => x.code)).toEqual(["TBD", "TBD"]);
  });
  it("reuses team images seen in other matches", () => {
    const img = "https://static.lolesports.com/teams/dk.png";
    const withImg: Match = { ...mk("0", "2026-10-23T21:00:00Z", { ...t("DK"), image: img }, t("G2"), "completed"), upstreamState: "completed" };
    const { matches } = applyDrawSeed([withImg, mk("1", "2026-10-24T17:00:00Z", t("TBD"), t("TBD"))]);
    expect(matches[1]!.teams[0]!.image).toBe(img);
  });
});
