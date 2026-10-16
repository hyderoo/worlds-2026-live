import { describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/store";
import { runSync } from "@/lib/sync";
import { applyOverrides } from "@/lib/snapshot";
import { withRetry } from "@/lib/retry";
import { deriveSync } from "@/lib/snapshot";
import type { Match } from "@/lib/types";

const match = (over: Partial<Match> = {}): Match => ({
  id: "m1", startTime: "2026-10-17T18:00:00Z", stage: "Play-Ins", block: "Play-Ins", previous: [], bestOf: 5, state: "scheduled", upstreamState: "unstarted",
  teams: [{ code: "A", name: "A", wins: 0, outcome: null }, { code: "B", name: "B", wins: 0, outcome: null }],
  games: [], source: "lolesports", updatedAt: "2026-10-17T00:00:00.000Z", upstreamChangedAt: "2026-10-17T00:00:00.000Z", ...over,
});
const deps = (ms: Match[], fail = false) => ({
  fetchUpstream: async () => { if (fail) throw new Error("boom"); return { matches: ms, attempts: 1, stages: ["Play-Ins"] }; },
  fetchGames: async () => [],
  now: () => new Date("2026-10-17T01:00:00Z"),
});

describe("runSync", () => {
  it("is idempotent: the same upstream data changes nothing the second time", async () => {
    const store = createMemoryStore();
    const first = await runSync(store, "t", deps([match()]));
    const second = await runSync(store, "t", deps([match()]));
    expect(first.matchesChanged).toBe(1);
    expect(second.matchesChanged).toBe(0);
    expect((await store.loadMatches()).length).toBe(1);
  });

  it("moves upstreamChangedAt only when upstream data changes", async () => {
    const store = createMemoryStore();
    await runSync(store, "t", deps([match()]));
    const done = match({ upstreamState: "completed", teams: [{ code: "A", name: "A", wins: 3, outcome: "win" }, { code: "B", name: "B", wins: 1, outcome: "loss" }], updatedAt: "2026-10-17T02:00:00.000Z", upstreamChangedAt: "x" });
    await runSync(store, "t", deps([done]));
    const [m] = await store.loadMatches();
    expect(m?.teams[0].outcome).toBe("win");
    expect(m?.upstreamChangedAt).toBe("2026-10-17T02:00:00.000Z");
  });

  it("keeps cached data and records the error when upstream fails", async () => {
    const store = createMemoryStore();
    await runSync(store, "t", deps([match()]));
    const bad = await runSync(store, "t", deps([], true));
    expect(bad.ok).toBe(false);
    expect(bad.error).toContain("boom");
    expect((await store.loadMatches()).length).toBe(1);
    const sync = deriveSync(await store.recentRuns(5), "memory");
    expect(sync.connection).toBe("degraded");
    expect(sync.lastError).toContain("boom");
    expect(sync.lastSuccessAt).not.toBeNull();
  });
});

describe("applyOverrides", () => {
  const o = { matchId: "m1", patch: { wins: [2, 0] as [number, number] }, author: "admin", createdAt: "2026-10-17T03:00:00.000Z" };
  it("applies a manual override made after the last upstream change", () => {
    const { matches, stale } = applyOverrides([match()], [o]);
    expect(matches[0]?.teams[0].wins).toBe(2);
    expect(matches[0]?.source).toBe("manual");
    expect(stale).toEqual([]);
  });
  it("does not overwrite newer upstream data", () => {
    const { matches, stale } = applyOverrides([match({ upstreamChangedAt: "2026-10-17T04:00:00.000Z" })], [o]);
    expect(matches[0]?.teams[0].wins).toBe(0);
    expect(stale).toEqual(["m1"]);
  });
});

describe("withRetry", () => {
  it("retries with backoff and reports attempts", async () => {
    let n = 0;
    const r = await withRetry(async () => { if (++n < 3) throw new Error("x"); return "ok"; }, { sleep: async () => {} });
    expect(r).toEqual({ value: "ok", attempts: 3 });
  });
  it("throws after the last attempt", async () => {
    await expect(withRetry(async () => { throw new Error("nope"); }, { attempts: 2, sleep: async () => {} })).rejects.toThrow("nope");
  });
});
