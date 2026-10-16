import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireAdmin, sameOrigin } from "@/lib/http";
import { getStore } from "@/lib/store";

const Body = z.object({ matchId: z.string().min(1).max(64), title: z.string().min(1).max(140), body: z.string().min(1).max(5000) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Bad origin", 403);
  const denied = await requireAdmin();
  if (denied) return denied;
  const store = getStore();
  if (store.kind !== "supabase") return jsonError("Editorial recaps need the Supabase database to be configured.", 503);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return jsonError("Invalid recap", 400);
  await store.saveRecap({ ...p.data, kind: "editorial", author: "admin", updatedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
