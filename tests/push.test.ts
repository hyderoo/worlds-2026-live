import { describe, expect, it } from "vitest";
import { allowedEndpoint, dueEvents, payloadFor } from "../src/lib/push";
import type { Match } from "../src/lib/types";

const base = { id: "m1", stage: "Swiss", block: "R1", previous: [], bestOf: 3, games: [], upstreamChangedAt: "2026-10-23T18:00:00Z", startTime: "2026-10-23T17:00:00Z", upstreamState: "unstarted", state: "scheduled" } as unknown as Match;
const teams = [{ code: "A", name: "Alpha", wins: 2, outcome: "win" }, { code: "B", name: "Beta", wins: 1, outcome: "loss" }];
const m = (o: Record<string, unknown>) => ({ ...base, teams, ...o }) as unknown as Match;

describe("push", () => {
  it("only allows real push services over https", () => {
    expect(allowedEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(allowedEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(allowedEndpoint("http://fcm.googleapis.com/x")).toBe(false);
    expect(allowedEndpoint("https://evil.example/x")).toBe(false);
    expect(allowedEndpoint("https://fcm.googleapis.com.evil.example/x")).toBe(false);
  });
  it("finds due events and skips TBD matchups", () => {
    const now = new Date("2026-10-23T16:50:00Z");
    expect(dueEvents([m({})], now).map((e) => e.kind)).toEqual(["soon"]);
    expect(dueEvents([m({ startTime: "2026-10-23T18:50:00Z" })], now)).toEqual([]);
    expect(dueEvents([m({ teams: [{ code: "TBD", name: "TBD" }, { code: "TBD", name: "TBD" }] })], now)).toEqual([]);
    expect(dueEvents([m({ teams: [{ code: "TBD", name: "TBD" }, teams[1]] })], now).map((e) => e.kind)).toEqual(["soon"]);
    expect(dueEvents([m({ state: "live", upstreamState: "inProgress" })], now).map((e) => e.kind)).toEqual(["live"]);
    expect(dueEvents([m({ state: "completed", upstreamState: "completed" })], new Date("2026-10-23T18:10:00Z")).map((e) => e.kind)).toEqual(["final"]);
    expect(dueEvents([m({ state: "completed", upstreamState: "completed" })], new Date("2026-10-24T18:10:00Z"))).toEqual([]);
  });
  it("leaves the score out of result alerts in spoiler mode", () => {
    const e = { key: "m1:final", kind: "final" as const, match: m({}) };
    expect(payloadFor(e, true, new Date()).body).not.toMatch(/\d/);
    expect(payloadFor(e, false, new Date()).body).toContain("2 - 1");
  });
});
