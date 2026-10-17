import { NextResponse } from "next/server";
import { clientIp, jsonError, sameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { buildSnapshot } from "@/lib/snapshot";
import { GROUP_PREFIX, hashToken, loadGroup, pickOpen } from "@/lib/groups";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Forbidden", 403);
  if (!rateLimit(`grp-pick:${clientIp(req)}`, 60, 60_000)) return jsonError("Too many requests", 429);
  const { id } = await params;
  const store = getStore();
  const g = await loadGroup(store, id);
  if (!g) return jsonError("League not found", 404);
  const b = (await req.json().catch(() => null)) as { memberId?: string; token?: string; matchId?: string; team?: string } | null;
  const me = g.members[b?.memberId ?? ""];
  if (!me || !b?.token || me.tokenHash !== hashToken(b.token)) return jsonError("Not a member of this league on this device", 401);
  const m = (await buildSnapshot({ refresh: false })).matches.find((x) => x.id === b.matchId);
  if (!m) return jsonError("Match not found", 404);
  if (!pickOpen(m, new Date())) return jsonError("Picks for this match are closed", 409);
  if (b.team) {
    if (!m.teams.some((t) => t.code === b.team)) return jsonError("Team is not in this match", 400);
    me.picks[m.id] = b.team;
  } else delete me.picks[m.id];
  await store.saveExtra(GROUP_PREFIX + id, g);
  return NextResponse.json({ ok: true, picks: me.picks });
}
