import type { Metadata } from "next";
import { PredictionsView } from "@/components/predictions-view";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "My predictions", description: "Track your own Worlds 2026 match predictions. Stored on your device only.", alternates: { canonical: "/predictions" } };
export default function Page() {
  return (<><PageTitle eyebrow="Just for you" title="My predictions" sub="Personal opinions, saved on this device. Not a forecast." /><PredictionsView /></>);
}
