import type { Metadata } from "next";
import { TodayView } from "@/components/today-view";

export const metadata: Metadata = { title: "Today", description: "Worlds 2026 matches today in your time zone, with live countdowns.", alternates: { canonical: "/today" } };

export default function Page() {
  return <TodayView />;
}
