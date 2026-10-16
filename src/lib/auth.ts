import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "w26_admin";
const TTL_MS = 8 * 3600_000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET is not configured (min 16 chars)");
  return s;
}

const sign = (p: string) => createHmac("sha256", secret()).update(p).digest("base64url");

export function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 12) return false; // refuse weak or missing admin password
  return safeEqual(input, pw);
}

export function issueSession(now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ exp: now + TTL_MS, role: "admin" })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  try {
    if (!safeEqual(sig, sign(payload))) return false;
    const { exp, role } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp: number; role: string };
    return role === "admin" && exp > now;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE = TTL_MS / 1000;

export function checkSyncSecret(header: string | null): boolean {
  const s = process.env.SYNC_SECRET;
  if (!s || s.length < 16 || !header) return false;
  const m = /^Bearer (.+)$/.exec(header);
  return !!m && safeEqual(m[1]!, s);
}
