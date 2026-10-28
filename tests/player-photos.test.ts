import { describe, expect, it } from "vitest";
import seed from "../src/data/teams-seed.json";

describe("roster player photos", () => {
  it("only uses https Riot-hosted images and never a placeholder", () => {
    const photos = seed.flatMap((t) => t.players.map((p) => (p as { photo?: string }).photo)).filter((x): x is string => !!x);
    expect(photos.length).toBeGreaterThan(0);
    for (const u of photos) {
      expect(u.startsWith("https://static.lolesports.com/players/")).toBe(true);
      expect(/silhouette|default|download\.png/i.test(u)).toBe(false);
    }
  });
});
