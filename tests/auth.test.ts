import { beforeEach, describe, expect, it } from "vitest";
import { checkPassword, checkSyncSecret, issueSession, verifySession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

beforeEach(() => {
  process.env.SESSION_SECRET = "test-session-secret-0123456789";
  process.env.ADMIN_PASSWORD = "correct horse battery";
  process.env.SYNC_SECRET = "sync-secret-0123456789abc";
});

describe("admin auth", () => {
  it("accepts only the configured password", () => {
    expect(checkPassword("correct horse battery")).toBe(true);
    expect(checkPassword("wrong")).toBe(false);
  });
  it("refuses a weak configured password", () => {
    process.env.ADMIN_PASSWORD = "short";
    expect(checkPassword("short")).toBe(false);
  });
  it("round-trips a session and rejects tampering and expiry", () => {
    const t = issueSession(1_000);
    expect(verifySession(t, 2_000)).toBe(true);
    expect(verifySession(t + "x", 2_000)).toBe(false);
    expect(verifySession(t, 1_000 + 9 * 3600_000)).toBe(false);
    expect(verifySession(undefined)).toBe(false);
  });
  it("checks the sync bearer secret", () => {
    expect(checkSyncSecret("Bearer sync-secret-0123456789abc")).toBe(true);
    expect(checkSyncSecret("Bearer nope")).toBe(false);
    expect(checkSyncSecret(null)).toBe(false);
  });
});

describe("rateLimit", () => {
  it("blocks after the limit within the window", () => {
    expect(rateLimit("k", 2, 1000, 0)).toBe(true);
    expect(rateLimit("k", 2, 1000, 1)).toBe(true);
    expect(rateLimit("k", 2, 1000, 2)).toBe(false);
    expect(rateLimit("k", 2, 1000, 2000)).toBe(true);
  });
});
