import { describe, expect, it } from "vitest";
import { buildIcs, fold } from "../src/lib/ics";
import type { Match } from "../src/lib/types";

const m = (over: Partial<Match> = {}): Match => ({
  id: "m1", startTime: "2026-10-17T18:00:00.000Z", stage: "Play-Ins", block: "Round 1", previous: [], bestOf: 3, state: "completed", upstreamState: "completed",
  teams: [{ code: "T1", name: "T1", wins: 2, outcome: "win" }, { code: "G2", name: "G2 Esports", wins: 0, outcome: "loss" }] as unknown as Match["teams"],
  games: [], source: "lolesports", updatedAt: "2026-10-17T10:00:00.000Z", upstreamChangedAt: "2026-10-17T10:00:00.000Z", ...over,
});

describe("buildIcs", () => {
  it("writes UTC times, a stable UID and no scores", () => {
    const s = buildIcs([m()], { siteUrl: "https://x.test", feed: true, alarmMin: 15 });
    expect(s).toContain("DTSTART:20261017T180000Z");
    expect(s).toContain("DTEND:20261017T210000Z");
    expect(s).toContain("UID:m1@worlds-2026-live");
    expect(s).toContain("SUMMARY:T1 vs G2 Esports (Worlds 2026)");
    expect(s).not.toMatch(/2 - 0|2-0|win/i);
    expect(s).toContain("TRIGGER:-PT15M");
    expect(s).toContain("REFRESH-INTERVAL");
  });
  it("is deterministic and bumps SEQUENCE when upstream changes", () => {
    expect(buildIcs([m()], "https://x.test")).toBe(buildIcs([m()], "https://x.test"));
    const a = /SEQUENCE:(\d+)/.exec(buildIcs([m()], "https://x.test"))![1];
    const b = /SEQUENCE:(\d+)/.exec(buildIcs([m({ upstreamChangedAt: "2026-10-17T12:00:00.000Z" })], "https://x.test"))![1];
    expect(Number(b)).toBeGreaterThan(Number(a));
  });
  it("folds long lines to 75 octets with CRLF + space", () => {
    const f = fold("DESCRIPTION:" + "x".repeat(200));
    for (const l of f.split("\r\n")) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(f.replace(/\r\n /g, "")).toBe("DESCRIPTION:" + "x".repeat(200));
  });
  it("keeps a match with one TBD side, titled with TBD", () => {
    const tbd = m({ state: "scheduled", teams: [{ code: "TBD", name: "TBD", wins: null, outcome: null }, { code: "KC", name: "Karmine Corp", wins: null, outcome: null }] as unknown as Match["teams"] });
    const s = buildIcs([tbd], "https://x.test");
    expect(s).toContain("SUMMARY:TBD vs Karmine Corp (Worlds 2026)");
    expect(s).toContain("UID:m1@worlds-2026-live");
  });
});
