import { NextResponse } from "next/server";
import { clientIp, jsonError, sameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { cleanName, GROUP_PREFIX, hashToken, loadGroup, MAX_MEMBERS, newId, newToken } from "@/lib/groups";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Forbidden", 403);
  if (!rateLimit(`grp-join:${clientIp(req)}`, 10, 60_000)) return jsonError("Too many requests", 429);
  const { id } = await params;
  const store = getStore();
  const g = await loadGroup(store, id);
  if (!g) return jsonError("League not found", 404);
  const b = (await req.json().catch(() => null)) as { displayName?: string } | null;
  const name = cleanName(b?.displayName, 24);
  if (!name) return jsonError("Display name is required", 400);
  if (Object.keys(g.members).length >= MAX_MEMBERS) return jsonError("This league is full", 409);
  if (Object.values(g.members).some((m) => m.name.toLowerCase() === name.toLowerCase())) return jsonError("That name is taken in this league", 409);
  const memberId = newId(6), token = newToken();
  g.members[memberId] = { name, tokenHash: hashToken(token), joinedAt: new Date().toISOString(), picks: {} };
  await store.saveExtra(GROUP_PREFIX + id, g);
  return NextResponse.json({ memberId, token });
}
