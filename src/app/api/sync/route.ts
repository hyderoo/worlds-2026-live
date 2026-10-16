import { NextResponse } from "next/server";
import { checkSyncSecret } from "@/lib/auth";
import { clientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: Request) {
  if (!checkSyncSecret(req.headers.get("authorization"))) return jsonError("Unauthorized", 401);
  if (!rateLimit(`sync:${clientIp(req)}`, 30, 60_000)) return jsonError("Too many requests", 429);
  const trigger = new URL(req.url).searchParams.get("trigger")?.slice(0, 32) || "api";
  const run = await runSync(getStore(), trigger);
  return NextResponse.json({ ok: run.ok, run }, { status: run.ok ? 200 : 502 });
}

export const POST = handle;
/** Vercel Cron issues GET with `Authorization: Bearer $CRON_SECRET`; set CRON_SECRET equal to SYNC_SECRET. */
export const GET = handle;
