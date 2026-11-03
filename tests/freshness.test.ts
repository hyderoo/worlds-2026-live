import { describe, expect, it } from "vitest";
import { isSnapshotStale, SNAPSHOT_STALE_MS } from "../src/lib/freshness";

describe("isSnapshotStale", () => {
  const now = Date.parse("2026-11-03T09:50:00Z");
  it("treats a just-served snapshot as fresh", () => {
    expect(isSnapshotStale("2026-11-03T09:49:30Z", now)).toBe(false);
  });
  it("treats a snapshot at the threshold boundary as fresh", () => {
    const at = new Date(now - SNAPSHOT_STALE_MS).toISOString();
    expect(isSnapshotStale(at, now)).toBe(false);
  });
  it("flags a snapshot older than the threshold", () => {
    const at = new Date(now - SNAPSHOT_STALE_MS - 1).toISOString();
    expect(isSnapshotStale(at, now)).toBe(true);
  });
  it("flags a days-old cached snapshot (the pre-draw bracket case)", () => {
    expect(isSnapshotStale("2026-10-31T22:00:00Z", now)).toBe(true);
  });
  it("never flags an unparseable stamp (no false alarm)", () => {
    expect(isSnapshotStale("not-a-date", now)).toBe(false);
    expect(isSnapshotStale("", now)).toBe(false);
  });
});
