import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireAdmin, sameOrigin } from "@/lib/http";
import { getStore } from "@/lib/store";

const Body = z.object({
  matchId: z.string().min(1).max(64),
  patch: z.object({
    startTime: z.iso.datetime().optional(),
    bestOf: z.number().int().min(1).max(7).optional(),
    wins: z.tuple([z.number().int().min(0).max(4), z.number().int().min(0).max(4)]).optional(),
    note: z.string().max(300).optional(),
  }),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Bad origin", 403);
  const denied = await requireAdmin();
  if (denied) return denied;
  const store = getStore();
  if (store.kind !== "supabase") return jsonError("Manual edits need the Supabase database to be configured.", 503);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return jsonError("Invalid override", 400);
  await store.saveOverride({ matchId: p.data.matchId, patch: p.data.patch, author: "admin", createdAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return jsonError("Bad origin", 403);
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("matchId");
  if (!id) return jsonError("matchId required", 400);
  await getStore().deleteOverride(id);
  return NextResponse.json({ ok: true });
}
