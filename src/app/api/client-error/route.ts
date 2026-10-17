import { NextResponse } from "next/server";
import { clientIp, jsonError, sameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

type Rec = { at: string; message: string; digest?: string; url: string; ua: string; build?: string };
const clip = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, n);

/** Anonymous client crash log (last 20): message, page path, browser string. No cookies, prefs or personal data. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Forbidden", 403);
  if (!rateLimit(`cerr:${clientIp(req)}`, 10, 60_000)) return jsonError("Too many requests", 429);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return jsonError("Invalid", 400);
  const store = getStore();
  const ex = await store.loadExtras();
  const list = ((ex["client-errors"] as Rec[] | undefined) ?? []).slice(-19);
  list.push({ at: new Date().toISOString(), message: clip(b.message, 300), digest: clip(b.digest, 40), url: clip(b.url, 200), ua: clip(b.ua, 160), build: clip(b.build, 40) });
  await store.saveExtra("client-errors", list);
  console.error("client-error", JSON.stringify(list.at(-1)));
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const ex = await getStore().loadExtras();
  return NextResponse.json({ errors: (ex["client-errors"] as Rec[] | undefined) ?? [] });
}
