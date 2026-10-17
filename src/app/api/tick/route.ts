import { NextResponse } from "next/server";
import { clientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { buildSnapshot } from "@/lib/snapshot";
import { sendDueNotifications } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Public, idempotent "send what is due" tick for any free cron pinger. It needs no secret because it only sends
 * notifications that are already due according to stored data, each at most once (deduped by event key),
 * to people who opted in. It never fetches upstream or writes match data.
 */
async function tick(req: Request) {
  if (!rateLimit(`tick:${clientIp(req)}`, 30, 60_000)) return jsonError("Too many requests", 429);
  const snap = await buildSnapshot({ refresh: false });
  const sent = await sendDueNotifications(getStore(), snap.matches, new Date());
  return NextResponse.json({ ok: true, sent }, { headers: { "cache-control": "no-store" } });
}
export const GET = tick;
export const POST = tick;
