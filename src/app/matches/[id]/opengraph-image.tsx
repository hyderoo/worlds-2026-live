import { ImageResponse } from "next/og";
import { buildSnapshot } from "@/lib/snapshot";

export const alt = "Worlds 2026 match";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = (await buildSnapshot({ refresh: false })).matches.find((x) => x.id === id);
  const a = m?.teams[0], b = m?.teams[1];
  const done = m?.state === "completed";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg,#1a0f33,#0d0c11)", color: "#f1eef9", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", color: "#d9b86c", fontSize: 28, letterSpacing: 6, textTransform: "uppercase" }}>Worlds 2026 · {m?.block ?? "Match"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 48, fontSize: 120, fontWeight: 700 }}>
          <span>{a?.code ?? "?"}</span>
          <span style={{ color: "#d9b86c" }}>{done ? `${a?.wins} - ${b?.wins}` : "vs"}</span>
          <span>{b?.code ?? "?"}</span>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#a9a4bd" }}>{m ? `${a?.name} vs ${b?.name} · Best of ${m.bestOf}` : "Match not found"}</div>
      </div>
    ),
    size,
  );
}
