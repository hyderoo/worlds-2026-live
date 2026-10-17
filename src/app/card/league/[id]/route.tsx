import { ImageResponse } from "next/og";
import { getStore } from "@/lib/store";
import { buildSnapshot } from "@/lib/snapshot";
import { leaderboard, loadGroup } from "@/lib/groups";

export const dynamic = "force-dynamic";

/**
 * Pick'em share card. Spoiler-safe by default: it only says how many picks the member made.
 * With ?score=1 it adds rank, points and settled picks (counted from official results only).
 * It never shows which team anyone picked.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = new URL(req.url);
  const withScore = u.searchParams.get("score") === "1";
  const g = await loadGroup(getStore(), id);
  const memberId = u.searchParams.get("m") ?? "";
  const mem = g?.members[memberId];
  let line = "League not found";
  let big = "?";
  let sub = "";
  if (g && mem) {
    const rows = leaderboard(g, (await buildSnapshot({ refresh: false })).matches);
    const me = rows.find((r) => r.id === memberId)!;
    const rank = 1 + rows.filter((r) => r.points > me.points).length;
    line = `${g.name} · Friends league`;
    big = withScore ? `${me.points}/${me.settled}` : `${me.picks}`;
    sub = withScore ? `#${rank} of ${rows.length} · correct picks from official results` : `picks made · results hidden`;
  }
  const img = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg,#1a0f33,#0d0c11)", color: "#f1eef9", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", color: "#d9b86c", fontSize: 28, letterSpacing: 6, textTransform: "uppercase" }}>Worlds 2026 · Pick&apos;em</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>{mem?.name ?? ""}</span>
          <span style={{ display: "flex", fontSize: 160, fontWeight: 700, color: "#d9b86c" }}>{big}</span>
          <span style={{ display: "flex", fontSize: 32, color: "#a9a4bd" }}>{sub}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 26, color: "#a9a4bd" }}>
          <span>{line}</span>
          <span>Fan-made, unofficial. Not affiliated with Riot Games.</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
  img.headers.set("cache-control", "public, max-age=0, s-maxage=60");
  return img;
}
