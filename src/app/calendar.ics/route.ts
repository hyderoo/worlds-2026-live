import { buildSnapshot } from "@/lib/snapshot";
import { config } from "@/lib/config";
import { ALARM_CHOICES, buildIcs } from "@/lib/ics";
import { hasTbd } from "@/lib/match-state";

export const dynamic = "force-dynamic";

/** Subscribable calendar feed. ?teams=T1,G2 limits to those teams (default: every match). ?alarm=15 adds a reminder. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const snap = await buildSnapshot({ refresh: false });
  const known = new Set(snap.teams.map((t) => t.code));
  const teams = (u.searchParams.get("teams") ?? "").split(",").map((s) => s.trim()).filter((c) => known.has(c)).slice(0, 30);
  const alarmRaw = Number(u.searchParams.get("alarm") ?? 0);
  const alarmMin = (ALARM_CHOICES as readonly number[]).includes(alarmRaw) ? alarmRaw : 0;
  const matches = snap.matches
    .filter((m) => !hasTbd(m))
    .filter((m) => teams.length === 0 || m.teams.some((t) => teams.includes(t.code)))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const siteUrl = config.siteUrl.startsWith("http") ? config.siteUrl.replace(/\/$/, "") : u.origin;
  const body = buildIcs(matches, { siteUrl, feed: true, alarmMin, name: teams.length ? `Worlds 2026: ${teams.join(", ")}` : "Worlds 2026 (all matches)" });
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="worlds-2026.ics"',
      "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
