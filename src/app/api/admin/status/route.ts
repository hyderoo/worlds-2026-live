import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/http";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const store = getStore();
  return NextResponse.json({ storage: store.kind, runs: await store.recentRuns(30), overrides: await store.loadOverrides() });
}
