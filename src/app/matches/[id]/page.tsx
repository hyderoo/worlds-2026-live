import type { Metadata } from "next";
import { MatchDetail } from "@/components/match-detail";
import { buildSnapshot } from "@/lib/snapshot";
import { autoSummary } from "@/lib/recap-text";

type P = { params: Promise<{ id: string }>; searchParams?: Promise<{ score?: string }> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const { id } = await params;
  const withScore = (await searchParams)?.score === "1";
  const m = (await buildSnapshot({ refresh: false })).matches.find((x) => x.id === id);
  if (!m) return { title: "Match not found" };
  const title = `${m.teams[0].name} vs ${m.teams[1].name}`;
  const description = (withScore ? autoSummary(m) : null) ?? `${m.stage}, ${m.block}. Best of ${m.bestOf}. Scheduled ${new Date(m.startTime).toUTCString()}.`;
  return { title, description, alternates: { canonical: `/matches/${id}` }, openGraph: { title, description, type: "article", images: [`/card/${id}${withScore ? "?score=1" : ""}`] }, twitter: { card: "summary_large_image", title, description } };
}

export default async function Page({ params }: P) {
  const { id } = await params;
  return <MatchDetail id={id} />;
}
