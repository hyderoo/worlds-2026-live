import type { Metadata } from "next";
import { StandingsView } from "@/components/standings-view";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Bracket and standings", description: "Worlds 2026 Play-In bracket, Swiss standings and knockout bracket built from official results.", alternates: { canonical: "/standings" } };

export default function Page() {
  return (<><PageTitle eyebrow="Progression" title="Bracket and standings" sub="Built only from official results. Nothing is projected." /><StandingsView /></>);
}
