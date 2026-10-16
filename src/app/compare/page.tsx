import type { Metadata } from "next";
import { CompareView } from "@/components/teams-views";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Compare teams", description: "Side-by-side comparison of two Worlds 2026 teams using verified results.", alternates: { canonical: "/compare" } };
export default async function Page({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a, b } = await searchParams;
  return (<><PageTitle eyebrow="Head-to-head" title="Compare teams" /><CompareView a={a} b={b} /></>);
}
