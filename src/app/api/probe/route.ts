// TEMPORARY probe to inspect Liquipedia wikitext shape from a non-blocked IP. Removed right after use.
export const dynamic = "force-dynamic";
let last = 0;
export async function GET(req: Request) {
  const u = new URL(req.url);
  const contact = req.headers.get("x-contact");
  if (!contact || u.searchParams.get("k") !== "probe-7731") return new Response("no", { status: 403 });
  if (Date.now() - last < 31000) return new Response("throttled", { status: 429 });
  last = Date.now();
  const page = u.searchParams.get("page") ?? "Gen.G";
  const r = await fetch(`https://liquipedia.net/leagueoflegends/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&redirects=1`, { headers: { "User-Agent": `Worlds2026LiveTracker/1.0 (fan project; contact: ${contact})`, "Accept-Encoding": "gzip" } });
  const t = await r.text();
  return new Response(`status ${r.status}\n` + t.slice(0, 200000), { headers: { "content-type": "text/plain" } });
}
