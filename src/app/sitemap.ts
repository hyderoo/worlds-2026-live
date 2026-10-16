import type { MetadataRoute } from "next";
import { buildSnapshot } from "@/lib/snapshot";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await buildSnapshot({ refresh: false });
  const base = config.siteUrl;
  const pages = ["", "/matches", "/standings", "/teams", "/recaps", "/stats", "/compare", "/about"].map((p) => ({ url: `${base}${p}`, changeFrequency: "hourly" as const }));
  return [
    ...pages,
    ...s.teams.map((t) => ({ url: `${base}/teams/${t.code}`, changeFrequency: "daily" as const })),
    ...s.matches.filter((m) => m.teams.every((t) => t.code !== "TBD")).map((m) => ({ url: `${base}/matches/${m.id}`, lastModified: m.upstreamChangedAt })),
    ...s.matches.filter((m) => m.state === "completed").map((m) => ({ url: `${base}/recaps/${m.id}`, lastModified: m.upstreamChangedAt })),
  ];
}
