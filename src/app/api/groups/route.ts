import { NextResponse } from "next/server";
import { clientIp, jsonError, sameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { cleanName, GROUP_PREFIX, hashToken, MAX_GROUPS, newId, newToken, type Group } from "@/lib/groups";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Forbidden", 403);
  if (!rateLimit(`grp-new:${clientIp(req)}`, 5, 60_000)) return jsonError("Too many requests", 429);
  const b = (await req.json().catch(() => null)) as { name?: string; displayName?: string } | null;
  const name = cleanName(b?.name, 40), me = cleanName(b?.displayName, 24);
  if (!name || !me) return jsonError("Name and display name are required", 400);
  const store = getStore();
  const ex = await store.loadExtras();
  if (Object.keys(ex).filter((k) => k.startsWith(GROUP_PREFIX)).length >= MAX_GROUPS) return jsonError("Group limit reached", 503);
  const id = newId(), memberId = newId(6), token = newToken();
  const g: Group = { id, name, createdAt: new Date().toISOString(), members: { [memberId]: { name: me, tokenHash: hashToken(token), joinedAt: new Date().toISOString(), picks: {} } } };
  await store.saveExtra(GROUP_PREFIX + id, g);
  return NextResponse.json({ id, memberId, token });
}
