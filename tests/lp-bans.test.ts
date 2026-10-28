import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createMemoryStore } from "../src/lib/store";
import { attachBans, champId, parseMatchPageDrafts, refreshBans, loadPages, type LpPage } from "../src/lib/lp-bans";
import type { GameStats } from "../src/lib/types";

const bo1 = readFileSync(new URL("./fixtures/lp-match-bo1.html", import.meta.url), "utf8");
const bo3 = readFileSync(new URL("./fixtures/lp-match-bo3.html", import.meta.url), "utf8");

const statsFrom = (g: ReturnType<typeof parseMatchPageDrafts>[number], id: string): GameStats => {
  const mk = (side: "blue" | "red") => ({ team: side === "blue" ? "AAA" : "BBB", picks: g.teams.find((t) => t.side === side)!.picks.map((p, i) => ["top", champId(p), `P${i}`] as [string, string, string]) });
  return { n: g.n, id, blue: mk("blue"), red: mk("red") };
};

describe("liquipedia bans", () => {
  it("maps champion names to Data Dragon ids", () => {
    expect(champId("K&#39;Sante")).toBe("KSante");
    expect(champId("Wukong")).toBe("MonkeyKing");
    expect(champId("Bel'Veth")).toBe("Belveth");
    expect(champId("Dr. Mundo")).toBe("DrMundo");
    expect(champId("Jarvan IV")).toBe("JarvanIV");
    expect(champId("Lee Sin")).toBe("LeeSin");
  });
  it("reads a best-of-one draft: sides, five picks and five bans in order", () => {
    const [g] = parseMatchPageDrafts(bo1);
    expect(parseMatchPageDrafts(bo1)).toHaveLength(1);
    const red = g!.teams.find((t) => t.side === "red")!, blue = g!.teams.find((t) => t.side === "blue")!;
    expect(red.picks).toEqual(["Ambessa", "Nocturne", "Locke", "Jhin", "Shen"]);
    expect(red.bans).toEqual(["Cassiopeia", "Qiyana", "Akali", "Corki", "Renekton"]);
    expect(blue.bans).toEqual(["Olaf", "Vi", "Jayce", "Nautilus", "Bard"]);
  });
  it("reads each game of a best-of-three separately", () => {
    const gs = parseMatchPageDrafts(bo3);
    expect(gs.map((g) => g.n)).toEqual([1, 2]);
    for (const g of gs) for (const t of g.teams) { expect(t.picks).toHaveLength(5); expect(t.bans.length).toBeGreaterThan(0); }
  });
  it("attaches bans only when both sides' picks match exactly", () => {
    const gs = parseMatchPageDrafts(bo3);
    const page: LpPage = { title: "Match:ID Test", fetchedAt: "2026-10-29T00:00:00Z", games: gs };
    const g2 = statsFrom(gs[1]!, "g2");
    const [out] = attachBans([g2], [page]);
    const b = gs[1]!.teams.find((t) => t.side === "blue")!;
    expect(out!.bans?.blue).toEqual(b.bans.map(champId));
    expect(out!.bans?.page).toBe("https://liquipedia.net/leagueoflegends/Match:ID_Test");
    // game 1 picks never receive game 2 bans
    const g1 = attachBans([statsFrom(gs[0]!, "g1")], [page])[0]!;
    expect(g1.bans?.blue).toEqual(gs[0]!.teams.find((t) => t.side === "blue")!.bans.map(champId));
    expect(g1.bans?.blue).not.toEqual(out!.bans?.blue);
    // one swapped pick: no bans at all
    const bad = statsFrom(gs[1]!, "bad"); bad.blue.picks[0] = ["top", "Teemo", "x"];
    expect(attachBans([bad], [page])[0]!.bans).toBeUndefined();
    // swapped sides: no bans
    const flipped = { ...g2, blue: g2.red, red: g2.blue };
    expect(attachBans([flipped], [page])[0]!.bans).toBeUndefined();
  });
  it("fetches one page per call, respects the gap and stores parsed drafts", async () => {
    const store = createMemoryStore();
    const calls: string[] = [];
    const fetchers = { list: async () => (calls.push("list"), ["Match:ID Wrd26Test 0001"]), page: async (t: string) => (calls.push(t), bo1) };
    const stats = { m1: [statsFrom(parseMatchPageDrafts(bo1)[0]!, "x")] };
    const t0 = new Date("2026-10-29T00:00:00Z");
    expect(await refreshBans(store, stats, { contact: "a@b.c", now: t0, fetchers })).toMatch(/listed 1/);
    expect(await refreshBans(store, stats, { contact: "a@b.c", now: new Date(t0.getTime() + 10_000), fetchers })).toBe("throttled");
    expect(await refreshBans(store, stats, { contact: "a@b.c", now: new Date(t0.getTime() + 40_000), fetchers })).toMatch(/page ok/);
    expect(loadPages(await store.loadExtras())[0]!.games).toHaveLength(1);
    expect(await refreshBans(store, stats, { contact: "a@b.c", now: new Date(t0.getTime() + 90_000), fetchers })).toBe("complete");
    expect(calls).toEqual(["list", "Match:ID Wrd26Test 0001"]);
    expect(await refreshBans(store, stats, { now: t0 })).toBe("disabled");
  });
});
