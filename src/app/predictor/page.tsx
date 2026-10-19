import type { Metadata } from "next";
import { PredictorView } from "@/components/predictor-view";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Swiss and knockout predictor", description: "Pick winners and see how the Worlds 2026 Swiss stage and knockouts could play out. Your own predictions, not official results.", alternates: { canonical: "/predictor" } };

export default function Page() {
  return (<><PageTitle eyebrow="Your picks" title="Predictor" sub="Click winners to see where teams could land. These are your predictions, not official results." /><PredictorView /></>);
}
