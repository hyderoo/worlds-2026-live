import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamProfile } from "@/components/teams-views";
import { buildSnapshot } from "@/lib/snapshot";

type P = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { code } = await params;
  const t = (await buildSnapshot({ refresh: false })).teams.find((x) => x.code === code);
  if (!t) return { title: "Team not found" };
  return { title: t.name, description: `${t.name} at Worlds 2026: roster, results and schedule.`, alternates: { canonical: `/teams/${code}` } };
}
export default async function Page({ params }: P) {
  const { code } = await params;
  const t = (await buildSnapshot({ refresh: false })).teams.find((x) => x.code === code);
  if (!t) notFound();
  return <TeamProfile code={code} />;
}
