import { ImageResponse } from "next/og";
import { buildSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

/** Share card image. Spoiler-safe by default: the score only appears with ?score=1 and only for completed matches. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const withScore = new URL(req.url).searchParams.get("score") === "1";
  const m = (await buildSnapshot({ refresh: false })).matches.find((x) => x.id === id);
  const a = m?.teams[0], b = m?.teams[1];
  const showScore = withScore && m?.state === "completed";
  const when = m ? new Date(m.startTime).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) + " WIB" : "";
  const img = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg,#1a0f33,#0d0c11)", color: "#f1eef9", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", color: "#d9b86c", fontSize: 28, letterSpacing: 6, textTransform: "uppercase" }}>Worlds 2026 · {m ? `${m.stage} · ${m.block}` : "Match"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 48, fontSize: 120, fontWeight: 700 }}>
          <span>{a?.code ?? "?"}</span>
          <span style={{ color: "#d9b86c" }}>{showScore ? `${a?.wins} - ${b?.wins}` : "vs"}</span>
          <span>{b?.code ?? "?"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 28, color: "#a9a4bd" }}>
          <span>{m ? `${a?.name} vs ${b?.name} · Best of ${m.bestOf}` : "Match not found"}</span>
          <span>{m ? (showScore ? "Final · official result" : when) : ""}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
  img.headers.set("cache-control", "public, max-age=0, s-maxage=60");
  return img;
}
