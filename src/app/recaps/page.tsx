import type { Metadata } from "next";
import { RecapsList } from "@/components/recaps-views";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Recaps", description: "Searchable archive of Worlds 2026 match recaps built from verified results.", alternates: { canonical: "/recaps" } };
export default function Page() {
  return (<><PageTitle eyebrow="Archive" title="Match recaps" sub="Official results and champions. Editorial text is labeled and separate from data." /><RecapsList /></>);
}
