import { describe, expect, it } from "vitest";
import { bareName, photoFor } from "../src/lib/player-photo";
import type { Team } from "../src/lib/types";

const teams = [{ code: "T1", name: "T1", players: [{ role: "mid", name: "Faker", photo: "https://static.lolesports.com/players/x.png" }, { role: "top", name: "Doran" }] }] as unknown as Team[];

describe("photoFor", () => {
  it("strips the team prefix and matches by name", () => {
    expect(bareName("T1", "T1 Faker")).toBe("Faker");
    expect(photoFor(teams, "T1", "T1 Faker")).toContain("x.png");
    expect(photoFor(teams, "T1", "faker")).toContain("x.png");
  });
  it("returns nothing when the player or photo is missing", () => {
    expect(photoFor(teams, "T1", "T1 Doran")).toBeUndefined();
    expect(photoFor(teams, "T1", "T1 Nobody")).toBeUndefined();
    expect(photoFor(teams, "GEN", "GEN Chovy")).toBeUndefined();
  });
});
