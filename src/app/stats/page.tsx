import type { Metadata } from "next";
import { StatsView } from "@/components/recaps-views";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Statistics", description: "Worlds 2026 team records and champion pick counts from official data.", alternates: { canonical: "/stats" } };
export default function Page() {
  return (<><PageTitle eyebrow="Numbers" title="Statistics" sub="Only what the official data supports. Sample sizes are shown." /><StatsView /></>);
}
