import { describe, expect, it } from "vitest";
import { computeRecords, normalizeState, nextMatch, playInWinner, swissField } from "@/lib/match-state";
import type { Match, TeamSide } from "@/lib/types";

const t = (code: string, wins: number | null, outcome: "win" | "loss" | null): TeamSide => ({ code, name: code, wins, outcome });
const start = "2026-10-17T18:00:00Z";
const at = (iso: string) => new Date(iso);

describe("normalizeState", () => {
  it("maps unstarted to scheduled", () => {
    expect(normalizeState("unstarted", start, [t("A", 0, null), t("B", 0, null)], at("2026-10-17T10:00:00Z"))).toBe("scheduled");
  });
  it("trusts inProgress near the start time", () => {
    expect(normalizeState("inProgress", start, [t("A", 1, null), t("B", 0, null)], at("2026-10-17T18:30:00Z"))).toBe("live");
  });
  it("flags inProgress hours before the scheduled start as unverified", () => {
    expect(normalizeState("inProgress", start, [t("A", 0, null), t("B", 0, null)], at("2026-10-17T10:00:00Z"))).toBe("unverified");
  });
  it("flags a match stuck live for too long", () => {
    expect(normalizeState("inProgress", start, [t("A", 1, null), t("B", 0, null)], at("2026-10-18T10:00:00Z"))).toBe("unverified");
  });
  it("requires a decided winner for completed", () => {
    expect(normalizeState("completed", start, [t("A", 0, null), t("B", 0, null)], at("2026-10-18T10:00:00Z"))).toBe("unverified");
    expect(normalizeState("completed", start, [t("A", 3, "win"), t("B", 1, "loss")], at("2026-10-18T10:00:00Z"))).toBe("completed");
  });
  it("treats unknown states as unverified", () => {
    expect(normalizeState("weird", start, [t("A", 0, null), t("B", 0, null)])).toBe("unverified");
  });
});

const mk = (id: string, a: TeamSide, b: TeamSide, state: Match["state"], startTime = start): Match => ({
  id, startTime, stage: "Play-Ins", block: "Play-Ins", previous: [], bestOf: 5, state, upstreamState: state, teams: [a, b], games: [], source: "lolesports", updatedAt: "", upstreamChangedAt: "",
});

describe("computeRecords", () => {
  it("counts only completed matches and ignores TBD", () => {
    const ms = [
      mk("1", t("KC", 3, "win"), t("C9", 2, "loss"), "completed"),
      mk("2", t("KC", 3, "win"), t("MVK", 0, "loss"), "completed"),
      mk("3", t("C9", 0, null), t("FUR", 0, null), "scheduled"),
      mk("4", t("TBD", 0, null), t("KC", 0, null), "scheduled"),
    ];
    const r = computeRecords(ms);
    expect(r[0]).toMatchObject({ code: "KC", w: 2, l: 0, gw: 6, gl: 2 });
    expect(r.find((x) => x.code === "FUR")).toBeUndefined();
    expect(r.find((x) => x.code === "TBD")).toBeUndefined();
  });
});

describe("nextMatch", () => {
  it("skips TBD and past matches", () => {
    const ms = [
      mk("1", t("TBD", 0, null), t("KC", 0, null), "scheduled", "2026-10-17T12:00:00Z"),
      mk("2", t("C9", 0, null), t("FUR", 0, null), "scheduled", "2026-10-17T13:00:00Z"),
    ];
    expect(nextMatch(ms, at("2026-10-17T11:00:00Z"))?.id).toBe("2");
    expect(nextMatch(ms, at("2026-10-17T14:00:00Z"))).toBeNull();
  });
});

describe("playInWinner", () => {
  const entries = [
    { code: "KC", entry: "Play-In" },
    { code: "C9", entry: "Play-In" },
    { code: "GEN", entry: "Swiss" },
  ];
  it("is null while Play-Ins are undecided", () => {
    expect(playInWinner([mk("1", t("KC", 0, null), t("C9", 0, null), "scheduled")], entries)).toBeNull();
  });
  it("takes the winner of the last completed Play-In series", () => {
    const ms = [
      mk("1", t("KC", 3, "win"), t("C9", 2, "loss"), "completed", "2026-10-15T18:00:00Z"),
      mk("2", t("C9", 3, "win"), t("KC", 1, "loss"), "completed", "2026-10-16T18:00:00Z"),
    ];
    expect(playInWinner(ms, entries)).toBe("C9");
  });
  it("prefers the Play-In team Riot scheduled into a Swiss series", () => {
    const swiss: Match = { ...mk("2", t("KC", 0, null), t("GEN", 0, null), "scheduled"), stage: "Swiss", block: "Swiss", bestOf: 1 };
    expect(playInWinner([swiss], entries)).toBe("KC");
  });
  it("ignores TBD placeholders in Swiss series", () => {
    const swiss: Match = { ...mk("2", t("TBD", 0, null), t("TBD", 0, null), "scheduled"), stage: "Swiss", block: "Swiss", bestOf: 1 };
    expect(playInWinner([swiss], entries)).toBeNull();
  });
});

describe("swissField", () => {
  const entries = [
    { code: "KC", entry: "Play-In" },
    { code: "C9", entry: "Play-In" },
    { code: "GEN", entry: "Swiss" },
  ];
  it("adds the decided Play-In winner to the Swiss field", () => {
    const ms = [mk("1", t("KC", 3, "win"), t("C9", 0, "loss"), "completed")];
    expect(swissField(ms, entries).map((e) => e.code)).toEqual(["KC", "GEN"]);
  });
  it("keeps the field at direct entries while the Play-In is undecided", () => {
    const ms = [mk("1", t("KC", 0, null), t("C9", 0, null), "scheduled")];
    expect(swissField(ms, entries).map((e) => e.code)).toEqual(["GEN"]);
  });
});
