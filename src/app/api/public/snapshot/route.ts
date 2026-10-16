import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { buildSnapshot } from "@/lib/snapshot";
import { corsHeaders } from "@/lib/http";

export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function GET(req: Request) {
  const headers = corsHeaders(req.headers.get("origin"));
  try {
    const snap = await buildSnapshot();
    // ETag ignores generatedAt so unchanged data returns 304
    const { generatedAt: _g, ...stable } = snap;
    void _g;
    const etag = `"${createHash("sha1").update(JSON.stringify(stable)).digest("hex").slice(0, 16)}"`;
    const cc = "public, s-maxage=15, stale-while-revalidate=60";
    if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ...headers, ETag: etag, "Cache-Control": cc } });
    return NextResponse.json(snap, { headers: { ...headers, ETag: etag, "Cache-Control": cc } });
  } catch {
    return NextResponse.json({ error: "snapshot unavailable" }, { status: 503, headers });
  }
}
