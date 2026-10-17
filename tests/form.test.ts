import { describe, expect, it } from "vitest";
import { headToHead, streak, teamForm } from "../src/lib/form";
import type { Match } from "../src/lib/types";

const mk = (id: string, t: string, a: string, b: string, aw: number, bw: number, state = "completed"): Match => ({
  id, startTime: t, stage: "Swiss", block: "R", previous: [], bestOf: 3, state, upstreamState: state, games: [], source: "lolesports", updatedAt: t, upstreamChangedAt: t,
  teams: [{ code: a, name: a, wins: aw, outcome: state === "completed" ? (aw > bw ? "win" : "loss") : null }, { code: b, name: b, wins: bw, outcome: state === "completed" ? (bw > aw ? "win" : "loss") : null }],
}) as unknown as Match;

const ms = [mk("1", "2026-10-01T00:00:00Z", "A", "B", 2, 0), mk("2", "2026-10-02T00:00:00Z", "C", "A", 2, 1), mk("3", "2026-10-03T00:00:00Z", "A", "C", 2, 0), mk("4", "2026-10-04T00:00:00Z", "A", "B", 0, 0, "scheduled")];

describe("form", () => {
  it("lists only completed matches, newest first, with own score first", () => {
    const f = teamForm(ms, "A");
    expect(f.map((x) => x.matchId)).toEqual(["3", "2", "1"]);
    expect(f[1]).toMatchObject({ won: false, gw: 1, gl: 2 });
  });
  it("streak", () => { expect(streak(teamForm(ms, "A"))).toEqual({ won: true, n: 1 }); expect(streak([])).toBeNull(); });
  it("head-to-head ignores unfinished matches and gives zeros when none", () => {
    expect(headToHead(ms, "A", "B")).toMatchObject({ aw: 1, bw: 0, ag: 2, bg: 0 });
    expect(headToHead(ms, "B", "C").meetings).toEqual([]);
  });
});
