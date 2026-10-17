import type { Metadata } from "next";
import { DailyView } from "@/components/daily-view";

export const metadata: Metadata = { title: "Daily recap", description: "Yesterday's Worlds 2026 results on one screen, with a hide-scores option.", alternates: { canonical: "/daily" } };

export default function Page() {
  return <DailyView />;
}
