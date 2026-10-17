import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createMemoryStore } from "../src/lib/store";
import { parseParticipants, parseSocials, refreshLiquipedia } from "../src/lib/liquipedia";

const wt = readFileSync(new URL("./fixtures/worlds-participants.wt", import.meta.url), "utf8");

describe("liquipedia parser", () => {
  it("reads starters, subs and staff, ignoring commented-out people", () => {
    const m = parseParticipants(wt);
    const gen = m.get("GEN")!;
    expect(gen.players.map((p) => p.id)).toEqual(["Kiin", "Canyon", "Chovy", "Ruler", "Duro"]);
    expect(gen.players.find((p) => p.id === "Ruler")?.captain).toBe(true);
    expect(gen.staff.map((s) => s.role)).toContain("head coach");
    const hle = m.get("HLE")!;
    expect(hle.players.some((p) => p.id === "Bluffing")).toBe(false);
    const c9 = m.get("C9")!;
    expect(c9.players.filter((p) => p.sub).map((p) => p.id)).toEqual(["APA", "Zven"]);
    expect(c9.staff.length).toBe(4);
    expect(m.get("T1")!.staff.some((s) => s.id === "kkOma")).toBe(false);
  });
  it("handles Person templates with the id after the role", () => {
    const tl = parseParticipants(wt).get("TL")!;
    expect(tl.players.map((p) => p.id)).toEqual(["Morgan", "Josedeodo", "Quid", "Yeon", "CoreJJ"]);
    expect(tl.staff.map((s) => s.id)).toEqual(["Spawn", "Spookz"]);
  });
  it("reads only safe social handles", () => {
    const s = parseSocials(readFileSync(new URL("./fixtures/infobox.wt", import.meta.url), "utf8") + "\n}}");
    expect(s.find((x) => x.label === "X / Twitter")?.url).toBe("https://x.com/geng");
    expect(s.find((x) => x.label === "Website")?.url).toBe("https://geng.gg/");
  });
  it("is disabled without a contact and throttles to one request per tick", async () => {
    const store = createMemoryStore();
    expect(await refreshLiquipedia(store, { contact: "" })).toContain("disabled");
    let calls = 0;
    const fetcher = async () => { calls++; return wt; };
    const t0 = new Date("2026-10-17T00:00:00Z");
    expect(await refreshLiquipedia(store, { contact: "x@example.com", now: t0, fetcher })).toContain("roster ok");
    expect(await refreshLiquipedia(store, { contact: "x@example.com", now: new Date(t0.getTime() + 30_000), fetcher })).toBe("throttled");
    expect(calls).toBe(1);
  });
});

describe("prize pool", () => {
  it("reads total and per-placement percentages, derives dollars", async () => {
    const { parsePrize } = await import("../src/lib/liquipedia");
    const p = parsePrize("|prizepoolusd=5,000,000\n==Prize Pool==\n{{TeamPrizePool|cutafter=8\n|{{Slot|place=1|percentage=20%}}\n|{{Slot|place=3-4|percentage=8%}}\n|adjacentContent=x", "t")!;
    expect(p.totalUsd).toBe(5_000_000);
    expect(p.slots).toEqual([{ place: "1", percentage: 20, usd: 1_000_000 }, { place: "3-4", percentage: 8, usd: 400_000 }]);
    expect(parsePrize("no prize here", "t")).toBeNull();
  });
});
