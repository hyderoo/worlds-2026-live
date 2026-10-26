import { describe, expect, it } from "vitest";
import { fmtDateTime, dayKey } from "@/lib/format";
import { swissStatus, waitingForSwissDraw } from "@/lib/swiss-progress";
import { computeRecords } from "@/lib/match-state";
import type { Match } from "@/lib/types";

function match(id: string, a: string, b: string, state: Match["state"] = "completed", bestOf = 1): Match {
  return { id, stage: "Swiss", block: "Swiss", startTime: `2026-10-2${id}T17:00:00Z`, state, bestOf, previous: [], games: [], source: "lolesports", upstreamState: state, updatedAt: "", upstreamChangedAt: "", teams: [{ code: a, name: a, wins: state === "completed" ? Math.ceil(bestOf / 2) : null, outcome: state === "completed" ? "win" : null }, { code: b, name: b, wins: 0, outcome: state === "completed" ? "loss" : null }] };
}

describe("Swiss display dates", () => {
  it("distinguishes the two midnight matches on consecutive WIB dates", () => {
    expect(fmtDateTime("2026-10-25T17:00:00Z", "Asia/Jakarta")).toBe("Mon 26 Oct, 00:00 WIB");
    expect(fmtDateTime("2026-10-26T17:00:00Z", "Asia/Jakarta")).toBe("Tue 27 Oct, 00:00 WIB");
  });
  it("moves across midnight in the selected timezone, not the server timezone", () => {
    expect(dayKey("2026-10-25T16:59:00Z", "Asia/Jakarta")).toBe("2026-10-25");
    expect(dayKey("2026-10-25T17:00:00Z", "Asia/Jakarta")).toBe("2026-10-26");
    expect(fmtDateTime("2026-10-25T17:00:00Z", "UTC")).toBe("Sun 25 Oct, 17:00 UTC");
  });
});

describe("Swiss advancement and waiting draw members", () => {
  const ms = [match("1", "GEN", "IG"), match("2", "GEN", "HLE"), match("3", "GEN", "LYON", "completed", 3), match("4", "LYON", "A"), match("5", "LYON", "B")];
  it("counts series wins, not individual games, for 3-0 qualification", () => {
    const gen = computeRecords(ms, "Swiss").find((r) => r.code === "GEN")!;
    expect(gen.w).toBe(3);
    expect(gen.gw).toBe(4);
    expect(swissStatus(gen.w, gen.l)).toBe("qualified");
    expect(swissStatus(2, 0)).toBe("active");
    expect(swissStatus(1, 3)).toBe("eliminated");
  });
  it("keeps a 2-1 loser visible before the next draw without making a pairing", () => {
    expect(waitingForSwissDraw(ms, "2-1", []).map((r) => r.code)).toEqual(["LYON"]);
    expect(waitingForSwissDraw(ms, "3-0", [])).toEqual([]);
  });
  it("removes a waiting chip once its actual pairing is announced", () => {
    expect(waitingForSwissDraw(ms, "2-1", [match("6", "LYON", "MKOI", "scheduled", 3)])).toEqual([]);
  });
  it("does not advance teams from live, unverified or scheduled scores", () => {
    for (const state of ["scheduled", "live", "unverified"] as const) {
      const altered = [...ms.slice(0, 2), { ...ms[2]!, state }];
      expect(computeRecords(altered, "Swiss").find((r) => r.code === "GEN")?.w).toBe(2);
    }
  });
});
