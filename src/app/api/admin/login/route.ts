import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_MAX_AGE, checkPassword, issueSession } from "@/lib/auth";
import { clientIp, jsonError, sameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Bad origin", 403);
  if (!rateLimit(`login:${clientIp(req)}`, 5, 10 * 60_000)) return jsonError("Too many attempts. Try again later.", 429);
  const body = z.object({ password: z.string().min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError("Invalid request", 400);
  if (!process.env.SESSION_SECRET || !process.env.ADMIN_PASSWORD) return jsonError("Admin is not configured", 503);
  if (!checkPassword(body.data.password)) return jsonError("Wrong password", 401);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, issueSession(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SESSION_MAX_AGE });
  return res;
}
