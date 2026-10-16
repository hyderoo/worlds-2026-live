import type { Metadata } from "next";
import { RecapDetail } from "@/components/recaps-views";
import { autoSummary } from "@/lib/recap-text";
import { buildSnapshot } from "@/lib/snapshot";

type P = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { id } = await params;
  const m = (await buildSnapshot({ refresh: false })).matches.find((x) => x.id === id);
  if (!m || m.state !== "completed") return { title: "Recap" };
  const title = `${m.teams[0].name} ${m.teams[0].wins}-${m.teams[1].wins} ${m.teams[1].name}: Worlds 2026 recap`;
  const description = autoSummary(m) ?? title;
  return { title, description, alternates: { canonical: `/recaps/${id}` }, openGraph: { title, description, type: "article", images: [`/matches/${id}/opengraph-image`] }, twitter: { card: "summary_large_image", title, description } };
}
export default async function Page({ params }: P) {
  const { id } = await params;
  return <RecapDetail id={id} />;
}
