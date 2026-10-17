import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { clientIp } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { buildSnapshot } from "@/lib/snapshot";
import { hashToken, leaderboard, loadGroup, revealedPicks } from "@/lib/groups";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit(`grp-get:${clientIp(req)}`, 120, 60_000)) return jsonError("Too many requests", 429);
  const { id } = await params;
  const g = await loadGroup(getStore(), id);
  if (!g) return jsonError("League not found", 404);
  const snap = await buildSnapshot({ refresh: false });
  const memberId = req.headers.get("x-w26-member") ?? "";
  const token = req.headers.get("x-w26-token") ?? "";
  const me = g.members[memberId];
  const authed = !!me && me.tokenHash === hashToken(token);
  return NextResponse.json({
    id: g.id,
    name: g.name,
    members: leaderboard(g, snap.matches),
    revealed: revealedPicks(g, snap.matches, new Date()),
    me: authed ? { id: memberId, name: me!.name, picks: me!.picks } : null,
  });
}
