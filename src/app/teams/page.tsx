import type { Metadata } from "next";
import { TeamsView } from "@/components/teams-views";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Teams", description: "All 19 teams at Worlds 2026 with region, entry stage and results.", alternates: { canonical: "/teams" } };
export default function Page() {
  return (<><PageTitle eyebrow="Teams" title="The field" sub="Follow teams to get a personal schedule on the home page." /><TeamsView /></>);
}
