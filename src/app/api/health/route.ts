import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { deriveSync } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = getStore();
    const sync = deriveSync(await store.recentRuns(10), store.kind);
    return NextResponse.json({ ok: true, sync });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
