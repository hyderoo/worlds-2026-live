import { describe, it, expect } from "vitest";
import { historyFor, summarize } from "@/lib/worlds-history";
import seed from "@/data/teams-seed.json";

describe("worlds history", () => {
  it("T1 has the titles Liquipedia lists and keeps SK Telecom T1 K out", () => {
    const s = summarize(historyFor("T1")!);
    expect(s.titles).toEqual([2015, 2016, 2023, 2024, 2025]);
    expect(historyFor("T1")!.note).toMatch(/separate/);
  });
  it("only keeps real placements", () => {
    for (const t of seed as { code: string }[]) {
      const h = historyFor(t.code);
      if (!h) continue;
      for (const y of h.years) expect(y.result).not.toMatch(/^(NQ|WC|WQS|-)$/);
    }
  });
  it("does not invent history for teams not in the table", () => {
    expect(historyFor("KC")).toBeNull();
    expect(historyFor("FUR")).toBeNull();
  });
  it("Movistar KOI carries the rebrand note", () => {
    expect(historyFor("MKOI")!.years.at(-1)).toMatchObject({ year: 2025, asName: "Movistar KOI" });
  });
});
