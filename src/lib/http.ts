import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { config } from "./config";
import { SESSION_COOKIE, verifySession } from "./auth";

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && config.corsOrigins.includes(origin) ? origin : null;
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": allowed } : {}),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, if-none-match",
    Vary: "Origin",
  };
}

export const jsonError = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function requireAdmin(): Promise<NextResponse | null> {
  let ok = false;
  try {
    ok = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  } catch {
    return jsonError("Admin is not configured", 503);
  }
  return ok ? null : jsonError("Unauthorized", 401);
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Same-origin check for cookie-authenticated writes (CSRF defence in depth on top of SameSite=Strict). */
export function sameOrigin(req: Request): boolean {
  const o = req.headers.get("origin");
  if (!o) return true;
  try {
    return new URL(o).host === req.headers.get("host");
  } catch {
    return false;
  }
}
