import { describe, expect, it } from "vitest";
import { cleanName, leaderboard, pickOpen, revealedPicks, type Group } from "../src/lib/groups";
import type { Match } from "../src/lib/types";

const mk = (id: string, state: string, start: string, win?: "A" | "B"): Match => ({ id, state, startTime: start, teams: [{ code: "A", name: "A", outcome: win === "A" ? "win" : win ? "loss" : undefined }, { code: "B", name: "B", outcome: win === "B" ? "win" : win ? "loss" : undefined }] }) as unknown as Match;
const g: Group = { id: "x", name: "t", createdAt: "", members: { u1: { name: "Ann", tokenHash: "", joinedAt: "", picks: { m1: "A", m2: "B", m3: "A" } }, u2: { name: "Bo", tokenHash: "", joinedAt: "", picks: { m1: "B" } } } };

describe("groups", () => {
  it("scores only completed matches", () => {
    const rows = leaderboard(g, [mk("m1", "completed", "2026-10-01T00:00:00Z", "A"), mk("m2", "completed", "2026-10-01T00:00:00Z", "A"), mk("m3", "scheduled", "2027-01-01T00:00:00Z")]);
    expect(rows[0]).toMatchObject({ name: "Ann", points: 1, settled: 2, picks: 3 });
    expect(rows[1]).toMatchObject({ name: "Bo", points: 0, settled: 1 });
  });
  it("closes picks at start and hides others' picks until then", () => {
    const now = new Date("2026-10-10T00:00:00Z");
    expect(pickOpen(mk("m3", "scheduled", "2026-10-11T00:00:00Z"), now)).toBe(true);
    expect(pickOpen(mk("m3", "scheduled", "2026-10-09T00:00:00Z"), now)).toBe(false);
    expect(pickOpen(mk("m3", "live", "2026-10-11T00:00:00Z"), now)).toBe(false);
    const r = revealedPicks(g, [mk("m1", "completed", "2026-10-01T00:00:00Z", "A"), mk("m3", "scheduled", "2026-10-11T00:00:00Z")], now);
    expect(Object.keys(r)).toEqual(["m1"]);
  });
  it("cleans display names", () => {
    expect(cleanName("  <b>Ann</b>\n  Lee ", 24)).toBe("bAnn/b Lee");
    expect(cleanName("x".repeat(99), 10)).toHaveLength(10);
  });
});
