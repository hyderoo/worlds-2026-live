import { NextResponse } from "next/server";
import { clientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { buildSnapshot } from "@/lib/snapshot";
import { sendDueNotifications } from "@/lib/push";
import { runSync } from "@/lib/sync";
import { refreshBansFromStore } from "@/lib/lp-bans";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** How old the last sync attempt may be before a tick kicks off a fresh one. */
const STALE_MS = 10 * 60_000;

/**
 * Public, idempotent "send what is due" tick for any free cron pinger. It needs no secret because it only sends
 * notifications that are already due according to stored data, each at most once (deduped by event key),
 * to people who opted in.
 *
 * It also keeps match data fresh: GitHub Actions' every-5-minute sync schedule is routinely delayed by
 * hours, so when the last sync attempt is older than STALE_MS this route runs one bounded sync pass.
 * Sync is idempotent (fingerprint compare), only ever pulls the public lolesports feed, and each run is
 * recorded, so overlapping pings can never duplicate writes or hammer upstream.
 */
async function tick(req: Request) {
  if (!rateLimit(`tick:${clientIp(req)}`, 30, 60_000)) return jsonError("Too many requests", 429);
  const snap = await buildSnapshot({ refresh: false });
  const sent = await sendDueNotifications(getStore(), snap.matches, new Date());
  let sync: { ran: boolean; ok?: boolean } = { ran: false };
  const lastAttempt = snap.sync.lastAttemptAt ? Date.parse(snap.sync.lastAttemptAt) : 0;
  if (Date.now() - lastAttempt > STALE_MS) {
    const run = await runSync(getStore(), "tick");
    sync = { ran: true, ok: run.ok };
  }
  // Liquipedia bans backfill: self-throttled to one request per 35 s, no-op once every stored game has bans.
  const bans = await refreshBansFromStore(getStore());
  return NextResponse.json({ ok: true, sent, sync, bans }, { headers: { "cache-control": "no-store" } });
}
export const GET = tick;
export const POST = tick;
