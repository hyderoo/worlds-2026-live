export const dynamic = "force-static";

export function GET() {
  const body = {
    name: "Worlds 2026 Next Match",
    short_name: "Worlds Next",
    description: "Next Worlds 2026 match with a live countdown. Fan-made.",
    id: "/next",
    lang: "id",
    start_url: "/next",
    scope: "/next",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1a1438",
    theme_color: "#0b0a10",
    icons: [
      { src: "/next-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/next-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/next-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/manifest+json" } });
}
