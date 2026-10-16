import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/admin";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { buildSnapshot } from "@/lib/snapshot";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  let ok = false;
  try { ok = verifySession((await cookies()).get(SESSION_COOKIE)?.value); } catch { /* not configured */ }
  if (!ok) redirect("/admin/login");
  const store = getStore();
  const [snap, runs, overrides] = await Promise.all([buildSnapshot({ refresh: false }), store.recentRuns(30), store.loadOverrides()]);
  return <Dashboard runs={runs} overrides={overrides} matches={snap.matches.filter((m) => m.teams.every((t) => t.code !== "TBD"))} storage={store.kind} stale={snap.staleOverrides} />;
}
