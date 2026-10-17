import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, jsonError, sameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { allowedEndpoint, MAX_SUBS, subKey } from "@/lib/push";

export const dynamic = "force-dynamic";

const Body = z.object({
  subscription: z.object({ endpoint: z.string().max(600), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) }),
  watch: z.array(z.string().max(12)).max(30),
  spoiler: z.boolean(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Forbidden", 403);
  if (!rateLimit(`push:${clientIp(req)}`, 20, 60_000)) return jsonError("Too many requests", 429);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success || !allowedEndpoint(p.data.subscription.endpoint)) return jsonError("Invalid subscription", 400);
  const store = getStore();
  const key = subKey(p.data.subscription.endpoint);
  const ex = await store.loadExtras();
  if (!(key in ex) && Object.keys(ex).filter((k) => k.startsWith("push:sub:")).length >= MAX_SUBS) return jsonError("Subscriber limit reached", 503);
  if (p.data.watch.length === 0) { await store.deleteExtra(key); return NextResponse.json({ ok: true, active: false }); }
  await store.saveExtra(key, { sub: p.data.subscription, watch: p.data.watch, spoiler: p.data.spoiler, createdAt: new Date().toISOString() });
  return NextResponse.json({ ok: true, active: true });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return jsonError("Forbidden", 403);
  if (!rateLimit(`push:${clientIp(req)}`, 20, 60_000)) return jsonError("Too many requests", 429);
  const b = z.object({ endpoint: z.string().max(600) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return jsonError("Invalid", 400);
  await getStore().deleteExtra(subKey(b.data.endpoint));
  return NextResponse.json({ ok: true });
}
