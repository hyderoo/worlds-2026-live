import { describe, expect, it } from "vitest";
import { computeRecords, normalizeState, nextMatch } from "@/lib/match-state";
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
